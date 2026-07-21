# Night Hunt: monorepo-dependency-graph

| Поле | Значение |
|------|----------|
| Week | 2026-30 |
| Generated (UTC) | 2026-07-21T08:30:39.476Z |
| Channel | claude |

---

# Weekly-отчёт: `monorepo-dependency-graph` — неделя 2026-30

## Находки

- **Граф §1 задаёт строгий DAG.** `@membrana/core` — корень без внутренних зависимостей; `@membrana/agenda` и `@membrana/device-board` зависят только от `core` и **не друг от друга**; `apps/client` — единственный «сток», которому разрешены зависимости на любые внутренние пакеты. Любое ребро против этих направлений = нарушение.
- **Сервисный слой (§1a) — узкая политика зависимостей.** `packages/services/*` могут импортировать **только** `@membrana/core` + внешние npm. Сервис→сервис, сервис→`agenda`/`device-board`/`apps/client` запрещены. Единственное исключение — `packages/services/detectors/*` (§1e).
- **Детекторы (§1e) — жёсткая изоляция.** Каждый `*-detector-service` → только `@membrana/core` + `@membrana/detector-base`; `detector-base` → `core` + `audio-engine-service`. Импорты между детекторами (harmonic↔yamnet и т.п.) и импорт детекторов из analyzer-сервисов (`fft-analyzer`) запрещены.
- **Единственный узел Web Audio (§1b).** Только `@membrana/audio-engine-service` имеет право на `AudioContext`/`getUserMedia`/`createAnalyser`. Прямой вызов этих API из других пакетов — архитектурное нарушение, эквивалентное «обходу графа».
- **Калибровка `DRONE_TIGHT` (§1e).** Канон чисел — в пакете `template-match`; `apps/client/.../droneTightCalibration.ts` должен быть thin facade без дублирования порогов/temporal, а `background-media` не должен подменять shipped-каталог.

## Типичные нарушения графа

- **Циклы.** `core → любой пакет` (core обязан быть листом-корнем); двунаправленное ребро `agenda ↔ device-board`; цикл через `src/index.ts` реэкспорты (A импортирует barrel B, B — barrel A).
- **client→services в обход alias.** Импорт из `packages/services/*/src/internal` вместо публичного `src/index.ts`; регистрация модулей напрямую через `useMembranaStore.getState().registerModule(...)` вместо `MembranaRegistry` (§1c).
- **service→service / service→app.** Любой `@membrana/*-service` импортирует другой сервис, `@membrana/agenda`, `@membrana/device-board` или что-либо из `apps/client`.
- **background-* утечки.** Импорт `@membrana/background-office` / `@membrana/background-media` (NestJS-серверов) из фронтовых пакетов или сервисов; `background-media` как источник истины для shipped `DRONE_TIGHT`.
- **detector-cross-imports.** `harmonic-detector` ↔ `yamnet-detector`; `fft-analyzer` → любой детектор; детектор → `audio-engine-service` напрямую (должен идти через `detector-base`/`AudioWindow`).
- **Прямой Web Audio.** `new AudioContext()`, `createAnalyser()`, `getUserMedia()` вне `audio-engine-service`.

## Риски

- **Frozen-пакеты (§1e).** `tdoa/localizer/tracker/transport-service` заморожены до gate 1→2 (precision ≥85%, recall ≥90%). Любое новое ребро в клиент/сервисы к ним — преждевременная разморозка сети.
- **Barrel-циклы незаметны для eslint по путям.** Циклы через `@membrana/*` alias + реэкспорты `index.ts` часто проходят мимо простых правил `no-restricted-imports` и всплывают только на этапе сборки Vite/tree-shaking.
- **Дрейф калибровки.** Рассинхрон `packages/.../curated-drone-templates.json` ↔ `data/detectors-benchmark/v0.2/...` даёт расхождение между `yarn benchmark:detectors` и prod-кандидатом эшелона 0 (`DRONE_TIGHT`).
- **Alias-на-исходники (dev).** `apps/client/vite.config.ts` резолвит сервисы на `src`, поэтому запрещённое ребро может «работать» в dev и упасть только при изоляционной сборке пакета.

## Рекомендации

1. **Автоматизировать граф-проверку в CI:** прогонять `madge --circular` (или dependency-cruiser) по `@membrana/*` alias'ам; правило dependency-cruiser с явным whitelisting направлений §1/§1a/§1e и `error` на любое ребро против DAG.
2. **Enforce публичного API:** eslint `no-restricted-imports` с паттерном `@membrana/*/src/**` (кроме `src/index.ts`) — блокировать deep-imports и barrel-циклы.
3. **Grep-gate на Web Audio и store-обход:** CI-проверка на `new AudioContext|createAnalyser|getUserMedia` вне `audio-engine-service` и на `useMembranaStore.getState().registerModule` вне store.
4. **Sync-check калибровки:** шаг CI, сверяющий байтовое равенство `template-match/.../curated-drone-templates.json` и `data/detectors-benchmark/v0.2/...`; fail при расхождении.
5. **Frozen-guard:** правило, запрещающее импорт `tdoa|localizer|tracker|transport-service` из client/сервисов до снятия флага gate 1→2.

## Чеклист weekly review

- [ ] `core` не импортирует ни один внутренний пакет (лист-корень).
- [ ] Нет ребра `agenda ↔ device-board` (ни прямого, ни через barrel).
- [ ] `madge --circular` по alias'ам — 0 циклов.
- [ ] Каждый `packages/services/*` (кроме `detectors/*`) зависит только от `core` + npm.
- [ ] Ни один сервис не импортирует другой сервис / `agenda` / `device-board` / `apps/client`.
- [ ] Каждый `*-detector-service` → только `core` + `detector-base`; нет detector↔detector.
- [ ] `fft-analyzer` и прочие analyzer-сервисы не импортируют детекторы.
- [ ] Все межпакетные импорты — через `@membrana/*` alias и `src/index.ts` (нет deep-import в `src/internal`).
- [ ] Нет прямого Web Audio API вне `audio-engine-service`.
- [ ] Модули/плагины регистрируются через `MembranaRegistry`, без `useMembranaStore.getState().registerModule`.
- [ ] Нет импортов `background-office` / `background-media` из фронта/сервисов.
- [ ] `DRONE_TIGHT` curated JSON синхронен между пакетом и benchmark-каталогом; `droneTightCalibration.ts` не дублирует числа.
- [ ] Frozen-пакеты сети (`tdoa/localizer/tracker/transport`) не подключены в client/сервисы.
