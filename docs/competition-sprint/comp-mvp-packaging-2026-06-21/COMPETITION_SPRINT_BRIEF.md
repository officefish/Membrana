# Competition Sprint Brief: MVP UserCase — упаковка продукта

| Поле | Значение |
|------|----------|
| **sprintId** | `comp-mvp-packaging-2026-06-21` |
| **GitHub Issue** | *(optional — создать по запросу)* |
| **baseBranch** | `main` @ `b73fd4f` (merge PR #137 U9) |
| **teams** | alpha, beta, gamma |
| **LGTM Product** | 2026-06-21 — старт sprint |
| **LGTM Vesnin** | Phase 0 open |

---

## Problem

Bundled **`usercase-mvp-microphone`** функционально доказан (LGTM 2026-06-21), но graph на canvas — **инженерный чертёж**, а не **продукт для оператора**. Три команды независимо переупаковывают **тот же runtime** в наглядный, аккуратный, «приятный» UserCase, используя **все editor-возможности device-board** (comment groups, user functions, exec-layout, align).

**Соревнование не в новой логике**, а в **качестве упаковки** сценария.

---

## Функциональный паритет (обязателен для всех)

Runtime-поведение **эквивалентно** MVP v0.8:

| # | Поведение | Критерий приёмки |
|---|-----------|------------------|
| F1 | Bootstrap | onConnect + initial: journal, device, mic, stream |
| F2 | Recording gate | Окно записи → MakeTrack → upload (не блокирует tick) |
| F3 | Policy | MakeRecordingPolicy + MakeFftTrendsPolicy (constructors) |
| F4 | Trends + report | Collect FFT → classify → MakeReportFromAnalysis → PublishReport (`trends-fft/v0.1`) |
| F5 | Teardown | onStop / onDisconnect — корректная остановка |
| F6 | Run | Main loop end-to-end без ручного import JSON (bundled или apply-all) |

**Запрещено:** менять node kinds, ломать pure/data contracts, обходить audio-engine, писать sidecar-плагины для observation.

---

## Editor toolbox (must use ≥3 из списка)

| Инструмент | Минимум |
|------------|---------|
| **Comment groups** | ≥4 semantic frames на `main` (+ optional на других ветках) |
| **User functions** | ≥2 collapsed functions **или** 1 function + глубокая декомposition |
| **Exec layout LR** | `layoutProfile: exec-lr-v1`, `yarn usercase:verify-layout` green |
| **Align / smart align** | явное использование на финальном документе |
| **Variables** | journal ref mapping сохранён |

---

## Состав команд (исполнители)

| Команда | Codename | Состав | Фокус упаковки |
|---------|----------|--------|----------------|
| **A** | `alpha` | **Vesnin** (Teamlead) + **Музыкант** | Operator journey, audio chain clarity, end-to-end narrative |
| **B** | `beta` | **Ozhegov** (Структурщик) + **Dynin** (Математик) | Модульность через functions, измеримый layout, verify metrics |
| **C** | `gamma` | **Rodchenko** (Верстальщик) | Визуальная иерархия, цвет/типографика групп, минимализм canvas |

### Жюри Phase 4 (голосование)

Все пять ролей; Музыкант оценивает **F1–F6 audio path** + operator clarity.

---

## Definition of Done (Phase 2β — общий)

- [x] Новый UserCase id: `usercase-mvp-microphone-<team>` (`alpha`|`beta`|`gamma`)
- [x] `manifest.json` + `yarn usercase:build` + `verify-kinds` + **`verify-layout` green**
- [x] Comment groups с title + description (RU operator copy)
- [x] User functions documented в CONCEPT + в graph
- [ ] Demo script ниже — **PASS** на ветке команды *(Phase 3 manual)*
- [x] `packages/device-board` tests green; smoke recording + trends parity не регресс
- [x] `CONCEPT.md` §Implementation + commit hash final *(hash at commit)*

---

## Out of scope

- Новые node kinds / core contracts
- Tariff / catalog UI changes (U9 уже в main)
- Alarm loop journal (stub OK как в MVP)
- Server-side CRUD UserCase

---

## Demo script (единый для Consilium Phase 3)

1. Settings → UserCases catalog ON → board → UserCase modal → apply **своей** команды (или bundled fork).
2. **Run** → onConnect bootstrap (INFO logs: journal, mic, stream).
3. Main tick ≥45: `recording-window-full` → track upload; trends publish `trends-fft/v0.1`.
4. **Stop** → clean shutdown.
5. Скриншот / описание: canvas main — «продуктовая» читаемость за **≤30 сек** объяснения новому оператору.

---

## Evaluation hints (жюри)

| Критерий | Подсказка |
|----------|-----------|
| C1 DoD | Все F1–F6 |
| C2 Architecture | Только document + scripts; без client hacks |
| C3 Layout metrics | verify-layout + node count on main |
| C4 UX | Comment groups как «карта продукта» |
| C5 Maintainability | Functions vs spaghetti |
| C6 Debt | Не раздули scope |

---

## Timeline

| Phase | Target |
|-------|--------|
| **1** Concept | Day 0 (2026-06-21) |
| **2α** Proof (main happy path + 1 function) | +1 day |
| **2β** Full DoD | +2 days |
| **3–4** Consilium + vote | +0.5 day |
| **5** Merge winner | +0.5 day |

---

## Deliverable paths (per team)

```
docs/device-board-scripts/usercase-mvp-microphone-<team>/
  manifest.json
  *.json (branch sources)
docs/competition-sprint/comp-mvp-packaging-2026-06-21/team-<team>/
  CONCEPT.md
packages/device-board/src/graph/default-usercase-mvp-microphone-<team>.generated.ts  (build output)
```

Ветка Git: `comp/comp-mvp-packaging-2026-06-21/<team>`
