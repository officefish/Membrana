import { describe, expect, it } from 'vitest';

import { parseDeviceScenarioDocument } from '@membrana/core';

import {
  DETECTION_ALARM_GAMMA_JOURNAL_VARIABLE_ID,
  DETECTION_ALARM_GAMMA_NODE_IDS as IDS,
  buildDetectionAlarmGammaDocument,
  getDetectionAlarmGammaDocument,
} from './default-usercase-detection-alarm-gamma.js';
import { shouldMigrateMicrophoneScenarioToBundledMvp } from './device-scenario-workspace.js';
import { hydrateBoardFromDocument } from './hydrate-board-from-document.js';
import { validateUserCaseDocument } from '../runtime/validators/validate-user-case-document.js';

/**
 * Team Gamma · comp-detection-alarm-2026-07-10 — структура документа
 * «Прозрачный сценарий» (Phase 2α): полная цепочка задания на месте.
 */

describe('default-usercase-detection-alarm-gamma (документ)', () => {
  const doc = getDetectionAlarmGammaDocument();
  const main = doc.scenario.loops.main;
  const alarm = doc.scenario.loops.alarm;

  const hasExec = (
    subgraph: typeof main,
    source: string,
    target: string,
    sourceHandle = 'exec-out',
  ): boolean =>
    subgraph.edges.some(
      (edge) =>
        edge.kind === 'exec' &&
        edge.source === source &&
        edge.sourceHandle === sourceHandle &&
        edge.target === target,
    );

  const hasData = (
    subgraph: typeof main,
    source: string,
    target: string,
    targetHandle: string,
  ): boolean =>
    subgraph.edges.some(
      (edge) =>
        edge.kind === 'data' &&
        edge.source === source &&
        edge.target === target &&
        edge.targetHandle === targetHandle,
    );

  it('loadDocument возвращает валидный НЕпустой документ (parse ok, все ветки)', () => {
    const parsed = parseDeviceScenarioDocument(buildDetectionAlarmGammaDocument());
    expect(parsed.ok).toBe(true);
    expect(doc.deviceKind).toBe('microphone');
    expect(doc.scenario.initial.nodes.length).toBeGreaterThan(0);
    expect(doc.scenario.onConnect.nodes.length).toBeGreaterThan(0);
    expect(main.nodes.length).toBeGreaterThan(0);
    expect(alarm.nodes.length).toBeGreaterThan(0);
    expect(doc.scenario.triggers.onStop.nodes.length).toBeGreaterThan(0);
    expect(doc.scenario.triggers.onDisconnect.nodes.length).toBeGreaterThan(0);
    expect(doc.scenario.functions).toHaveLength(0); // плоский плакат — без user-функций
  });

  it('main: полная цепочка — поток → collect → 2 детектора → fusion → branch', () => {
    // Окно наблюдения
    expect(hasExec(main, 'main-on-tick', IDS.guard)).toBe(true);
    expect(hasExec(main, IDS.guard, IDS.sample, 'exec-true-out')).toBe(true);
    expect(hasExec(main, IDS.sample, IDS.fftFrame)).toBe(true);
    expect(hasExec(main, IDS.fftFrame, IDS.collectFft)).toBe(true);
    expect(hasExec(main, IDS.collectFft, IDS.collectSamples)).toBe(true);
    expect(hasExec(main, IDS.collectSamples, IDS.gate)).toBe(true);
    // Гейт: окно копится → ∞; окно готово → Sequence
    expect(hasExec(main, IDS.gate, IDS.mainLoopRepeat, 'exec-false-out')).toBe(true);
    expect(hasExec(main, IDS.gate, IDS.sequence, 'exec-true-out')).toBe(true);
    // then-0: детекция двумя детекторами
    expect(hasExec(main, IDS.sequence, IDS.flush, 'then-0')).toBe(true);
    expect(hasExec(main, IDS.flush, IDS.trends)).toBe(true);
    expect(hasExec(main, IDS.trends, IDS.ensemble)).toBe(true);
    expect(hasExec(main, IDS.ensemble, IDS.fusion)).toBe(true);
    expect(hasExec(main, IDS.fusion, IDS.branch)).toBe(true);
    // Fusion: ровно 2 обязательных входа (trends + ensemble)
    expect(hasData(main, IDS.trends, IDS.fusion, 'analysis-1')).toBe(true);
    expect(hasData(main, IDS.ensemble, IDS.fusion, 'analysis-2')).toBe(true);
    expect(hasData(main, IDS.fusion, IDS.branch, 'fusion')).toBe(true);
    const fusionNode = main.nodes.find((node) => node.id === IDS.fusion);
    expect(fusionNode?.detectionFusionInputCount).toBe(2);
    const branchNode = main.nodes.find((node) => node.id === IDS.branch);
    expect(branchNode?.detectionThreshold).toBe(0.5);
    // Ансамбль читает окно сэмплов коллектора
    expect(hasData(main, IDS.collectSamples, IDS.ensemble, 'samples')).toBe(true);
  });

  it('main: detected-путь — print → запись трека → async-загрузка; тихое окно тоже закрывает запись', () => {
    expect(hasExec(main, IDS.branch, IDS.printDetected, 'detected')).toBe(true);
    expect(hasExec(main, IDS.printDetected, IDS.stopRecording)).toBe(true);
    expect(hasExec(main, IDS.stopRecording, IDS.makeTrack)).toBe(true);
    expect(hasExec(main, IDS.makeTrack, IDS.uploadJob)).toBe(true);
    expect(hasExec(main, IDS.branch, IDS.stopRecordingQuiet, 'not-detected')).toBe(true);
    // Print детекции показывает fusion value (score/agreement)
    expect(hasData(main, IDS.fusion, IDS.printDetected, 'value')).toBe(true);
    // MakeTrack: slice от StopRecording + окно сэмплов
    expect(hasData(main, IDS.stopRecording, IDS.makeTrack, 'slice')).toBe(true);
    expect(hasData(main, IDS.collectSamples, IDS.makeTrack, 'samples')).toBe(true);
    expect(hasData(main, IDS.makeTrack, IDS.uploadJob, 'track')).toBe(true);
    const upload = main.nodes.find((node) => node.id === IDS.uploadJob);
    expect(upload?.asyncJobConfig?.jobKind).toBe('track-upload');
    // Рестарт окна записи на then-1, итерация завершается через exec-out → ∞
    expect(hasExec(main, IDS.sequence, IDS.restartRecording, 'then-1')).toBe(true);
    expect(hasExec(main, IDS.sequence, IDS.mainLoopRepeat, 'exec-out')).toBe(true);
  });

  it('main: детачед async-хвост — on-async-resolved → combined-отчёт → публикация (main loop не блокируется)', () => {
    expect(hasData(main, IDS.uploadJob, IDS.asyncResolved, 'promise')).toBe(true);
    expect(
      main.edges.some(
        (edge) =>
          edge.kind === 'event' &&
          edge.source === IDS.asyncResolved &&
          edge.target === IDS.printTrack,
      ),
    ).toBe(true);
    expect(hasExec(main, IDS.printTrack, IDS.combinedReport)).toBe(true);
    expect(hasExec(main, IDS.combinedReport, IDS.publishReport)).toBe(true);
    expect(hasExec(main, IDS.publishReport, IDS.printReport)).toBe(true);
    // Единый отчёт: reporter + оба анализа + трек
    expect(hasData(main, IDS.reporter, IDS.combinedReport, 'reporter')).toBe(true);
    expect(hasData(main, IDS.trends, IDS.combinedReport, 'analysis-1')).toBe(true);
    expect(hasData(main, IDS.ensemble, IDS.combinedReport, 'analysis-2')).toBe(true);
    expect(hasData(main, IDS.makeTrack, IDS.combinedReport, 'track')).toBe(true);
    expect(hasData(main, IDS.combinedReport, IDS.publishReport, 'report')).toBe(true);
    expect(hasData(main, IDS.journalVar, IDS.publishReport, 'journal')).toBe(true);
    // В exec-цепочке main НЕТ пути от Sequence к combined-report (только детачед event)
    expect(hasExec(main, IDS.uploadJob, IDS.combinedReport)).toBe(false);
  });

  it('alarm: композиция брифа — proximity → is-valid; true → loop-repeat, false = lost = выход', () => {
    expect(hasExec(alarm, 'alarm-on-tick', IDS.proximity)).toBe(true);
    expect(hasExec(alarm, IDS.proximity, IDS.printProximity)).toBe(true);
    expect(hasExec(alarm, IDS.printProximity, IDS.alarmIsValid)).toBe(true);
    expect(hasData(alarm, IDS.proximity, IDS.alarmIsValid, 'value')).toBe(true);
    expect(hasExec(alarm, IDS.alarmIsValid, IDS.alarmLoopRepeat, 'exec-true-out')).toBe(true);
    expect(hasExec(alarm, IDS.alarmIsValid, IDS.printProximityLost, 'exec-false-out')).toBe(true);
    // false-ветка — выход: из неё НЕТ пути обратно в loop-repeat
    expect(hasExec(alarm, IDS.printProximityLost, IDS.alarmLoopRepeat)).toBe(false);
    // Живой индикатор тревоги печатает ProximityRef каждый тик
    expect(hasData(alarm, IDS.proximity, IDS.printProximity, 'value')).toBe(true);
  });

  it('латентный Sequence: все impure-узлы Then-веток несут supportsAsync (pre-run latent gate)', () => {
    const sequenceNode = main.nodes.find((node) => node.id === IDS.sequence);
    expect(sequenceNode?.sequenceConfig?.latentThen).toBe(true);
    const thenChainIds = [
      IDS.flush,
      IDS.trends,
      IDS.ensemble,
      IDS.fusion,
      IDS.branch,
      IDS.printDetected,
      IDS.stopRecording,
      IDS.stopRecordingQuiet,
      IDS.makeTrack,
      IDS.uploadJob,
      IDS.restartRecording,
    ];
    for (const id of thenChainIds) {
      const node = main.nodes.find((item) => item.id === id);
      expect(node?.supportsAsync, id).toBe(true);
    }
  });

  it('validateUserCaseDocument: без ошибок (переменные, comment groups, entry всех веток)', () => {
    const result = validateUserCaseDocument(doc);
    expect(result.errors).toEqual([]);
  });

  it('гидратация на доску не падает и раскладывает все 6 веток + группы плаката', () => {
    const state = hydrateBoardFromDocument(doc);
    expect(state.scenarioMainNodes.some((node) => node.data.nodeKind === 'make-detection-fusion')).toBe(true);
    expect(state.scenarioMainNodes.some((node) => node.data.nodeKind === 'make-combined-report')).toBe(true);
    expect(state.scenarioAlarmNodes.some((node) => node.data.nodeKind === 'make-proximity-trend')).toBe(true);
    expect(state.scenarioInitialNodes.some((node) => node.data.nodeKind === 'start-recording')).toBe(true);
    expect(state.scenarioOnConnectNodes.some((node) => node.data.nodeKind === 'get-journal')).toBe(true);
    expect(state.variables.some((variable) => variable.id === DETECTION_ALARM_GAMMA_JOURNAL_VARIABLE_ID)).toBe(true);
    expect(doc.scenario.commentGroups).toHaveLength(6);
    const branches = new Set(doc.scenario.commentGroups.map((group) => group.branch));
    expect(branches.has('initial')).toBe(true);
    expect(branches.has('main')).toBe(true);
    expect(branches.has('alarm')).toBe(true);
  });

  it('migrate-on-load не подменяет документ bundled MVP (v09/v20/gate/policy-чеки)', () => {
    expect(shouldMigrateMicrophoneScenarioToBundledMvp(doc)).toBe(false);
  });
});
