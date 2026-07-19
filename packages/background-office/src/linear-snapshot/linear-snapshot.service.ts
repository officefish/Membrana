/**
 * Производитель снимка (Р2, вердикт M2 registry-relocation).
 *
 * Снимок строится ПОЛНЫМ pull-опросом состояния на момент съёмки — никогда из
 * накопленных вебхуков (вебхуки теряются, есть rate-limit). Сеть монорепо живёт
 * ровно здесь: гейты — чистые потребители материализованного файла.
 *
 * В app.module.ts модуль НЕ проводится — провод на интеграции коворка.
 */
import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { AppConfig } from '../config/env.schema';
import { APP_CONFIG } from '../config/config.tokens';
import type {
  FreshnessResult,
  LinearSnapshot,
  LinearSnapshotRecord,
  LinearSnapshotSourcePort,
  LinearSnapshotTrigger,
} from './linear-snapshot.types';
import { LINEAR_SNAPSHOT_FORMAT, LINEAR_SNAPSHOT_SOURCE } from './linear-snapshot.types';

const LINEAR_GQL = 'https://api.linear.app/graphql';
const PAGE_SIZE = 50;

interface GqlResponse<T> {
  data?: T;
  errors?: { message: string }[];
}

interface IssueNode {
  id: string;
  identifier: string;
  state: { name: string; type: string } | null;
  assignee: { name: string } | null;
  parent: { id: string } | null;
  relations: { nodes: { type: string; relatedIssue: { identifier: string } | null }[] } | null;
  inverseRelations: { nodes: { type: string; issue: { identifier: string } | null }[] } | null;
  attachments: { nodes: { url: string }[] } | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

const GITHUB_ISSUE_URL = /github\.com\/[^/\s]+\/[^/\s]+\/issues\/(\d+)/;

/** @internal — экспортирован для тестов на фикстурах. */
export function mapIssueNode(node: IssueNode): LinearSnapshotRecord {
  const blocking: string[] = [];
  for (const rel of node.relations?.nodes ?? []) {
    if (rel.type === 'blocks' && rel.relatedIssue) {
      blocking.push(rel.relatedIssue.identifier);
    }
  }
  const blockedBy: string[] = [];
  for (const rel of node.inverseRelations?.nodes ?? []) {
    if (rel.type === 'blocks' && rel.issue) {
      blockedBy.push(rel.issue.identifier);
    }
  }
  const githubIssueRefs: number[] = [];
  for (const attachment of node.attachments?.nodes ?? []) {
    const match = GITHUB_ISSUE_URL.exec(attachment.url ?? '');
    if (match) {
      githubIssueRefs.push(Number(match[1]));
    }
  }
  return {
    linearId: node.identifier,
    state: node.state?.name ?? 'unknown',
    stateType: node.state?.type ?? 'unknown',
    assignee: node.assignee?.name ?? null,
    // A3: поле делегата в схеме Linear не проверено по живому API — до проверки
    // производитель его не запрашивает и честно отдаёт null (не домысливаем).
    delegatedAgent: null,
    parentId: node.parent?.id ?? null,
    blockedBy,
    blocking,
    githubIssueRefs,
    createdAt: node.createdAt,
    updatedAt: node.updatedAt,
    completedAt: node.completedAt,
  };
}

/**
 * Сетевой порт: GraphQL полный pull с пагинацией + один дешёвый запрос курсора.
 * В тестах замещается фикстурным портом (сеть в тестах запрещена — M2).
 */
@Injectable()
export class LinearSnapshotGraphqlSource implements LinearSnapshotSourcePort {
  private readonly logger = new Logger(LinearSnapshotGraphqlSource.name);

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  private async postGql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
    const res = await fetch(LINEAR_GQL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: this.config.LINEAR_API_KEY,
      },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) {
      this.logger.warn({ status: res.status }, 'Linear HTTP error');
      throw new BadRequestException('Linear API request failed');
    }
    let parsed: GqlResponse<T>;
    try {
      parsed = JSON.parse(await res.text()) as GqlResponse<T>;
    } catch {
      throw new BadRequestException('Linear API returned invalid JSON');
    }
    if (parsed.errors?.length) {
      this.logger.warn({ errors: parsed.errors }, 'Linear GraphQL errors');
      throw new BadRequestException(parsed.errors[0]?.message ?? 'Linear GraphQL error');
    }
    if (!parsed.data) {
      throw new BadRequestException('Linear API returned empty data');
    }
    return parsed.data;
  }

  async pullAllIssues(): Promise<LinearSnapshotRecord[]> {
    const query = `
      query SnapshotIssues($first: Int!, $after: String) {
        issues(first: $first, after: $after) {
          pageInfo { hasNextPage endCursor }
          nodes {
            id
            identifier
            state { name type }
            assignee { name }
            parent { id }
            relations { nodes { type relatedIssue { identifier } } }
            inverseRelations { nodes { type issue { identifier } } }
            attachments { nodes { url } }
            createdAt
            updatedAt
            completedAt
          }
        }
      }
    `;
    const records: LinearSnapshotRecord[] = [];
    let after: string | null = null;
    // Полный опрос: пагинация до конца, не «сколько успели».
    for (;;) {
      const data: {
        issues: { pageInfo: { hasNextPage: boolean; endCursor: string | null }; nodes: IssueNode[] };
      } = await this.postGql(query, { first: PAGE_SIZE, after });
      for (const node of data.issues.nodes) {
        records.push(mapIssueNode(node));
      }
      if (!data.issues.pageInfo.hasNextPage) {
        return records;
      }
      after = data.issues.pageInfo.endCursor;
    }
  }

  async fetchSourceCursor(): Promise<string> {
    // A6: курсор источника = organization.updatedAt (кандидат; проверка по
    // живому API — Phase 2/EXPECTATIONS). Один дешёвый запрос, O(1).
    const data = await this.postGql<{ organization: { updatedAt: string } }>(
      `query SnapshotCursor { organization { updatedAt } }`,
      {},
    );
    return data.organization.updatedAt;
  }
}

@Injectable()
export class LinearSnapshotService {
  private readonly logger = new Logger(LinearSnapshotService.name);

  constructor(
    @Inject(LINEAR_SNAPSHOT_SOURCE) private readonly source: LinearSnapshotSourcePort,
  ) {}

  /**
   * Материализовать снимок: полный pull + провенанс. Курсор снимается ПОСЛЕ
   * pull — ревизия соответствует завершённому состоянию опроса.
   */
  async captureSnapshot(trigger: LinearSnapshotTrigger): Promise<LinearSnapshot> {
    const records = await this.source.pullAllIssues();
    const sourceRevision = await this.source.fetchSourceCursor();
    const snapshot: LinearSnapshot = {
      header: {
        format: LINEAR_SNAPSHOT_FORMAT,
        capturedAt: new Date().toISOString(),
        sourceRevision,
        source: 'office-batch',
        trigger,
        recordCount: records.length,
      },
      records,
    };
    this.logger.log(
      { trigger, recordCount: records.length, sourceRevision },
      'linear snapshot captured',
    );
    return snapshot;
  }

  /** Снимок адресуем: имя файла несёт момент съёмки. */
  snapshotFileName(snapshot: LinearSnapshot): string {
    return `linear-snapshot-${snapshot.header.capturedAt.replace(/[:.]/g, '-')}.json`;
  }

  writeSnapshot(snapshot: LinearSnapshot, dir: string): string {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    const filePath = join(dir, this.snapshotFileName(snapshot));
    writeFileSync(filePath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
    return filePath;
  }

  /**
   * Предикат свежести — ВНЕ тела гейта (M2): один дешёвый запрос курсора.
   * `fresh := sourceCursor == snapshot.header.sourceRevision`.
   */
  async checkFreshness(snapshot: LinearSnapshot): Promise<FreshnessResult> {
    const sourceCursor = await this.source.fetchSourceCursor();
    return {
      fresh: sourceCursor === snapshot.header.sourceRevision,
      snapshotRevision: snapshot.header.sourceRevision,
      sourceCursor,
    };
  }
}
