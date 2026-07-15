import { describe, expect, it } from 'vitest';
import {
  SCENARIO_NODE_KINDS,
  parseDeviceScenarioDocument,
  type ScenarioGraphEdge,
  type ScenarioSubgraph,
} from '@membrana/core';

import {
  FREE_SPECTRUM_LIVE_USER_CASE_ID,
  MVP_MAIN_ANCHORS,
  REMOVED_MVP_RECORDING_NODE_IDS,
  REMOVED_MVP_TRACK_NODE_IDS,
  REMOVED_MVP_WINDOW_CLOCK_NODE_IDS,
  SPECTRUM_LIVE_EXPECTED_TICK_MS,
  SPECTRUM_LIVE_MAIN,
  SPECTRUM_LIVE_SEQUENCE_THEN_COUNT,
  SPECTRUM_LIVE_TRENDS_POLICY,
  SPECTRUM_LIVE_WINDOW_MS,
  getFreeSpectrumLiveDocument,
} from './usercase-free-spectrum-live.js';
import { validateUserCaseDocument } from '../runtime/validators/validate-user-case-document.js';
import { hydrateBoardFromDocument } from './hydrate-board-from-document.js';

/**
 * Cowork Sprint `cowork-free-fragment-usercases`, блок `spectrum-live`, Phase 2:
 * структурные тесты деривации — валидность, состав ветвей, гард палитры,
 * policy-значения, вычитание трековой ветви.
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

describe('usercase-free-spectrum-live (Phase 2)', () => {
  const document = getFreeSpectrumLiveDocument();
  const main = document.scenario.loops.main;
  const alarm = document.scenario.loops.alarm;

  it('id каталога соответствует брифу', () => {
    expect(FREE_SPECTRUM_LIVE_USER_CASE_ID).toBe('usercase-free-spectrum-live');
  });

  it('loadDocument возвращает валидный непустой device-scenario v2', () => {
    const parsed = parseDeviceScenarioDocument(document);
    expect(parsed.ok).toBe(true);
    expect(document.deviceKind).toBe('microphone');
    expect(main.nodes.length).toBeGreaterThan(0);
    expect(document.meta?.title).toContain('Спектр');
  });

  it('чистая валидация документа — ноль ошибок (links, structure, parameters)', () => {
    const result = validateUserCaseDocument(document);
    expect(result.errors, JSON.stringify(result.errors, null, 2)).toHaveLength(0);
  });

  it('кэш loadDocument идемпотентен (один и тот же инстанс)', () => {
    expect(getFreeSpectrumLiveDocument()).toBe(document);
  });

  // ── Гард брифа: НОВЫХ УЗЛОВ ПАЛИТРЫ НЕ ВВОДИТЬ ──
  it('все nodeKind всех ветвей ∈ SCENARIO_NODE_KINDS', () => {
    const kinds = new Set<string>(SCENARIO_NODE_KINDS);
    const branches: ScenarioSubgraph[] = [
      document.scenario.initial,
      document.scenario.onConnect,
      main,
      alarm,
      document.scenario.triggers.onStop,
      document.scenario.triggers.onDisconnect,
    ];
    const graphs = [...branches, ...document.scenario.functions];
    for (const graph of graphs) {
      for (const n of graph.nodes) {
        if (n.nodeKind === undefined) {
          // subgraph-блоки пользовательских функций (fn-1/fn-3) вида не имеют
          expect(n.blockKind, n.id).toBe('subgraph');
          continue;
        }
        expect(kinds.has(n.nodeKind), `${n.id}: ${n.nodeKind}`).toBe(true);
      }
    }
  });

  // ── L36: entry-id обязаны совпадать с каноном ──
  it('деривация MVP: канонические точки входа всех ветвей (L36)', () => {
    expect(document.scenario.initial.entry).toBe('initial-event');
    expect(document.scenario.onConnect.entry).toBe('on-connect-event');
    expect(main.entry).toBe('main-on-tick');
    expect(alarm.entry).toBe('alarm-on-tick');
    expect(document.scenario.triggers.onStop.entry).toBe('on-stop-event');
    expect(document.scenario.triggers.onDisconnect.entry).toBe('on-disconnect-event');
  });

  it('деривация MVP: bootstrap/onConnect/teardown/функции/переменные сохранены', () => {
    // PC-2c: bootstrap-вызов StartRecording (fn-1-block) снят, StartStreaming — хвост потока.
    expect(document.scenario.initial.nodes.some((n) => n.id === 'fn-1-block')).toBe(false);
    expect(document.scenario.initial.nodes.some((n) => n.nodeKind === 'start-streaming')).toBe(true);
    // bootstrap не оставил висячих рёбер на снятый узел записи
    expect(
      document.scenario.initial.edges.some((e) => e.source === 'fn-1-block' || e.target === 'fn-1-block'),
    ).toBe(false);
    expect(document.scenario.onConnect.nodes.length).toBeGreaterThan(0);
    expect(document.scenario.triggers.onStop.nodes.length).toBeGreaterThan(0);
    expect(document.scenario.triggers.onDisconnect.nodes.length).toBeGreaterThan(0);
    // fn-1 (StartRecording) удалена — не зовётся; остаётся только fn-3 (GetAudioStream).
    expect(document.scenario.functions.map((fn) => fn.id).sort()).toEqual(['fn-3']);
    expect(document.scenario.variables.some((v) => v.type === 'JournalRef')).toBe(true);
  });

  // ── PC-2c: полная развязка наблюдения от ЗАПИСИ ──
  it('PC-2c: ни start-recording, ни stop-recording ни в одной ветви и функции', () => {
    const branches: ScenarioSubgraph[] = [
      document.scenario.initial,
      document.scenario.onConnect,
      main,
      alarm,
      document.scenario.triggers.onStop,
      document.scenario.triggers.onDisconnect,
    ];
    const graphs = [...branches, ...document.scenario.functions];
    for (const graph of graphs) {
      for (const n of graph.nodes) {
        expect(
          ['start-recording', 'stop-recording'].includes(n.nodeKind ?? ''),
          `${graph.entry}:${n.id}`,
        ).toBe(false);
      }
    }
    // Удалённые id записи отсутствуют в main вместе с их рёбрами (0 висячих/сирот).
    for (const removedId of REMOVED_MVP_RECORDING_NODE_IDS) {
      expect(main.nodes.some((n) => n.id === removedId), removedId).toBe(false);
      expect(
        main.edges.some((e) => e.source === removedId || e.target === removedId),
        removedId,
      ).toBe(false);
    }
  });

  // Мутация-проба не вхолостую: вернём stop-recording узел — инвариант «нет записи» краснеет.
  it('мутация-проба: возврат stop-recording узла нарушает инвариант «нет записи» — КРАСНОЕ', () => {
    const mutated = structuredClone(getFreeSpectrumLiveDocument());
    mutated.scenario.loops.main.nodes.push({
      id: 'mut-stop-recording',
      blockKind: 'custom',
      nodeKind: 'stop-recording',
      label: 'StopRecording',
      position: { x: 0, y: 0 },
      supportsAsync: true,
    });
    const hasRecording = mutated.scenario.loops.main.nodes.some(
      (n) => n.nodeKind === 'stop-recording' || n.nodeKind === 'start-recording',
    );
    expect(hasRecording).toBe(true);
    // Инвариант держится ТОЛЬКО на нетронутом документе:
    expect(main.nodes.some((n) => n.nodeKind === 'stop-recording' || n.nodeKind === 'start-recording')).toBe(false);
  });

  // ── Состав ветвей: живой луп ровно один ──
  it('alarm остаётся пустой заглушкой канона — alarm-loop у блока нет', () => {
    expect(alarm.nodes.map((n) => n.id).sort()).toEqual(['alarm-infinity', 'alarm-on-tick']);
    expect(alarm.edges).toHaveLength(1);
    expect(findEdge(alarm, { kind: 'exec', source: 'alarm-on-tick', target: 'alarm-infinity' })).toBeDefined();
  });

  it('одиночная модальность: ни ensemble, ни fusion, ни branch-on-detection, ни proximity', () => {
    const forbidden = [
      'make-ensemble-analysis',
      'make-detection-fusion',
      'branch-on-detection',
      'make-proximity-trend',
      'make-combined-report',
    ];
    for (const graph of [main, alarm]) {
      for (const kind of forbidden) {
        expect(graph.nodes.some((n) => n.nodeKind === kind), kind).toBe(false);
      }
    }
  });

  // ── Вычитание трековой ветви ──
  it('трековая ветвь вычтена: узлы и их рёбра удалены', () => {
    for (const removedId of REMOVED_MVP_TRACK_NODE_IDS) {
      expect(main.nodes.some((n) => n.id === removedId), removedId).toBe(false);
      expect(
        main.edges.some((e) => e.source === removedId || e.target === removedId),
        removedId,
      ).toBe(false);
    }
    // Ни одного узла трековых видов не осталось
    for (const kind of ['make-track', 'make-report-from-track', 'collect-samples', 'start-async-job']) {
      expect(main.nodes.some((n) => n.nodeKind === kind), kind).toBe(false);
    }
    expect(main.edges.some((e) => e.kind === 'event')).toBe(false);
  });

  // ── Спектральная цепочка ──
  it('main: цепочка захвата спектра сохранена байт-в-байт от входа до кадра', () => {
    for (const [source, target] of [
      [MVP_MAIN_ANCHORS.entry, MVP_MAIN_ANCHORS.streamFn],
      [MVP_MAIN_ANCHORS.streamFn, MVP_MAIN_ANCHORS.sample],
      [MVP_MAIN_ANCHORS.sample, MVP_MAIN_ANCHORS.frame],
      [MVP_MAIN_ANCHORS.frame, MVP_MAIN_ANCHORS.collectFrames],
    ] as const) {
      expect(findEdge(main, { kind: 'exec', source, target }), `${source}→${target}`).toBeDefined();
    }
  });

  // ── PC-2b: часы окна свапнуты на is-window-elapsed (host-clock, без рекордера) ──
  it('main: окно наблюдения — CollectFftFrames → IsWindowElapsed; true → Sequence, false → ∞', () => {
    // Ровно один is-window-elapsed
    const iwe = main.nodes.filter((n) => n.nodeKind === 'is-window-elapsed');
    expect(iwe).toHaveLength(1);
    expect(iwe[0]?.id).toBe(SPECTRUM_LIVE_MAIN.windowElapsed);
    expect(iwe[0]?.windowElapsedMs).toBe(SPECTRUM_LIVE_WINDOW_MS);

    expect(
      findEdge(main, {
        kind: 'exec',
        source: MVP_MAIN_ANCHORS.collectFrames,
        target: SPECTRUM_LIVE_MAIN.windowElapsed,
      }),
    ).toBeDefined();
    expect(
      findEdge(main, {
        kind: 'exec',
        source: SPECTRUM_LIVE_MAIN.windowElapsed,
        sourceHandle: 'exec-true-out',
        target: MVP_MAIN_ANCHORS.sequence,
      }),
    ).toBeDefined();
    expect(
      findEdge(main, {
        kind: 'exec',
        source: SPECTRUM_LIVE_MAIN.windowElapsed,
        sourceHandle: 'exec-false-out',
        target: MVP_MAIN_ANCHORS.infinity,
      }),
    ).toBeDefined();
    // Спектр больше не тащит рекордер-часы: ни get-recorder, ни is-recording-window-full
    for (const kind of ['get-recorder', 'is-recording-window-full']) {
      expect(main.nodes.some((n) => n.nodeKind === kind), kind).toBe(false);
    }
    // is-window-elapsed не имеет data-провода recorder (владелец времени — host-часы)
    expect(
      main.edges.some(
        (e) => e.target === SPECTRUM_LIVE_MAIN.windowElapsed && e.kind === 'data',
      ),
    ).toBe(false);
  });

  // ── PC-2b: рекордер-часы вычтены как узлы + рёбра ──
  it('часы «рекордер как таймер» вычтены: узлы и их рёбра удалены', () => {
    for (const removedId of REMOVED_MVP_WINDOW_CLOCK_NODE_IDS) {
      expect(main.nodes.some((n) => n.id === removedId), removedId).toBe(false);
      expect(
        main.edges.some((e) => e.source === removedId || e.target === removedId),
        removedId,
      ).toBe(false);
    }
  });

  // ── PC-2b гард-инвариант (СЕРДЦЕ консилиума): окно ≥ measurementsCount кадров ──
  it('гард: windowElapsedMs / tick ≥ measurementsCount (защита от L11 insufficient-subsample)', () => {
    // читаем ИЗ СОБРАННОГО документа, не из констант
    const iwe = nodeById(main, SPECTRUM_LIVE_MAIN.windowElapsed);
    const policy = nodeById(main, MVP_MAIN_ANCHORS.trendsPolicy).fftTrendsPolicy;
    const windowElapsedMs = iwe.windowElapsedMs;
    const measurementsCount = policy?.measurementsCount;
    expect(windowElapsedMs, 'windowElapsedMs узла').toBeDefined();
    expect(measurementsCount, 'measurementsCount policy').toBeDefined();
    const framesPerWindow = (windowElapsedMs ?? 0) / SPECTRUM_LIVE_EXPECTED_TICK_MS;
    expect(
      framesPerWindow,
      `окно ${windowElapsedMs} мс / тик ${SPECTRUM_LIVE_EXPECTED_TICK_MS} мс = ${framesPerWindow} кадров < ${measurementsCount}`,
    ).toBeGreaterThanOrEqual(measurementsCount ?? 0);
  });

  // Гард не вхолостую: заниженное окно роняет инвариант (мутация-проба величины).
  it('гард-проба: windowMs=2000 при tick 500 даёт 4 кадра < measurementsCount(5) — КРАСНОЕ', () => {
    const mutatedWindowMs = 2000;
    expect(mutatedWindowMs / SPECTRUM_LIVE_EXPECTED_TICK_MS).toBeLessThan(
      SPECTRUM_LIVE_TRENDS_POLICY.measurementsCount,
    );
  });

  // Мутация-проба структуры: битый target ребра iwe→Sequence ловит валидатор.
  it('мутация-проба: битое ребро IsWindowElapsed→Sequence ловится валидатором — КРАСНОЕ', () => {
    const mutated = structuredClone(getFreeSpectrumLiveDocument());
    const mutatedMain = mutated.scenario.loops.main;
    const trueEdge = mutatedMain.edges.find(
      (e) => e.source === SPECTRUM_LIVE_MAIN.windowElapsed && e.sourceHandle === 'exec-true-out',
    );
    expect(trueEdge, 'ребро iwe→Sequence существует до мутации').toBeDefined();
    trueEdge!.target = 'node-does-not-exist';
    const result = validateUserCaseDocument(mutated);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some((e) => e.code === 'block-missing-target')).toBe(true);
  });

  it('main: Sequence переиндексирован в 2 then — наблюдение | рестарт (запись снята)', () => {
    expect(nodeById(main, MVP_MAIN_ANCHORS.sequence).sequenceConfig?.thenCount).toBe(
      SPECTRUM_LIVE_SEQUENCE_THEN_COUNT,
    );
    for (const [handle, target] of [
      ['then-0', MVP_MAIN_ANCHORS.flush],
      ['then-1', MVP_MAIN_ANCHORS.restartStreamFn],
      ['exec-out', MVP_MAIN_ANCHORS.infinity],
    ] as const) {
      expect(
        findEdge(main, { kind: 'exec', source: MVP_MAIN_ANCHORS.sequence, sourceHandle: handle, target }),
        handle,
      ).toBeDefined();
    }
    // then-2/then-3 больше нет (сняты StopRecording и трековая ветвь); дыры then нет (L35 sequence-then-skip)
    for (const handle of ['then-2', 'then-3'] as const) {
      expect(main.edges.some((e) => e.source === MVP_MAIN_ANCHORS.sequence && e.sourceHandle === handle), handle).toBe(false);
    }
    // ни один then Sequence не ведёт в stop-recording
    expect(main.nodes.some((n) => n.nodeKind === 'stop-recording')).toBe(false);
  });

  // PC-2c: рестарт перезапускает ПОТОК (не запись); целостность Sequence сохранена (L35)
  it('main: рестарт потока сохранён (PC-2c) — Sequence then-1 → restartStream, без StartRecording', () => {
    // restartStreamFn достижим от Sequence и остаётся хвостом рестарта
    expect(
      findEdge(main, {
        kind: 'exec',
        source: MVP_MAIN_ANCHORS.sequence,
        sourceHandle: 'then-1',
        target: MVP_MAIN_ANCHORS.restartStreamFn,
      }),
    ).toBeDefined();
    expect(main.nodes.some((n) => n.id === MVP_MAIN_ANCHORS.restartStreamFn)).toBe(true);
    // рестарт больше не зовёт StartRecording: fn-1-block снят, у restartStream нет исходящего exec
    expect(main.nodes.some((n) => n.id === 'fn-1-block')).toBe(false);
    expect(
      main.edges.some((e) => e.kind === 'exec' && e.source === MVP_MAIN_ANCHORS.restartStreamFn),
    ).toBe(false);
  });

  it('main: наблюдение — flush → гейт кадров → тренды → гейт анализа → отчёт → publish → print', () => {
    for (const [source, target] of [
      [MVP_MAIN_ANCHORS.flush, SPECTRUM_LIVE_MAIN.framesGate],
      [MVP_MAIN_ANCHORS.trendsAnalysis, SPECTRUM_LIVE_MAIN.analysisGate],
      [MVP_MAIN_ANCHORS.reportFromAnalysis, MVP_MAIN_ANCHORS.publishReport],
      [MVP_MAIN_ANCHORS.publishReport, SPECTRUM_LIVE_MAIN.printObservation],
    ] as const) {
      expect(findEdge(main, { kind: 'exec', source, target }), `${source}→${target}`).toBeDefined();
    }
    for (const [gate, target] of [
      [SPECTRUM_LIVE_MAIN.framesGate, MVP_MAIN_ANCHORS.trendsAnalysis],
      [SPECTRUM_LIVE_MAIN.analysisGate, MVP_MAIN_ANCHORS.reportFromAnalysis],
    ] as const) {
      expect(
        findEdge(main, { kind: 'exec', source: gate, sourceHandle: 'exec-true-out', target }),
        gate,
      ).toBeDefined();
    }
  });

  // L11 / L26 / L28: гейты защищают от пустого окна и несобравшегося анализа
  it('main: оба is-valid гейта читают ref нетипизированным ребром (L26), false — конец ветки', () => {
    for (const [source, sourceHandle, gate] of [
      [MVP_MAIN_ANCHORS.flush, 'frames', SPECTRUM_LIVE_MAIN.framesGate],
      [MVP_MAIN_ANCHORS.trendsAnalysis, 'analysis', SPECTRUM_LIVE_MAIN.analysisGate],
    ] as const) {
      const edge = findEdge(main, { kind: 'data', source, sourceHandle, target: gate, targetHandle: 'value' });
      expect(edge, gate).toBeDefined();
      // нетипизированное ребро: dataType отсутствует
      expect(edge?.dataType, gate).toBeUndefined();
      // false-ветка никуда не ведёт — пустой отчёт не публикуется
      expect(main.edges.some((e) => e.source === gate && e.sourceHandle === 'exec-false-out'), gate).toBe(false);
    }
  });

  it('main: типизированный вход трендов — кадры от flush, policy от конструктора', () => {
    expect(
      findEdge(main, {
        kind: 'data',
        source: MVP_MAIN_ANCHORS.flush,
        sourceHandle: 'frames',
        target: MVP_MAIN_ANCHORS.trendsAnalysis,
        targetHandle: 'frames',
        dataType: 'FftFrameRefList',
      }),
    ).toBeDefined();
    expect(
      findEdge(main, {
        kind: 'data',
        source: MVP_MAIN_ANCHORS.trendsPolicy,
        target: MVP_MAIN_ANCHORS.trendsAnalysis,
        targetHandle: 'policy',
        dataType: 'FftTrendsPolicy',
      }),
    ).toBeDefined();
  });

  // CONCEPT §5: measurementsCount ≤ кадров за окно, иначе insufficient-subsample (L11)
  it('main: policy наблюдения — 5 измерений (≤ ≈8 кадров за окно 4 c), шаг 500 мс', () => {
    const policy = nodeById(main, MVP_MAIN_ANCHORS.trendsPolicy).fftTrendsPolicy;
    expect(policy?.measurementsCount).toBe(SPECTRUM_LIVE_TRENDS_POLICY.measurementsCount);
    // ≤ кадров за окно наблюдения (windowMs / tick) — тот же инвариант, что гард-тест
    expect(policy?.measurementsCount).toBeLessThanOrEqual(
      SPECTRUM_LIVE_WINDOW_MS / SPECTRUM_LIVE_EXPECTED_TICK_MS,
    );
    expect(policy?.intervalMs).toBe(SPECTRUM_LIVE_TRENDS_POLICY.intervalMs);
    expect(policy?.minConfidence).toBe(0.55);
    expect(policy?.minRms).toBe(0.02);
    expect(policy?.enabledTemplateKeys).toContain('DRONE_TIGHT');
    // Окно трендов не длиннее окна наблюдения (4 c): (5-1)×500 мс = 2 c
    const spanMs =
      ((policy?.measurementsCount ?? 0) - 1) * (policy?.intervalMs ?? 0);
    expect(spanMs).toBeLessThanOrEqual(SPECTRUM_LIVE_WINDOW_MS);
  });

  // Стаб карточки каталога: общий free-tier-user-case-entries.ts в изолированной
  // фазе не трогаю — форму записи фиксирую у себя (EXPECTATIONS «Мои стабы»).
  it('стаб карточки каталога: фактические поля выводятся из документа', () => {
    const expectedCatalogEntry = {
      id: FREE_SPECTRUM_LIVE_USER_CASE_ID,
      deviceKind: 'microphone',
      tier: 'bundled',
      layoutProfile: 'exec-lr-v1',
      branchCount: 1,
      functionCount: 1,
    } as const;

    expect(document.deviceKind).toBe(expectedCatalogEntry.deviceKind);
    expect(document.scenario.functions).toHaveLength(expectedCatalogEntry.functionCount);
    // branchCount = живые лупы: main живой, alarm — пустая заглушка
    const liveLoops = Object.values(document.scenario.loops).filter((loop) => loop.nodes.length > 2);
    expect(liveLoops).toHaveLength(expectedCatalogEntry.branchCount);
  });

  it('документ гидратируется в board-state (канвас пикера/редактора)', () => {
    const state = hydrateBoardFromDocument(document);
    expect(state.scenarioMainNodes.some((n) => n.id === MVP_MAIN_ANCHORS.trendsAnalysis)).toBe(true);
    expect(state.scenarioMainNodes.some((n) => n.id === SPECTRUM_LIVE_MAIN.framesGate)).toBe(true);
    expect(state.scenarioMainNodes.some((n) => n.id === MVP_MAIN_ANCHORS.infinity)).toBe(true);
    expect(state.variables.length).toBeGreaterThan(0);
  });
});
