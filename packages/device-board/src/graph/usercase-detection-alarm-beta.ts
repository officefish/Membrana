import {
  parseDeviceScenarioDocument,
  type DeviceScenarioDocument,
  type ScenarioCommentGroup,
  type ScenarioGraphEdge,
  type ScenarioGraphNode,
  type ScenarioSubgraph,
} from '@membrana/core';

import { DEFAULT_USERCASE_MVP_MICROPHONE_DOCUMENT } from './default-usercase-mvp-microphone.generated.js';
import { stampCompetitionDocumentMeta } from './execution-policy.js';

/**
 * Team Beta · Competition Sprint `comp-detection-alarm-2026-07-10` — «Измеренный
 * сценарий»: полный детекционный UserCase (combined-детекция + alarm-loop) как
 * ДЕРИВАЦИЯ bundled MVP v2.0-async (CONCEPT B1): bootstrap записи, журнал
 * onConnect, async track-upload, teardown и функции fn-1/fn-3 берутся из канона
 * байт-в-байт; заменяются только report-секция main (→ detection-цепочка basn)
 * и alarm-луп (→ proximity-композиция).
 *
 * Main: … → MakeFftTrendsAnalysis → MakeEnsembleAnalysis → MakeDetectionFusion(2)
 * → BranchOnDetection(0.55) → detected: MakeCombinedReport → StartAsyncJob(report-build)
 * → OnAsyncResolved ⇒ PublishReport (main loop не блокируется).
 *
 * Alarm: onTick → свежие кадры (get-sample→get-fft-frame→collect→flush) →
 * IsValid(frames)-гейт → trends(0.5 s окно) → fusion(trends-only, вход 2 молчит
 * by design — CONCEPT B6) → MakeProximityTrend → IsValid(proximity):
 * true → Print «tracking» → ∞; false (lost) → Print «lost», ∞ не достигается (B7).
 *
 * Policy-значения выведены из docs/DETECTOR_BENCHMARK.md — обоснование в
 * docs/competition-sprint/comp-detection-alarm-2026-07-10/team-beta/CONCEPT.md.
 */

/** Id UserCase каталога (бриф: usercase-detection-alarm-<team>). */
export const DETECTION_ALARM_BETA_USER_CASE_ID = 'usercase-detection-alarm-beta' as const;

/**
 * Порог combined-тревоги = minConfidence trends (CONCEPT B3): инвариант
 * «combined-гейт не мягче одиночного trends-гейта» — ансамбль (cepstral
 * P=50 %/R=100 % на free-v1 v0.2) не может дотащить слабый trends-сигнал
 * до тревоги в одиночку.
 */
export const DETECTION_ALARM_BETA_THRESHOLD = 0.55;

/** MVP-узлы report-секции main, заменяемые detection-цепочкой (B1). */
export const REPLACED_MVP_MAIN_NODE_IDS = [
  'node-make-report-from-analysis-mqma356z-34',
  'node-publish-report-mqma49xv-35',
  'node-make-report-from-track-mqs54kgw-177',
  'board-mqs5v7w1-9c8xw62e',
] as const;

/** Опорные узлы MVP main, на которые вешается detection-цепочка. */
export const MVP_MAIN_ANCHORS = {
  trendsAnalysis: 'node-make-fft-trends-analysis-mqs6vdme-174',
  trendsPolicy: 'node-make-fft-trends-policy-mqs6wrpr-175',
  collectSamples: 'node-collect-samples-mqs2lopv-164',
  makeTrack: 'node-make-track-mqmcipn5-28',
  getReporter: 'node-get-reporter-mqs5wkzi-169',
  journalVarGet: 'node-variable-get-var-JournalRef-mqm9dl4a-6-mqs6jso7-15',
  onTrackUploaded: 'node-on-async-resolved-v20',
} as const;

/** Id новых узлов беты (main). */
export const BETA_MAIN = {
  ensemble: 'beta-main-ensemble',
  fusion: 'beta-main-fusion',
  branch: 'beta-main-branch',
  combinedReport: 'beta-main-combined-report',
  reportJob: 'beta-main-report-job',
  onReportBuilt: 'beta-main-on-report-built',
  publishCombined: 'beta-main-publish-combined',
  printPublished: 'beta-main-print-published',
  printDetected: 'beta-main-print-detected',
  printTrackUploaded: 'beta-main-print-track-uploaded',
} as const;

/** Id узлов беты (alarm). */
export const BETA_ALARM = {
  entry: 'alarm-on-tick',
  infinity: 'alarm-infinity',
  stream: 'beta-alarm-stream',
  sample: 'beta-alarm-sample',
  frame: 'beta-alarm-frame',
  collectFrames: 'beta-alarm-collect-frames',
  device: 'beta-alarm-device',
  analyser: 'beta-alarm-analyser',
  flush: 'beta-alarm-flush',
  framesGate: 'beta-alarm-frames-gate',
  trendsPolicy: 'beta-alarm-trends-policy',
  trends: 'beta-alarm-trends',
  fusion: 'beta-alarm-fusion',
  proximity: 'beta-alarm-proximity',
  proxGate: 'beta-alarm-prox-gate',
  printTracking: 'beta-alarm-print-tracking',
  printLost: 'beta-alarm-print-lost',
} as const;

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

function exec(source: string, target: string, sourceHandle = 'exec-out', targetHandle = 'exec-in'): ScenarioGraphEdge {
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

function event(source: string, target: string): ScenarioGraphEdge {
  return { kind: 'event', source, sourceHandle: 'event-out', target, targetHandle: 'exec-in' };
}

/**
 * Нетипизированное data-ребро для presence-гейта `is-valid` (пин `value`
 * принимает любой тип): до первого flush collect-store отдаёт invalid-ref
 * дефолтного вида — типизированное ребро бросило бы type-mismatch вместо
 * честного false. Тип проверяет типизированное ребро потребителя (trends),
 * которое исполняется только на true-ветке гейта (CONCEPT B8).
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
 * Main: MVP-цепочка до MakeFftTrendsAnalysis сохранена; report-секция MVP
 * (make-report-from-analysis/track + оба publish) заменяется detection-цепочкой.
 */
function transformMainLoop(main: ScenarioSubgraph): MutableSubgraph {
  const removed = new Set<string>(REPLACED_MVP_MAIN_NODE_IDS);

  const keptNodes = main.nodes
    .filter((n) => !removed.has(n.id))
    .map((n) => {
      // B-policy: окно трендов 20×200 мс = 4 c ≤ окна записи 5 c (арифметика окон,
      // CONCEPT «Key decisions»); остальные поля policy — канон DRONE_TIGHT.
      if (n.id === MVP_MAIN_ANCHORS.trendsPolicy && n.fftTrendsPolicy !== undefined) {
        const patched: ScenarioGraphNode = {
          ...n,
          fftTrendsPolicy: { ...n.fftTrendsPolicy, intervalMs: 200 },
        };
        return patched;
      }
      return n;
    });

  const keptEdges = main.edges.filter((e) => !removed.has(e.source) && !removed.has(e.target));

  const asyncCapable = { supportsAsync: true } as const;

  const newNodes: ScenarioGraphNode[] = [
    // ── Слияние двух детекторов (then-2 после trends-анализа) ──
    node(BETA_MAIN.ensemble, 'make-ensemble-analysis', 'MakeEnsembleAnalysis', 2560, -760, asyncCapable),
    node(BETA_MAIN.fusion, 'make-detection-fusion', 'MakeDetectionFusion', 2896, -760, {
      ...asyncCapable,
      detectionFusionInputCount: 2,
    }),
    node(BETA_MAIN.branch, 'branch-on-detection', 'BranchOnDetection', 3232, -760, {
      ...asyncCapable,
      detectionThreshold: DETECTION_ALARM_BETA_THRESHOLD,
    }),
    // ── Combined-отчёт: sync-конструктор + report-build async job ──
    node(BETA_MAIN.combinedReport, 'make-combined-report', 'MakeCombinedReport', 3560, -848, asyncCapable),
    node(BETA_MAIN.reportJob, 'start-async-job', 'StartAsyncJob (report-build)', 3880, -848, {
      ...asyncCapable,
      asyncJobConfig: { jobKind: 'report-build' },
    }),
    node(BETA_MAIN.printDetected, 'print', 'Print: детекция', 4176, -848, asyncCapable),
    node(BETA_MAIN.onReportBuilt, 'on-async-resolved', 'OnAsyncResolved (report-build)', 3880, -1064),
    node(BETA_MAIN.publishCombined, 'publish-report', 'PublishReport (combined)', 4176, -1064, asyncCapable),
    node(BETA_MAIN.printPublished, 'print', 'Print: combined-отчёт', 4448, -1064, asyncCapable),
    // ── Наблюдаемость async-выгрузки трека (замена report-from-track MVP) ──
    node(BETA_MAIN.printTrackUploaded, 'print', 'Print: трек выгружен', 1152, -456),
  ];

  const newEdges: ScenarioGraphEdge[] = [
    // exec: trends → ensemble → fusion → branch
    exec(MVP_MAIN_ANCHORS.trendsAnalysis, BETA_MAIN.ensemble),
    exec(BETA_MAIN.ensemble, BETA_MAIN.fusion),
    exec(BETA_MAIN.fusion, BETA_MAIN.branch),
    // detected: combined-отчёт → report-build job → print (not-detected — конец Then)
    exec(BETA_MAIN.branch, BETA_MAIN.combinedReport, 'detected'),
    exec(BETA_MAIN.combinedReport, BETA_MAIN.reportJob),
    exec(BETA_MAIN.reportJob, BETA_MAIN.printDetected),
    // report-build resolve → detached publish → print
    event(BETA_MAIN.onReportBuilt, BETA_MAIN.publishCombined),
    exec(BETA_MAIN.publishCombined, BETA_MAIN.printPublished),
    // track-upload resolve → print (наблюдаемость)
    event(MVP_MAIN_ANCHORS.onTrackUploaded, BETA_MAIN.printTrackUploaded),

    // data: два независимых детектора → fusion (2 входа, B2)
    data(MVP_MAIN_ANCHORS.collectSamples, 'batches', BETA_MAIN.ensemble, 'samples', 'AudioSampleRefList'),
    data(MVP_MAIN_ANCHORS.trendsAnalysis, 'analysis', BETA_MAIN.fusion, 'analysis-1', 'DetectionAnalysisRef'),
    data(BETA_MAIN.ensemble, 'analysis', BETA_MAIN.fusion, 'analysis-2', 'DetectionAnalysisRef'),
    data(BETA_MAIN.fusion, 'fusion', BETA_MAIN.branch, 'fusion', 'DetectionFusion'),
    // data: единый combined-отчёт (reporter + оба анализа + трек)
    data(MVP_MAIN_ANCHORS.getReporter, 'reporter', BETA_MAIN.combinedReport, 'reporter', 'ReporterRef'),
    data(MVP_MAIN_ANCHORS.trendsAnalysis, 'analysis', BETA_MAIN.combinedReport, 'analysis-1', 'DetectionAnalysisRef'),
    data(BETA_MAIN.ensemble, 'analysis', BETA_MAIN.combinedReport, 'analysis-2', 'DetectionAnalysisRef'),
    data(MVP_MAIN_ANCHORS.makeTrack, 'track', BETA_MAIN.combinedReport, 'track', 'TrackRef'),
    // data: async publish
    data(BETA_MAIN.reportJob, 'promise', BETA_MAIN.onReportBuilt, 'promise', 'PromiseRef'),
    data(MVP_MAIN_ANCHORS.journalVarGet, 'value', BETA_MAIN.publishCombined, 'journal', 'JournalRef'),
    data(BETA_MAIN.combinedReport, 'report', BETA_MAIN.publishCombined, 'report', 'ReportRef'),
    // data: наблюдаемость
    data(BETA_MAIN.fusion, 'fusion', BETA_MAIN.printDetected, 'value', 'DetectionFusion'),
    data(BETA_MAIN.combinedReport, 'report', BETA_MAIN.printPublished, 'value', 'ReportRef'),
    data(MVP_MAIN_ANCHORS.makeTrack, 'track', BETA_MAIN.printTrackUploaded, 'value', 'TrackRef'),
  ];

  return {
    entry: main.entry,
    nodes: [...keptNodes, ...newNodes],
    edges: [...keptEdges, ...newEdges],
  };
}

/**
 * Alarm: свежие кадры каждый тик, IsValid-гейты на пустое окно (B8) и потерю
 * цели (B7); fusion в режиме trends-only (вход 2 молчит by design, B6).
 */
function buildAlarmLoop(): MutableSubgraph {
  const nodes: ScenarioGraphNode[] = [
    { ...node(BETA_ALARM.entry, 'event', 'onTick', -1912, -96), system: true, eventVariant: 'loopTick' },
    { ...node(BETA_ALARM.infinity, 'loop-repeat', '∞', 2456, -96), system: true },
    node(BETA_ALARM.stream, 'get-audio-stream', 'GetAudioStream', -1608, -96),
    node(BETA_ALARM.sample, 'get-sample', 'GetSample', -1312, -96),
    node(BETA_ALARM.frame, 'get-fft-frame', 'GetFFTFrame', -1016, -96),
    node(BETA_ALARM.collectFrames, 'collect-fft-frames', 'CollectFftFrames (1 c)', -720, -96, {
      collectorConfig: { windowSec: 1, bufferSize: 2048, queueCapacity: 10, smoothingTimeConstant: 0.75 },
    }),
    node(BETA_ALARM.device, 'device-global', 'GetDevice', -1016, 168),
    node(BETA_ALARM.analyser, 'get-spectral-analyser', 'GetSpectralAnalyser', -720, 168),
    node(BETA_ALARM.flush, 'flush-spectral-analyser', 'FlushSpectralAnalyser', -392, -96),
    node(BETA_ALARM.framesGate, 'is-valid', 'isValid (кадры есть?)', -96, -96),
    node(BETA_ALARM.trendsPolicy, 'make-fft-trends-policy', 'MakeFftTrendsPolicy (alarm)', 200, 168, {
      pure: true,
      // 5×100 мс = 0.5 c — окно под каденс alarm-тика ~400 мс (B6);
      // minConfidence канон 0.55, шаблоны DRONE_TIGHT + контр-классы.
      fftTrendsPolicy: {
        detectionMode: 'auto',
        measurementsCount: 5,
        intervalMs: 100,
        minConfidence: 0.55,
        minRms: 0.02,
        enabledTemplateKeys: ['DRONE_TIGHT', 'WIND', 'QUIET', 'TRAFFIC', 'BIRDS', 'VOICE'],
      },
    }),
    node(BETA_ALARM.trends, 'make-fft-trends-analysis', 'MakeFftTrendsAnalysis (alarm)', 200, -96),
    node(BETA_ALARM.fusion, 'make-detection-fusion', 'MakeDetectionFusion (trends-only)', 536, -96, {
      detectionFusionInputCount: 2,
    }),
    node(BETA_ALARM.proximity, 'make-proximity-trend', 'MakeProximityTrend', 872, -96),
    node(BETA_ALARM.proxGate, 'is-valid', 'isValid (цель на связи?)', 1208, -96),
    node(BETA_ALARM.printTracking, 'print', 'Print: 📡 tracking', 1544, -96),
    node(BETA_ALARM.printLost, 'print', 'Print: 🔕 lost', 1544, 168),
  ];

  const edges: ScenarioGraphEdge[] = [
    // exec-цепочка тика
    exec(BETA_ALARM.entry, BETA_ALARM.stream),
    exec(BETA_ALARM.stream, BETA_ALARM.sample),
    exec(BETA_ALARM.sample, BETA_ALARM.frame),
    exec(BETA_ALARM.frame, BETA_ALARM.collectFrames),
    exec(BETA_ALARM.collectFrames, BETA_ALARM.flush),
    exec(BETA_ALARM.flush, BETA_ALARM.framesGate),
    // гейт пустого окна (B8): кадры есть → анализ; нет → сразу proximity (fan-in)
    exec(BETA_ALARM.framesGate, BETA_ALARM.trends, 'exec-true-out'),
    exec(BETA_ALARM.framesGate, BETA_ALARM.proximity, 'exec-false-out'),
    exec(BETA_ALARM.trends, BETA_ALARM.fusion),
    exec(BETA_ALARM.fusion, BETA_ALARM.proximity),
    // гейт потери цели (B7): true → ∞ (луп живёт); false → lost, ∞ не достигается
    exec(BETA_ALARM.proximity, BETA_ALARM.proxGate),
    exec(BETA_ALARM.proxGate, BETA_ALARM.printTracking, 'exec-true-out'),
    exec(BETA_ALARM.printTracking, BETA_ALARM.infinity),
    exec(BETA_ALARM.proxGate, BETA_ALARM.printLost, 'exec-false-out'),

    // data
    data(BETA_ALARM.stream, 'stream', BETA_ALARM.sample, 'stream', 'AudioStreamRef'),
    data(BETA_ALARM.sample, 'sample', BETA_ALARM.frame, 'sample', 'AudioSampleRef'),
    data(BETA_ALARM.frame, 'frame', BETA_ALARM.collectFrames, 'frame', 'FftFrameRef'),
    data(BETA_ALARM.device, 'device', BETA_ALARM.analyser, 'device', 'DeviceRef'),
    data(BETA_ALARM.analyser, 'analyser', BETA_ALARM.collectFrames, 'analyser', 'SpectralAnalyserRef'),
    data(BETA_ALARM.analyser, 'analyser', BETA_ALARM.flush, 'analyser', 'SpectralAnalyserRef'),
    dataUntyped(BETA_ALARM.flush, 'frames', BETA_ALARM.framesGate, 'value'),
    data(BETA_ALARM.flush, 'frames', BETA_ALARM.trends, 'frames', 'FftFrameRefList'),
    data(BETA_ALARM.analyser, 'analyser', BETA_ALARM.trends, 'analyser', 'SpectralAnalyserRef'),
    data(BETA_ALARM.trendsPolicy, 'policy', BETA_ALARM.trends, 'policy', 'FftTrendsPolicy'),
    // fusion: только trends — вход analysis-2 намеренно молчит (present:false, B6)
    data(BETA_ALARM.trends, 'analysis', BETA_ALARM.fusion, 'analysis-1', 'DetectionAnalysisRef'),
    data(BETA_ALARM.fusion, 'fusion', BETA_ALARM.proximity, 'fusion', 'DetectionFusion'),
    data(BETA_ALARM.proximity, 'proximity', BETA_ALARM.proxGate, 'value', 'ProximityRef'),
    data(BETA_ALARM.proximity, 'proximity', BETA_ALARM.printTracking, 'value', 'ProximityRef'),
    data(BETA_ALARM.proximity, 'proximity', BETA_ALARM.printLost, 'value', 'ProximityRef'),
  ];

  return { entry: BETA_ALARM.entry, nodes, edges };
}

/** Comment groups: MVP-группы без заменённых узлов + группы беты. */
function transformCommentGroups(
  groups: readonly ScenarioCommentGroup[],
): ScenarioCommentGroup[] {
  const removed = new Set<string>(REPLACED_MVP_MAIN_NODE_IDS);
  const kept = groups.filter((group) => !group.nodeIds.some((id) => removed.has(id)));
  const betaGroups: ScenarioCommentGroup[] = [
    {
      id: 'beta-group-fusion',
      branch: 'main',
      title: 'Слияние двух детекторов',
      rect: { x: 2528, y: -840, width: 1000, height: 240 },
      nodeIds: [BETA_MAIN.ensemble, BETA_MAIN.fusion, BETA_MAIN.branch],
      frameColor: { preset: 'accent' },
      description:
        'Trends (DRONE_TIGHT) и DSP-ансамбль — независимые детекторы; fusion = взвешенное среднее сырых confidence (не бинарный OR). Порог тревоги 0.55 = minConfidence trends.',
    },
    {
      id: 'beta-group-combined',
      branch: 'main',
      title: 'Combined-отчёт (async, идемпотентный)',
      rect: { x: 3536, y: -1120, width: 1180, height: 480 },
      nodeIds: [
        BETA_MAIN.combinedReport,
        BETA_MAIN.reportJob,
        BETA_MAIN.printDetected,
        BETA_MAIN.onReportBuilt,
        BETA_MAIN.publishCombined,
        BETA_MAIN.printPublished,
      ],
      frameColor: { preset: 'secondary' },
      description:
        'Единый отчёт (оба анализа + трек) создаётся sync-конструктором и публикуется detached через report-build job — main loop не ждёт. Дубли исключены: host кэширует по хэшу входов.',
    },
    {
      id: 'beta-group-alarm',
      branch: 'alarm',
      title: 'Тревога: дистанция и потеря цели',
      rect: { x: -424, y: -160, width: 2280, height: 424 },
      nodeIds: [
        BETA_ALARM.flush,
        BETA_ALARM.framesGate,
        BETA_ALARM.trends,
        BETA_ALARM.fusion,
        BETA_ALARM.proximity,
        BETA_ALARM.proxGate,
        BETA_ALARM.printTracking,
        BETA_ALARM.printLost,
      ],
      frameColor: { preset: 'warning' },
      description:
        'Каждый тик — свежее окно 0.5 c: trends → combinedScore → ProximityRef. 3 промаха score < 0.3 подряд = lost → ref invalid → false-ветка isValid (выход без нового branch-узла).',
    },
  ];
  return [...kept, ...betaGroups];
}

function buildDetectionAlarmBetaDocument(): DeviceScenarioDocument {
  const base = structuredClone(
    DEFAULT_USERCASE_MVP_MICROPHONE_DOCUMENT,
  ) as DeviceScenarioDocument;

  const document: DeviceScenarioDocument = {
    ...base,
    meta: {
      ...base.meta,
      title: 'UserCase Detection Alarm — Beta (DSP fusion + proximity)',
    },
    scenario: {
      ...base.scenario,
      loops: {
        main: transformMainLoop(base.scenario.loops.main),
        alarm: buildAlarmLoop(),
      },
      commentGroups: transformCommentGroups(base.scenario.commentGroups ?? []),
    },
  };

  return stampCompetitionDocumentMeta(document);
}

let cachedDocument: DeviceScenarioDocument | null = null;

/**
 * Embedded Team Beta detection+alarm UserCase document (fail-fast при поломке
 * деривации: результат прогоняется через parseDeviceScenarioDocument).
 */
export function getDetectionAlarmBetaDocument(): DeviceScenarioDocument {
  if (cachedDocument !== null) {
    return cachedDocument;
  }
  const parsed = parseDeviceScenarioDocument(buildDetectionAlarmBetaDocument());
  if (!parsed.ok) {
    throw new Error(`Beta detection-alarm UserCase document invalid: ${parsed.error.message}`);
  }
  cachedDocument = parsed.value;
  return cachedDocument;
}
