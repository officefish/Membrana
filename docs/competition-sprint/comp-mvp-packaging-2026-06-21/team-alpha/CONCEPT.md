# Concept — Team Alpha (Vesnin + Музыкант)

## One-liner

**«Live Observation Pipeline»** — UserCase как **три акта** на canvas: подключение → наблюдение в эфире → аккуратное завершение; audio chain читается как **partiturа**, не как схема.

## Product thesis

Оператор микрофонного поста думает **временем и звуком**, не ветками XYFlow. Мы упаковываем MVP в **operator journey map**: каждый comment group = **акт спектакля**, каждая user function = **макро-шаг**, который можно объяснить вслух за 10 секунд.

Музыкант гарантирует: **ни один audio ref не «висят в воздухе»** — от mic до track/report видна causality (labels, group descriptions, порядок exec слева направо = forward in time).

## Architecture

| Слой | Решение |
|------|---------|
| **Поставка** | `usercase-mvp-microphone-alpha` — fork MVP document, тот же runtime |
| **Пакеты** | Только `docs/device-board-scripts/` + build → `default-usercase-mvp-microphone-alpha.generated.ts` |
| **Core / client** | **Не трогаем** — apply через catalog fork или bundled entry (Phase 2) |

```text
[Act I Bootstrap]     initial + onConnect  (comment groups: «Старт», «Подключение»)
[Act II Live]         main                 (groups: Gate · Trends · Journal)
[Act III Teardown]    onStop + onDisconnect
```

### User functions (2)

| id | name | Содержимое collapsed |
|----|------|----------------------|
| `fn-alpha-bootstrap` | Bootstrap device & stream | onConnect chain + initial mic/stream/journal refs |
| `fn-alpha-observation-tick` | Observation tick | recording gate slice + trends publish slice (pins: stream in, report out) |

Main canvas после collapse: **~8–10 видимых нод** + 4 comment frames.

## Key decisions (ADR-lite)

| ID | Решение | Альтернатива | Почему так |
|----|---------|--------------|------------|
| A1 | 3 акта = 3 цветовые семантики групп (primary / warning / success) | Одна группа на main | Journey > engineering zones |
| A2 | Function «Observation tick» объединяет gate+trends | Две functions | Один «heartbeat» main loop |
| A3 | RU descriptions в groups с **audio units** («5 s WAV», «48 kHz stream») | English tech | Operator locale |
| A4 | initial/onConnect **не** collapse — видны bootstrap шаги | Всё в functions | Onboarding новичка |

## Trade-offs

| Плюс | Минус |
|------|-------|
| Мгновенная narrativa для demo | main всё ещё dense до collapse |
| Audio causality явная | 2 functions = pin discipline при правках |
| Совместимо с verify-layout | Build второго bundled id в catalog (Phase 2) |

## Phase 2 plan

### 2α — vertical slice

- Fork MVP JSON → `usercase-mvp-microphone-alpha/`
- Переразметить **main**: 4 comment groups (Policy · Gate · Trends · Journal) + exec LR
- Collapse **только** trends+publish subgraph в `fn-alpha-observation-tick` (partial)
- `yarn usercase:build usercase-mvp-microphone-alpha` + verify-kinds
- Demo: F4 trends publish PASS

### 2β — full DoD

- Полный collapse gate+trends в function или split per ADR A2 final
- Bootstrap function на onConnect subgraph
- `verify-layout` green; recording + trends smoke
- Catalog entry optional stub (bundled tier)

## Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Function pins mismatch runtime | Copy pin types from MVP collapse recipe; test Run 45 ticks |
| Group rects overlap after edit | `applyUserCaseLayoutCanon` + verify-layout |

## Demo narrative (2–3 мин)

1. «**Акт I** — подключаем журнал и микрофон, видите зелёную рамку „Старт“.»
2. «**Акт II** — main: слеva policy, центр **5 секунд gate** (жёлтая рамка), справа trends и journal.»
3. «Run — слышим/видим upload track и отчёт в journal. **Акт III** — Stop.»

---

*Team Alpha · Phase 1 · comp-mvp-packaging-2026-06-21*
