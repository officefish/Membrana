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
 * байт-в-байт onConnect-журнал, teardown, функция fn-3 (GetAudioStream), переменные,
 * signalGraph и alarm (в каноне alarm — уже пустая заглушка `alarm-on-tick → ∞`,
 * поэтому «без alarm-loop» = ничего не делать). Bootstrap и главный луп деривируются.
 *
 * Main = MVP-main минус трековая ветвь (CollectSamples → MakeTrack → async
 * track-upload → MakeReportFromTrack → PublishReport): трек — модальность соседнего
 * блока, не спектра. Ensemble/fusion/branch-on-detection вычитать не нужно — их в
 * MVP-каноне нет, они появляются только в combined-деривации.
 *
 * Main: onTick → fn-3(GetAudioStream) → GetSample → GetFFTFrame → CollectFftFrames
 * → IsWindowElapsed(4 c, host-clock) → Sequence[flush → isValid → trends → isValid
 * → MakeReportFromAnalysis → PublishReport → Print | restartStream] → ∞.
 *
 * PC-2c (владелец 2026-07-15): аудиопоток (StartStreaming / GetAudioStream) —
 * ТРАНСЛЯЦИЯ звука, а не ЗАПИСЬ трека (StartRecording / StopRecording). Трек в спектр-
 * графе уже снят при декомпозиции (MakeTrack нет), поэтому StartRecording/StopRecording
 * крутили сессию записи вхолостую (slice питал только снятый MakeTrack) → устарели и вычтены из ЭТОГО
 * графа: наблюдению нужен только поток → FFT → отчёт, БЕЗ записи. Вычтено в трёх местах —
 * bootstrap-вызов StartRecording, Sequence-then StopRecording и рестарт-вызов
 * StartRecording; функция fn-1 (StartRecording) больше не зовётся → удалена целиком.
 * Узлы палитры start-/stop-recording живут в других графах (backward-compat) — не трогаются.
 *
 * PC-2b (консилиум pc2b-spectrum-window-rebuild 2026-07-15): владелец времени лупа —
 * периодический is-window-elapsed по host-часам, а не «рекордер как часы». Спектр
 * больше не тащит get-recorder / is-recording-window-full: наблюдению нужно ОКНО, а
 * не запись. Обоснование решений — team-spectrum-live/CONCEPT.md (§5 policy-значения).
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
 * Узлы «рекордер как часы» MVP-main, снятые деривацией PC-2b: наблюдательное окно
 * теперь держит is-window-elapsed по host-часам. Их KEPT-рёбра (windowFull→sequence,
 * windowFull→∞, recorderClock→windowFull) отпадают авто по `removed.has`.
 */
export const REMOVED_MVP_WINDOW_CLOCK_NODE_IDS = [
  /** IsRecordingWindowFull — заменён на периодический is-window-elapsed (без записи). */
  'node-is-recording-window-full-mqmo40ie-32',
  /** GetRecorder-часы — is-window-elapsed не тянет RecorderRef. */
  'node-get-recorder-mqs3ir02-168',
] as const;

/**
 * Узлы записи MVP-main, снятые деривацией PC-2c: поток ≠ запись. Slice StopRecording
 * питал ТОЛЬКО MakeTrack, снятый при декомпозиции трека, — потребителя не осталось,
 * сессия записи крутилась вхолостую.
 *
 * ВНИМАНИЕ: только для main. Bootstrap-вызов записи (fn-1-block в initial) снимает
 * `transformInitialBootstrap`, определение функции fn-1 — фильтр в build (нигде не зовётся).
 */
export const REMOVED_MVP_RECORDING_NODE_IDS = [
  /** StopRecording (Sequence then-0) — slice не подключён, звук не выгружается. */
  'node-stop-recording-mqmod4yf-35',
  /** StartRecording::fn-1 в рестарт-цепочке — рестарт перезапускает ПОТОК, не запись. */
  'fn-1-block',
  /** GetDevice, питавший device-пин только StartRecording-рестарта — иначе сирота. */
  'node-device-global-mqs5ibg8-126',
] as const;

/**
 * Опорные узлы MVP-main, сохраняемые байт-в-байт: спектральная цепочка,
 * stop-секция сессии и report-секция анализа.
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
  sequence: 'node-sequence-gate-v20-async',
  /** Рестарт ПОТОКА после отчёта (PC-2c: запись не перезапускается — трека нет). */
  restartStreamFn: 'fn-3-block-2',
  flush: 'node-flush-spectral-analyser-mqs6tcs6-172',
  trendsPolicy: 'node-make-fft-trends-policy-mqs6wrpr-175',
  trendsAnalysis: 'node-make-fft-trends-analysis-mqs6vdme-174',
  reportFromAnalysis: 'node-make-report-from-analysis-mqma356z-34',
  publishReport: 'node-publish-report-mqma49xv-35',
} as const;

/**
 * Окно наблюдения is-window-elapsed по host-часам (PC-2b): владелец времени лупа
 * вместо рекордера-как-часов.
 *
 * кадров = windowMs / tick ≈ 8 при tick 500; инвариант ≥ measurementsCount(5) — гард в тесте.
 */
export const SPECTRUM_LIVE_WINDOW_MS = 4000;
/** Живой каденс тика ~500 мс (L32) — знаменатель инварианта окна (гард в тесте). */
export const SPECTRUM_LIVE_EXPECTED_TICK_MS = 500;

/** Id новых узлов блока (только виды из SCENARIO_NODE_KINDS). */
export const SPECTRUM_LIVE_MAIN = {
  /** Периодическое окно наблюдения по host-часам (PC-2b, замена рекордера-как-часам). */
  windowElapsed: 'spectrum-live-window-elapsed',
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
 * её целиком). Живой каденс тика ~500 мс (L32) ⇒ окно 4 c даёт ≈8 кадров ⇒ 5 —
 * запас (инвариант windowMs / tick ≥ measurementsCount — гард в тесте). `intervalMs`
 * на порог НЕ влияет, только на выбор слотов: 4×500 мс = 2 c самых свежих кадров.
 * Остальные поля — канон MVP.
 */
export const SPECTRUM_LIVE_TRENDS_POLICY = {
  detectionMode: 'auto',
  measurementsCount: 5,
  intervalMs: 500,
  minConfidence: 0.55,
  minRms: 0.02,
  enabledTemplateKeys: ['DRONE_TIGHT', 'WIND', 'QUIET', 'TRAFFIC', 'BIRDS', 'VOICE'],
} as const;

/** Sequence после переиндексации: наблюдение | рестарт потока (было 4 — с треком и записью). */
export const SPECTRUM_LIVE_SEQUENCE_THEN_COUNT = 2;

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
  const removed = new Set<string>([
    ...REMOVED_MVP_TRACK_NODE_IDS,
    ...REMOVED_MVP_WINDOW_CLOCK_NODE_IDS,
    ...REMOVED_MVP_RECORDING_NODE_IDS,
  ]);

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
      // Sequence: трековая then-ветвь и StopRecording выброшены → 4 → 2 (переиндексация ниже).
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
    // Часы окна БЕЗ рекордера (PC-2b): периодический гейт по host-часам, окно 4 c.
    node(
      SPECTRUM_LIVE_MAIN.windowElapsed,
      'is-window-elapsed',
      'IsWindowElapsed (окно наблюдения 4 c)',
      240,
      -760,
      { windowElapsedMs: SPECTRUM_LIVE_WINDOW_MS },
    ),
    node(SPECTRUM_LIVE_MAIN.framesGate, 'is-valid', 'isValid (кадры есть?)', 640, -760),
    node(SPECTRUM_LIVE_MAIN.analysisGate, 'is-valid', 'isValid (анализ получился?)', 2360, -760),
    node(SPECTRUM_LIVE_MAIN.printObservation, 'print', 'Print: спектр-отчёт', 3240, -760, {
      supportsAsync: true,
    }),
  ];

  const newEdges: ScenarioGraphEdge[] = [
    // Часы окна без рекордера (PC-2b): кадр собран → набралось ли окно наблюдения 4 c.
    exec(MVP_MAIN_ANCHORS.collectFrames, SPECTRUM_LIVE_MAIN.windowElapsed),
    // Семантика ровно как у windowFull: окно набралось → цикл наблюдения; ещё нет → следующий тик.
    exec(SPECTRUM_LIVE_MAIN.windowElapsed, MVP_MAIN_ANCHORS.sequence, 'exec-true-out'),
    exec(SPECTRUM_LIVE_MAIN.windowElapsed, MVP_MAIN_ANCHORS.infinity, 'exec-false-out'),

    // Sequence после переиндексации PC-2c: сняты then-0 StopRecording и then-1 MakeTrack;
    // остаются наблюдение (flush) и рестарт потока, contiguous — без дыры then (L35).
    // Рестарт на последней (latent) then-1, как и в каноне: рестарт всегда хвост Sequence.
    exec(MVP_MAIN_ANCHORS.sequence, MVP_MAIN_ANCHORS.flush, 'then-0'),
    exec(MVP_MAIN_ANCHORS.sequence, MVP_MAIN_ANCHORS.restartStreamFn, 'then-1'),
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

/**
 * Bootstrap (initial): снять вызов StartRecording (PC-2c). В каноне цепочка bootstrap —
 * GetMicrophone → StartStreaming → fn-1(StartRecording), причём fn-1-block здесь ХВОСТ
 * (exec-out нет — StartRecording ничего не звал дальше). Поэтому «перевесить на следующий
 * за fn-1 узел» нечего: узел записи и все его рёбра (1 exec + 2 data) просто снимаются,
 * StartStreaming остаётся хвостом bootstrap — поток продолжает жить БЕЗ записи.
 */
function transformInitialBootstrap(initial: ScenarioSubgraph): ScenarioSubgraph {
  const recordingCall = 'fn-1-block';
  return {
    ...initial,
    nodes: initial.nodes.filter((n) => n.id !== recordingCall),
    edges: initial.edges.filter((e) => e.source !== recordingCall && e.target !== recordingCall),
  };
}

/** Comment groups: MVP-группы без вычтенных узлов + группы блока. */
function transformCommentGroups(groups: readonly ScenarioCommentGroup[]): ScenarioCommentGroup[] {
  const removed = new Set<string>([
    ...REMOVED_MVP_TRACK_NODE_IDS,
    ...REMOVED_MVP_WINDOW_CLOCK_NODE_IDS,
    ...REMOVED_MVP_RECORDING_NODE_IDS,
  ]);
  const kept = groups.filter((group) => !group.nodeIds.some((id) => removed.has(id)));
  const spectrumGroups: ScenarioCommentGroup[] = [
    {
      id: 'spectrum-live-group-window-clock',
      branch: 'main',
      title: 'Окно наблюдения (host-часы, без записи)',
      rect: { x: -320, y: -880, width: 900, height: 400 },
      nodeIds: [SPECTRUM_LIVE_MAIN.windowElapsed, MVP_MAIN_ANCHORS.sequence],
      frameColor: { preset: 'secondary' },
      description:
        'Периодическое окно наблюдения 4 c по host-часам (IsWindowElapsed) — без записи и без ' +
        'рекордера: наблюдению нужно ОКНО кадров, а не трек. Sequence раскрывает цикл наблюдения ' +
        '(flush → анализ → отчёт) и перезапуск ПОТОКА — запись (StartRecording/StopRecording) снята (PC-2c).',
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

  // onConnect / triggers / variables / signalGraph / alarm — канон байт-в-байт. Alarm в
  // MVP уже пуст (alarm-on-tick → ∞): «без alarm-loop» = мы его не трогаем. Bootstrap,
  // main и functions деривируются: PC-2c снимает запись во всех трёх местах, а функция
  // fn-1 (StartRecording) больше не зовётся ни из bootstrap, ни из рестарта → удаляется.
  return {
    ...base,
    meta: {
      ...base.meta,
      title: 'UserCase FREE — Спектр: живое наблюдение',
    },
    scenario: {
      ...base.scenario,
      initial: transformInitialBootstrap(base.scenario.initial),
      functions: base.scenario.functions.filter((fn) => fn.id !== 'fn-1'),
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
