/**
 * Таксономия узлов scenario graph v0.4 (`data.kind` на канвасе).
 * Отдельна от legacy `SCENARIO_BLOCK_KINDS` (D0 exec-цепочка хакатона 1):
 * новые узлы рендерятся и резолвятся по `nodeKind`, не ломая каталог D0.
 * @see packages/device-board/DEVICE_BOARD_CONCEPT.md §15 (v0.4)
 */

/**
 * Виды узлов v0.4:
 * - `event` — системный неудаляемый вход обработчика (даёт exec + data-ссылку);
 * - `variable-get` / `variable-set` — чтение/запись переменной;
 * - `print` — терминальный лог (принимает DeviceRef/MicrophoneRef);
 * - `is-valid` — условный узел проверки валидности ссылки;
 * - `get-microphone` — извлекает MicrophoneRef из DeviceRef (выбор из списка);
 * - `device-global` — GetDevice (DeviceRef) в main/alarm без Event;
 * - `stop-runtime` — StopRuntime (exec): выход из runtime в edit;
 * - `start-streaming` / `stop-streaming` — управление аудиопотоком;
 * - `get-audio-stream` — ссылка на активный AudioStream;
 * - `get-sample` — звуковой отрезок (один тик) из AudioStream;
 * - `get-fft-frame` — FftFrame из AudioSample.
 */
export const SCENARIO_NODE_KINDS = [
  'event',
  'variable-get',
  'variable-set',
  'print',
  'is-valid',
  'get-microphone',
  'device-global',
  'stop-runtime',
  'start-streaming',
  'stop-streaming',
  'get-audio-stream',
  'get-sample',
  'get-fft-frame',
  /** Системный терминал лупа (∞): exec-ребро сюда → новая итерация. */
  'loop-repeat',
] as const;

/** Вид узла scenario graph v0.4. */
export type ScenarioNodeKind = (typeof SCENARIO_NODE_KINDS)[number];

/** Системные виды узлов, которые нельзя удалять с борда. */
export const SYSTEM_SCENARIO_NODE_KINDS = ['event', 'loop-repeat'] as const satisfies readonly ScenarioNodeKind[];

/** Type guard для `ScenarioNodeKind`. */
export function isScenarioNodeKind(value: string): value is ScenarioNodeKind {
  return (SCENARIO_NODE_KINDS as readonly string[]).includes(value);
}

/** True, если узел такого вида системный (неудаляемый). */
export function isSystemScenarioNodeKind(value: string): boolean {
  return (SYSTEM_SCENARIO_NODE_KINDS as readonly string[]).includes(value);
}
