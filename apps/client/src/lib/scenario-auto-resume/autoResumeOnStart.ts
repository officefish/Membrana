/**
 * Возобновление сценария доски при старте Студии (ADR-0033). Один прогон на запуск приложения.
 *
 * Порядок: отметка «шёл» (локально) → признак прибора (`/quota`; без сети — последнее известное
 * значение) → ждать подключения к кабинету до таймаута → захват → решение `decideAutoResume` →
 * запуск через тот же `controller.start()` без `fromRemote` (проверки захвата действуют как на
 * кнопку оператора). Исход — в shell-лог и в интерфейс (кроме обычного старта).
 */
import { decideAutoResume, AUTO_RESUME_SKIP_TEXT, type CaptureAtStart } from './decide';

export const AUTO_RESUME_CONNECT_TIMEOUT_MS = 15_000;

export type AutoResumeOutcome =
  | { readonly kind: 'started' }
  | { readonly kind: 'skipped'; readonly silent: boolean; readonly text: string }
  | { readonly kind: 'failed'; readonly text: string };

export interface AutoResumeDeps {
  readonly deviceId: string | null;
  readonly paired: boolean;
  readonly readRunMark: (deviceId: string) => boolean;
  /** Признак из `/quota`; `null` — сервер недоступен. */
  readonly fetchFlag: () => Promise<boolean | null>;
  readonly readLastKnownFlag: (deviceId: string) => boolean | null;
  readonly writeLastKnownFlag: (deviceId: string, value: boolean) => void;
  /** Ждать подключения к кабинету; `false` — не дождались за таймаут. */
  readonly waitConnected: (timeoutMs: number) => Promise<boolean>;
  readonly captureAtStart: () => CaptureAtStart;
  /** Запустить и дождаться «идёт»; `false` — проверки перед запуском не пропустили или не дошло. */
  readonly start: () => Promise<boolean>;
}

export async function runAutoResumeOnStart(deps: AutoResumeDeps): Promise<AutoResumeOutcome> {
  const wasRunning = deps.deviceId !== null && deps.readRunMark(deps.deviceId);
  if (!wasRunning) return { kind: 'skipped', silent: true, text: AUTO_RESUME_SKIP_TEXT.not_running };

  let enabled = await deps.fetchFlag().catch(() => null);
  if (enabled !== null && deps.deviceId !== null) deps.writeLastKnownFlag(deps.deviceId, enabled);
  if (enabled === null && deps.deviceId !== null) enabled = deps.readLastKnownFlag(deps.deviceId);

  // Без связи с кабинетом захвата знать неоткуда; ждём подключения, но не дольше таймаута.
  if (deps.paired && enabled === true) await deps.waitConnected(AUTO_RESUME_CONNECT_TIMEOUT_MS);

  const decision = decideAutoResume({ enabled, paired: deps.paired, wasRunning, capture: deps.captureAtStart() });
  if (decision.action === 'skip') {
    return { kind: 'skipped', silent: decision.silent, text: AUTO_RESUME_SKIP_TEXT[decision.reason] };
  }
  let running = false;
  try {
    running = await deps.start();
  } catch {
    return { kind: 'failed', text: 'Сценарий шёл до выключения, но запустить его снова не удалось.' };
  }
  return running
    ? { kind: 'started' }
    : { kind: 'failed', text: 'Сценарий шёл до выключения, но запуск не состоялся (проверка перед запуском не пропустила).' };
}
