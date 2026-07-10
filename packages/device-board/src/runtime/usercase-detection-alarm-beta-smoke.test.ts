import { describe, expect, it, vi } from 'vitest';
import type { ScenarioReferenceValue, ScenarioSubgraph } from '@membrana/core';

import { executeScenarioBlock } from './block-executor.js';
import { createStubScenarioRuntimeHost } from './host.js';
import { FftTrendAnalysisRuntimeStore } from './analysis-runtime-store.js';
import { EnsembleAnalysisRuntimeStore } from './ensemble-runtime-store.js';
import { DetectionFusionRuntimeStore } from './fusion-runtime-store.js';
import { ProximityRuntimeStore } from './proximity-runtime-store.js';
import { ReportRuntimeStore } from './report-runtime-store.js';
import { TrackRuntimeStore } from './track-runtime-store.js';
import { CollectRuntimeStore } from './collect-runtime-store.js';
import { AsyncJobStore } from './async-job-store.js';
import { PromiseRuntimeStore } from './promise-runtime-store.js';
import { ScenarioVariableStore } from './variable-store.js';
import { isReferenceValid } from './reference-validity.js';
import {
  BRANCH_ON_DETECTION_DETECTED_HANDLE,
  BRANCH_ON_DETECTION_NOT_DETECTED_HANDLE,
} from '../graph/branch-on-detection-node.js';
import { IS_VALID_FALSE_HANDLE, IS_VALID_TRUE_HANDLE } from '../graph/palette-node.js';
import {
  BETA_ALARM,
  BETA_MAIN,
  MVP_MAIN_ANCHORS,
  getDetectionAlarmBetaDocument,
} from '../graph/usercase-detection-alarm-beta.js';

/**
 * Team Beta · comp-detection-alarm-2026-07-10, Phase 2β: runtime-smoke по
 * образцу эпик-smoke #323 (combined-report-executor.test.ts), но на подграфах
 * НАШЕГО документа: detected-путь main + alarm до lost + выход + крайние случаи
 * из CONCEPT (B3 строгий порог, B6 молчащий вход, B8 пустое окно, B5 идемпотентность).
 */

const JOURNAL_VAR_ID = 'var-JournalRef-mqm9dl4a-6';

function journalRefValue(): ScenarioReferenceValue {
  return { kind: 'JournalRef', handle: 'journal:device-1', valid: true };
}

function sampleRef(id: string): ScenarioReferenceValue {
  return { kind: 'AudioSampleRef', handle: `sample:${id}`, valid: true };
}

function frameRef(id: string): ScenarioReferenceValue {
  return { kind: 'FftFrameRef', handle: `fft-frame:${id}`, valid: true };
}

interface SmokeRig {
  readonly variableStore: ScenarioVariableStore;
  readonly analysisStore: FftTrendAnalysisRuntimeStore;
  readonly ensembleStore: EnsembleAnalysisRuntimeStore;
  readonly fusionStore: DetectionFusionRuntimeStore;
  readonly proximityStore: ProximityRuntimeStore;
  readonly reportStore: ReportRuntimeStore;
  readonly trackStore: TrackRuntimeStore;
  readonly collectStore: CollectRuntimeStore;
  readonly asyncJobStore: AsyncJobStore;
  readonly promiseRuntimeStore: PromiseRuntimeStore;
  readonly base: Record<string, unknown>;
  readonly runNode: (
    host: ReturnType<typeof createStubScenarioRuntimeHost>,
    subgraph: ScenarioSubgraph,
    branch: 'main' | 'alarm',
    nodeId: string,
  ) => ReturnType<typeof executeScenarioBlock>;
}

function createRig(): SmokeRig {
  const variableStore = new ScenarioVariableStore([
    { id: JOURNAL_VAR_ID, name: 'journal1', type: 'JournalRef', value: journalRefValue() },
  ]);
  const analysisStore = new FftTrendAnalysisRuntimeStore();
  const ensembleStore = new EnsembleAnalysisRuntimeStore();
  const fusionStore = new DetectionFusionRuntimeStore();
  const proximityStore = new ProximityRuntimeStore();
  const reportStore = new ReportRuntimeStore();
  const trackStore = new TrackRuntimeStore();
  const collectStore = new CollectRuntimeStore();
  const asyncJobStore = new AsyncJobStore();
  const promiseRuntimeStore = new PromiseRuntimeStore();

  const resolveContext = {
    getFftTrendAnalysisRef: (nodeId: string) => analysisStore.getAnalysisRef(nodeId),
    getEnsembleAnalysisRef: (nodeId: string) => ensembleStore.getAnalysisRef(nodeId),
    getDetectionFusionValue: (nodeId: string) => fusionStore.getFusionValue(nodeId),
    getProximityRef: (nodeId: string) => proximityStore.getProximityRef(nodeId),
    getTrackRef: (nodeId: string) => trackStore.getTrackRef(nodeId),
    getReportRef: (nodeId: string) => reportStore.getReportRef(nodeId),
    getCollectBatchRef: (nodeId: string) => collectStore.getLastBatchRef(nodeId),
    getPromiseRef: (nodeId: string) => promiseRuntimeStore.getPromiseRef(nodeId),
    getReporterRef: (journalHandle: string): ScenarioReferenceValue => ({
      kind: 'ReporterRef',
      handle: `reporter:${journalHandle}`,
      valid: true,
    }),
  };

  const base = {
    signal: new AbortController().signal,
    lastDetection: null,
    defaultChunkDurationMs: 5000,
    functions: [],
    runId: 'run-beta-smoke',
    variableStore,
    analysisStore,
    ensembleStore,
    fusionStore,
    proximityStore,
    reportStore,
    trackStore,
    collectStore,
    asyncJobStore,
    promiseRuntimeStore,
    resolveContext,
  };

  const runNode: SmokeRig['runNode'] = (host, subgraph, branch, nodeId) => {
    const node = subgraph.nodes.find((n) => n.id === nodeId);
    if (node === undefined) throw new Error(`node ${nodeId} missing in ${branch}`);
    return executeScenarioBlock({ ...base, host, branch, subgraph, node } as never);
  };

  return {
    variableStore,
    analysisStore,
    ensembleStore,
    fusionStore,
    proximityStore,
    reportStore,
    trackStore,
    collectStore,
    asyncJobStore,
    promiseRuntimeStore,
    base,
    runNode,
  };
}

const document = getDetectionAlarmBetaDocument();
const main = document.scenario.loops.main;
const alarm = document.scenario.loops.alarm;

describe('usercase-detection-alarm-beta runtime-smoke (Phase 2β)', () => {
  it('detected-путь main: ensemble → fusion 0.8 → detected → combined-отчёт → report-build job → publish', async () => {
    const rig = createRig();
    const makeCombinedReport = vi.fn(async () => ({
      schema: 'combined-detection/v1',
      reportId: 'combined-beta-1',
      trackId: 't-1',
      isDetected: true,
      payload: {},
    }));
    const publishReport = vi.fn(async () => true);
    const host = createStubScenarioRuntimeHost({
      makeCombinedReport,
      publishReport,
      makeEnsembleAnalysisFromSampleRefs: async () => ({
        analysisId: 'ens-beta-1',
        detection: { detected: true, confidence: 0.7, isDrone: true },
      }),
    });

    // Окно готово: trends-анализ MVP-узла + окно сэмплов CollectSamples + трек.
    rig.analysisStore.setNodeAnalysis(MVP_MAIN_ANCHORS.trendsAnalysis, 'trends-1', {
      detected: true,
      confidence: 0.9,
      isDrone: true,
    });
    rig.collectStore.setLastBatch(
      MVP_MAIN_ANCHORS.collectSamples,
      [sampleRef('s1'), sampleRef('s2')],
      'AudioSampleRefList',
    );
    rig.trackStore.setNodeTrack(MVP_MAIN_ANCHORS.makeTrack, 't-1');

    // 1) второй детектор — DSP-ансамбль по окну сэмплов
    await rig.runNode(host, main, 'main', BETA_MAIN.ensemble);
    expect(isReferenceValid(rig.ensembleStore.getAnalysisRef(BETA_MAIN.ensemble))).toBe(true);

    // 2) fusion: mean(0.9, 0.7) = 0.8, оба источника присутствуют
    await rig.runNode(host, main, 'main', BETA_MAIN.fusion);
    const fusion = rig.fusionStore.getFusionValue(BETA_MAIN.fusion);
    expect(fusion?.combinedScore).toBeCloseTo(0.8, 5);
    expect(fusion?.presentCount).toBe(2);

    // 3) branch (порог 0.55) → detected
    const branchResult = await rig.runNode(host, main, 'main', BETA_MAIN.branch);
    expect(branchResult.execOutHandle).toBe(BRANCH_ON_DETECTION_DETECTED_HANDLE);

    // 4) единый combined-отчёт: reporter + оба анализа + трек
    await rig.runNode(host, main, 'main', BETA_MAIN.combinedReport);
    expect(makeCombinedReport).toHaveBeenCalledTimes(1);
    const [reporterArg, inputArg] = makeCombinedReport.mock.calls[0]! as unknown as [
      ScenarioReferenceValue,
      { analyses: readonly { handle: string }[]; trackHandle: string | null },
    ];
    expect(reporterArg.handle).toBe('reporter:journal:device-1');
    expect(inputArg.analyses.map((a) => a.handle)).toEqual([
      'analysis:trends-1',
      'ensemble-analysis:ens-beta-1',
    ]);
    expect(inputArg.trackHandle).toBe('track:t-1');
    expect(isReferenceValid(rig.reportStore.getReportRef(BETA_MAIN.combinedReport))).toBe(true);

    // 5) report-build уходит async — main loop не ждёт (fire-and-forget job)
    await rig.runNode(host, main, 'main', BETA_MAIN.reportJob);
    const pending = rig.asyncJobStore.listPending();
    expect(pending.some((job) => job.kind === 'report-build')).toBe(true);
    expect(isReferenceValid(rig.promiseRuntimeStore.getPromiseRef(BETA_MAIN.reportJob))).toBe(true);

    // 6) OnAsyncResolved ⇒ PublishReport: журнал получает payload combined-отчёта
    await rig.runNode(host, main, 'main', BETA_MAIN.publishCombined);
    expect(publishReport).toHaveBeenCalledTimes(1);
    const [journalArg, payloadArg] = publishReport.mock.calls[0]! as unknown as [
      ScenarioReferenceValue,
      { reportId: string },
    ];
    expect(journalArg.handle).toBe('journal:device-1');
    expect(payloadArg.reportId).toBe('combined-beta-1');
  });

  it('B3: порог 0.55 строгий — mean(0.5, 0.59) = 0.545 → not-detected; 0.55 ровно → detected', async () => {
    const rig = createRig();
    const host = createStubScenarioRuntimeHost({});

    rig.analysisStore.setNodeAnalysis(MVP_MAIN_ANCHORS.trendsAnalysis, 'trends-low', {
      detected: false,
      confidence: 0.5,
      isDrone: false,
    });
    rig.ensembleStore.setNodeAnalysis(BETA_MAIN.ensemble, 'ens-low', {
      detected: true,
      confidence: 0.59,
      isDrone: true,
    });
    await rig.runNode(host, main, 'main', BETA_MAIN.fusion);
    expect(rig.fusionStore.getFusionValue(BETA_MAIN.fusion)?.combinedScore).toBeCloseTo(0.545, 5);
    const below = await rig.runNode(host, main, 'main', BETA_MAIN.branch);
    expect(below.execOutHandle).toBe(BRANCH_ON_DETECTION_NOT_DETECTED_HANDLE);

    // ровно на пороге: combinedScore >= threshold → detected (инвариант B3)
    rig.analysisStore.setNodeAnalysis(MVP_MAIN_ANCHORS.trendsAnalysis, 'trends-eq', {
      detected: true,
      confidence: 0.55,
      isDrone: true,
    });
    rig.ensembleStore.setNodeAnalysis(BETA_MAIN.ensemble, 'ens-eq', {
      detected: true,
      confidence: 0.55,
      isDrone: true,
    });
    await rig.runNode(host, main, 'main', BETA_MAIN.fusion);
    const atThreshold = await rig.runNode(host, main, 'main', BETA_MAIN.branch);
    expect(atThreshold.execOutHandle).toBe(BRANCH_ON_DETECTION_DETECTED_HANDLE);
  });

  it('крайний случай: детекторы молчат → fusion пуст (presentCount 0) → not-detected, без throw', async () => {
    const rig = createRig();
    const host = createStubScenarioRuntimeHost({});
    await rig.runNode(host, main, 'main', BETA_MAIN.fusion);
    const fusion = rig.fusionStore.getFusionValue(BETA_MAIN.fusion);
    expect(fusion?.presentCount).toBe(0);
    const result = await rig.runNode(host, main, 'main', BETA_MAIN.branch);
    expect(result.execOutHandle).toBe(BRANCH_ON_DETECTION_NOT_DETECTED_HANDLE);
  });

  it('B5: идемпотентность — повтор combined-отчёта на тех же входах не плодит новый reportId', async () => {
    const rig = createRig();
    // Хост кэширует по хэшу входов (basn-5) — повтор возвращает тот же payload.
    const makeCombinedReport = vi.fn(async () => ({
      schema: 'combined-detection/v1',
      reportId: 'combined-stable',
      trackId: 't-1',
      isDetected: true,
      payload: {},
    }));
    const host = createStubScenarioRuntimeHost({ makeCombinedReport });
    rig.analysisStore.setNodeAnalysis(MVP_MAIN_ANCHORS.trendsAnalysis, 'trends-1', {
      detected: true,
      confidence: 0.9,
      isDrone: true,
    });
    rig.ensembleStore.setNodeAnalysis(BETA_MAIN.ensemble, 'ens-1', {
      detected: true,
      confidence: 0.7,
      isDrone: true,
    });
    rig.trackStore.setNodeTrack(MVP_MAIN_ANCHORS.makeTrack, 't-1');

    await rig.runNode(host, main, 'main', BETA_MAIN.combinedReport);
    const first = rig.reportStore.getReportRef(BETA_MAIN.combinedReport);
    await rig.runNode(host, main, 'main', BETA_MAIN.combinedReport);
    const second = rig.reportStore.getReportRef(BETA_MAIN.combinedReport);
    expect(first.handle).toBe(second.handle);
    expect(rig.reportStore.getPayload(second.handle!)?.reportId).toBe('combined-stable');
  });

  it('B8: alarm frames-гейт — пустое окно → false-ветка (сразу proximity), кадры есть → true-ветка', async () => {
    const rig = createRig();
    const host = createStubScenarioRuntimeHost({});

    // Пустой тик: flush ещё не отдал batch → FftFrameRefList invalid → false
    const empty = await rig.runNode(host, alarm, 'alarm', BETA_ALARM.framesGate);
    expect(empty.execOutHandle).toBe(IS_VALID_FALSE_HANDLE);
    // Структурная гарантия: false-ветка идёт ровно в proximity (анализ пропущен)
    const falseEdge = alarm.edges.find(
      (e) => e.kind === 'exec' && e.source === BETA_ALARM.framesGate && e.sourceHandle === IS_VALID_FALSE_HANDLE,
    );
    expect(falseEdge?.target).toBe(BETA_ALARM.proximity);

    rig.collectStore.setLastBatch(BETA_ALARM.flush, [frameRef('f1'), frameRef('f2')], 'FftFrameRefList');
    const filled = await rig.runNode(host, alarm, 'alarm', BETA_ALARM.framesGate);
    expect(filled.execOutHandle).toBe(IS_VALID_TRUE_HANDLE);
  });

  it('B6: alarm-fusion trends-only — вход 2 молчит, combinedScore = свежий trends-confidence', async () => {
    const rig = createRig();
    const host = createStubScenarioRuntimeHost({});
    rig.analysisStore.setNodeAnalysis(BETA_ALARM.trends, 'alarm-trends-1', {
      detected: true,
      confidence: 0.62,
      isDrone: true,
    });
    await rig.runNode(host, alarm, 'alarm', BETA_ALARM.fusion);
    const fusion = rig.fusionStore.getFusionValue(BETA_ALARM.fusion);
    expect(fusion?.presentCount).toBe(1);
    expect(fusion?.combinedScore).toBeCloseTo(0.62, 5);
    expect(fusion?.agreement).toBe(1);
  });

  it('B7: alarm живёт (approaching → ∞) и выходит по lost (invalid → false-ветка без ∞)', async () => {
    const rig = createRig();
    rig.analysisStore.setNodeAnalysis(BETA_ALARM.trends, 'alarm-trends-1', {
      detected: true,
      confidence: 0.62,
      isDrone: true,
    });
    const hostAlive = createStubScenarioRuntimeHost({
      evaluateProximityTrend: async (_nodeId, input) => {
        // score-гейт: proximity получает combinedScore свежего alarm-fusion
        expect(input.combinedScore).toBeCloseTo(0.62, 5);
        return { trend: 'approaching', ready: true, deltaRatio: 0.3 };
      },
    });
    await rig.runNode(hostAlive, alarm, 'alarm', BETA_ALARM.fusion);
    await rig.runNode(hostAlive, alarm, 'alarm', BETA_ALARM.proximity);
    expect(isReferenceValid(rig.proximityStore.getProximityRef(BETA_ALARM.proximity))).toBe(true);
    const alive = await rig.runNode(hostAlive, alarm, 'alarm', BETA_ALARM.proxGate);
    expect(alive.execOutHandle).toBe(IS_VALID_TRUE_HANDLE);
    // true-ветка достигает ∞ через print «tracking»
    const trueEdge = alarm.edges.find(
      (e) => e.kind === 'exec' && e.source === BETA_ALARM.proxGate && e.sourceHandle === IS_VALID_TRUE_HANDLE,
    );
    expect(trueEdge?.target).toBe(BETA_ALARM.printTracking);

    // тишина: 3 промаха подряд → lost → ProximityRef invalid → false-ветка = выход
    const hostLost = createStubScenarioRuntimeHost({
      evaluateProximityTrend: async () => ({ trend: 'lost', ready: true, deltaRatio: 0 }),
    });
    await rig.runNode(hostLost, alarm, 'alarm', BETA_ALARM.proximity);
    expect(isReferenceValid(rig.proximityStore.getProximityRef(BETA_ALARM.proximity))).toBe(false);
    const lost = await rig.runNode(hostLost, alarm, 'alarm', BETA_ALARM.proxGate);
    expect(lost.execOutHandle).toBe(IS_VALID_FALSE_HANDLE);
    // выход: от print «lost» нет exec-рёбер — ∞ недостижим на false-пути
    expect(alarm.edges.some((e) => e.kind === 'exec' && e.source === BETA_ALARM.printLost)).toBe(false);
  });
});
