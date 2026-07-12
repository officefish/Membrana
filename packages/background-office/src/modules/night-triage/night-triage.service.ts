import { Inject, Injectable, Logger } from '@nestjs/common';

import { APP_CONFIG } from '../../config/config.tokens';
import type { AppConfig } from '../../config/env.schema';
import { GithubService } from '../github/github.service';
import { OpenRouterService } from '../openrouter/openrouter.service';
import {
  buildTriageSnapshot,
  DEFAULT_STALE_THRESHOLD_DAYS,
  type RegistryTask,
  type TriageSnapshot,
} from './night-triage-core';
import { buildNarrativePrompt, insertNarrative } from './night-triage-narrative';
import { renderTriageReport } from './night-triage-report';
import { findSecrets } from './night-triage-secret-guard';

const REGISTRY_PATH = 'docs/tasks/registry.json';

export interface NightTriageResult {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  prUrl?: string;
  filePath?: string;
  counts?: TriageSnapshot['counts'];
}

@Injectable()
export class NightTriageService {
  private readonly logger = new Logger(NightTriageService.name);

  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly github: GithubService,
    private readonly openRouter: OpenRouterService,
  ) {}

  isEnabled(): boolean {
    return this.config.NIGHT_TRIAGE_ENABLED === true;
  }

  baseBranch(): string {
    return this.config.NIGHT_TRIAGE_BASE_BRANCH?.trim() || 'main';
  }

  staleThresholdDays(): number {
    const raw = Number.parseInt(this.config.NIGHT_TRIAGE_STALE_DAYS ?? '', 10);
    return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_STALE_THRESHOLD_DAYS;
  }

  private parseRegistry(text: string): RegistryTask[] {
    const parsed = JSON.parse(text) as { tasks?: RegistryTask[] };
    if (!Array.isArray(parsed.tasks)) {
      throw new Error('registry.json: поле tasks отсутствует или не массив');
    }
    return parsed.tasks;
  }

  /** Один ран триажа: срез → отчёт (+нарратив) → секрет-гейт → draft PR. */
  async run(now: Date = new Date()): Promise<NightTriageResult> {
    if (!this.isEnabled()) {
      return { ok: true, skipped: true, reason: 'night-triage disabled (NIGHT_TRIAGE_ENABLED)' };
    }

    const date = now.toISOString().slice(0, 10);
    const filePath = `docs/reports/night-triage/NIGHT_TRIAGE_${date}.md`;

    try {
      const registryText = await this.github.fetchTextFile(REGISTRY_PATH);
      if (!registryText) {
        return { ok: true, skipped: true, reason: `не удалось прочитать ${REGISTRY_PATH}` };
      }
      const tasks = this.parseRegistry(registryText);

      // Детекция детерминирована; git-активность не собираем (budget-safe) — dwell от дат реестра.
      const snapshot = buildTriageSnapshot(tasks, new Map(), now, this.staleThresholdDays());
      let report = renderTriageReport(snapshot, { date });

      // Нарратив опционален и graceful — таблицы неизменны.
      if (this.openRouter.isConfigured()) {
        try {
          const narrative = await this.openRouter.chat(buildNarrativePrompt(snapshot), 1_024);
          report = insertNarrative(report, narrative);
        } catch (err) {
          this.logger.warn(
            { reason: err instanceof Error ? err.message : String(err) },
            'night-triage narrative failed (graceful)',
          );
        }
      }

      // Блокирующий секрет-гейт перед push.
      const secrets = findSecrets(report);
      if (secrets.length > 0) {
        this.logger.warn({ secrets }, 'night-triage secret gate blocked');
        return { ok: false, reason: `секрет-гейт: ${secrets.join(', ')}`, counts: snapshot.counts };
      }

      const prResult = await this.github.createPullRequestWithFile({
        branchPrefix: 'claude/night-triage',
        baseBranch: this.baseBranch(),
        title: `Night triage ${date}`,
        body: [
          '## Night Triage (детерминированный)',
          '',
          'Ночной триаж реестра задач (#380). **sink not source**: рекомендации, не действия — исполняет человек.',
          '',
          `- Ghost: ${snapshot.counts.ghost} · Orphan: ${snapshot.counts.orphan} · Stale: ${snapshot.counts.stale}`,
          `- Порог stale: ${snapshot.staleThresholdDays} дн · File: \`${filePath}\``,
          '',
          'Детекция — детерминированный TS (`night-triage-core`); нарратив — LLM поверх среза, таблицы неизменны.',
        ].join('\n'),
        filePath,
        content: report,
        labels: ['night-triage', 'automated'],
        draft: true,
        dedupLabel: 'night-triage',
        commitMessage: `docs(night-triage): ${date}`,
      });

      if ('skipped' in prResult && prResult.skipped) {
        this.logger.log({ reason: prResult.reason }, 'night-triage skipped (dup PR)');
        return { ok: true, skipped: true, reason: prResult.reason, filePath, counts: snapshot.counts };
      }

      const prUrl = 'prUrl' in prResult ? prResult.prUrl : undefined;
      this.logger.log({ prUrl, counts: snapshot.counts }, 'night-triage draft PR created');
      return { ok: true, prUrl, filePath, counts: snapshot.counts };
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      this.logger.warn({ reason }, 'night-triage failed');
      return { ok: false, reason, filePath };
    }
  }
}
