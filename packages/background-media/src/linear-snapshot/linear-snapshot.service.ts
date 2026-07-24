/**
 * Производитель снимка на media-NL (вердикты M1/M2/M3 linear-egress-gear-wiring).
 *
 * Снимок строится ПОЛНЫМ pull-опросом. `LINEAR_API_KEY` читается только из env media;
 * в HTTP-запросе office→media ключ не передаётся и не ожидается.
 */
import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
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
import {
  LINEAR_SNAPSHOT_EGRESS_REGION,
  LINEAR_SNAPSHOT_FORMAT,
  LINEAR_SNAPSHOT_MODE,
  LINEAR_SNAPSHOT_PRODUCED_BY,
  LINEAR_SNAPSHOT_SOURCE,
} from './linear-snapshot.types';

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
  /** Аддитивно в @1; старые фикстуры/снимки могут не нести поле. */
  startedAt?: string | null;
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
    delegatedAgent: null,
    parentId: node.parent?.id ?? null,
    blockedBy,
    blocking,
    githubIssueRefs,
    createdAt: node.createdAt,
    updatedAt: node.updatedAt,
    startedAt: node.startedAt ?? null,
    completedAt: node.completedAt,
  };
}

/**
 * Сетевой порт GraphQL на media-NL. В тестах замещается фикстурным портом.
 */
@Injectable()
export class LinearSnapshotGraphqlSource implements LinearSnapshotSourcePort {
  private readonly logger = new Logger(LinearSnapshotGraphqlSource.name);

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  private requireApiKey(): string {
    const key = this.config.LINEAR_API_KEY?.trim();
    if (!key) {
      throw new ServiceUnavailableException(
        'LINEAR_API_KEY is not configured on media (egress producer)',
      );
    }
    return key;
  }

  private async postGql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
    const res = await fetch(LINEAR_GQL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: this.requireApiKey(),
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
            startedAt
            completedAt
          }
        }
      }
    `;
    const records: LinearSnapshotRecord[] = [];
    let after: string | null = null;
    for (;;) {
      const data: {
        issues: {
          pageInfo: { hasNextPage: boolean; endCursor: string | null };
          nodes: IssueNode[];
        };
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
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  /**
   * Материализовать снимок: полный pull + honest-шапка media-NL.
   * Курсор снимается ПОСЛЕ pull — ревизия соответствует завершённому опросу.
   */
  async captureSnapshot(trigger: LinearSnapshotTrigger): Promise<LinearSnapshot> {
    const records = await this.source.pullAllIssues();
    const sourceRevision = await this.source.fetchSourceCursor();
    const snapshot: LinearSnapshot = {
      header: {
        format: LINEAR_SNAPSHOT_FORMAT,
        capturedAt: new Date().toISOString(),
        sourceRevision,
        producedBy: LINEAR_SNAPSHOT_PRODUCED_BY,
        egressRegion: LINEAR_SNAPSHOT_EGRESS_REGION,
        mode: LINEAR_SNAPSHOT_MODE,
        trigger,
        recordCount: records.length,
      },
      records,
    };
    this.logger.log(
      {
        trigger,
        recordCount: records.length,
        sourceRevision,
        producedBy: snapshot.header.producedBy,
        egressRegion: snapshot.header.egressRegion,
      },
      'linear snapshot captured on media-NL',
    );
    return snapshot;
  }

  snapshotFileName(snapshot: LinearSnapshot): string {
    return `linear-snapshot-${snapshot.header.capturedAt.replace(/[:.]/g, '-')}.json`;
  }

  writeSnapshot(snapshot: LinearSnapshot, dir?: string): string {
    const target = dir ?? this.config.LINEAR_SNAPSHOT_DIR;
    if (!existsSync(target)) {
      mkdirSync(target, { recursive: true });
    }
    const filePath = join(target, this.snapshotFileName(snapshot));
    writeFileSync(filePath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
    return filePath;
  }

  /**
   * Предикат свежести — ВНЕ тела `pullOk`: один дешёвый запрос курсора.
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
