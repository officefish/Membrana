import { describe, expect, it } from 'vitest';
import {
  SCENARIO_NODE_KINDS,
  parseDeviceScenarioDocument,
  type DeviceScenarioDocument,
  type ScenarioGraphEdge,
  type ScenarioSubgraph,
} from '@membrana/core';

import {
  FREE_NEURO_DETECTION_USER_CASE_ID,
  MVP_MAIN_ANCHORS,
  NEURO_MAIN,
  REPLACED_MVP_MAIN_NODE_IDS,
  getFreeNeuroDetectionDocument,
} from './usercase-free-neuro-detection.js';
import type { UserCaseCatalogEntry } from '../catalog/user-case-catalog-types.js';
import { validateUserCaseDocument } from '../runtime/validators/validate-user-case-document.js';
import { hydrateBoardFromDocument } from './hydrate-board-from-document.js';

/**
 * Block `neuro-detection` · Cowork Sprint `cowork-free-fragment-usercases` (#487),
 * Phase 2: структурные тесты деривации — состав ветвей, отсутствие новых
 * node-kind, нейро-цепочка и честный fallback.
 *
 * Собственный DoD блока: проходит БЕЗ кода соседей (блоки не связаны потоком
 * данных; стаб карточки каталога живёт здесь же, в прод-каталог не пишется).
 */

/** Стаб строки каталога — замещает правку `free-tier-user-case-entries.ts`,
 * которую координатор сделает на интеграции (регламент §Hard rules 3;
 * общий корневой файл в изолированной фазе не трогает никто). */
const NEURO_DETECTION_CATALOG_ENTRY_STUB: UserCaseCatalogEntry = {
  id: FREE_NEURO_DETECTION_USER_CASE_ID,
  title: 'FREE · Нейро-детекция (yamnet)',
  description:
    'Одиночная нейро-модальность: yamnet по окну сэмплов → отчёт в журнал. ' +
    'При недоступной модели — видимая метка, вердикт не публикуется.',
  deviceKind: 'microphone',
  tier: 'bundled',
  layoutProfile: 'exec-lr-v1',
  branchCount: 1,
  functionCount: 2,
  loadDocument: getFreeNeuroDetectionDocument,
};

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

/** Все подграфы документа (ветви + функции) — для сквозных гардов. */
function allSubgraphs(document: DeviceScenarioDocument): readonly (readonly [string, ScenarioSubgraph])[] {
  return [
    ['initial', document.scenario.initial],
    ['onConnect', document.scenario.onConnect],
    ['main', document.scenario.loops.main],
    ['alarm', document.scenario.loops.alarm],
    ['onStop', document.scenario.triggers.onStop],
    ['onDisconnect', document.scenario.triggers.onDisconnect],
    ...document.scenario.functions.map((fn) => [`fn:${fn.id}`, fn] as const),
  ] as const;
}

describe('usercase-free-neuro-detection (Cowork Phase 2)', () => {
  const document = getFreeNeuroDetectionDocument();
  const main = document.scenario.loops.main;
  const alarm = document.scenario.loops.alarm;

  it('id каталога соответствует заготовке брифа', () => {
    expect(FREE_NEURO_DETECTION_USER_CASE_ID).toBe('usercase-free-neuro-detection');
  });

  it('loadDocument возвращает валидный непустой device-scenario v2', () => {
    const parsed = parseDeviceScenarioDocument(document);
    expect(parsed.ok).toBe(true);
    expect(document.deviceKind).toBe('microphone');
    expect(main.nodes.length).toBeGreaterThan(0);
    expect(document.meta?.title).toBe('FREE · Нейро-детекция (yamnet)');
    // Адаптер интеграции (INTERFACE_CONTRACT §5): FREE-шаблон НЕ competition —
    // иначе isCompetitionStructureLocked заблокировал бы правку структуры у
    // бесплатного пользователя. Гард против регресса штампа.
    expect(document.meta?.executionPolicy).not.toBe('competition');
  });

  it('чистая валидация документа — ноль ошибок (links, structure, parameters)', () => {
    const result = validateUserCaseDocument(document);
    expect(result.errors, JSON.stringify(result.errors, null, 2)).toHaveLength(0);
  });

  it('кэш loadDocument идемпотентен (один и тот же инстанс)', () => {
    expect(getFreeNeuroDetectionDocument()).toBe(document);
  });

  // ── Гард брифа: новых узлов палитры не введено ──────────────────────────────

  it('🚫 новых node-kind нет: каждый узел каждой ветви ∈ SCENARIO_NODE_KINDS', () => {
    const known = new Set<string>(SCENARIO_NODE_KINDS);
    for (const [branch, subgraph] of allSubgraphs(document)) {
      for (const node of subgraph.nodes) {
        if (node.nodeKind === undefined) {
          // subgraph-блок вызова функции — не палитра
          expect(node.blockKind, `${branch}/${node.id}`).toBe('subgraph');
          continue;
        }
        expect(known.has(node.nodeKind), `${branch}/${node.id}: ${node.nodeKind}`).toBe(true);
      }
    }
  });

  // ── Состав ветвей ──────────────────────────────────────────────────────────

  it('состав ветвей: initial/onConnect/main/alarm/onStop/onDisconnect + fn-1/fn-3', () => {
    expect(document.scenario.initial.nodes.some((n) => n.id === 'fn-1-block')).toBe(true);
    expect(document.scenario.onConnect.nodes.length).toBeGreaterThan(0);
    expect(document.scenario.triggers.onStop.nodes.length).toBeGreaterThan(0);
    expect(document.scenario.triggers.onDisconnect.nodes.length).toBeGreaterThan(0);
    expect(document.scenario.functions.map((fn) => fn.id).sort()).toEqual(['fn-1', 'fn-3']);
    expect(document.scenario.variables.some((v) => v.type === 'JournalRef')).toBe(true);
  });

  it('L36: точки входа всех ветвей — канонические (наследованы деривацией)', () => {
    expect(document.scenario.initial.entry).toBe('initial-event');
    expect(document.scenario.onConnect.entry).toBe('on-connect-event');
    expect(main.entry).toBe('main-on-tick');
    expect(alarm.entry).toBe('alarm-on-tick');
    expect(document.scenario.triggers.onStop.entry).toBe('on-stop-event');
    expect(document.scenario.triggers.onDisconnect.entry).toBe('on-disconnect-event');
    // точка входа обязана присутствовать среди узлов своей ветви
    for (const [branch, subgraph] of allSubgraphs(document)) {
      expect(subgraph.nodes.some((n) => n.id === subgraph.entry), branch).toBe(true);
    }
  });

  it('alarm: заглушка MVP байт-в-байт — alarm-лупа нет by design', () => {
    expect(alarm.nodes.map((n) => n.id).sort()).toEqual(['alarm-infinity', 'alarm-on-tick']);
    expect(findEdge(alarm, { kind: 'exec', source: 'alarm-on-tick', target: 'alarm-infinity' })).toBeDefined();
  });

  // ── Декомпозиция: что отброшено ────────────────────────────────────────────

  it('снятые узлы MVP (report-секция + FFT-машинерия) и их рёбра удалены', () => {
    for (const removedId of REPLACED_MVP_MAIN_NODE_IDS) {
      expect(main.nodes.some((n) => n.id === removedId), removedId).toBe(false);
      expect(
        main.edges.some((e) => e.source === removedId || e.target === removedId),
        removedId,
      ).toBe(false);
    }
  });

  it('одиночная модальность: без trends, без fusion, без branch-on-detection, без proximity', () => {
    const forbidden = [
      'make-fft-trends-analysis',
      'make-fft-trends-policy',
      'make-detection-fusion',
      'branch-on-detection',
      'make-proximity-trend',
      // FFT-машинерия кормила только trends
      'get-fft-frame',
      'collect-fft-frames',
      'get-spectral-analyser',
      'flush-spectral-analyser',
    ];
    for (const [branch, subgraph] of allSubgraphs(document)) {
      for (const node of subgraph.nodes) {
        expect(forbidden, `${branch}/${node.id}`).not.toContain(node.nodeKind);
      }
    }
  });

  it('ровно один детектор в документе — нейро (make-ensemble-analysis)', () => {
    const detectors = allSubgraphs(document).flatMap(([, s]) =>
      s.nodes.filter((n) => n.nodeKind === 'make-ensemble-analysis'),
    );
    expect(detectors.map((n) => n.id)).toEqual([NEURO_MAIN.ensemble]);
  });

  // ── Декомпозиция: что сохранено из MVP/combined ────────────────────────────

  it('цепочка добычи сэмплов сохранена; после снятия FFT — GetSample → CollectSamples', () => {
    expect(
      findEdge(main, { kind: 'exec', source: 'main-on-tick', target: 'fn-3-block' }),
      'L20: entry → fn-3-block',
    ).toBeDefined();
    expect(
      findEdge(main, { kind: 'exec', source: 'fn-3-block', target: MVP_MAIN_ANCHORS.getSample }),
    ).toBeDefined();
    expect(
      findEdge(main, {
        kind: 'exec',
        source: MVP_MAIN_ANCHORS.getSample,
        target: MVP_MAIN_ANCHORS.collectSamples,
      }),
      'перепайка после снятия FFT',
    ).toBeDefined();
    // окно сэмплов — канон MVP, блок его не переопределяет (CONCEPT N4)
    expect(nodeById(main, MVP_MAIN_ANCHORS.collectSamples).collectorConfig?.windowSec).toBe(3);
  });

  it('L35: цепочка записи MVP сохранена — stop-recording имеет exec-путь к рестарту', () => {
    const sequence = nodeById(main, MVP_MAIN_ANCHORS.sequenceGate);
    expect(sequence.sequenceConfig?.thenCount).toBe(4);
    expect(
      findEdge(main, { kind: 'exec', source: MVP_MAIN_ANCHORS.sequenceGate, sourceHandle: 'then-0' }),
    ).toBeDefined();
    // then-3 → fn-3-block-2 → fn-1-block (рестарт записи из канона)
    expect(
      findEdge(main, {
        kind: 'exec',
        source: MVP_MAIN_ANCHORS.sequenceGate,
        sourceHandle: 'then-3',
        target: 'fn-3-block-2',
      }),
    ).toBeDefined();
    expect(findEdge(main, { kind: 'exec', source: 'fn-3-block-2', target: 'fn-1-block' })).toBeDefined();
    // async track-upload MVP жив
    expect(main.nodes.some((n) => n.id === 'node-start-async-job-v20')).toBe(true);
    expect(
      findEdge(main, {
        kind: 'event',
        source: MVP_MAIN_ANCHORS.onTrackUploaded,
        target: NEURO_MAIN.printTrackUploaded,
      }),
    ).toBeDefined();
  });

  // ── Ядро блока: нейро-цепочка ──────────────────────────────────────────────

  it('нейро-канал: then-2 → MakeEnsembleAnalysis ← окно сэмплов CollectSamples', () => {
    expect(
      findEdge(main, {
        kind: 'exec',
        source: MVP_MAIN_ANCHORS.sequenceGate,
        sourceHandle: 'then-2',
        target: NEURO_MAIN.ensemble,
      }),
    ).toBeDefined();
    expect(
      findEdge(main, {
        kind: 'data',
        source: MVP_MAIN_ANCHORS.collectSamples,
        sourceHandle: 'batches',
        target: NEURO_MAIN.ensemble,
        targetHandle: 'samples',
      }),
    ).toBeDefined();
  });

  it('N2 честный fallback: isValid на анализе — false → метка, отчёт НЕ публикуется', () => {
    expect(nodeById(main, NEURO_MAIN.modelGate).nodeKind).toBe('is-valid');
    expect(findEdge(main, { kind: 'exec', source: NEURO_MAIN.ensemble, target: NEURO_MAIN.modelGate })).toBeDefined();
    // ребро в гейт — нетипизированное (иначе type-mismatch на холодном старте, L26/L28)
    const gateEdge = findEdge(main, {
      kind: 'data',
      source: NEURO_MAIN.ensemble,
      target: NEURO_MAIN.modelGate,
      targetHandle: 'value',
    });
    expect(gateEdge).toBeDefined();
    expect(gateEdge?.dataType).toBeUndefined();
    // true → отчёт; false → видимая метка
    expect(
      findEdge(main, {
        kind: 'exec',
        source: NEURO_MAIN.modelGate,
        sourceHandle: 'exec-true-out',
        target: NEURO_MAIN.report,
      }),
    ).toBeDefined();
    expect(
      findEdge(main, {
        kind: 'exec',
        source: NEURO_MAIN.modelGate,
        sourceHandle: 'exec-false-out',
        target: NEURO_MAIN.printUnavailable,
      }),
    ).toBeDefined();
    expect(nodeById(main, NEURO_MAIN.printUnavailable).nodeKind).toBe('print');
    // молчаливой деградации нет: false-ветка ничего не публикует и никуда не ведёт
    expect(main.edges.some((e) => e.kind === 'exec' && e.source === NEURO_MAIN.printUnavailable)).toBe(false);
  });

  it('ADR-0006 нейро-отчёт: MakeReportFromAnalysis(reporter + один нейро-анализ), НЕ combined', () => {
    // Честный узел одиночного детектора, а не MakeCombinedReport (узел не врёт «combined»).
    expect(nodeById(main, NEURO_MAIN.report).nodeKind).toBe('make-report-from-analysis');
    for (const [handle, source] of [
      ['reporter', MVP_MAIN_ANCHORS.getReporter],
      ['analysis', NEURO_MAIN.ensemble],
    ] as const) {
      expect(
        findEdge(main, { kind: 'data', source, target: NEURO_MAIN.report, targetHandle: handle }),
        handle,
      ).toBeDefined();
    }
    // Одиночный отчётник: ни второго анализа (combined-вход), ни трека.
    for (const absent of ['analysis-1', 'analysis-2', 'track'] as const) {
      expect(
        main.edges.some((e) => e.kind === 'data' && e.target === NEURO_MAIN.report && e.targetHandle === absent),
        absent,
      ).toBe(false);
    }
    // Во всём графе нет узла make-combined-report (нейро-одиночка его больше не носит).
    expect(main.nodes.some((n) => n.nodeKind === 'make-combined-report')).toBe(false);
  });

  it('L25: публикация нейро-отчёта — detached через report-build job', () => {
    expect(nodeById(main, NEURO_MAIN.reportJob).asyncJobConfig?.jobKind).toBe('report-build');
    expect(findEdge(main, { kind: 'exec', source: NEURO_MAIN.report, target: NEURO_MAIN.reportJob })).toBeDefined();
    expect(
      findEdge(main, {
        kind: 'data',
        source: NEURO_MAIN.reportJob,
        sourceHandle: 'promise',
        target: NEURO_MAIN.onReportBuilt,
        targetHandle: 'promise',
      }),
    ).toBeDefined();
    expect(
      findEdge(main, { kind: 'event', source: NEURO_MAIN.onReportBuilt, target: NEURO_MAIN.publishNeuro }),
    ).toBeDefined();
    for (const [handle, source] of [
      ['journal', MVP_MAIN_ANCHORS.journalVarGet],
      ['report', NEURO_MAIN.report],
    ] as const) {
      expect(
        findEdge(main, { kind: 'data', source, target: NEURO_MAIN.publishNeuro, targetHandle: handle }),
        handle,
      ).toBeDefined();
    }
  });

  it('L20/L22/L23: exec-цепочка main без сирот — каждый узел достижим', () => {
    // корни: точка входа + on-async-resolved (самостоятельные корни detached-диспетчеризации)
    const roots = [
      main.entry,
      ...main.nodes.filter((n) => n.nodeKind === 'on-async-resolved').map((n) => n.id),
    ];
    const seen = new Set<string>(roots);
    const queue = [...roots];
    while (queue.length > 0) {
      const cur = queue.shift() as string;
      for (const e of main.edges) {
        if ((e.kind === 'exec' || e.kind === 'event') && e.source === cur && !seen.has(e.target)) {
          seen.add(e.target);
          queue.push(e.target);
        }
      }
    }
    // чистые data-источники exec-цепочке не принадлежат by design
    const pureDataKinds = new Set(['device-global', 'variable-get', 'get-recorder', 'get-reporter']);
    const orphans = main.nodes.filter((n) => !seen.has(n.id) && !pureDataKinds.has(n.nodeKind ?? ''));
    expect(orphans.map((n) => n.id), 'сироты exec-цепочки').toEqual([]);
    // каждое on-async-resolved реально питается промисом (иначе detached-ветвь мертва)
    for (const n of main.nodes.filter((n) => n.nodeKind === 'on-async-resolved')) {
      expect(
        main.edges.some((e) => e.kind === 'data' && e.target === n.id && e.targetHandle === 'promise'),
        `${n.id}: promise`,
      ).toBe(true);
    }
  });

  // ── Каталог (стаб) и канвас ────────────────────────────────────────────────

  it('стаб карточки каталога отдаёт документ этого блока (замещает интеграцию)', () => {
    expect(NEURO_DETECTION_CATALOG_ENTRY_STUB.loadDocument()).toBe(document);
    expect(NEURO_DETECTION_CATALOG_ENTRY_STUB.branchCount).toBe(1);
    expect(NEURO_DETECTION_CATALOG_ENTRY_STUB.functionCount).toBe(document.scenario.functions.length);
  });

  it('документ гидратируется в board-state (канвас пикера/редактора)', () => {
    const state = hydrateBoardFromDocument(document);
    expect(state.scenarioMainNodes.some((n) => n.id === NEURO_MAIN.ensemble)).toBe(true);
    expect(state.scenarioMainNodes.some((n) => n.id === NEURO_MAIN.modelGate)).toBe(true);
    expect(state.scenarioAlarmNodes.some((n) => n.id === 'alarm-on-tick')).toBe(true);
    expect(state.variables.length).toBeGreaterThan(0);
  });
});
