import { describe, expect, it, vi } from 'vitest';
import { createReferenceValue, type ScenarioDetectionResult } from '@membrana/core';

import { executeScenarioBlock } from './block-executor.js';
import { executeStartAsyncJob } from './async-promise-executor.js';
import { dispatchAsyncResolvedBranches } from './async-resolved-dispatch.js';
import { createStubScenarioRuntimeHost, type ScenarioRuntimeHost } from './host.js';
import { AsyncJobStore } from './async-job-store.js';
import { FftTrendAnalysisRuntimeStore } from './analysis-runtime-store.js';
import { EnsembleAnalysisRuntimeStore } from './ensemble-runtime-store.js';
import { DetectionFusionRuntimeStore } from './fusion-runtime-store.js';
import { PromiseRuntimeStore } from './promise-runtime-store.js';
import { ProximityRuntimeStore } from './proximity-runtime-store.js';
import { ReportRuntimeStore } from './report-runtime-store.js';
import { TrackRuntimeStore } from './track-runtime-store.js';
import { ScenarioVariableStore } from './variable-store.js';
import { isReferenceValid } from './reference-validity.js';
import { isDetectionFrontEdge } from './detection-front.js';
import {
  BRANCH_ON_DETECTION_DETECTED_HANDLE,
  BRANCH_ON_DETECTION_NOT_DETECTED_HANDLE,
} from '../graph/branch-on-detection-node.js';
import { IS_VALID_FALSE_HANDLE, IS_VALID_TRUE_HANDLE } from '../graph/palette-node.js';
import {
  DETECTION_ALARM_ALPHA_JOURNAL_VARIABLE_ID,
  getDetectionAlarmAlphaDocument,
} from '../graph/usercase-detection-alarm-alpha.js';

/**
 * Team Alpha · comp-detection-alarm-2026-07-10 (#336), Phase 2β: runtime-smoke
 * по образцу эпик-smoke `combined-report-executor.test.ts`, но на РЕАЛЬНЫХ
 * подграфах документа `usercase-detection-alarm-alpha` (не синтетическом графе):
 * detected-путь (fusion → branch → combined-report → async report-build →
 * publish) + alarm до lost + выход (proximity → is-valid false).
 */

const JOURNAL_HANDLE = 'journal:device-1';

const N = {
  trends: 'alpha-main-trends',
  ensemble: 'alpha-main-ensemble',
  fusion: 'alpha-main-fusion',
  branch: 'alpha-main-branch',
  track: 'alpha-main-track',
  report: 'alpha-main-report',
  jobReport: 'alpha-main-job-report',
  restart: 'alpha-main-restart-rec',
  prox: 'alpha-alarm-prox',
  valid: 'alpha-alarm-valid',
  printNear: 'alpha-alarm-print-near',
  printLost: 'alpha-alarm-print-lost',
} as const;

function createHarness(host: ScenarioRuntimeHost) {
  const document = getDetectionAlarmAlphaDocument();
  const main = document.scenario.loops.main;
  const alarm = document.scenario.loops.alarm;

  const analysisStore = new FftTrendAnalysisRuntimeStore();
  const ensembleStore = new EnsembleAnalysisRuntimeStore();
  const fusionStore = new DetectionFusionRuntimeStore();
  const proximityStore = new ProximityRuntimeStore();
  const reportStore = new ReportRuntimeStore();
  const trackStore = new TrackRuntimeStore();
  const asyncJobStore = new AsyncJobStore();
  const promiseRuntimeStore = new PromiseRuntimeStore();
  const variableStore = new ScenarioVariableStore([
    {
      id: DETECTION_ALARM_ALPHA_JOURNAL_VARIABLE_ID,
      name: 'journal1',
      type: 'JournalRef',
      value: createReferenceValue('JournalRef', JOURNAL_HANDLE),
    },
  ]);

  const resolveContext = {
    scenarioFunctions: document.scenario.functions,
    getFftTrendAnalysisRef: (nodeId: string) => analysisStore.getAnalysisRef(nodeId),
    getEnsembleAnalysisRef: (nodeId: string) => ensembleStore.getAnalysisRef(nodeId),
    getDetectionFusionValue: (nodeId: string) => fusionStore.getFusionValue(nodeId),
    getProximityRef: (nodeId: string) => proximityStore.getProximityRef(nodeId),
    getTrackRef: (nodeId: string) => trackStore.getTrackRef(nodeId),
    getReportRef: (nodeId: string) => reportStore.getReportRef(nodeId),
    getPromiseRef: (nodeId: string) => promiseRuntimeStore.getPromiseRef(nodeId),
    // Реальная цепочка reporter'а документа: journal1 → GetReporter → отчёт.
    getReporterRef: (journalHandle: string) =>
      createReferenceValue('ReporterRef', `reporter:${journalHandle}`),
  };

  const base = {
    host,
    signal: new AbortController().signal,
    lastDetection: null,
    defaultChunkDurationMs: 5000,
    functions: document.scenario.functions,
    variableStore,
    analysisStore,
    ensembleStore,
    fusionStore,
    proximityStore,
    reportStore,
    trackStore,
    asyncJobStore,
    promiseRuntimeStore,
    resolveContext,
  };

  const nodeById = (subgraph: typeof main, id: string) => {
    const node = subgraph.nodes.find((item) => item.id === id);
    if (node === undefined) throw new Error(`node ${id} missing`);
    return node;
  };

  return {
    document,
    main,
    alarm,
    base,
    nodeById,
    stores: {
      analysisStore,
      ensembleStore,
      fusionStore,
      proximityStore,
      reportStore,
      trackStore,
      asyncJobStore,
      promiseRuntimeStore,
      variableStore,
    },
  };
}

/** Окно готово: оба детектора отработали (мок-host уровня analyze*), трек записан. */
function seedDetectionWindow(
  harness: ReturnType<typeof createHarness>,
  trends: ScenarioDetectionResult,
  ensemble: ScenarioDetectionResult,
): void {
  harness.stores.analysisStore.setNodeAnalysis(N.trends, 'trends-1', trends);
  harness.stores.ensembleStore.setNodeAnalysis(N.ensemble, 'ens-1', ensemble);
  harness.stores.trackStore.setNodeTrack(N.track, 't-1');
}

describe('usercase-detection-alarm-alpha runtime-smoke (Phase 2β)', () => {
  it('detected-путь: fusion 0.8 → branch detected → combined-report (2 анализа + трек, reporter из journal1)', async () => {
    const makeCombinedReport = vi.fn(async () => ({
      schema: 'combined-detection/v1',
      reportId: 'combined-alpha-1',
      trackId: 't-1',
      isDetected: true,
      payload: {},
    }));
    const harness = createHarness(createStubScenarioRuntimeHost({ makeCombinedReport }));
    seedDetectionWindow(
      harness,
      { detected: true, confidence: 0.9, isDrone: true },
      { detected: true, confidence: 0.7, isDrone: true },
    );

    // ④ fusion на реальном узле документа → combinedScore = (0.9 + 0.7) / 2.
    await executeScenarioBlock({
      ...harness.base,
      branch: 'main',
      subgraph: harness.main,
      node: harness.nodeById(harness.main, N.fusion),
    });
    expect(harness.stores.fusionStore.getFusionValue(N.fusion)?.combinedScore).toBeCloseTo(0.8, 5);

    // ④ branch → detected (0.8 >= 0.55).
    const branchResult = await executeScenarioBlock({
      ...harness.base,
      branch: 'main',
      subgraph: harness.main,
      node: harness.nodeById(harness.main, N.branch),
    });
    expect(branchResult.execOutHandle).toBe(BRANCH_ON_DETECTION_DETECTED_HANDLE);

    // ⑤ combined-report: reporter пришёл по реальной цепочке journal1 → GetReporter.
    await executeScenarioBlock({
      ...harness.base,
      branch: 'main',
      subgraph: harness.main,
      node: harness.nodeById(harness.main, N.report),
    });
    expect(makeCombinedReport).toHaveBeenCalledTimes(1);
    const [reporterArg, inputArg] = makeCombinedReport.mock.calls[0]!;
    expect(reporterArg.handle).toBe(`reporter:${JOURNAL_HANDLE}`);
    expect(inputArg.analyses.map((analysis: { handle: string }) => analysis.handle)).toEqual([
      'analysis:trends-1',
      'ensemble-analysis:ens-1',
    ]);
    expect(inputArg.trackHandle).toBe('track:t-1');
    expect(isReferenceValid(harness.stores.reportStore.getReportRef(N.report))).toBe(true);
  });

  it('слабое согласие ансамбля → not-detected: рестарт записи, отчёт не строится', async () => {
    const makeCombinedReport = vi.fn(async () => null);
    const harness = createHarness(createStubScenarioRuntimeHost({ makeCombinedReport }));
    seedDetectionWindow(
      harness,
      { detected: true, confidence: 0.9, isDrone: true },
      { detected: false, confidence: 0.1, isDrone: false },
    );

    await executeScenarioBlock({
      ...harness.base,
      branch: 'main',
      subgraph: harness.main,
      node: harness.nodeById(harness.main, N.fusion),
    });
    expect(harness.stores.fusionStore.getFusionValue(N.fusion)?.combinedScore).toBeCloseTo(0.5, 5);

    const branchResult = await executeScenarioBlock({
      ...harness.base,
      branch: 'main',
      subgraph: harness.main,
      node: harness.nodeById(harness.main, N.branch),
    });
    expect(branchResult.execOutHandle).toBe(BRANCH_ON_DETECTION_NOT_DETECTED_HANDLE);

    // not-detected ведёт на рестарт записи, MakeCombinedReport не исполнялся.
    const notDetectedEdge = harness.main.edges.find(
      (edge) =>
        edge.kind === 'exec' &&
        edge.source === N.branch &&
        edge.sourceHandle === BRANCH_ON_DETECTION_NOT_DETECTED_HANDLE,
    );
    expect(notDetectedEdge?.target).toBe(N.restart);
    expect(makeCombinedReport).not.toHaveBeenCalled();
  });

  it('async: report-build job pending не блокирует магистраль; resolve → publish через OnAsyncResolved', async () => {
    const publishReport = vi.fn(async () => true);
    const makeCombinedReport = vi.fn(async () => ({
      schema: 'combined-detection/v1',
      reportId: 'combined-alpha-2',
      trackId: 't-1',
      isDetected: true,
      payload: {},
    }));
    const harness = createHarness(
      createStubScenarioRuntimeHost({ makeCombinedReport, publishReport }),
    );
    seedDetectionWindow(
      harness,
      { detected: true, confidence: 0.9, isDrone: true },
      { detected: true, confidence: 0.7, isDrone: true },
    );
    const signal = harness.base.signal;

    // Отчёт создан синхронно на detected-пути.
    await executeScenarioBlock({
      ...harness.base,
      branch: 'main',
      subgraph: harness.main,
      node: harness.nodeById(harness.main, N.report),
    });

    // then-0 latent Sequence → StartAsyncJob(report-build): job регистрируется…
    await executeStartAsyncJob({
      host: harness.base.host,
      signal,
      branch: 'main',
      subgraph: harness.main,
      node: harness.nodeById(harness.main, N.jobReport),
      runId: 'run-alpha-smoke',
      variableStore: harness.stores.variableStore,
      resolveContext: harness.base.resolveContext,
      asyncJobStore: harness.stores.asyncJobStore,
      promiseRuntimeStore: harness.stores.promiseRuntimeStore,
    });

    // …и остаётся pending: exec вернулся, публикации ещё нет — main loop не ждёт.
    const pending = harness.stores.asyncJobStore.listPending();
    expect(pending).toHaveLength(1);
    expect(pending[0]?.kind).toBe('report-build');
    expect(publishReport).not.toHaveBeenCalled();

    // Host завершил упаковку → OnAsyncResolved ⇒ PublishReport (event-ребро документа).
    const record = harness.stores.asyncJobStore.resolve(pending[0]!.promiseId);
    expect(record).not.toBeNull();
    await dispatchAsyncResolvedBranches({
      document: harness.document,
      record: record!,
      host: harness.base.host,
      signal,
      variableStore: harness.stores.variableStore,
      promiseRuntimeStore: harness.stores.promiseRuntimeStore,
      execOptions: (branch) => ({
        branch,
        variableStore: harness.stores.variableStore,
        reportStore: harness.stores.reportStore,
        functions: harness.document.scenario.functions,
        resolveContext: harness.base.resolveContext,
        asyncJobStore: harness.stores.asyncJobStore,
        promiseRuntimeStore: harness.stores.promiseRuntimeStore,
        runId: 'run-alpha-smoke',
      }),
    });

    await vi.waitFor(() => {
      expect(publishReport).toHaveBeenCalledTimes(1);
    });
    const [journalArg, payloadArg] = publishReport.mock.calls[0]!;
    expect(journalArg.handle).toBe(JOURNAL_HANDLE);
    expect(payloadArg.reportId).toBe('combined-alpha-2');
    // Идемпотентность A4: одна детекция → один отчёт → одна публикация.
    expect(makeCombinedReport).toHaveBeenCalledTimes(1);
  });

  it('alarm: proximity approaching → valid → «Цель рядом» → ∞; score-гейт берёт fusion из main (A3)', async () => {
    const evaluateProximityTrend = vi.fn(async () => ({
      trend: 'approaching' as const,
      ready: true,
      deltaRatio: 0.3,
    }));
    const harness = createHarness(createStubScenarioRuntimeHost({ evaluateProximityTrend }));
    seedDetectionWindow(
      harness,
      { detected: true, confidence: 0.9, isDrone: true },
      { detected: true, confidence: 0.7, isDrone: true },
    );

    // fusion исполнен в MAIN (детекция состоялась)…
    await executeScenarioBlock({
      ...harness.base,
      branch: 'main',
      subgraph: harness.main,
      node: harness.nodeById(harness.main, N.fusion),
    });

    // …а в ALARM mirror-узел (тот же id, dataflow-only) отдаёт его combinedScore хосту.
    await executeScenarioBlock({
      ...harness.base,
      branch: 'alarm',
      subgraph: harness.alarm,
      node: harness.nodeById(harness.alarm, N.prox),
    });
    expect(evaluateProximityTrend).toHaveBeenCalledWith(N.prox, { combinedScore: 0.8 });
    expect(isReferenceValid(harness.stores.proximityStore.getProximityRef(N.prox))).toBe(true);

    // is-valid → true-ветка → Print «Цель рядом» → loop-repeat (alarm живёт).
    const validResult = await executeScenarioBlock({
      ...harness.base,
      branch: 'alarm',
      subgraph: harness.alarm,
      node: harness.nodeById(harness.alarm, N.valid),
    });
    expect(validResult.execOutHandle).toBe(IS_VALID_TRUE_HANDLE);
    const trueEdge = harness.alarm.edges.find(
      (edge) =>
        edge.kind === 'exec' && edge.source === N.valid && edge.sourceHandle === IS_VALID_TRUE_HANDLE,
    );
    expect(trueEdge?.target).toBe(N.printNear);
  });

  it('alarm: lost → ProximityRef invalid → is-valid false = выход (false-ветка не ведёт в ∞)', async () => {
    const harness = createHarness(
      createStubScenarioRuntimeHost({
        evaluateProximityTrend: async () => ({ trend: 'lost' as const, ready: true, deltaRatio: 0 }),
      }),
    );
    harness.stores.fusionStore.setNodeFusion(N.fusion, {
      kind: 'DetectionFusion',
      combinedScore: 0.1,
      agreement: 1,
      presentCount: 2,
    });

    await executeScenarioBlock({
      ...harness.base,
      branch: 'alarm',
      subgraph: harness.alarm,
      node: harness.nodeById(harness.alarm, N.prox),
    });
    expect(isReferenceValid(harness.stores.proximityStore.getProximityRef(N.prox))).toBe(false);

    const validResult = await executeScenarioBlock({
      ...harness.base,
      branch: 'alarm',
      subgraph: harness.alarm,
      node: harness.nodeById(harness.alarm, N.valid),
    });
    expect(validResult.execOutHandle).toBe(IS_VALID_FALSE_HANDLE);

    // Выход: false-ветка обрывается на Print «Дистанция потеряна», ∞ недостижим.
    const falseEdge = harness.alarm.edges.find(
      (edge) =>
        edge.kind === 'exec' && edge.source === N.valid && edge.sourceHandle === IS_VALID_FALSE_HANDLE,
    );
    expect(falseEdge?.target).toBe(N.printLost);
    expect(
      harness.alarm.edges.some((edge) => edge.kind === 'exec' && edge.source === N.printLost),
    ).toBe(false);
  });

  it('detection front: trends-детекция DRONE_TIGHT (из policy документа) поднимает вход в alarm', () => {
    const document = getDetectionAlarmAlphaDocument();
    const trendsPolicyNode = document.scenario.loops.main.nodes.find(
      (node) => node.nodeKind === 'make-fft-trends-policy',
    );
    // Канал входа в alarm — lastDetection от make-fft-trends-analysis: policy
    // документа обязана включать DRONE-шаблон, иначе front не поднимется.
    expect(trendsPolicyNode?.fftTrendsPolicy?.enabledTemplateKeys).toContain('DRONE_TIGHT');

    const detection: ScenarioDetectionResult = {
      detected: true,
      confidence: 0.9,
      templateId: 'DRONE_TIGHT',
    };
    expect(isDetectionFrontEdge(null, detection)).toBe(true);
    // Погасший front (тишина) не перезапускает alarm.
    expect(isDetectionFrontEdge(detection, null)).toBe(false);
  });
});
