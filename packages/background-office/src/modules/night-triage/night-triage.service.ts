import { Inject, Injectable, Logger } from '@nestjs/common';

import { APP_CONFIG } from '../../config/config.tokens';
import type { AppConfig } from '../../config/env.schema';
import { ClaudeService } from '../claude/claude.service';
import { DeepSeekService } from '../deepseek/deepseek.service';
import { GithubService, isMechanismBranch } from '../github/github.service';
import {
  buildTriageSnapshot,
  DEFAULT_STALE_THRESHOLD_DAYS,
  snapshotFingerprint,
  type RegistryTask,
  type TriageSnapshot,
} from './night-triage-core';
import { buildNarrativePrompt, insertNarrative } from './night-triage-narrative';
import {
  answerPrimaryFocus,
  insightYield,
  promoteCandidates,
  type PromoteCandidate,
} from './night-triage-promote';
import { extractFingerprint, renderTriageReport } from './night-triage-report';
import { findSecrets } from './night-triage-secret-guard';

const REGISTRY_PATH = 'docs/tasks/registry.json';
/** Гейт утра: несёт магистраль дня (owner-choice) — вопрос, на который отчёт обязан отвечать (#1445 п.5). */
const GATES_STATE_PATH = 'docs/tasks/morning-gates-state.json';
/** Экспортирован ради зубов: путь не должен жить копией в стабе — иначе переезд каталога тихо разъедется с проверкой. */
export const REPORT_DIR = 'docs/reports/night-triage';
/**
 * Префикс ветки механизма — ОДИН на обе заслонки: дедуп открытых PR и карантин после
 * отвергнутого выхода. Две копии этого литерала разъехались бы, и одна из заслонок начала
 * бы судить не о своём механизме.
 */
const BRANCH_PREFIX = 'claude/night-triage';
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Ночей молчания после отвергнутого выхода. Семь — неделя: достаточно, чтобы «закрыл руками»
 * не превращалось в ежесуточный такт, и мало, чтобы механизм не забыли.
 */
const DEFAULT_REJECT_COOLDOWN_NIGHTS = 7;

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
    private readonly claude: ClaudeService,
    private readonly deepseek: DeepSeekService,
  ) {}

  /**
   * Цепочка провайдеров нарратива (ADR 0005): Claude → DeepSeek(direct) → null.
   * Порядок фиксирован в коде; null = оба канала недоступны, отчёт остаётся
   * детерминированным без раздела (graceful, как раньше).
   */
  private async generateNarrative(prompt: string): Promise<{ text: string; provider: string } | null> {
    if (this.config.ANTHROPIC_API_KEY?.trim()) {
      try {
        const resp = await this.claude.askWithUserText(prompt);
        return { text: resp.text, provider: 'claude' };
      } catch (err) {
        this.logger.warn(
          { reason: err instanceof Error ? err.message : String(err) },
          'night-triage narrative: claude failed, trying deepseek',
        );
      }
    }
    if (this.deepseek.isConfigured()) {
      try {
        return { text: await this.deepseek.chat(prompt), provider: 'deepseek' };
      } catch (err) {
        this.logger.warn(
          { reason: err instanceof Error ? err.message : String(err) },
          'night-triage narrative: deepseek failed (graceful)',
        );
      }
    }
    return null;
  }

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

  rejectCooldownNights(): number {
    const raw = Number.parseInt(this.config.NIGHT_TRIAGE_REJECT_COOLDOWN_NIGHTS ?? '', 10);
    return Number.isFinite(raw) && raw >= 0 ? raw : DEFAULT_REJECT_COOLDOWN_NIGHTS;
  }

  /**
   * Отпечаток последнего отчёта, КОТОРЫЙ ПОЛУЧИЛ СТВОЛ.
   *
   * Именно ствол, а не последний открытый PR: механизм судится по доставленному, иначе он
   * сравнивал бы себя со своим же непрочитанным черновиком и всегда находил новизну.
   *
   * `null` — сравнивать не с чем (каталога нет, он пуст, или отчёт посажен до появления
   * маркера 07.08). На `null` порог обязан ПРОПУСКАТЬ: «основания нет» ≠ «дельта нулевая».
   */
  private async lastLandedFingerprint(): Promise<string | null> {
    // Сетевой сбой здесь — тоже «основания для сравнения нет»: порог обязан пропускать, а
    // не валить прогон. Иначе транзиентный таймаут GitHub становился бы отказом публикации,
    // то есть заслонка отвечала бы на помеху связи, а не на отсутствие новизны.
    try {
      const files = await this.github.listDirectoryFiles(REPORT_DIR);
      if (!files || files.length === 0) return null;
      // Имена вида NIGHT_TRIAGE_YYYY-MM-DD.md — лексикографический максимум и есть свежайший.
      const newest = files.filter((f) => f.startsWith('NIGHT_TRIAGE_') && f.endsWith('.md')).sort().pop();
      if (!newest) return null;
      const text = await this.github.fetchTextFile(`${REPORT_DIR}/${newest}`);
      return text ? extractFingerprint(text) : null;
    } catch (err) {
      this.logger.warn(
        { reason: err instanceof Error ? err.message : String(err) },
        'night-triage: последний доставленный отчёт не прочитан — порог нулевой дельты пропускает',
      );
      return null;
    }
  }

  /**
   * Отвергнут ли предыдущий выход механизма, и не истыл ли ещё карантин.
   *
   * Вещдок 29.07 (`docs/reports/night-triage/CLOSURE_MEMO_2026-07-29.md`): комната закрыла
   * четыре прогона подряд вердиктом `close_no_card`, `insight_yield(25–28.07)=0` — и
   * механизм открыл ещё семь. Вердикт применили к артефактам, а не к механизму; шесть из
   * семи потом закрывали руками по одному. Карантин переносит вердикт на механизм: PR
   * закрыт без мерджа — значит выход отвергнут, и следующие N ночей механизм молчит.
   *
   * Карантин временной, а не «до первого мерджа», СОЗНАТЕЛЬНО: правило «молчать, пока не
   * влит предыдущий» само себя запирает — молчащий механизм не открывает PR, влить нечего,
   * и он не разомкнётся никогда. Время размыкает карантин само.
   */
  private async rejectionCooldown(now: Date): Promise<{ quiet: true; reason: string } | null> {
    const nights = this.rejectCooldownNights();
    if (nights === 0) return null;

    // Метки НЕ достаточно: `night-triage` может нести и чужой PR — хоть ручной разбор
    // самого механизма, — и его закрытие поставило бы механизму ложный карантин. Отбор
    // идёт по тому же ключу, что и дедуп: ветка, которую механизм строит сам.
    const recent = await this.github.listRecentPullRequestsByLabel('night-triage', 10);
    const own = recent.filter((pr) => isMechanismBranch(pr.headRef, BRANCH_PREFIX));
    const previous = own.find((pr) => pr.state !== 'open');
    if (!previous || previous.merged || !previous.closedAt) return null;

    const closedAt = Date.parse(previous.closedAt);
    if (!Number.isFinite(closedAt)) return null;
    const nightsSince = Math.floor((now.getTime() - closedAt) / DAY_MS);
    if (nightsSince >= nights) return null;

    return {
      quiet: true,
      reason:
        `предыдущий отчёт отвергнут (PR #${previous.number} закрыт без мерджа ${nightsSince} ноч. назад): ` +
        `карантин ${nights} ноч. — механизм молчит, пока его выход не читают`,
    };
  }

  private parseRegistry(text: string): RegistryTask[] {
    const parsed = JSON.parse(text) as { tasks?: RegistryTask[] };
    if (!Array.isArray(parsed.tasks)) {
      throw new Error('registry.json: поле tasks отсутствует или не массив');
    }
    return parsed.tasks;
  }

  /**
   * Магистраль дня из гейта утра (#1445 п.5). Любой сбой — честный null:
   * «стык не проверен» печатается словом, а не выдаётся за «пересечения нет».
   */
  private async readMagistral(): Promise<string | null> {
    try {
      const text = await this.github.fetchTextFile(GATES_STATE_PATH);
      if (!text) return null;
      const parsed = JSON.parse(text) as { magistral?: unknown };
      return typeof parsed.magistral === 'string' && parsed.magistral.trim() !== ''
        ? parsed.magistral
        : null;
    } catch (err) {
      this.logger.warn(
        { reason: err instanceof Error ? err.message : String(err) },
        'night-triage: morning-gates-state не прочитан — стык с магистралью не проверен',
      );
      return null;
    }
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

      // ── Порог публикации (`#night-triage-yield-zero`) ─────────────────────────────
      // Обе заслонки стоят ДО нарратива: молчать надо и от LLM тоже, иначе механизм
      // продолжает жечь провайдера ради отчёта, который никто не откроет.
      const cooldown = await this.rejectionCooldown(now);
      if (cooldown) {
        this.logger.log({ reason: cooldown.reason, counts: snapshot.counts }, 'night-triage quiet (rejected)');
        return { ok: true, skipped: true, reason: cooldown.reason, filePath, counts: snapshot.counts };
      }

      const fingerprint = snapshotFingerprint(snapshot);
      const landed = await this.lastLandedFingerprint();
      if (landed !== null && landed === fingerprint) {
        const reason = 'состав среза не изменился с последнего доставленного отчёта — сказать нечего';
        this.logger.log({ reason, counts: snapshot.counts }, 'night-triage skipped (nil delta)');
        return { ok: true, skipped: true, reason, filePath, counts: snapshot.counts };
      }

      // ── Промоут-гейт (#1445 п.2): PR открывается ТОГДА И ТОЛЬКО ТОГДА, когда есть
      // кандидат в карточку инсайта. Стоит ДО нарратива: жечь LLM ради отчёта,
      // который не поедет, незачем. Молчание легально и называет причину (B10).
      const magistral = await this.readMagistral();
      const activeTotal = tasks.filter((t) => t.status === 'active').length;
      const cards: PromoteCandidate[] = promoteCandidates(snapshot, { magistral, activeTotal });
      const focus = answerPrimaryFocus(snapshot, magistral);
      if (cards.length === 0) {
        const reason =
          'кандидатов в карточку инсайта нет (cards: 0) — PR не открывается; ' +
          `стык с магистралью: ${focus.join(' · ')}`;
        this.logger.log({ reason, counts: snapshot.counts }, 'night-triage quiet (no promote)');
        return { ok: true, skipped: true, reason, filePath, counts: snapshot.counts };
      }

      let report = renderTriageReport(snapshot, {
        date,
        promote: {
          cards,
          focus,
          yieldText: insightYield(cards.length, 1).text + ' (эта ночь; база 25–28.07 = 0)',
          draftsClosed: 0,
        },
      });

      // Нарратив опционален и graceful — таблицы неизменны. Цепочка ADR 0005.
      const narrative = await this.generateNarrative(buildNarrativePrompt(snapshot));
      if (narrative) {
        report = insertNarrative(report, narrative.text, narrative.provider);
      }

      // Блокирующий секрет-гейт перед push.
      const secrets = findSecrets(report);
      if (secrets.length > 0) {
        this.logger.warn({ secrets }, 'night-triage secret gate blocked');
        return { ok: false, reason: `секрет-гейт: ${secrets.join(', ')}`, counts: snapshot.counts };
      }

      const prResult = await this.github.createPullRequestWithFile({
        branchPrefix: BRANCH_PREFIX,
        baseBranch: this.baseBranch(),
        title: `Night triage ${date}`,
        body: [
          '## Night Triage (детерминированный)',
          '',
          'Ночной триаж реестра задач (#380). **sink not source**: рекомендации, не действия — исполняет человек.',
          '',
          `- Ghost: ${snapshot.counts.ghost} · Orphan: ${snapshot.counts.orphan} · Stale: ${snapshot.counts.stale}`,
          `- Cards: ${cards.length} (промоут-гейт #1445: без кандидата PR не открывается)`,
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
