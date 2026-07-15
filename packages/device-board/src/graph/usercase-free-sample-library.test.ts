import { describe, expect, it } from 'vitest';
import {
  SCENARIO_NODE_KINDS,
  parseDeviceScenarioDocument,
  type ScenarioGraphEdge,
  type ScenarioSubgraph,
} from '@membrana/core';

import { DEFAULT_USERCASE_MVP_MICROPHONE_DOCUMENT } from './default-usercase-mvp-microphone.generated.js';
import {
  FREE_SAMPLE_LIBRARY_USER_CASE_ID,
  MVP_RECORDING_ANCHORS,
  REMOVED_MVP_MAIN_NODE_IDS,
  SAMPLE_LIBRARY_COMMENT_GROUPS,
  SAMPLE_LIBRARY_SEQUENCE_THEN_COUNT,
  getFreeSampleLibraryDocument,
} from './usercase-free-sample-library.js';
import { validateUserCaseDocument } from '../runtime/validators/validate-user-case-document.js';
import { hydrateBoardFromDocument } from './hydrate-board-from-document.js';

/**
 * Block `sample-recording` · Cowork Sprint `cowork-free-fragment-usercases` (#487),
 * Phase 2: структурные тесты деривации-вычитанием — валидность документа, полная
 * запись-цепочка, отсутствие детекции, гард «только зарегистрированные узлы».
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

/** Виды узлов, которые в этом сценарии не имеют права появиться (заказ владельца). */
const DETECTION_NODE_KINDS = [
  'make-fft-trends-analysis',
  'make-fft-trends-policy',
  'make-ensemble-analysis',
  'make-detection-fusion',
  'branch-on-detection',
  'make-proximity-trend',
  'make-combined-report',
  'make-report-from-analysis',
  'flush-spectral-analyser',
  'get-spectral-analyser',
  'get-fft-frame',
  'collect-fft-frames',
] as const;

describe('usercase-free-sample-library (Phase 2)', () => {
  const document = getFreeSampleLibraryDocument();
  const main = document.scenario.loops.main;

  /** Все подграфы документа: 6 ветвей + пользовательские функции. */
  const allSubgraphs: readonly ScenarioSubgraph[] = [
    document.scenario.initial,
    document.scenario.onConnect,
    document.scenario.loops.main,
    document.scenario.loops.alarm,
    document.scenario.triggers.onStop,
    document.scenario.triggers.onDisconnect,
    ...document.scenario.functions,
  ];

  it('loadDocument возвращает валидный непустой device-scenario v2', () => {
    const parsed = parseDeviceScenarioDocument(document);
    expect(parsed.ok).toBe(true);
    expect(document.deviceKind).toBe('microphone');
    expect(main.nodes.length).toBeGreaterThan(0);
    expect(document.meta?.title).toContain('Библиотека сэмплов');
  });

  it('чистая валидация документа — ноль ошибок (links, structure, parameters)', () => {
    const result = validateUserCaseDocument(document);
    expect(result.errors, JSON.stringify(result.errors, null, 2)).toHaveLength(0);
  });

  it('кэш loadDocument идемпотентен (один и тот же инстанс)', () => {
    expect(getFreeSampleLibraryDocument()).toBe(document);
  });

  it('id каталога — исторический id каркаса, слаг блока в него не протекает', () => {
    expect(FREE_SAMPLE_LIBRARY_USER_CASE_ID).toBe('usercase-free-sample-library');
  });

  // ── Гард «без новых узлов» (brief §Constraints 1) ──

  it('все nodeKind во всех ветвях и функциях ∈ SCENARIO_NODE_KINDS', () => {
    const registered = new Set<string>(SCENARIO_NODE_KINDS);
    for (const subgraph of allSubgraphs) {
      for (const node of subgraph.nodes) {
        if (node.nodeKind === undefined) {
          // subgraph-блоки пользовательских функций nodeKind не несут
          expect(node.blockKind, node.id).toBe('subgraph');
          continue;
        }
        expect(registered.has(node.nodeKind), `${node.id}: ${node.nodeKind}`).toBe(true);
      }
    }
  });

  it('деривация вычитанием: узлы main — строгое подмножество канона MVP', () => {
    const canonMainIds = new Set(
      DEFAULT_USERCASE_MVP_MICROPHONE_DOCUMENT.scenario.loops.main.nodes.map((n) => n.id),
    );
    const derivedMainIds = main.nodes.map((n) => n.id);
    // ни одного узла сверх канона (гард «новых узлов не вводить» по существу)
    for (const id of derivedMainIds) {
      expect(canonMainIds.has(id), `узел вне канона MVP: ${id}`).toBe(true);
    }
    // и это именно вычитание: снято ровно REMOVED_MVP_MAIN_NODE_IDS
    expect(derivedMainIds).toHaveLength(canonMainIds.size - REMOVED_MVP_MAIN_NODE_IDS.length);
  });

  it('деривация вычитанием: единственное новое ребро main — сшивка GetSample → CollectSamples', () => {
    const edgeKey = (e: ScenarioGraphEdge) =>
      `${e.kind}|${e.source}|${e.sourceHandle ?? ''}|${e.target}|${e.targetHandle ?? ''}`;
    const canonKeys = new Set(
      DEFAULT_USERCASE_MVP_MICROPHONE_DOCUMENT.scenario.loops.main.edges.map((e) =>
        edgeKey(e as ScenarioGraphEdge),
      ),
    );
    const addedKeys = main.edges.map(edgeKey).filter((key) => !canonKeys.has(key));
    expect(addedKeys.sort()).toEqual(
      [
        // сшивка концов после снятия спектрального сбора
        `exec|${MVP_RECORDING_ANCHORS.getSample}|exec-out|${MVP_RECORDING_ANCHORS.collectSamples}|exec-in`,
        // перевешенный рестарт записи (then-3 канона → then-2)
        `exec|${MVP_RECORDING_ANCHORS.sequence}|then-2|${MVP_RECORDING_ANCHORS.restartStreamFn}|exec-in`,
      ].sort(),
    );
  });

  // ── Запись-цепочка (заказ владельца) ──

  it('L36/L22: 6 канонических точек входа и bootstrap записи fn-1 в initial', () => {
    expect(document.scenario.initial.entry).toBe('initial-event');
    expect(document.scenario.onConnect.entry).toBe('on-connect-event');
    expect(document.scenario.loops.main.entry).toBe('main-on-tick');
    expect(document.scenario.loops.alarm.entry).toBe('alarm-on-tick');
    expect(document.scenario.triggers.onStop.entry).toBe('on-stop-event');
    expect(document.scenario.triggers.onDisconnect.entry).toBe('on-disconnect-event');
    // L22: без bootstrap на onStart окно записи никогда не полно
    expect(document.scenario.initial.nodes.some((n) => n.id === 'fn-1-block')).toBe(true);
    expect(document.scenario.functions.map((fn) => fn.id).sort()).toEqual(['fn-1', 'fn-3']);
  });

  it('GetRecorder → StartRecording живут в fn-1 байт-в-байт каноном', () => {
    const fn1 = document.scenario.functions.find((fn) => fn.id === 'fn-1');
    expect(fn1).toBeDefined();
    const kinds = (fn1?.nodes ?? []).map((n) => n.nodeKind);
    expect(kinds).toContain('get-recorder');
    expect(kinds).toContain('start-recording');
    expect(kinds).toContain('make-recording-policy');
    const start = fn1?.nodes.find((n) => n.nodeKind === 'start-recording');
    expect(start?.recordingPolicy?.windowSec).toBe(5);
    expect(start?.recordingPolicy?.captureFormat).toBe('wav');
  });

  it('main: тик сшит GetSample → CollectSamples → IsRecordingWindowFull', () => {
    for (const [source, target] of [
      [MVP_RECORDING_ANCHORS.streamFn, MVP_RECORDING_ANCHORS.getSample],
      // сшивка вместо снятого спектрального сбора (CONCEPT §3.2)
      [MVP_RECORDING_ANCHORS.getSample, MVP_RECORDING_ANCHORS.collectSamples],
      [MVP_RECORDING_ANCHORS.collectSamples, MVP_RECORDING_ANCHORS.windowGate],
    ] as const) {
      expect(findEdge(main, { kind: 'exec', source, target }), `${source}→${target}`).toBeDefined();
    }
    // окно не полно → тик заканчивается, запись продолжается
    expect(
      findEdge(main, {
        kind: 'exec',
        source: MVP_RECORDING_ANCHORS.windowGate,
        sourceHandle: 'exec-false-out',
        target: MVP_RECORDING_ANCHORS.infinity,
      }),
    ).toBeDefined();
    // окно полно → Sequence
    expect(
      findEdge(main, {
        kind: 'exec',
        source: MVP_RECORDING_ANCHORS.windowGate,
        sourceHandle: 'exec-true-out',
        target: MVP_RECORDING_ANCHORS.sequence,
      }),
    ).toBeDefined();
  });

  it('main: инвариант окон — flush сэмплов (3 c) строго раньше гейта записи (5 c)', () => {
    const collectWindowSec = nodeById(main, MVP_RECORDING_ANCHORS.collectSamples).collectorConfig
      ?.windowSec;
    const gateWindowSec = nodeById(main, MVP_RECORDING_ANCHORS.windowGate).recordingPolicy
      ?.windowSec;
    expect(collectWindowSec).toBe(3);
    expect(gateWindowSec).toBe(5);
    expect(collectWindowSec as number).toBeLessThan(gateWindowSec as number);
  });

  it('L23: Sequence перенумерован плотно — 3 Then-ветви без дыр', () => {
    const sequence = nodeById(main, MVP_RECORDING_ANCHORS.sequence);
    expect(sequence.sequenceConfig?.thenCount).toBe(SAMPLE_LIBRARY_SEQUENCE_THEN_COUNT);
    expect(sequence.sequenceConfig?.latentThen).toBe(true);

    const thenHandles = main.edges
      .filter((e) => e.kind === 'exec' && e.source === MVP_RECORDING_ANCHORS.sequence)
      .map((e) => e.sourceHandle)
      .filter((h): h is string => h !== undefined && h.startsWith('then-'))
      .sort();
    expect(thenHandles).toEqual(['then-0', 'then-1', 'then-2']);

    for (const [handle, target] of [
      ['then-0', MVP_RECORDING_ANCHORS.stopRecording],
      ['then-1', MVP_RECORDING_ANCHORS.makeTrack],
      // рестарт записи переехал с then-3 канона (L35: путь к StartRecording после StopRecording)
      ['then-2', MVP_RECORDING_ANCHORS.restartStreamFn],
    ] as const) {
      expect(
        findEdge(main, { kind: 'exec', source: MVP_RECORDING_ANCHORS.sequence, sourceHandle: handle, target }),
        handle,
      ).toBeDefined();
    }
    expect(
      findEdge(main, {
        kind: 'exec',
        source: MVP_RECORDING_ANCHORS.restartStreamFn,
        target: MVP_RECORDING_ANCHORS.restartRecordFn,
      }),
    ).toBeDefined();
  });

  it('main: трек → async track-upload → отчёт → публикация в журнал', () => {
    expect(
      findEdge(main, {
        kind: 'data',
        source: MVP_RECORDING_ANCHORS.stopRecording,
        sourceHandle: 'slice',
        target: MVP_RECORDING_ANCHORS.makeTrack,
        targetHandle: 'slice',
      }),
    ).toBeDefined();
    expect(nodeById(main, MVP_RECORDING_ANCHORS.uploadJob).asyncJobConfig?.jobKind).toBe(
      'track-upload',
    );
    expect(
      findEdge(main, { kind: 'exec', source: MVP_RECORDING_ANCHORS.makeTrack, target: MVP_RECORDING_ANCHORS.uploadJob }),
    ).toBeDefined();
    expect(
      findEdge(main, {
        kind: 'data',
        source: MVP_RECORDING_ANCHORS.uploadJob,
        sourceHandle: 'promise',
        target: MVP_RECORDING_ANCHORS.onTrackUploaded,
        targetHandle: 'promise',
      }),
    ).toBeDefined();
    // выгрузка резолвится → отчёт о треке (detached, main loop не ждёт)
    expect(
      findEdge(main, {
        kind: 'event',
        source: MVP_RECORDING_ANCHORS.onTrackUploaded,
        target: MVP_RECORDING_ANCHORS.reportFromTrack,
      }),
    ).toBeDefined();
    expect(
      findEdge(main, {
        kind: 'data',
        source: MVP_RECORDING_ANCHORS.reportFromTrack,
        target: MVP_RECORDING_ANCHORS.publishReport,
        targetHandle: 'report',
      }),
    ).toBeDefined();
    // журнал у публикации есть — иначе записи некуда класть
    expect(
      findEdge(main, { kind: 'data', target: MVP_RECORDING_ANCHORS.publishReport, targetHandle: 'journal' }),
    ).toBeDefined();
  });

  // ── Отсутствие детекции (заказ владельца) ──

  it('снятые узлы MVP отсутствуют вместе со своими рёбрами', () => {
    for (const removedId of REMOVED_MVP_MAIN_NODE_IDS) {
      expect(main.nodes.some((n) => n.id === removedId), removedId).toBe(false);
      expect(
        main.edges.some((e) => e.source === removedId || e.target === removedId),
        removedId,
      ).toBe(false);
    }
  });

  it('во всём документе нет ни одного детекционного узла', () => {
    const forbidden = new Set<string>(DETECTION_NODE_KINDS);
    for (const subgraph of allSubgraphs) {
      for (const node of subgraph.nodes) {
        expect(
          node.nodeKind === undefined || !forbidden.has(node.nodeKind),
          `${node.id}: ${node.nodeKind ?? ''}`,
        ).toBe(true);
      }
    }
  });

  it('alarm-loop пуст по заказу: onTick → ∞ и ничего больше', () => {
    const alarm = document.scenario.loops.alarm;
    expect(alarm.nodes.map((n) => n.id).sort()).toEqual(['alarm-infinity', 'alarm-on-tick']);
    expect(alarm.edges).toHaveLength(1);
  });

  it('ни одного async-job вида report-build (L25 — реджектившийся вид)', () => {
    for (const subgraph of allSubgraphs) {
      for (const node of subgraph.nodes) {
        if (node.nodeKind === 'start-async-job') {
          expect(node.asyncJobConfig?.jobKind, node.id).toBe('track-upload');
        }
      }
    }
  });

  // ── Комментарии и карточка каталога ──

  it('comment-группы: снятые детекционные убраны, группы блока на месте', () => {
    const groups = document.scenario.commentGroups ?? [];
    const ids = groups.map((g) => g.id);
    for (const removedGroupId of ['group-3', 'group-6', 'group-7']) {
      expect(ids, removedGroupId).not.toContain(removedGroupId);
    }
    expect(ids).toContain(SAMPLE_LIBRARY_COMMENT_GROUPS.capture);
    expect(ids).toContain(SAMPLE_LIBRARY_COMMENT_GROUPS.publish);
    // ни одна группа не ссылается на снятый узел
    const removed = new Set<string>(REMOVED_MVP_MAIN_NODE_IDS);
    for (const group of groups) {
      for (const nodeId of group.nodeIds) {
        expect(removed.has(nodeId), `${group.id}/${nodeId}`).toBe(false);
      }
    }
  });

  /**
   * Стаб карточки каталога: `free-tier-user-case-entries.ts` — общий корневой файл,
   * в изолированной фазе не трогается (loadDocument переключит интеграция). Стаб
   * держит поля карточки в моей зоне и проверяет их против факта графа.
   */
  it('стаб карточки каталога сходится с фактом документа', () => {
    const catalogEntryStub = {
      id: FREE_SAMPLE_LIBRARY_USER_CASE_ID,
      deviceKind: 'microphone',
      tier: 'bundled',
      layoutProfile: 'exec-lr-v1',
      branchCount: 1,
      functionCount: 2,
      loadDocument: getFreeSampleLibraryDocument,
    } as const;

    expect(catalogEntryStub.loadDocument().deviceKind).toBe(catalogEntryStub.deviceKind);
    expect(catalogEntryStub.functionCount).toBe(document.scenario.functions.length);
    // branchCount: живой луп только main (alarm — пустой канон-стаб)
    const liveLoops = [document.scenario.loops.main, document.scenario.loops.alarm].filter(
      (loop) => loop.nodes.length > 2,
    );
    expect(catalogEntryStub.branchCount).toBe(liveLoops.length);
  });

  it('документ гидратируется в board-state (канвас пикера/редактора)', () => {
    const state = hydrateBoardFromDocument(document);
    expect(state.scenarioMainNodes.some((n) => n.id === MVP_RECORDING_ANCHORS.makeTrack)).toBe(true);
    expect(state.scenarioMainNodes.some((n) => n.id === MVP_RECORDING_ANCHORS.windowGate)).toBe(true);
    expect(state.variables.length).toBeGreaterThan(0);
  });
});
