/**
 * CC8 — оркестратор агента живого чтения контура communications.
 *
 * Поток: refresh (git pull — закрытие точки дрейфа кэша) → loadCanon (fs-read Слой 1–3) →
 * generate (pluggable seam: реальная LLM-генерация подключается здесь / в CC9) →
 * writeArtifact в out/ с tone-guard. Агент читает много, пишет ТОЛЬКО в out/.
 *
 * LLM-генерация НЕ входит в CC8: `generate` — seam, чтобы каркас был детерминированным и тестируемым.
 */
import { spawnSync } from 'node:child_process';
import { loadCanon, type CanonContext } from './canon.js';
import { writeArtifact, type WriteResult } from './out-writer.js';

/** Артефакт, произведённый генератором: имя (относительно out/) + контент. */
export interface Artifact {
  readonly name: string;
  readonly content: string;
}

/** Seam генерации: получает живой канон, возвращает артефакты для записи в out/. */
export type Generate = (canon: CanonContext) => Artifact[] | Promise<Artifact[]>;

export interface AgentOptions {
  /** Корень пакета контура (apps/comms-studio). */
  readonly pkgRoot: string;
  /** Корень монорепо (рабочей копии) для чтения канона. */
  readonly repoRoot: string;
  /** Генератор артефактов (LLM / детерминированный). */
  readonly generate: Generate;
  /** Обновить рабочую копию (`git pull`) перед чтением канона. По умолчанию false. */
  readonly refresh?: boolean;
  /**
   * Если refresh запрошен, но `git pull` неуспешен — ронять прогон (не читать устаревшую копию).
   * По умолчанию true: «закрытие точки дрейфа» строгое. CC8-review P2.
   */
  readonly failOnStaleRefresh?: boolean;
}

export class StaleRefreshError extends Error {}

export interface AgentRunResult {
  readonly canon: CanonContext;
  readonly written: readonly WriteResult[];
  readonly refreshed: boolean;
}

/**
 * Ритм: обновляет рабочую копию перед чтением канона (единственная точка дрейфа — кэш агента).
 * @returns true, если git pull выполнен успешно.
 */
export function refreshWorkingCopy(repoRoot: string): boolean {
  const res = spawnSync('git', ['pull', '--ff-only'], { cwd: repoRoot, encoding: 'utf8' });
  return res.status === 0;
}

/** Запускает агента: refresh → loadCanon → generate → write в out/. */
export async function runAgent(opts: AgentOptions): Promise<AgentRunResult> {
  const refreshed = opts.refresh ? refreshWorkingCopy(opts.repoRoot) : false;
  if (opts.refresh && !refreshed && opts.failOnStaleRefresh !== false) {
    throw new StaleRefreshError('git pull неуспешен — прогон остановлен, чтобы не читать устаревший канон');
  }
  const canon = loadCanon(opts.repoRoot);
  const artifacts = await opts.generate(canon);
  const written = artifacts.map((a) => writeArtifact(opts.pkgRoot, a.name, a.content));
  return { canon, written, refreshed };
}
