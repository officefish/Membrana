/**
 * Семантика pin на scenario graph v0.5+.
 * - `exec` — синхронный поток исполнения (loop tick);
 * - `data` — dataflow ссылок/значений;
 * - `event` — асинхронный trigger (например Collect flush), квадратный handle в UI.
 * @see packages/device-board/DEVICE_BOARD_CONCEPT.md §16
 */

export const SCENARIO_PIN_KINDS = ['exec', 'data', 'event'] as const;

/** Семантика handle на scenario graph. */
export type ScenarioPinKind = (typeof SCENARIO_PIN_KINDS)[number];

/** Type guard для `ScenarioPinKind`. */
export function isScenarioPinKind(value: string): value is ScenarioPinKind {
  return (SCENARIO_PIN_KINDS as readonly string[]).includes(value);
}
