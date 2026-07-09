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

const DETECTION_FUSION_INSPECTOR_NOTES: readonly ScenarioNodeInspectorNote[] = [
  {
    variant: 'info',
    sections: [
      {
        heading: 'Слияние сырых confidence, не бинарный OR',
        paragraphs: [
          'combinedScore — взвешенное среднее сырых confidence подключённых анализов (fusion-ядро core). Согласие детекторов даёт высокий score, расхождение — середину; agreement выводится отдельным полем.',
          'Входы analysis-1/analysis-2 обязательны (min 2), analysis-3/4 — опциональны (max 4). Молчащий/невалидный вход не ломает узел: он исключается из среднего (present:false).',
        ],
      },
    ],
  },
];

const BRANCH_ON_DETECTION_INSPECTOR_NOTES: readonly ScenarioNodeInspectorNote[] = [
  {
    variant: 'info',
    sections: [
      {
        heading: 'Порог на узле',
        paragraphs: [
          'detected срабатывает при combinedScore ≥ threshold (дефолт 0.5) И presentCount > 0. Неподключённый/пустой fusion всегда уводит в not-detected — ветка тревоги не запустится от молчащего входа.',
        ],
      },
    ],
  },
];

const ENSEMBLE_ANALYSIS_INSPECTOR_NOTES: readonly ScenarioNodeInspectorNote[] = [
  {
    variant: 'info',
    sections: [
      {
        heading: 'Второй детектор (host)',
        paragraphs: [
          'DSP-ансамбль (harmonic/cepstral/spectral-flux) исполняется хостом на окне CollectSamples; узлу нужен непустой batch — пустой AudioSampleRefList остановит сценарий ошибкой (как MakeFftTrendsAnalysis).',
        ],
      },
    ],
  },
];

const PROXIMITY_TREND_INSPECTOR_NOTES: readonly ScenarioNodeInspectorNote[] = [
  {
    variant: 'warning',
    sections: [
      {
        heading: 'Выход из alarm-loop через is-valid',
        paragraphs: [
          'ProximityRef становится НЕвалидным при trend=lost (N промахов combinedScore подряд). Подключите выход к is-valid: true → loop-repeat (тревога живёт), false → выход из alarm-ветки. Отдельного branch-узла для proximity нет — это осознанная композиция.',
          'Громкость — грубая мера сцены, не координата и не расстояние; тренд ближе/дальше судится по половинам окна громкости, история копится хостом и сбрасывается на каждом Пуске.',
        ],
      },
    ],
  },
];

const COMBINED_REPORT_INSPECTOR_NOTES: readonly ScenarioNodeInspectorNote[] = [
  {
    variant: 'info',
    sections: [
      {
        heading: 'Идемпотентный конструктор',
        paragraphs: [
          'Узел синхронно конструирует единый отчёт (2 анализа + трек → ReportRef, schema combined-detection/v1). Повторный exec с теми же входами возвращает ТОТ ЖЕ отчёт (идемпотентность по хэшу входов) — alarm-loop не плодит дубли.',
          'Публикация — отдельным узлом PublishReport; тяжёлую упаковку/выгрузку запускайте как async job (start-async-job: report-build), не блокируя рантайм.',
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
  'make-detection-fusion': DETECTION_FUSION_INSPECTOR_NOTES,
  'branch-on-detection': BRANCH_ON_DETECTION_INSPECTOR_NOTES,
  'make-ensemble-analysis': ENSEMBLE_ANALYSIS_INSPECTOR_NOTES,
  'make-proximity-trend': PROXIMITY_TREND_INSPECTOR_NOTES,
  'make-combined-report': COMBINED_REPORT_INSPECTOR_NOTES,
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
