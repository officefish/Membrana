import type { ScenarioNodeKind } from '@membrana/core';

/** Тон блока заметки в правом инспекторе узла. */
export type ScenarioNodeInspectorNoteVariant = 'info' | 'warning';

/** Один абзац или подзаголовок + абзацы в инспекторе. */
export interface ScenarioNodeInspectorNoteSection {
  readonly heading?: string;
  readonly paragraphs: readonly string[];
}

/**
 * Операторская заметка о поведении узла (не подпись pin и не validation issue).
 * Источник правды для правого сайдбара; pre-run lint может ссылаться на те же формулировки.
 */
export interface ScenarioNodeInspectorNote {
  readonly variant: ScenarioNodeInspectorNoteVariant;
  readonly sections: readonly ScenarioNodeInspectorNoteSection[];
}

const START_RECORDING_INSPECTOR_NOTES: readonly ScenarioNodeInspectorNote[] = [
  {
    variant: 'warning',
    sections: [
      {
        heading: 'Защита от частого вызова',
        paragraphs: [
          'Если запись на device уже активна, повторный exec этого узла не открывает новый clip: host пропускает вызов (chain-log: start-recording-idempotent). Это предохранитель от антипаттерна, а не приглашение вызывать узел на каждом tick.',
          'Канон: один старт после StartStreaming (onStart) или рестарт только после StopRecording на ветке gate. Не вешайте StartRecording на безусловный путь каждой итерации main/alarm — pre-run lint будет предупреждать о такой топологии.',
        ],
      },
    ],
  },
];

/**
 * Заметки по nodeKind для правого инспектора.
 * Расширяется по мере появления неочевидного runtime/host-поведения.
 */
export const SCENARIO_NODE_INSPECTOR_NOTES: Partial<
  Record<ScenarioNodeKind, readonly ScenarioNodeInspectorNote[]>
> = {
  'start-recording': START_RECORDING_INSPECTOR_NOTES,
};

/** True, если для nodeKind есть операторские заметки. */
export function hasScenarioNodeInspectorNotes(
  nodeKind: ScenarioNodeKind | undefined,
): boolean {
  if (nodeKind === undefined) {
    return false;
  }
  const notes = SCENARIO_NODE_INSPECTOR_NOTES[nodeKind];
  return notes !== undefined && notes.length > 0;
}

/** Заметки для выбранного узла (пустой массив, если нет). */
export function getScenarioNodeInspectorNotes(
  nodeKind: ScenarioNodeKind | undefined,
): readonly ScenarioNodeInspectorNote[] {
  if (nodeKind === undefined) {
    return [];
  }
  return SCENARIO_NODE_INSPECTOR_NOTES[nodeKind] ?? [];
}
