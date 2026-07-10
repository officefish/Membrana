import { describe, expect, it } from 'vitest';

import {
  parseDeviceScenarioDocument,
  type ScenarioGraphEdge,
  type ScenarioSubgraph,
} from '@membrana/core';

import { validateUserCaseDocument } from '../runtime/validators/validate-user-case-document.js';
import { UserCaseCatalogService } from '../catalog/user-case-catalog.js';
import { DETECTION_ALARM_COMPETITION_USER_CASE_ENTRIES } from '../catalog/detection-alarm-competition-user-case-entries.js';
import {
  DETECTION_ALARM_ALPHA_JOURNAL_VARIABLE_ID,
  DETECTION_ALARM_ALPHA_THRESHOLD,
  getDetectionAlarmAlphaDocument,
} from './usercase-detection-alarm-alpha.js';

/**
 * Team Alpha · comp-detection-alarm-2026-07-10 (#336), Phase 2α.
 * Полная цепочка задания присутствует порёберно: поток → окно → 2 детектора →
 * fusion → branch → [detected: трек → combined-отчёт → async publish] +
 * alarm-композиция proximity → is-valid (false = lost = выход) → loop-repeat.
 */

const ENTRY_ID = 'usercase-detection-alarm-alpha';

function execEdge(
  subgraph: ScenarioSubgraph,
  source: string,
  sourceHandle: string,
): ScenarioGraphEdge | undefined {
  return subgraph.edges.find(
    (edge) => edge.kind === 'exec' && edge.source === source && edge.sourceHandle === sourceHandle,
  );
}

function dataEdge(
  subgraph: ScenarioSubgraph,
  target: string,
  targetHandle: string,
): ScenarioGraphEdge | undefined {
  return subgraph.edges.find(
    (edge) => edge.kind === 'data' && edge.target === target && edge.targetHandle === targetHandle,
  );
}

/** Идём по exec-магистрали от узла: nodeId → target его exec-out. */
function walkExecSpine(subgraph: ScenarioSubgraph, from: string, hops: number): readonly string[] {
  const path: string[] = [from];
  let current = from;
  for (let i = 0; i < hops; i += 1) {
    const edge = execEdge(subgraph, current, 'exec-out');
    if (edge === undefined) {
      break;
    }
    path.push(edge.target);
    current = edge.target;
  }
  return path;
}

describe('usercase-detection-alarm-alpha (Phase 2α)', () => {
  it('loadDocument: валидный непустой device-scenario v2 без ошибок валидатора', () => {
    const document = getDetectionAlarmAlphaDocument();
    const parsed = parseDeviceScenarioDocument(document);
    expect(parsed.ok).toBe(true);

    const validation = validateUserCaseDocument(document);
    expect(validation.errors).toEqual([]);
    expect(validation.isValid).toBe(true);

    expect(document.deviceKind).toBe('microphone');
    expect(document.scenario.loops.main.nodes.length).toBeGreaterThan(0);
    expect(document.scenario.loops.alarm.nodes.length).toBeGreaterThan(0);
    expect(document.scenario.initial.nodes.length).toBeGreaterThan(0);
    expect(document.scenario.onConnect.nodes.length).toBeGreaterThan(0);
    // Изюминка Alpha: плоский граф — ни одной user-функции.
    expect(document.scenario.functions).toHaveLength(0);
  });

  it('каталог: entry community виден и грузит именно этот документ', () => {
    const catalog = new UserCaseCatalogService();
    const summary = catalog.getSummary(ENTRY_ID);
    expect(summary).not.toBeNull();
    expect(summary?.tier).toBe('community');
    expect(summary?.deviceKind).toBe('microphone');
    expect(summary?.functionCount).toBe(0);
    expect(summary?.branchCount).toBe(6);

    const document = catalog.loadDocument(ENTRY_ID);
    expect(document).toBe(getDetectionAlarmAlphaDocument());
    expect(DETECTION_ALARM_COMPETITION_USER_CASE_ENTRIES).toHaveLength(1);
  });

  it('main ①–②: exec-магистраль потока и гейт окна записи', () => {
    const main = getDetectionAlarmAlphaDocument().scenario.loops.main;
    const kinds = new Map(main.nodes.map((node) => [node.id, node.nodeKind]));

    // ① onTick → mic → stream → sample → fft → collect-fft → collect-samples → gate
    const spine = walkExecSpine(main, main.entry, 7);
    expect(spine.map((id) => kinds.get(id))).toEqual([
      'event',
      'get-microphone',
      'get-audio-stream',
      'get-sample',
      'get-fft-frame',
      'collect-fft-frames',
      'collect-samples',
      'is-recording-window-full',
    ]);

    // ② окно не полно → ∞; полно → StopRecording
    const gateId = spine[7]!;
    expect(kinds.get(execEdge(main, gateId, 'exec-false-out')?.target ?? '')).toBe('loop-repeat');
    expect(kinds.get(execEdge(main, gateId, 'exec-true-out')?.target ?? '')).toBe('stop-recording');
  });

  it('main ③–④: трек + два детектора → fusion (вариадика 2) → branch', () => {
    const main = getDetectionAlarmAlphaDocument().scenario.loops.main;
    const kinds = new Map(main.nodes.map((node) => [node.id, node.nodeKind]));
    const gate = main.nodes.find((node) => node.nodeKind === 'is-recording-window-full');
    const detectedChain = walkExecSpine(main, execEdge(main, gate!.id, 'exec-true-out')!.target, 5);
    expect(detectedChain.map((id) => kinds.get(id))).toEqual([
      'stop-recording',
      'make-track',
      'flush-spectral-analyser',
      'make-fft-trends-analysis',
      'make-ensemble-analysis',
      'make-detection-fusion',
    ]);

    const trends = main.nodes.find((node) => node.nodeKind === 'make-fft-trends-analysis')!;
    const ensemble = main.nodes.find((node) => node.nodeKind === 'make-ensemble-analysis')!;
    const fusion = main.nodes.find((node) => node.nodeKind === 'make-detection-fusion')!;
    const branch = main.nodes.find((node) => node.nodeKind === 'branch-on-detection')!;

    // Оба детектора в fusion (min-вариадика 2 — обоснование в CONCEPT §Policy).
    expect(fusion.detectionFusionInputCount).toBe(2);
    expect(dataEdge(main, fusion.id, 'analysis-1')?.source).toBe(trends.id);
    expect(dataEdge(main, fusion.id, 'analysis-2')?.source).toBe(ensemble.id);
    expect(execEdge(main, fusion.id, 'exec-out')?.target).toBe(branch.id);
    expect(dataEdge(main, branch.id, 'fusion')?.source).toBe(fusion.id);
    expect(branch.detectionThreshold).toBe(DETECTION_ALARM_ALPHA_THRESHOLD);

    // Детектор B (ансамбль) слушает то же окно сэмплов, что и трек.
    const collectSamples = main.nodes.find((node) => node.nodeKind === 'collect-samples')!;
    expect(dataEdge(main, ensemble.id, 'samples')?.source).toBe(collectSamples.id);
  });

  it('main ⑤: detected → combined-отчёт (оба анализа + трек) → async publish, магистраль не ждёт', () => {
    const main = getDetectionAlarmAlphaDocument().scenario.loops.main;
    const nodeById = new Map(main.nodes.map((node) => [node.id, node]));
    const branch = main.nodes.find((node) => node.nodeKind === 'branch-on-detection')!;
    const report = main.nodes.find((node) => node.nodeKind === 'make-combined-report')!;
    const track = main.nodes.find((node) => node.nodeKind === 'make-track')!;
    const trends = main.nodes.find((node) => node.nodeKind === 'make-fft-trends-analysis')!;
    const ensemble = main.nodes.find((node) => node.nodeKind === 'make-ensemble-analysis')!;

    // detected → единый отчёт: 2 анализа + трек + reporter из journal1.
    expect(execEdge(main, branch.id, 'detected')?.target).toBe(report.id);
    expect(dataEdge(main, report.id, 'analysis-1')?.source).toBe(trends.id);
    expect(dataEdge(main, report.id, 'analysis-2')?.source).toBe(ensemble.id);
    expect(dataEdge(main, report.id, 'track')?.source).toBe(track.id);
    const reporter = nodeById.get(dataEdge(main, report.id, 'reporter')?.source ?? '');
    expect(reporter?.nodeKind).toBe('get-reporter');
    const journalVar = nodeById.get(dataEdge(main, reporter!.id, 'journal')?.source ?? '');
    expect(journalVar?.nodeKind).toBe('variable-get');
    expect(journalVar?.variableId).toBe(DETECTION_ALARM_ALPHA_JOURNAL_VARIABLE_ID);

    // Async-детач: latent Sequence → report-build + track-upload jobs.
    const seq = nodeById.get(execEdge(main, report.id, 'exec-out')?.target ?? '');
    expect(seq?.nodeKind).toBe('sequence');
    expect(seq?.sequenceConfig?.latentThen).toBe(true);
    const jobReport = nodeById.get(execEdge(main, seq!.id, 'then-0')?.target ?? '');
    expect(jobReport?.nodeKind).toBe('start-async-job');
    expect(jobReport?.asyncJobConfig?.jobKind).toBe('report-build');
    const jobUpload = nodeById.get(execEdge(main, seq!.id, 'then-1')?.target ?? '');
    expect(jobUpload?.nodeKind).toBe('start-async-job');
    expect(jobUpload?.asyncJobConfig?.jobKind).toBe('track-upload');
    expect(dataEdge(main, jobUpload!.id, 'track')?.source).toBe(track.id);

    // Публикация — по резолву report-build (event-ребро), не в магистрали.
    const onResolved = main.nodes.find((node) => node.nodeKind === 'on-async-resolved')!;
    expect(dataEdge(main, onResolved.id, 'promise')?.source).toBe(jobReport!.id);
    const publishEdge = main.edges.find(
      (edge) => edge.kind === 'event' && edge.source === onResolved.id,
    );
    const publish = nodeById.get(publishEdge?.target ?? '');
    expect(publish?.nodeKind).toBe('publish-report');
    expect(dataEdge(main, publish!.id, 'report')?.source).toBe(report.id);

    // ⑥ Оба исхода решения сходятся на рестарте записи → ∞.
    const restart = nodeById.get(execEdge(main, branch.id, 'not-detected')?.target ?? '');
    expect(restart?.nodeKind).toBe('start-recording');
    expect(execEdge(main, seq!.id, 'exec-out')?.target).toBe(restart!.id);
    const infinity = nodeById.get(execEdge(main, restart!.id, 'exec-out')?.target ?? '');
    expect(infinity?.nodeKind).toBe('loop-repeat');
  });

  it('alarm: композиция брифа — proximity → is-valid; false = lost = выход (не в ∞)', () => {
    const document = getDetectionAlarmAlphaDocument();
    const alarm = document.scenario.loops.alarm;
    const nodeById = new Map(alarm.nodes.map((node) => [node.id, node]));

    const prox = alarm.nodes.find((node) => node.nodeKind === 'make-proximity-trend')!;
    expect(execEdge(alarm, alarm.entry, 'exec-out')?.target).toBe(prox.id);

    // A3: score-гейт — mirror fusion из main (тот же nodeId, dataflow-only).
    const fusionEdge = dataEdge(alarm, prox.id, 'fusion');
    const mirror = nodeById.get(fusionEdge?.source ?? '');
    expect(mirror?.nodeKind).toBe('make-detection-fusion');
    const mainFusion = document.scenario.loops.main.nodes.find(
      (node) => node.nodeKind === 'make-detection-fusion',
    )!;
    expect(mirror?.id).toBe(mainFusion.id);
    // Mirror — dataflow-only: exec-рёбер у него в alarm нет.
    expect(
      alarm.edges.some(
        (edge) => edge.kind === 'exec' && (edge.source === mirror!.id || edge.target === mirror!.id),
      ),
    ).toBe(false);

    const valid = nodeById.get(execEdge(alarm, prox.id, 'exec-out')?.target ?? '');
    expect(valid?.nodeKind).toBe('is-valid');
    expect(dataEdge(alarm, valid!.id, 'value')?.source).toBe(prox.id);

    // true (цель рядом) → print → loop-repeat: alarm живёт.
    const near = nodeById.get(execEdge(alarm, valid!.id, 'exec-true-out')?.target ?? '');
    expect(near?.nodeKind).toBe('print');
    expect(nodeById.get(execEdge(alarm, near!.id, 'exec-out')?.target ?? '')?.nodeKind).toBe(
      'loop-repeat',
    );

    // false (lost) → print-выход; до loop-repeat exec НЕ доходит (A6).
    const lost = nodeById.get(execEdge(alarm, valid!.id, 'exec-false-out')?.target ?? '');
    expect(lost?.nodeKind).toBe('print');
    expect(execEdge(alarm, lost!.id, 'exec-out')).toBeUndefined();
  });

  it('onStart/onConnect/onStop/onDisconnect: bootstrap-ветки полные', () => {
    const document = getDetectionAlarmAlphaDocument();
    const initialKinds = document.scenario.initial.nodes.map((node) => node.nodeKind);
    expect(initialKinds).toContain('get-microphone');
    expect(initialKinds).toContain('start-streaming');
    expect(initialKinds).toContain('start-recording');
    expect(initialKinds).toContain('make-recording-policy');

    const onConnectKinds = document.scenario.onConnect.nodes.map((node) => node.nodeKind);
    expect(onConnectKinds.filter((kind) => kind === 'get-journal')).toHaveLength(2);
    expect(onConnectKinds.filter((kind) => kind === 'variable-set')).toHaveLength(2);

    expect(document.scenario.triggers.onStop.nodes.map((node) => node.nodeKind)).toContain(
      'stop-streaming',
    );
    expect(document.scenario.triggers.onDisconnect.nodes.map((node) => node.nodeKind)).toContain(
      'variable-set',
    );
    expect(document.scenario.variables.map((variable) => variable.id)).toEqual([
      DETECTION_ALARM_ALPHA_JOURNAL_VARIABLE_ID,
    ]);
  });

  it('читаемость: 6 актов-групп в main + группы на initial/onConnect/alarm', () => {
    const document = getDetectionAlarmAlphaDocument();
    const groups = document.scenario.commentGroups;
    const mainGroups = groups.filter((group) => group.branch === 'main');
    expect(mainGroups).toHaveLength(6);
    // Акты пронумерованы ①–⑥ — оператор читает сценарий слева направо.
    expect(mainGroups.map((group) => group.title[0])).toEqual(['①', '②', '③', '④', '⑤', '⑥']);
    expect(groups.some((group) => group.branch === 'initial')).toBe(true);
    expect(groups.some((group) => group.branch === 'onConnect')).toBe(true);
    expect(groups.some((group) => group.branch === 'alarm')).toBe(true);

    // Каждый nodeId группы существует в своей ветке.
    const byBranch: Record<string, ScenarioSubgraph> = {
      initial: document.scenario.initial,
      onConnect: document.scenario.onConnect,
      main: document.scenario.loops.main,
      alarm: document.scenario.loops.alarm,
    };
    for (const group of groups) {
      const subgraph = byBranch[group.branch];
      expect(subgraph, group.id).toBeDefined();
      const ids = new Set(subgraph!.nodes.map((node) => node.id));
      for (const nodeId of group.nodeIds) {
        expect(ids.has(nodeId), `${group.id}: ${nodeId}`).toBe(true);
      }
    }
  });
});
