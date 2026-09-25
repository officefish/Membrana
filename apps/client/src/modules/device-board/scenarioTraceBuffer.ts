/**
 * In-memory ring buffer of device-board scenario INFO lines (client-only).
 * Used by Phase 3 UX: copy / download trace for debugging.
 */

const MAX_TRACE_LINES = 10_000;

const lines: string[] = [];
const listeners = new Set<() => void>();

/** Кэш снапшота для useSyncExternalStore: identity меняется только при мутации буфера. */
let linesSnapshot: readonly string[] | null = null;

/**
 * ПРОБУЖДЕНИЕ ПОДПИСЧИКОВ СХЛОПНУТО ДО КАДРА (#2328, блок g2).
 *
 * ЧТО ИЗМЕРЕНО. 10.09 владелец воспроизвёл на Firebat: при открытой вкладке «Трейс»
 * приложение переставало отвечать на клавиши, при вкладке «Узлы» — нет. Зависло на
 * **1960 строках**, а не на потолке 10 000, и в самом журнале стоит `main-tick-blocked-ms`
 * с `elapsedMs 151` ДО нажатия остановки. То есть главный поток затыкался ПО ХОДУ работы,
 * а остановка лишь добила уже загруженный поток — она момент обнаружения, не причина.
 *
 * ЧТО СТОИЛО ДОРОГО. `notify()` звался на КАЖДУЮ добавленную строку, и за этой дверью
 * сидят оба подписчика: счётчик строк и панель журнала. На каждое пробуждение панель
 * платила копией всего массива (`getScenarioTraceLines` → `slice()`), второй копией хвоста
 * в 500 строк, сверкой 500 элементов списка и ПРИНУДИТЕЛЬНЫМ пересчётом разметки
 * (`scrollTop = scrollHeight`). Цена линейна на строку с большой константой: пятьсот
 * элементов платятся одинаково и при шестистах строках, и при десяти тысячах. Поэтому
 * «переполненный массив» причиной не был — беда наступала задолго до потолка.
 *
 * ЧТО СДЕЛАНО. Данные остаются СИНХРОННЫМИ: `lines` и сброс кэша снимка происходят сразу,
 * и `getScenarioTraceLines()` немедленно отдаёт новое содержимое (зуб «стабильный снапшот»
 * это и держит). Задерживается только СИГНАЛ «перерисуйся»: сколько бы строк ни пришло
 * внутри кадра, подписчики будятся один раз. Цена на строку падает до одного `push`.
 *
 * ЧЕГО ЭТО НЕ ЛЕЧИТ. Копия массива остаётся O(N) и при десяти тысячах строк раз в кадр
 * всё ещё заметна. Если замер покажет остаток — вторым шагом нужен хвостовой снимок вместо
 * полного, и он потребует правки панели, то есть другой зоны. Здесь этот шаг не делается.
 *
 * ЧТО ТРОГАТЬ НЕ НАДО. Ключ строки в панели — АБСОЛЮТНЫЙ номер строки, поэтому при
 * добавлении старые ключи сохраняются и пятьсот узлов не пересоздаются. Будь там индекс в
 * видимом хвосте, беда была бы вдесятеро злее. Место написано верно.
 */
const FRAME_MS = 16;
let notifyPending = false;

function runNotify(): void {
  notifyPending = false;
  listeners.forEach((listener) => listener());
}

function scheduleNotify(): void {
  if (notifyPending) return;
  notifyPending = true;
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(runNotify);
    return;
  }
  setTimeout(runNotify, FRAME_MS);
}

/**
 * Немедленно отдать отложенное пробуждение. Только для зубов: они обязаны судить
 * схлопывание детерминированно, не завися от таймеров и кадров среды.
 */
export function flushScenarioTraceNotifyForTests(): void {
  if (notifyPending) runNotify();
}

function notify(): void {
  linesSnapshot = null;
  scheduleNotify();
}

/** Format one line like browser console `[INFO] message {ctx}`. */
export function formatScenarioTraceLine(
  message: string,
  context?: Readonly<Record<string, unknown>>,
): string {
  if (context === undefined || Object.keys(context).length === 0) {
    return `[INFO] ${message}`;
  }
  const body = Object.entries(context)
    .map(([key, value]) => {
      if (typeof value === 'string') {
        return `${key}: '${value}'`;
      }
      if (value === null) {
        return `${key}: null`;
      }
      return `${key}: ${String(value)}`;
    })
    .join(', ');
  return `[INFO] ${message} {${body}}`;
}

/** Append line to ring buffer (drops oldest when over cap). */
export function appendScenarioTraceLine(
  message: string,
  context?: Readonly<Record<string, unknown>>,
): void {
  lines.push(formatScenarioTraceLine(message, context));
  if (lines.length > MAX_TRACE_LINES) {
    lines.splice(0, lines.length - MAX_TRACE_LINES);
  }
  notify();
}

export function clearScenarioTraceBuffer(): void {
  if (lines.length === 0) {
    return;
  }
  lines.length = 0;
  notify();
}

export function getScenarioTraceLineCount(): number {
  return lines.length;
}

/** Снапшот строк буфера (стабильная ссылка между мутациями — для useSyncExternalStore). */
export function getScenarioTraceLines(): readonly string[] {
  if (linesSnapshot === null) {
    linesSnapshot = lines.slice();
  }
  return linesSnapshot;
}

export function getScenarioTraceText(): string {
  return lines.join('\n');
}

export function subscribeScenarioTraceBuffer(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Copy buffer to clipboard; returns false when empty or clipboard denied. */
export async function copyScenarioTraceToClipboard(): Promise<boolean> {
  if (lines.length === 0 || typeof navigator.clipboard?.writeText !== 'function') {
    return false;
  }
  try {
    await navigator.clipboard.writeText(getScenarioTraceText());
    return true;
  } catch {
    return false;
  }
}

/** Trigger browser download of trace as plain text. */
export function downloadScenarioTraceFile(runId?: string | null): void {
  if (lines.length === 0) {
    return;
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const suffix = runId !== null && runId !== undefined && runId.length > 0 ? runId : stamp;
  const blob = new Blob([getScenarioTraceText()], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `device-board-trace-${suffix}.txt`;
  anchor.click();
  URL.revokeObjectURL(url);
}
