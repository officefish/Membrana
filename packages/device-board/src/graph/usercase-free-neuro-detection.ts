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
 * Block `neuro-detection` · Cowork Sprint `cowork-free-fragment-usercases` (#487) —
 * **FREE · Нейро-детекция (yamnet)**: одиночная НЕЙРО-модальность, полученная
 * декомпозицией работающего combined-графа.
 *
 * Из combined берётся ветвь `MakeEnsembleAnalysis` (в combined именно ensemble
 * несёт yamnet) — БЕЗ trends, БЕЗ fusion, БЕЗ branch-on-detection, БЕЗ alarm-loop.
 * Новых узлов палитры не вводит: только виды из `SCENARIO_NODE_KINDS`.
 *
 * Приём — ДЕРИВАЦИЯ bundled MVP v2.0-async (как `usercase-detection-alarm-beta`):
 * bootstrap записи, журнал onConnect, цепочка записи/трека, async track-upload,
 * teardown и функции fn-1/fn-3 берутся из канона байт-в-байт. Деривация — не
 * стилистика, а следствие L36: канонические id точек входа наследуются, вручную
 * собранная обвязка (Alpha) не стартовала вовсе.
 *
 * Main: onTick → fn-3 → GetSample → CollectSamples → IsRecordingWindowFull →
 * Sequence: then-0 StopRecording · then-1 MakeTrack → track-upload job ·
 * **then-2 MakeEnsembleAnalysis → isValid → отчёт | «модель недоступна»** ·
 * then-3 рестарт записи.
 *
 * Alarm: заглушка MVP (`alarm-on-tick → alarm-infinity`) — лупа нет by design,
 * но узел точки входа обязан существовать (L36).
 *
 * Обоснование решений (N1–N5) — в
 * docs/cowork-sprint/cowork-free-fragment-usercases/team-neuro-detection/CONCEPT.md.
 */

/** Id UserCase каталога (заготовка `free-tier-user-case-entries.ts`). */
export const FREE_NEURO_DETECTION_USER_CASE_ID = 'usercase-free-neuro-detection' as const;

/**
 * Узлы MVP main, снимаемые деривацией.
 *
 * Две группы:
 * 1. report-секция MVP — заменяется нейро-отчётом (тот же набор, что у Beta);
 * 2. FFT-машинерия — существует только чтобы кормить `trends`; нейро-канал
 *    питается сэмплами (`AudioSampleRefList`) и кадры не читает (CONCEPT §4).
 */
export const REPLACED_MVP_MAIN_NODE_IDS = [
  // report-секция MVP
  'node-make-report-from-analysis-mqma356z-34',
  'node-publish-report-mqma49xv-35',
  'node-make-report-from-track-mqs54kgw-177',
  'board-mqs5v7w1-9c8xw62e',
  // trends-ветвь (спектральная модальность — не моя)
  'node-make-fft-trends-analysis-mqs6vdme-174',
  'node-make-fft-trends-policy-mqs6wrpr-175',
  // FFT-машинерия, кормившая trends
  'node-flush-spectral-analyser-mqs6tcs6-172',
  'node-get-spectral-analyser-mqs6uey7-173',
  'node-get-spectral-analyser-mqs3gj4q-165',
  'node-collect-fft-frames-mqs3hhnu-167',
  'node-get-fft-frame-mqs3h75e-166',
] as const;

/** Опорные узлы MVP main, на которые вешается нейро-цепочка. */
export const MVP_MAIN_ANCHORS = {
  getSample: 'node-get-sample-mqs2mt0a-165',
  collectSamples: 'node-collect-samples-mqs2lopv-164',
  sequenceGate: 'node-sequence-gate-v20-async',
  makeTrack: 'node-make-track-mqmcipn5-28',
  getReporter: 'node-get-reporter-mqs5wkzi-169',
  journalVarGet: 'node-variable-get-var-JournalRef-mqm9dl4a-6-mqs6jso7-15',
  onTrackUploaded: 'node-on-async-resolved-v20',
} as const;

/** Id новых узлов блока (main). */
export const NEURO_MAIN = {
  ensemble: 'neuro-main-ensemble',
  modelGate: 'neuro-main-model-gate',
  printUnavailable: 'neuro-main-print-unavailable',
  report: 'neuro-main-report',
  reportJob: 'neuro-main-report-job',
  onReportBuilt: 'neuro-main-on-report-built',
  publishNeuro: 'neuro-main-publish-neuro',
  printDetected: 'neuro-main-print-detected',
  printPublished: 'neuro-main-print-published',
  printTrackUploaded: 'neuro-main-print-track-uploaded',
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
 * Нетипизированное data-ребро для гейта доступности модели (`is-valid`, пин
 * `value` принимает любой тип): пока модель не ответила, ensemble молча
 * скипается и оставляет ref невалидным (L28) с целевым kind (L26) —
 * типизированное ребро бросило бы type-mismatch вместо честного false.
 * Тип проверяет типизированное ребро потребителя (`MakeCombinedReport`),
 * которое исполняется только на true-ветке гейта (CONCEPT N2).
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
 * Main: цепочка добычи сэмплов и записи сохранена из MVP; снимаются FFT-машинерия
 * и report-секция, `then-2` Sequence перевешивается на нейро-цепочку.
 */
function transformMainLoop(main: ScenarioSubgraph): MutableSubgraph {
  const removed = new Set<string>(REPLACED_MVP_MAIN_NODE_IDS);

  const keptNodes = main.nodes.filter((n) => !removed.has(n.id));
  const keptEdges = main.edges.filter((e) => !removed.has(e.source) && !removed.has(e.target));

  const asyncCapable = { supportsAsync: true } as const;

  const newNodes: ScenarioGraphNode[] = [
    // ── Нейро-канал: окно сэмплов → yamnet на хосте ──
    node(NEURO_MAIN.ensemble, 'make-ensemble-analysis', 'MakeEnsembleAnalysis (нейро)', 1672, -760, asyncCapable),
    // ── Честный fallback: модель ответила? (N2) ──
    node(NEURO_MAIN.modelGate, 'is-valid', 'isValid (нейро-модель ответила?)', 2008, -760),
    node(NEURO_MAIN.printUnavailable, 'print', 'Print: ⚠️ нейро-модель недоступна', 2344, -616),
    // ── Нейро-отчёт: sync-конструктор + report-build async job ──
    node(NEURO_MAIN.report, 'make-combined-report', 'MakeCombinedReport (нейро-отчёт)', 2344, -880, asyncCapable),
    node(NEURO_MAIN.reportJob, 'start-async-job', 'StartAsyncJob (report-build)', 2680, -880, {
      ...asyncCapable,
      asyncJobConfig: { jobKind: 'report-build' },
    }),
    node(NEURO_MAIN.printDetected, 'print', 'Print: нейро-детекция', 3016, -880, asyncCapable),
    node(NEURO_MAIN.onReportBuilt, 'on-async-resolved', 'OnAsyncResolved (report-build)', 2680, -1120),
    node(NEURO_MAIN.publishNeuro, 'publish-report', 'PublishReport (нейро)', 3016, -1120, asyncCapable),
    node(NEURO_MAIN.printPublished, 'print', 'Print: нейро-отчёт', 3352, -1120, asyncCapable),
    // ── Наблюдаемость async-выгрузки трека (замена report-from-track MVP) ──
    node(NEURO_MAIN.printTrackUploaded, 'print', 'Print: трек выгружен', 1152, -456),
  ];

  const newEdges: ScenarioGraphEdge[] = [
    // exec: перепайка добычи после снятия FFT — GetSample → CollectSamples напрямую
    exec(MVP_MAIN_ANCHORS.getSample, MVP_MAIN_ANCHORS.collectSamples),
    // exec: then-2 (бывшая trends-ветвь) → нейро-канал
    exec(MVP_MAIN_ANCHORS.sequenceGate, NEURO_MAIN.ensemble, 'then-2'),
    exec(NEURO_MAIN.ensemble, NEURO_MAIN.modelGate),
    // гейт доступности модели: true → отчёт; false → видимая метка, публикации нет
    exec(NEURO_MAIN.modelGate, NEURO_MAIN.report, 'exec-true-out'),
    exec(NEURO_MAIN.modelGate, NEURO_MAIN.printUnavailable, 'exec-false-out'),
    exec(NEURO_MAIN.report, NEURO_MAIN.reportJob),
    exec(NEURO_MAIN.reportJob, NEURO_MAIN.printDetected),
    // report-build resolve → detached publish → print (main loop не ждёт, L25)
    event(NEURO_MAIN.onReportBuilt, NEURO_MAIN.publishNeuro),
    exec(NEURO_MAIN.publishNeuro, NEURO_MAIN.printPublished),
    // track-upload resolve → print (наблюдаемость)
    event(MVP_MAIN_ANCHORS.onTrackUploaded, NEURO_MAIN.printTrackUploaded),

    // data: единственный детектор — нейро, вход от окна сэмплов
    data(MVP_MAIN_ANCHORS.collectSamples, 'batches', NEURO_MAIN.ensemble, 'samples', 'AudioSampleRefList'),
    // гейт модели — нетипизированное ребро (N2)
    dataUntyped(NEURO_MAIN.ensemble, 'analysis', NEURO_MAIN.modelGate, 'value'),
    // data: нейро-отчёт (reporter + нейро-анализ + трек); analysis-2 молчит by design (N1)
    data(MVP_MAIN_ANCHORS.getReporter, 'reporter', NEURO_MAIN.report, 'reporter', 'ReporterRef'),
    data(NEURO_MAIN.ensemble, 'analysis', NEURO_MAIN.report, 'analysis-1', 'DetectionAnalysisRef'),
    data(MVP_MAIN_ANCHORS.makeTrack, 'track', NEURO_MAIN.report, 'track', 'TrackRef'),
    // data: async publish
    data(NEURO_MAIN.reportJob, 'promise', NEURO_MAIN.onReportBuilt, 'promise', 'PromiseRef'),
    data(MVP_MAIN_ANCHORS.journalVarGet, 'value', NEURO_MAIN.publishNeuro, 'journal', 'JournalRef'),
    data(NEURO_MAIN.report, 'report', NEURO_MAIN.publishNeuro, 'report', 'ReportRef'),
    // data: наблюдаемость
    data(NEURO_MAIN.ensemble, 'analysis', NEURO_MAIN.printDetected, 'value', 'DetectionAnalysisRef'),
    data(NEURO_MAIN.report, 'report', NEURO_MAIN.printPublished, 'value', 'ReportRef'),
    data(MVP_MAIN_ANCHORS.makeTrack, 'track', NEURO_MAIN.printTrackUploaded, 'value', 'TrackRef'),
  ];

  return {
    entry: main.entry,
    nodes: [...keptNodes, ...newNodes],
    edges: [...keptEdges, ...newEdges],
  };
}

/** Comment groups: MVP-группы без снятых узлов + группы нейро-блока. */
function transformCommentGroups(
  groups: readonly ScenarioCommentGroup[],
): ScenarioCommentGroup[] {
  const removed = new Set<string>(REPLACED_MVP_MAIN_NODE_IDS);
  const kept = groups.filter((group) => !group.nodeIds.some((id) => removed.has(id)));
  const neuroGroups: ScenarioCommentGroup[] = [
    {
      id: 'neuro-group-detector',
      branch: 'main',
      title: 'Нейро-детектор (yamnet)',
      rect: { x: 1648, y: -840, width: 700, height: 240 },
      nodeIds: [NEURO_MAIN.ensemble, NEURO_MAIN.modelGate, NEURO_MAIN.printUnavailable],
      frameColor: { preset: 'accent' },
      description:
        'Одиночная нейро-модальность: окно сэмплов → yamnet на хосте → EnsembleAnalysisRef. ' +
        'Спектральных трендов и слияния здесь нет by design — это вклад ОДНОГО детектора. ' +
        'Модель не ответила → ref невалиден → false-ветка isValid: видимая метка вместо ' +
        'молчаливой деградации, отчёт НЕ публикуется.',
    },
    {
      id: 'neuro-group-report',
      branch: 'main',
      title: 'Нейро-отчёт (async, идемпотентный)',
      rect: { x: 2320, y: -1160, width: 1180, height: 340 },
      nodeIds: [
        NEURO_MAIN.report,
        NEURO_MAIN.reportJob,
        NEURO_MAIN.printDetected,
        NEURO_MAIN.onReportBuilt,
        NEURO_MAIN.publishNeuro,
        NEURO_MAIN.printPublished,
      ],
      frameColor: { preset: 'secondary' },
      description:
        'Отчёт (нейро-анализ + трек) создаётся sync-конструктором и публикуется detached ' +
        'через report-build job — main loop не ждёт. Вход analysis-2 молчит by design: ' +
        'модальность одна. Дубли исключены: host кэширует по хэшу входов.',
    },
  ];
  return [...kept, ...neuroGroups];
}

function buildFreeNeuroDetectionDocument(): DeviceScenarioDocument {
  const base = structuredClone(
    DEFAULT_USERCASE_MVP_MICROPHONE_DOCUMENT,
  ) as DeviceScenarioDocument;

  const document: DeviceScenarioDocument = {
    ...base,
    meta: {
      ...base.meta,
      title: 'FREE · Нейро-детекция (yamnet)',
    },
    scenario: {
      ...base.scenario,
      loops: {
        // alarm — заглушка MVP байт-в-байт: лупа нет by design, но точка входа
        // `alarm-on-tick` обязана существовать (L36).
        ...base.scenario.loops,
        main: transformMainLoop(base.scenario.loops.main),
      },
      commentGroups: transformCommentGroups(base.scenario.commentGroups ?? []),
    },
  };

  return stampCompetitionDocumentMeta(document);
}

let cachedDocument: DeviceScenarioDocument | null = null;

/**
 * Embedded FREE нейро-детекция UserCase document (fail-fast при поломке
 * деривации: результат прогоняется через parseDeviceScenarioDocument).
 */
export function getFreeNeuroDetectionDocument(): DeviceScenarioDocument {
  if (cachedDocument !== null) {
    return cachedDocument;
  }
  const parsed = parseDeviceScenarioDocument(buildFreeNeuroDetectionDocument());
  if (!parsed.ok) {
    throw new Error(`FREE neuro-detection UserCase document invalid: ${parsed.error.message}`);
  }
  cachedDocument = parsed.value;
  return cachedDocument;
}
