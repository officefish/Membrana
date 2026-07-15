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
 * FREE · «Спектр: живое наблюдение» — одиночная СПЕКТРАЛЬНАЯ модальность,
 * полученная декомпозицией работающего combined-графа (Cowork Sprint
 * `cowork-free-fragment-usercases`, блок `spectrum-live`).
 *
 * Деривация MVP-канона (а не ручная сборка — урок L36: Alpha не стартовала из-за
 * неканонических entry-id). Из `DEFAULT_USERCASE_MVP_MICROPHONE_DOCUMENT` берётся
 * байт-в-байт ВСЁ, кроме главного лупа: bootstrap, onConnect-журнал, teardown,
 * функции fn-1/fn-3, переменные, signalGraph и alarm (в каноне alarm — уже пустая
 * заглушка `alarm-on-tick → ∞`, поэтому «без alarm-loop» = ничего не делать).
 *
 * Main = MVP-main минус трековая ветвь (CollectSamples → MakeTrack → async
 * track-upload → MakeReportFromTrack → PublishReport): трек — модальность соседнего
 * блока, не спектра. Ensemble/fusion/branch-on-detection вычитать не нужно — их в
 * MVP-каноне нет, они появляются только в combined-деривации.
 *
 * Main: onTick → fn-3(GetAudioStream) → GetSample → GetFFTFrame → CollectFftFrames
 * → IsRecordingWindowFull(5 c) → Sequence[stop | flush → isValid → trends → isValid
 * → MakeReportFromAnalysis → PublishReport → Print | restart] → ∞.
 *
 * Обоснование решений — team-spectrum-live/CONCEPT.md (§4 «рекордер как часы»,
 * §5 policy-значения).
 */

/** Id UserCase каталога (запись-заготовка живёт в free-tier-user-case-entries.ts). */
export const FREE_SPECTRUM_LIVE_USER_CASE_ID = 'usercase-free-spectrum-live' as const;

/**
 * Узлы трековой ветви MVP-main, удаляемые деривацией: всё, что производит,
 * выгружает или описывает ТРЕК. Спектральной модальности трек не нужен.
 */
export const REMOVED_MVP_TRACK_NODE_IDS = [
  /** Окно сэмплов — питало только MakeTrack (и ensemble в combined). */
  'node-collect-samples-mqs2lopv-164',
  /** MakeTrack — трек не спектральная модальность. */
  'node-make-track-mqmcipn5-28',
  /** GetRecorder, питавший только MakeTrack. */
  'node-get-recorder-mqs6hyo6-171',
  /** StartAsyncJob(track-upload). */
  'node-start-async-job-v20',
  /** OnAsyncResolved(track-upload). */
  'node-on-async-resolved-v20',
  /** MakeReportFromTrack. */
  'node-make-report-from-track-mqs54kgw-177',
  /** Второй PublishReport (трек-отчёт). */
  'board-mqs5v7w1-9c8xw62e',
] as const;

/**
 * Опорные узлы MVP-main, сохраняемые байт-в-байт: спектральная цепочка,
 * часы окна и report-секция анализа.
 */
export const MVP_MAIN_ANCHORS = {
  /** Точка входа лупа — канон SCENARIO_MAIN_ENTRY (L36). */
  entry: 'main-on-tick',
  infinity: 'main-infinity',
  /** GetAudioStream::fn-3 — вход main-пайплайна (L20: не терять). */
  streamFn: 'fn-3-block',
  sample: 'node-get-sample-mqs2mt0a-165',
  frame: 'node-get-fft-frame-mqs3h75e-166',
  collectFrames: 'node-collect-fft-frames-mqs3hhnu-167',
  /** Часы окна: recorder + host-clock гейт (CONCEPT §4). */
  recorderClock: 'node-get-recorder-mqs3ir02-168',
  windowFull: 'node-is-recording-window-full-mqmo40ie-32',
  stopRecording: 'node-stop-recording-mqmod4yf-35',
  sequence: 'node-sequence-gate-v20-async',
  /** Рестарт окна (L35: у каждого stop есть exec-путь к start после себя). */
  restartStreamFn: 'fn-3-block-2',
  restartRecordingFn: 'fn-1-block',
  flush: 'node-flush-spectral-analyser-mqs6tcs6-172',
  trendsPolicy: 'node-make-fft-trends-policy-mqs6wrpr-175',
  trendsAnalysis: 'node-make-fft-trends-analysis-mqs6vdme-174',
  reportFromAnalysis: 'node-make-report-from-analysis-mqma356z-34',
  publishReport: 'node-publish-report-mqma49xv-35',
} as const;

/** Id новых узлов блока (только виды из SCENARIO_NODE_KINDS). */
export const SPECTRUM_LIVE_MAIN = {
  /** Гейт пустого окна (L28): холодный старт → skip, не смерть ветки. */
  framesGate: 'spectrum-live-frames-gate',
  /** Гейт insufficient-subsample (L11): нет анализа → не публиковать пустой отчёт. */
  analysisGate: 'spectrum-live-analysis-gate',
  printObservation: 'spectrum-live-print-observation',
} as const;

/**
 * Policy трендов для наблюдения (CONCEPT §5).
 *
 * `measurementsCount` — ЖЁСТКОЕ требование субсэмплера: кадров в batch должно быть
 * не меньше, иначе `analyzeTrendsFromFftFrames` вернёт null («insufficient-subsample»,
 * L11). Кадров в batch = тиков за окно (очередь анализатора — FIFO, flush осушает
 * её целиком). Живой каденс тика ~500 мс (L32) ⇒ окно 5 c даёт ≈10 кадров ⇒ 5 —
 * запас ×2. `intervalMs` на порог НЕ влияет, только на выбор слотов: 4×500 мс = 2 c
 * самых свежих кадров. Остальные поля — канон MVP.
 */
export const SPECTRUM_LIVE_TRENDS_POLICY = {
  detectionMode: 'auto',
  measurementsCount: 5,
  intervalMs: 500,
  minConfidence: 0.55,
  minRms: 0.02,
  enabledTemplateKeys: ['DRONE_TIGHT', 'WIND', 'QUIET', 'TRAFFIC', 'BIRDS', 'VOICE'],
} as const;

/** Sequence после переиндексации: stop | наблюдение | рестарт (было 4 с треком). */
export const SPECTRUM_LIVE_SEQUENCE_THEN_COUNT = 3;

type MutableSubgraph = {
  entry: string;
  nodes: ScenarioGraphNode[];
  edges: ScenarioGraphEdge[];
};

function node(
  id: string,
  nodeKind: NonNullable<ScenarioGraphNode['nodeKind']>,
  label: string,
  x: number,
  y: number,
  extra: Partial<ScenarioGraphNode> = {},
): ScenarioGraphNode {
  return {
    id,
    blockKind: 'custom',
    nodeKind,
    label,
    position: { x, y },
    ...extra,
  };
}

function exec(
  source: string,
  target: string,
  sourceHandle = 'exec-out',
  targetHandle = 'exec-in',
): ScenarioGraphEdge {
  return { kind: 'exec', source, sourceHandle, target, targetHandle };
}

function data(
  source: string,
  sourceHandle: string,
  target: string,
  targetHandle: string,
  dataType: NonNullable<ScenarioGraphEdge['dataType']>,
): ScenarioGraphEdge {
  return { kind: 'data', source, sourceHandle, target, targetHandle, dataType };
}

/**
 * Нетипизированное data-ребро для is-valid гейтов (пин `value` принимает любой тип):
 * до первого flush store отдаёт invalid-ref дефолтного вида — типизированное ребро
 * бросило бы type-mismatch вместо честного false (L26). Тип проверяет типизированное
 * ребро потребителя, исполняемое только на true-ветке гейта.
 */
function dataUntyped(
  source: string,
  sourceHandle: string,
  target: string,
  targetHandle: string,
): ScenarioGraphEdge {
  return { kind: 'data', source, sourceHandle, target, targetHandle };
}

/**
 * Main: спектральная цепочка и часы окна сохранены байт-в-байт; трековая ветвь
 * вычтена; наблюдение защищено двумя is-valid гейтами (L28 / L11).
 */
function transformMainLoop(main: ScenarioSubgraph): MutableSubgraph {
  const removed = new Set<string>(REMOVED_MVP_TRACK_NODE_IDS);

  const keptNodes = main.nodes
    .filter((n) => !removed.has(n.id))
    .map((n) => {
      // Policy наблюдения: measurementsCount под реальное число кадров за окно (§5).
      if (n.id === MVP_MAIN_ANCHORS.trendsPolicy && n.fftTrendsPolicy !== undefined) {
        return {
          ...n,
          fftTrendsPolicy: { ...n.fftTrendsPolicy, ...SPECTRUM_LIVE_TRENDS_POLICY },
        } satisfies ScenarioGraphNode;
      }
      // Sequence: трековая then-ветвь выброшена → 4 → 3 (переиндексация ниже).
      if (n.id === MVP_MAIN_ANCHORS.sequence && n.sequenceConfig !== undefined) {
        return {
          ...n,
          sequenceConfig: { ...n.sequenceConfig, thenCount: SPECTRUM_LIVE_SEQUENCE_THEN_COUNT },
        } satisfies ScenarioGraphNode;
      }
      return n;
    });

  // Рёбра удалённых узлов уходят вместе с ними; then-рёбра Sequence
  // переиндексируются явно ниже, поэтому старые снимаем здесь.
  const keptEdges = main.edges.filter(
    (e) =>
      !removed.has(e.source) &&
      !removed.has(e.target) &&
      // exec-цепочка вокруг вычтенного CollectSamples и then-раскладка Sequence
      // задаются заново (newEdges).
      !(e.kind === 'exec' && e.source === MVP_MAIN_ANCHORS.collectFrames) &&
      !(e.kind === 'exec' && e.source === MVP_MAIN_ANCHORS.sequence) &&
      !(e.kind === 'exec' && e.source === MVP_MAIN_ANCHORS.flush),
  );

  const newNodes: ScenarioGraphNode[] = [
    node(SPECTRUM_LIVE_MAIN.framesGate, 'is-valid', 'isValid (кадры есть?)', 640, -760),
    node(SPECTRUM_LIVE_MAIN.analysisGate, 'is-valid', 'isValid (анализ получился?)', 2360, -760),
    node(SPECTRUM_LIVE_MAIN.printObservation, 'print', 'Print: спектр-отчёт', 3240, -760, {
      supportsAsync: true,
    }),
  ];

  const newEdges: ScenarioGraphEdge[] = [
    // Часы окна: кадр собран → проверить, набралось ли окно (CollectSamples вычтен).
    exec(MVP_MAIN_ANCHORS.collectFrames, MVP_MAIN_ANCHORS.windowFull),

    // Sequence после переиндексации (была then-1 = MakeTrack — выброшена).
    exec(MVP_MAIN_ANCHORS.sequence, MVP_MAIN_ANCHORS.stopRecording, 'then-0'),
    exec(MVP_MAIN_ANCHORS.sequence, MVP_MAIN_ANCHORS.flush, 'then-1'),
    exec(MVP_MAIN_ANCHORS.sequence, MVP_MAIN_ANCHORS.restartStreamFn, 'then-2'),
    exec(MVP_MAIN_ANCHORS.sequence, MVP_MAIN_ANCHORS.infinity, 'exec-out'),

    // Наблюдение: flush → гейт пустого окна → тренды → гейт анализа → отчёт.
    exec(MVP_MAIN_ANCHORS.flush, SPECTRUM_LIVE_MAIN.framesGate),
    exec(SPECTRUM_LIVE_MAIN.framesGate, MVP_MAIN_ANCHORS.trendsAnalysis, 'exec-true-out'),
    exec(MVP_MAIN_ANCHORS.trendsAnalysis, SPECTRUM_LIVE_MAIN.analysisGate),
    exec(SPECTRUM_LIVE_MAIN.analysisGate, MVP_MAIN_ANCHORS.reportFromAnalysis, 'exec-true-out'),
    exec(MVP_MAIN_ANCHORS.publishReport, SPECTRUM_LIVE_MAIN.printObservation),

    // Гейты читают ref нетипизированно (L26): invalid до первого flush — честный false.
    dataUntyped(MVP_MAIN_ANCHORS.flush, 'frames', SPECTRUM_LIVE_MAIN.framesGate, 'value'),
    dataUntyped(
      MVP_MAIN_ANCHORS.trendsAnalysis,
      'analysis',
      SPECTRUM_LIVE_MAIN.analysisGate,
      'value',
    ),
    // Наблюдаемость: что именно опубликовано.
    data(
      MVP_MAIN_ANCHORS.reportFromAnalysis,
      'report',
      SPECTRUM_LIVE_MAIN.printObservation,
      'value',
      'ReportRef',
    ),
  ];

  return {
    entry: main.entry,
    nodes: [...keptNodes, ...newNodes],
    edges: [...keptEdges, ...newEdges],
  };
}

/** Comment groups: MVP-группы без вычтенных узлов + группы блока. */
function transformCommentGroups(groups: readonly ScenarioCommentGroup[]): ScenarioCommentGroup[] {
  const removed = new Set<string>(REMOVED_MVP_TRACK_NODE_IDS);
  const kept = groups.filter((group) => !group.nodeIds.some((id) => removed.has(id)));
  const spectrumGroups: ScenarioCommentGroup[] = [
    {
      id: 'spectrum-live-group-window-clock',
      branch: 'main',
      title: 'Часы окна (запись как таймер)',
      rect: { x: -320, y: -880, width: 900, height: 400 },
      nodeIds: [MVP_MAIN_ANCHORS.windowFull, MVP_MAIN_ANCHORS.stopRecording, MVP_MAIN_ANCHORS.sequence],
      frameColor: { preset: 'secondary' },
      description:
        'Спектру нужно ОКНО кадров, а периодического гейта без рекордера в палитре нет: ' +
        'IsRecordingWindowFull (5 c, host-clock) работает здесь как таймер. Трек не создаётся, ' +
        'звук никуда не выгружается — slice от StopRecording намеренно не подключён.',
    },
    {
      id: 'spectrum-live-group-observation',
      branch: 'main',
      title: 'Наблюдение: спектр → отчёт',
      rect: { x: 600, y: -880, width: 2760, height: 400 },
      nodeIds: [
        SPECTRUM_LIVE_MAIN.framesGate,
        MVP_MAIN_ANCHORS.trendsAnalysis,
        SPECTRUM_LIVE_MAIN.analysisGate,
        MVP_MAIN_ANCHORS.reportFromAnalysis,
        MVP_MAIN_ANCHORS.publishReport,
        SPECTRUM_LIVE_MAIN.printObservation,
      ],
      frameColor: { preset: 'accent' },
      description:
        'Одиночная спектральная модальность: тренды по FFT-кадрам (DRONE_TIGHT + контр-классы), ' +
        'без ансамбля и без слияния. Два is-valid гейта: пустое окно на холодном старте и ' +
        'несобравшийся анализ не должны публиковать пустой отчёт.',
    },
  ];
  return [...kept, ...spectrumGroups];
}

function buildFreeSpectrumLiveDocument(): DeviceScenarioDocument {
  const base = structuredClone(DEFAULT_USERCASE_MVP_MICROPHONE_DOCUMENT) as DeviceScenarioDocument;

  // initial / onConnect / triggers / functions / variables / signalGraph / alarm —
  // канон байт-в-байт. Alarm в MVP уже пуст (alarm-on-tick → ∞): «без alarm-loop»
  // выполняется тем, что мы его не трогаем.
  return {
    ...base,
    meta: {
      ...base.meta,
      title: 'UserCase FREE — Спектр: живое наблюдение',
    },
    scenario: {
      ...base.scenario,
      loops: {
        ...base.scenario.loops,
        main: transformMainLoop(base.scenario.loops.main),
      },
      commentGroups: transformCommentGroups(base.scenario.commentGroups ?? []),
    },
  };
}

let cachedDocument: DeviceScenarioDocument | null = null;

/**
 * Embedded FREE «Спектр: живое наблюдение» UserCase document.
 *
 * Fail-fast при поломке деривации: результат прогоняется через
 * `parseDeviceScenarioDocument` — лучше throw, чем тихий невалидный документ.
 */
export function getFreeSpectrumLiveDocument(): DeviceScenarioDocument {
  if (cachedDocument !== null) {
    return cachedDocument;
  }
  const parsed = parseDeviceScenarioDocument(buildFreeSpectrumLiveDocument());
  if (!parsed.ok) {
    throw new Error(`FREE spectrum-live UserCase document invalid: ${parsed.error.message}`);
  }
  cachedDocument = parsed.value;
  return cachedDocument;
}
