import {
  parseDeviceScenarioDocument,
  type DeviceScenarioDocument,
  type ScenarioCommentGroup,
  type ScenarioGraphEdge,
  type ScenarioGraphNode,
  type ScenarioSubgraph,
} from '@membrana/core';

import { DEFAULT_USERCASE_MVP_MICROPHONE_DOCUMENT } from './default-usercase-mvp-microphone.generated.js';

/**
 * FREE UserCase «Библиотека сэмплов: записи» — Cowork Sprint
 * `cowork-free-fragment-usercases` (#487), блок `sample-recording`.
 *
 * **Граф = ТОЛЬКО ЗАПИСЬ** (решение владельца 2026-07-15): микрофон пишет окном
 * 5 c, каждое полное окно → трек → async track-upload → отчёт в журнал. Никакой
 * детекции: ни trends, ни ensemble, ни fusion, ни alarm-loop. Управление
 * коллекцией, импорт и разметка — существующий **клиентский модуль** «Библиотека
 * сэмплов», вне графа (узлов работы с коллекцией в палитре нет, новые вводить
 * запрещено — brief §Constraints 1).
 *
 * Деривация bundled MVP v2.0-async **вычитанием** (в отличие от Beta, которая
 * дериваирует заменой): у канона уже есть заказанная запись-цепочка — её надо не
 * построить, а освободить от детекционной ветви. Новых узлов документ не вводит
 * НИ ОДНОГО; добавляются одно сшивающее exec-ребро и две comment-группы.
 *
 * Main: onTick → fn-3(GetAudioStream) → GetSample → CollectSamples →
 * IsRecordingWindowFull → (true) Sequence: then-0 StopRecording · then-1 MakeTrack
 * → StartAsyncJob(track-upload) → OnAsyncResolved ⇒ MakeReportFromTrack →
 * PublishReport · then-2 рестарт записи (fn-3 → fn-1).
 *
 * Обоснование резки, границы и policy-арифметика:
 * docs/cowork-sprint/cowork-free-fragment-usercases/team-sample-recording/CONCEPT.md
 */

/**
 * Id UserCase каталога. Имя историческое (каркас в `free-tier-user-case-entries.ts`
 * заведён под ним) — слаг блока `sample-recording` в id намеренно НЕ протекает.
 */
export const FREE_SAMPLE_LIBRARY_USER_CASE_ID = 'usercase-free-sample-library' as const;

/**
 * Узлы MVP main, снимаемые как детекционная ветвь и её обвязка (CONCEPT §3.2).
 *
 * Первые шесть — детекция и отчёт по ней. Последние три — спектральный сбор на
 * горячем пути тика: детекцией не являются, но после снятия trends их выход никто
 * не потребляет (FFT в никуда каждый тик), а спектр по резке brief принадлежит
 * блоку `spectrum-live`. Записи сэмплов они не нужны: CollectSamples кормится
 * GetSample напрямую.
 */
export const REMOVED_MVP_MAIN_NODE_IDS = [
  'node-make-fft-trends-analysis-mqs6vdme-174',
  'node-make-fft-trends-policy-mqs6wrpr-175',
  'node-flush-spectral-analyser-mqs6tcs6-172',
  'node-get-spectral-analyser-mqs6uey7-173',
  'node-make-report-from-analysis-mqma356z-34',
  'node-publish-report-mqma49xv-35',
  'node-get-fft-frame-mqs3h75e-166',
  'node-collect-fft-frames-mqs3hhnu-167',
  'node-get-spectral-analyser-mqs3gj4q-165',
] as const;

/** Опорные узлы MVP, на которых держится запись-цепочка (остаются байт-в-байт). */
export const MVP_RECORDING_ANCHORS = {
  /** GetAudioStream::fn-3 — вход тика. */
  streamFn: 'fn-3-block',
  getSample: 'node-get-sample-mqs2mt0a-165',
  collectSamples: 'node-collect-samples-mqs2lopv-164',
  /** GetRecorder для collect/gate/stop. */
  recorderHot: 'node-get-recorder-mqs3ir02-168',
  /** GetRecorder для MakeTrack. */
  recorderTrack: 'node-get-recorder-mqs6hyo6-171',
  windowGate: 'node-is-recording-window-full-mqmo40ie-32',
  sequence: 'node-sequence-gate-v20-async',
  stopRecording: 'node-stop-recording-mqmod4yf-35',
  makeTrack: 'node-make-track-mqmcipn5-28',
  uploadJob: 'node-start-async-job-v20',
  onTrackUploaded: 'node-on-async-resolved-v20',
  reportFromTrack: 'node-make-report-from-track-mqs54kgw-177',
  publishReport: 'board-mqs5v7w1-9c8xw62e',
  getReporter: 'node-get-reporter-mqs5wkzi-169',
  /** Рестарт записи: GetAudioStream::fn-3 → StartRecording::fn-1. */
  restartStreamFn: 'fn-3-block-2',
  restartRecordFn: 'fn-1-block',
  infinity: 'main-infinity',
} as const;

/**
 * Then-ветви Sequence после вычитания: MVP-канон имел 4 (stop / make-track /
 * flush-trends / рестарт). Снятие flush-ветви обязано быть перенумеровано плотно —
 * дыра на `then-2` даёт `sequence-then-skip` каждое окно (симптом L23) и pin в
 * никуда на канвасе.
 */
export const SAMPLE_LIBRARY_SEQUENCE_THEN_COUNT = 3;

/** MVP-handle Then-ветви рестарта записи → её handle после перенумерации. */
const RESTART_THEN_HANDLE = { mvp: 'then-3', derived: 'then-2' } as const;

/** Comment-группы MVP main, снимаемые вместе с детекционной ветвью. */
const REMOVED_MVP_COMMENT_GROUP_IDS = new Set(['group-3', 'group-6', 'group-7']);

/** Id comment-групп блока (взамен снятых). */
export const SAMPLE_LIBRARY_COMMENT_GROUPS = {
  capture: 'sample-recording-group-capture',
  publish: 'sample-recording-group-publish',
} as const;

type MutableSubgraph = {
  entry: string;
  nodes: ScenarioGraphNode[];
  edges: ScenarioGraphEdge[];
};

function exec(
  source: string,
  target: string,
  sourceHandle = 'exec-out',
  targetHandle = 'exec-in',
): ScenarioGraphEdge {
  return { kind: 'exec', source, sourceHandle, target, targetHandle };
}

/**
 * Main: вычитание детекционной ветви из канона.
 *
 * Всё, что остаётся, — MVP байт-в-байт (позиции, policy, id узлов). Добавляется
 * ровно одно ребро: `GetSample → CollectSamples` — сшивка концов там, где из
 * цепочки тика снят спектральный сбор (`GetFFTFrame → CollectFftFrames`).
 */
function transformMainLoop(main: ScenarioSubgraph): MutableSubgraph {
  const removed = new Set<string>(REMOVED_MVP_MAIN_NODE_IDS);

  const keptNodes = main.nodes
    .filter((node) => !removed.has(node.id))
    .map((node) => {
      // Sequence: 4 Then-ветви канона → 3 (снята ветвь flush-trends), плотно.
      if (node.id === MVP_RECORDING_ANCHORS.sequence && node.sequenceConfig !== undefined) {
        const patched: ScenarioGraphNode = {
          ...node,
          sequenceConfig: {
            ...node.sequenceConfig,
            thenCount: SAMPLE_LIBRARY_SEQUENCE_THEN_COUNT,
          },
        };
        return patched;
      }
      return node;
    });

  const keptEdges = main.edges
    .filter((edge) => !removed.has(edge.source) && !removed.has(edge.target))
    .map((edge) => {
      // Рестарт записи переезжает на освободившийся Then-индекс.
      if (
        edge.kind === 'exec' &&
        edge.source === MVP_RECORDING_ANCHORS.sequence &&
        edge.sourceHandle === RESTART_THEN_HANDLE.mvp
      ) {
        return { ...edge, sourceHandle: RESTART_THEN_HANDLE.derived };
      }
      return edge;
    });

  const stitchedEdges: ScenarioGraphEdge[] = [
    exec(MVP_RECORDING_ANCHORS.getSample, MVP_RECORDING_ANCHORS.collectSamples),
  ];

  return {
    entry: main.entry,
    nodes: keptNodes,
    edges: [...keptEdges, ...stitchedEdges],
  };
}

/** Comment groups: канон-группы без снятых узлов + две группы блока. */
function transformCommentGroups(
  groups: readonly ScenarioCommentGroup[],
): ScenarioCommentGroup[] {
  const kept = groups.filter((group) => !REMOVED_MVP_COMMENT_GROUP_IDS.has(group.id));
  const sampleLibraryGroups: ScenarioCommentGroup[] = [
    {
      id: SAMPLE_LIBRARY_COMMENT_GROUPS.capture,
      branch: 'main',
      title: 'Отрывок звука',
      rect: { x: -1912, y: -736, width: 400, height: 152 },
      nodeIds: [MVP_RECORDING_ANCHORS.getSample],
      frameColor: { preset: 'warning' },
      description:
        'Каждый тик берём сэмпл из потока и складываем в окно записи. Спектральной ветви здесь нет: этот сценарий только пишет звук — распознавание живёт в других UserCase.',
    },
    {
      id: SAMPLE_LIBRARY_COMMENT_GROUPS.publish,
      branch: 'main',
      title: 'Публикация записи в журнал',
      rect: { x: 3176, y: -640, width: 624, height: 296 },
      nodeIds: [MVP_RECORDING_ANCHORS.reportFromTrack, MVP_RECORDING_ANCHORS.publishReport],
      frameColor: { preset: 'secondary' },
      description:
        'Трек выгружается асинхронно (track-upload), и по факту выгрузки отчёт о записи попадает в журнал — main loop выгрузку не ждёт. Дальше запись забирает клиентский модуль «Библиотека сэмплов»: коллекция и разметка живут вне графа.',
    },
  ];
  return [...kept, ...sampleLibraryGroups];
}

/**
 * Деривация канона. Ветви initial / onConnect / alarm / onStop / onDisconnect,
 * функции fn-1 (bootstrap записи, L22) и fn-3 (GetAudioStream), переменные и
 * signalGraph берутся байт-в-байт — вместе с ними наследуются канонические id
 * точек входа (L36).
 *
 * Meta: `executionPolicy: 'competition'` намеренно НЕ штампуется — это FREE-шаблон,
 * не competition-форк; 600-секундный таймаут рана для сценария записи семантически
 * неверен. Рассинхрон с combined UC (наследует штамп через Beta) — вопрос
 * Interface Consilium, см. EXPECTATIONS.md.
 */
function buildFreeSampleLibraryDocument(): DeviceScenarioDocument {
  const base = structuredClone(
    DEFAULT_USERCASE_MVP_MICROPHONE_DOCUMENT,
  ) as DeviceScenarioDocument;

  return {
    ...base,
    meta: {
      ...base.meta,
      title: 'UserCase FREE — Библиотека сэмплов: записи',
    },
    scenario: {
      ...base.scenario,
      loops: {
        main: transformMainLoop(base.scenario.loops.main),
        // Канон: alarm = onTick → ∞ и всё. Пустой луп = «без alarm-loop» по заказу.
        alarm: base.scenario.loops.alarm,
      },
      commentGroups: transformCommentGroups(base.scenario.commentGroups ?? []),
    },
  };
}

let cachedDocument: DeviceScenarioDocument | null = null;

/**
 * Embedded FREE UserCase «Библиотека сэмплов: записи» (fail-fast при поломке
 * деривации: результат прогоняется через `parseDeviceScenarioDocument`).
 */
export function getFreeSampleLibraryDocument(): DeviceScenarioDocument {
  if (cachedDocument !== null) {
    return cachedDocument;
  }
  const parsed = parseDeviceScenarioDocument(buildFreeSampleLibraryDocument());
  if (!parsed.ok) {
    throw new Error(`FREE sample-library UserCase document invalid: ${parsed.error.message}`);
  }
  cachedDocument = parsed.value;
  return cachedDocument;
}
