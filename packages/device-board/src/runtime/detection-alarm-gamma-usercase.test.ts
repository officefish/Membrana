import { describe, expect, it, vi } from 'vitest';
import type { ScenarioGraphNode, ScenarioSubgraph } from '@membrana/core';

import { executeScenarioBlock } from './block-executor.js';
import { createStubScenarioRuntimeHost } from './host.js';
import { FftTrendAnalysisRuntimeStore } from './analysis-runtime-store.js';
import { EnsembleAnalysisRuntimeStore } from './ensemble-runtime-store.js';
import { DetectionFusionRuntimeStore } from './fusion-runtime-store.js';
import { ProximityRuntimeStore } from './proximity-runtime-store.js';
import { ReportRuntimeStore } from './report-runtime-store.js';
import { TrackRuntimeStore } from './track-runtime-store.js';
import { ScenarioVariableStore } from './variable-store.js';
import { isReferenceValid } from './reference-validity.js';
import {
  BRANCH_ON_DETECTION_DETECTED_HANDLE,
  BRANCH_ON_DETECTION_NOT_DETECTED_HANDLE,
} from '../graph/branch-on-detection-node.js';
import { IS_VALID_FALSE_HANDLE, IS_VALID_TRUE_HANDLE } from '../graph/palette-node.js';
import {
  DETECTION_ALARM_GAMMA_JOURNAL_VARIABLE_ID,
  DETECTION_ALARM_GAMMA_NODE_IDS as IDS,
  getDetectionAlarmGammaDocument,
} from '../graph/default-usercase-detection-alarm-gamma.js';

/**
 * Team Gamma · comp-detection-alarm-2026-07-10 — runtime-smoke документа
 * (Phase 2β, по образцу эпик-smoke #323 в combined-report-executor.test.ts,
 * но на узлах РЕАЛЬНЫХ подграфов UserCase): detected-путь + alarm до lost + выход.
 */

const doc = getDetectionAlarmGammaDocument();
const main = doc.scenario.loops.main;
const alarm = doc.scenario.loops.alarm;

function nodeById(subgraph: ScenarioSubgraph, id: string): ScenarioGraphNode {
  const node = subgraph.nodes.find((item) => item.id === id);
  if (node === undefined) {
    throw new Error(`node ${id} missing in subgraph`);
  }
  return node;
}

function journalRefValue() {
  return { kind: 'JournalRef' as const, handle: 'journal:gamma-1', valid: true };
}

function reporterRefValue(journalHandle: string) {
  return { kind: 'ReporterRef' as const, handle: `reporter:${journalHandle}`, valid: true };
}

function createSmokeContext() {
  const analysisStore = new FftTrendAnalysisRuntimeStore();
  const ensembleStore = new EnsembleAnalysisRuntimeStore();
  const fusionStore = new DetectionFusionRuntimeStore();
  const proximityStore = new ProximityRuntimeStore();
  const reportStore = new ReportRuntimeStore();
  const trackStore = new TrackRuntimeStore();
  const variableStore = new ScenarioVariableStore([
    {
      id: DETECTION_ALARM_GAMMA_JOURNAL_VARIABLE_ID,
      name: 'journal1',
      type: 'JournalRef',
      value: journalRefValue(),
    },
  ]);
  const resolveContext = {
    getFftTrendAnalysisRef: (nodeId: string) => analysisStore.getAnalysisRef(nodeId),
    getEnsembleAnalysisRef: (nodeId: string) => ensembleStore.getAnalysisRef(nodeId),
    getDetectionFusionValue: (nodeId: string) => fusionStore.getFusionValue(nodeId),
    getProximityRef: (nodeId: string) => proximityStore.getProximityRef(nodeId),
    getTrackRef: (nodeId: string) => trackStore.getTrackRef(nodeId),
    getReportRef: (nodeId: string) => reportStore.getReportRef(nodeId),
    getReporterRef: (journalHandle: string) => reporterRefValue(journalHandle),
  };
  const base = {
    signal: new AbortController().signal,
    lastDetection: null,
    defaultChunkDurationMs: 5000,
    functions: [],
    variableStore,
    analysisStore,
    ensembleStore,
    fusionStore,
    proximityStore,
    reportStore,
    trackStore,
    resolveContext,
  };
  return { base, analysisStore, ensembleStore, fusionStore, proximityStore, reportStore, trackStore };
}

describe('runtime-smoke usercase-detection-alarm-gamma (Phase 2β)', () => {
  it('detected-путь: fusion 0.8 → branch detected → combined-report с обоими анализами и треком → publish', async () => {
    const ctx = createSmokeContext();
    const publishReport = vi.fn(async () => true);
    const host = createStubScenarioRuntimeHost({ publishReport });

    // 1) Оба детектора отработали окно (согласие high) + трек записан.
    ctx.analysisStore.setNodeAnalysis(IDS.trends, 'trends-1', {
      detected: true,
      confidence: 0.9,
      isDrone: true,
    });
    ctx.ensembleStore.setNodeAnalysis(IDS.ensemble, 'ens-1', {
      detected: true,
      confidence: 0.7,
      isDrone: true,
    });
    ctx.trackStore.setNodeTrack(IDS.makeTrack, 't-1');

    // 2) Fusion → combinedScore 0.8 (взвешенное среднее 0.9/0.7).
    await executeScenarioBlock({
      ...ctx.base,
      host,
      branch: 'main',
      subgraph: main,
      node: nodeById(main, IDS.fusion),
    });
    expect(ctx.fusionStore.getFusionValue(IDS.fusion)?.combinedScore).toBeCloseTo(0.8, 5);

    // 3) Branch → detected (порог 0.5 на узле документа).
    const branchResult = await executeScenarioBlock({
      ...ctx.base,
      host,
      branch: 'main',
      subgraph: main,
      node: nodeById(main, IDS.branch),
    });
    expect(branchResult.execOutHandle).toBe(BRANCH_ON_DETECTION_DETECTED_HANDLE);

    // 4) Combined-report (детачед-хвост): reporter через journal1 → get-reporter,
    //    оба анализа + трек уходят хосту, ReportRef валиден.
    const makeCombinedReport = vi.fn(async () => ({
      schema: 'combined-detection/v1',
      reportId: 'combined-gamma-1',
      trackId: 't-1',
      isDetected: true,
      payload: {},
    }));
    const hostCombined = createStubScenarioRuntimeHost({ makeCombinedReport, publishReport });
    await executeScenarioBlock({
      ...ctx.base,
      host: hostCombined,
      branch: 'main',
      subgraph: main,
      node: nodeById(main, IDS.combinedReport),
    });
    expect(makeCombinedReport).toHaveBeenCalledTimes(1);
    const [reporterArg, inputArg] = makeCombinedReport.mock.calls[0]!;
    expect(reporterArg.handle).toBe('reporter:journal:gamma-1');
    expect(inputArg.analyses.map((a: { handle: string }) => a.handle)).toEqual([
      'analysis:trends-1',
      'ensemble-analysis:ens-1',
    ]);
    expect(inputArg.trackHandle).toBe('track:t-1');
    expect(ctx.reportStore.getReportRef(IDS.combinedReport).valid).toBe(true);

    // 5) Publish: журнал из journal1, payload combined-отчёта уходит хосту.
    await executeScenarioBlock({
      ...ctx.base,
      host: hostCombined,
      branch: 'main',
      subgraph: main,
      node: nodeById(main, IDS.publishReport),
    });
    expect(publishReport).toHaveBeenCalledTimes(1);
    const [journalArg, payloadArg] = publishReport.mock.calls[0]!;
    expect(journalArg.handle).toBe('journal:gamma-1');
    expect(payloadArg.reportId).toBe('combined-gamma-1');
  });

  it('молчащие детекторы → branch уходит в not-detected (тревога не стартует от пустого fusion)', async () => {
    const ctx = createSmokeContext();
    const host = createStubScenarioRuntimeHost({});
    await executeScenarioBlock({
      ...ctx.base,
      host,
      branch: 'main',
      subgraph: main,
      node: nodeById(main, IDS.fusion),
    });
    const branchResult = await executeScenarioBlock({
      ...ctx.base,
      host,
      branch: 'main',
      subgraph: main,
      node: nodeById(main, IDS.branch),
    });
    expect(branchResult.execOutHandle).toBe(BRANCH_ON_DETECTION_NOT_DETECTED_HANDLE);
  });

  it('alarm: цель приближается → ProximityRef валиден → is-valid уводит в loop-repeat (тревога живёт)', async () => {
    const ctx = createSmokeContext();
    const hostAlive = createStubScenarioRuntimeHost({
      evaluateProximityTrend: async () => ({ trend: 'approaching', ready: true, deltaRatio: 0.3 }),
    });
    await executeScenarioBlock({
      ...ctx.base,
      host: hostAlive,
      branch: 'alarm',
      subgraph: alarm,
      node: nodeById(alarm, IDS.proximity),
    });
    expect(isReferenceValid(ctx.proximityStore.getProximityRef(IDS.proximity))).toBe(true);

    const isValidResult = await executeScenarioBlock({
      ...ctx.base,
      host: hostAlive,
      branch: 'alarm',
      subgraph: alarm,
      node: nodeById(alarm, IDS.alarmIsValid),
    });
    expect(isValidResult.execOutHandle).toBe(IS_VALID_TRUE_HANDLE);
    // true-ветка документа ведёт в системный loop-repeat.
    const trueEdge = alarm.edges.find(
      (edge) =>
        edge.kind === 'exec' &&
        edge.source === IDS.alarmIsValid &&
        edge.sourceHandle === IS_VALID_TRUE_HANDLE,
    );
    expect(trueEdge?.target).toBe(IDS.alarmLoopRepeat);
    expect(nodeById(alarm, IDS.alarmLoopRepeat).nodeKind).toBe('loop-repeat');
  });

  it('alarm: дистанция потеряна (lost) → ProximityRef invalid → false-ветка = выход, не loop-repeat', async () => {
    const ctx = createSmokeContext();
    const hostLost = createStubScenarioRuntimeHost({
      evaluateProximityTrend: async () => ({ trend: 'lost', ready: true, deltaRatio: 0 }),
    });
    await executeScenarioBlock({
      ...ctx.base,
      host: hostLost,
      branch: 'alarm',
      subgraph: alarm,
      node: nodeById(alarm, IDS.proximity),
    });
    expect(isReferenceValid(ctx.proximityStore.getProximityRef(IDS.proximity))).toBe(false);

    const isValidResult = await executeScenarioBlock({
      ...ctx.base,
      host: hostLost,
      branch: 'alarm',
      subgraph: alarm,
      node: nodeById(alarm, IDS.alarmIsValid),
    });
    expect(isValidResult.execOutHandle).toBe(IS_VALID_FALSE_HANDLE);
    // false-ветка ведёт в print «дистанция потеряна» и из неё НЕТ пути назад в ∞.
    const falseEdge = alarm.edges.find(
      (edge) =>
        edge.kind === 'exec' &&
        edge.source === IDS.alarmIsValid &&
        edge.sourceHandle === IS_VALID_FALSE_HANDLE,
    );
    expect(falseEdge?.target).toBe(IDS.printProximityLost);
    expect(
      alarm.edges.some(
        (edge) => edge.kind === 'exec' && edge.source === IDS.printProximityLost,
      ),
    ).toBe(false);
  });

  it('идемпотентность повторов: второй exec combined-report с теми же входами не плодит новый отчёт (stub-host хэш входов)', async () => {
    const ctx = createSmokeContext();
    const host = createStubScenarioRuntimeHost({});
    ctx.analysisStore.setNodeAnalysis(IDS.trends, 'trends-1', {
      detected: true,
      confidence: 0.9,
      isDrone: true,
    });
    ctx.ensembleStore.setNodeAnalysis(IDS.ensemble, 'ens-1', {
      detected: true,
      confidence: 0.7,
      isDrone: true,
    });
    ctx.trackStore.setNodeTrack(IDS.makeTrack, 't-1');

    const run = () =>
      executeScenarioBlock({
        ...ctx.base,
        host,
        branch: 'main',
        subgraph: main,
        node: nodeById(main, IDS.combinedReport),
      });
    await run();
    const firstRef = ctx.reportStore.getReportRef(IDS.combinedReport);
    await run();
    const secondRef = ctx.reportStore.getReportRef(IDS.combinedReport);
    // Stub-host строит reportId детерминированно от входов → повтор не меняет отчёт.
    expect(firstRef.valid).toBe(true);
    expect(secondRef.handle).toBe(firstRef.handle);
  });

  it('print детекции: fusion value документа печатается (наблюдаемость шага ③)', async () => {
    const ctx = createSmokeContext();
    const printed: string[] = [];
    const host = createStubScenarioRuntimeHost({ printLine: (line: string) => printed.push(line) });
    ctx.analysisStore.setNodeAnalysis(IDS.trends, 'trends-1', { detected: true, confidence: 0.9, isDrone: true });
    ctx.ensembleStore.setNodeAnalysis(IDS.ensemble, 'ens-1', { detected: true, confidence: 0.7, isDrone: true });
    await executeScenarioBlock({
      ...ctx.base,
      host,
      branch: 'main',
      subgraph: main,
      node: nodeById(main, IDS.fusion),
    });
    await executeScenarioBlock({
      ...ctx.base,
      host,
      branch: 'main',
      subgraph: main,
      node: nodeById(main, IDS.printDetected),
    });
    expect(printed).toHaveLength(1);
    expect(printed[0]).toBeTruthy();
  });
});
