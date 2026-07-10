import { describe, expect, it } from 'vitest';
import { parseDeviceScenarioDocument, type ScenarioGraphEdge, type ScenarioSubgraph } from '@membrana/core';

import {
  BETA_ALARM,
  BETA_MAIN,
  DETECTION_ALARM_BETA_THRESHOLD,
  DETECTION_ALARM_BETA_USER_CASE_ID,
  MVP_MAIN_ANCHORS,
  REPLACED_MVP_MAIN_NODE_IDS,
  getDetectionAlarmBetaDocument,
} from './usercase-detection-alarm-beta.js';
import { validateUserCaseDocument } from '../runtime/validators/validate-user-case-document.js';
import { hydrateBoardFromDocument } from './hydrate-board-from-document.js';

/**
 * Team Beta · comp-detection-alarm-2026-07-10, Phase 2α: структурные тесты
 * деривации — валидность документа, полная цепочка задания, policy-значения.
 */

function findEdge(
  subgraph: ScenarioSubgraph,
  match: Partial<ScenarioGraphEdge>,
): ScenarioGraphEdge | undefined {
  return subgraph.edges.find((edge) =>
    Object.entries(match).every(([key, value]) => edge[key as keyof ScenarioGraphEdge] === value),
  );
}

function nodeById(subgraph: ScenarioSubgraph, id: string) {
  const node = subgraph.nodes.find((n) => n.id === id);
  if (node === undefined) throw new Error(`node ${id} missing`);
  return node;
}

describe('usercase-detection-alarm-beta (Phase 2α)', () => {
  const document = getDetectionAlarmBetaDocument();
  const main = document.scenario.loops.main;
  const alarm = document.scenario.loops.alarm;

  it('loadDocument возвращает валидный непустой device-scenario v2', () => {
    const parsed = parseDeviceScenarioDocument(document);
    expect(parsed.ok).toBe(true);
    expect(document.deviceKind).toBe('microphone');
    expect(main.nodes.length).toBeGreaterThan(0);
    expect(alarm.nodes.length).toBeGreaterThan(0);
    expect(document.meta?.executionPolicy).toBe('competition');
    expect(document.meta?.title).toContain('Beta');
  });

  it('чистая валидация документа — ноль ошибок (links, structure, parameters)', () => {
    const result = validateUserCaseDocument(document);
    expect(result.errors, JSON.stringify(result.errors, null, 2)).toHaveLength(0);
  });

  it('кэш loadDocument идемпотентен (один и тот же инстанс)', () => {
    expect(getDetectionAlarmBetaDocument()).toBe(document);
  });

  it('деривация MVP: bootstrap/onConnect/teardown/функции сохранены', () => {
    expect(document.scenario.initial.nodes.some((n) => n.id === 'fn-1-block')).toBe(true);
    expect(document.scenario.onConnect.nodes.length).toBeGreaterThan(0);
    expect(document.scenario.triggers.onStop.nodes.length).toBeGreaterThan(0);
    expect(document.scenario.functions.map((fn) => fn.id).sort()).toEqual(['fn-1', 'fn-3']);
    expect(document.scenario.variables.some((v) => v.type === 'JournalRef')).toBe(true);
  });

  it('report-секция MVP заменена: старые узлы и их рёбра удалены', () => {
    for (const removedId of REPLACED_MVP_MAIN_NODE_IDS) {
      expect(main.nodes.some((n) => n.id === removedId), removedId).toBe(false);
      expect(
        main.edges.some((e) => e.source === removedId || e.target === removedId),
        removedId,
      ).toBe(false);
    }
  });

  it('main: fusion — ровно 2 входа от двух РАЗНЫХ детекторов (trends + ensemble)', () => {
    const fusion = nodeById(main, BETA_MAIN.fusion);
    expect(fusion.detectionFusionInputCount).toBe(2);
    expect(
      findEdge(main, {
        kind: 'data',
        source: MVP_MAIN_ANCHORS.trendsAnalysis,
        target: BETA_MAIN.fusion,
        targetHandle: 'analysis-1',
      }),
    ).toBeDefined();
    expect(
      findEdge(main, {
        kind: 'data',
        source: BETA_MAIN.ensemble,
        target: BETA_MAIN.fusion,
        targetHandle: 'analysis-2',
      }),
    ).toBeDefined();
    // ensemble питается окном сэмплов от CollectSamples
    expect(
      findEdge(main, {
        kind: 'data',
        source: MVP_MAIN_ANCHORS.collectSamples,
        sourceHandle: 'batches',
        target: BETA_MAIN.ensemble,
        targetHandle: 'samples',
      }),
    ).toBeDefined();
  });

  it('main: branch порог 0.55 (= minConfidence trends), detected → combined-отчёт', () => {
    const branch = nodeById(main, BETA_MAIN.branch);
    expect(branch.detectionThreshold).toBe(DETECTION_ALARM_BETA_THRESHOLD);
    expect(
      findEdge(main, { kind: 'data', source: BETA_MAIN.fusion, target: BETA_MAIN.branch, targetHandle: 'fusion' }),
    ).toBeDefined();
    expect(
      findEdge(main, {
        kind: 'exec',
        source: BETA_MAIN.branch,
        sourceHandle: 'detected',
        target: BETA_MAIN.combinedReport,
      }),
    ).toBeDefined();
    // not-detected — конец Then-ветки, никуда не ведёт
    expect(main.edges.some((e) => e.source === BETA_MAIN.branch && e.sourceHandle === 'not-detected')).toBe(false);
  });

  it('main: combined-отчёт получает reporter + оба анализа + трек', () => {
    for (const [handle, source] of [
      ['reporter', MVP_MAIN_ANCHORS.getReporter],
      ['analysis-1', MVP_MAIN_ANCHORS.trendsAnalysis],
      ['analysis-2', BETA_MAIN.ensemble],
      ['track', MVP_MAIN_ANCHORS.makeTrack],
    ] as const) {
      expect(
        findEdge(main, { kind: 'data', source, target: BETA_MAIN.combinedReport, targetHandle: handle }),
        handle,
      ).toBeDefined();
    }
  });

  it('main: публикация combined-отчёта — detached через report-build job', () => {
    const job = nodeById(main, BETA_MAIN.reportJob);
    expect(job.asyncJobConfig?.jobKind).toBe('report-build');
    expect(
      findEdge(main, { kind: 'exec', source: BETA_MAIN.combinedReport, target: BETA_MAIN.reportJob }),
    ).toBeDefined();
    expect(
      findEdge(main, {
        kind: 'data',
        source: BETA_MAIN.reportJob,
        sourceHandle: 'promise',
        target: BETA_MAIN.onReportBuilt,
        targetHandle: 'promise',
      }),
    ).toBeDefined();
    expect(
      findEdge(main, { kind: 'event', source: BETA_MAIN.onReportBuilt, target: BETA_MAIN.publishCombined }),
    ).toBeDefined();
    for (const [handle, source] of [
      ['journal', MVP_MAIN_ANCHORS.journalVarGet],
      ['report', BETA_MAIN.combinedReport],
    ] as const) {
      expect(
        findEdge(main, { kind: 'data', source, target: BETA_MAIN.publishCombined, targetHandle: handle }),
        handle,
      ).toBeDefined();
    }
  });

  it('main: async track-upload MVP сохранён; on-async-resolved ведёт в print', () => {
    expect(main.nodes.some((n) => n.id === 'node-start-async-job-v20')).toBe(true);
    expect(
      findEdge(main, {
        kind: 'event',
        source: MVP_MAIN_ANCHORS.onTrackUploaded,
        target: BETA_MAIN.printTrackUploaded,
      }),
    ).toBeDefined();
  });

  it('main: policy-значения измерены — trends 20×200 мс = 4 c ≤ окна записи 5 c', () => {
    const policy = nodeById(main, MVP_MAIN_ANCHORS.trendsPolicy).fftTrendsPolicy;
    expect(policy?.measurementsCount).toBe(20);
    expect(policy?.intervalMs).toBe(200);
    expect(policy?.minConfidence).toBe(0.55);
    expect(policy?.enabledTemplateKeys).toContain('DRONE_TIGHT');
  });

  it('alarm: полная композиция brief — branch-контур → proximity → is-valid → loop-repeat/выход', () => {
    // exec-цепочка свежего окна
    for (const [source, target] of [
      [BETA_ALARM.entry, BETA_ALARM.stream],
      [BETA_ALARM.stream, BETA_ALARM.sample],
      [BETA_ALARM.sample, BETA_ALARM.frame],
      [BETA_ALARM.frame, BETA_ALARM.collectFrames],
      [BETA_ALARM.collectFrames, BETA_ALARM.flush],
      [BETA_ALARM.flush, BETA_ALARM.framesGate],
      [BETA_ALARM.trends, BETA_ALARM.fusion],
      [BETA_ALARM.fusion, BETA_ALARM.proximity],
      [BETA_ALARM.proximity, BETA_ALARM.proxGate],
    ] as const) {
      expect(findEdge(alarm, { kind: 'exec', source, target }), `${source}→${target}`).toBeDefined();
    }
    // B8: гейт пустого окна — false идёт сразу в proximity (fan-in)
    expect(
      findEdge(alarm, { kind: 'exec', source: BETA_ALARM.framesGate, sourceHandle: 'exec-false-out', target: BETA_ALARM.proximity }),
    ).toBeDefined();
    // данные: fusion → proximity, proximity → оба is-valid/print
    expect(
      findEdge(alarm, { kind: 'data', source: BETA_ALARM.fusion, target: BETA_ALARM.proximity, targetHandle: 'fusion' }),
    ).toBeDefined();
    expect(
      findEdge(alarm, { kind: 'data', source: BETA_ALARM.proximity, target: BETA_ALARM.proxGate, targetHandle: 'value' }),
    ).toBeDefined();
  });

  it('alarm: true-ветка достигает ∞, false-ветка (lost) — НЕТ пути в ∞', () => {
    expect(
      findEdge(alarm, { kind: 'exec', source: BETA_ALARM.proxGate, sourceHandle: 'exec-true-out', target: BETA_ALARM.printTracking }),
    ).toBeDefined();
    expect(
      findEdge(alarm, { kind: 'exec', source: BETA_ALARM.printTracking, target: BETA_ALARM.infinity }),
    ).toBeDefined();
    // lost-путь: prox-gate false → print-lost, и от print-lost исходящих exec нет
    expect(
      findEdge(alarm, { kind: 'exec', source: BETA_ALARM.proxGate, sourceHandle: 'exec-false-out', target: BETA_ALARM.printLost }),
    ).toBeDefined();
    expect(alarm.edges.some((e) => e.kind === 'exec' && e.source === BETA_ALARM.printLost)).toBe(false);
  });

  it('alarm: fusion trends-only — analysis-1 от alarm-trends, вход 2 молчит by design (B6)', () => {
    expect(
      findEdge(alarm, { kind: 'data', source: BETA_ALARM.trends, target: BETA_ALARM.fusion, targetHandle: 'analysis-1' }),
    ).toBeDefined();
    expect(alarm.edges.some((e) => e.kind === 'data' && e.target === BETA_ALARM.fusion && e.targetHandle === 'analysis-2')).toBe(false);
    // alarm-policy: окно 5×100 мс = 0.5 c под каденс тика ~400 мс
    const policy = nodeById(alarm, BETA_ALARM.trendsPolicy).fftTrendsPolicy;
    expect(policy?.measurementsCount).toBe(5);
    expect(policy?.intervalMs).toBe(100);
    // свежие кадры: collect-окно 1 c
    expect(nodeById(alarm, BETA_ALARM.collectFrames).collectorConfig?.windowSec).toBe(1);
  });

  it('id каталога соответствует брифу', () => {
    expect(DETECTION_ALARM_BETA_USER_CASE_ID).toBe('usercase-detection-alarm-beta');
  });

  it('документ гидратируется в board-state (канвас пикера/редактора)', () => {
    const state = hydrateBoardFromDocument(document);
    expect(state.scenarioMainNodes.some((n) => n.id === BETA_MAIN.fusion)).toBe(true);
    expect(state.scenarioAlarmNodes.some((n) => n.id === BETA_ALARM.proximity)).toBe(true);
    expect(state.scenarioAlarmNodes.some((n) => n.id === BETA_ALARM.infinity)).toBe(true);
    expect(state.variables.length).toBeGreaterThan(0);
  });
});
