# Night Hunt: monorepo-dependency-graph

| Поле | Значение |
|------|----------|
| Week | 2026-39 |
| Generated (UTC) | 2026-09-21T14:05:55.295Z |
| Channel | claude |

---

## Находки

- **Граф внутренних пакетов (§1)** декларирует три жёстких инварианта, которые чаще всего нарушаются на практике:
  - `@membrana/core` не должен импортировать *ничего* из других внутренних пакетов — типовое нарушение: обратная зависимость `core → agenda/device-board`, вносимая «ради удобного типа».
  - `@membrana/agenda` и `@membrana/device-board` не зависят друг от друга — типовое нарушение: горизонтальный импорт между ними (обычно через shared-хелпер, который забыли вынести в `core`).
  - `apps/client` может зависеть от любого пакета, но не наоборот — типовое нарушение: пакет тянет что-то из `apps/client/*` (утечка клиентского кода в переиспользуемый слой).
- **Слой `packages/services/*` (§1a)** запрещает сервис↔сервис зависимости; единственные легальные внутренние ребра — `@membrana/core` и (для `detectors/*`) `detector-base` + `audio-engine-service` для типов окна. Частый дефект: сервис импортирует другой сервис напрямую, минуя `core`.
- **Центр аудио-обработки (§1b):** только `@membrana/audio-engine-service` вправе обращаться к Web Audio API. Нарушение — прямые `new AudioContext()`, `getUserMedia(...)`, `createAnalyser()` в модулях/плагинах/детекторах вместо публичного API engine'а.
- **Детекторы (§1e):** запрещены импорты между детекторами и импорты детекторов из analyzer-сервисов (`fft-analyzer`). Каждый `*-detector-service` замкнут на `core` + `detector-base`.
- **Регистрация (§1c):** обход фасада `MembranaRegistry` через прямой `useMembranaStore.getState().registerModule(...)` — архитектурное нарушение, привязывающее клиента к внутреннему API store.

## Риски

- **Циклы зависимостей** (`core ↔ agenda`, `agenda ↔ device-board`, сервис ↔ сервис) ломают инкрементальную сборку Turbo и tree-shaking, деградируют время CI и раздувают dev-чанки Vite.
- **Обратные рёбра `services/* → apps/client` или `services/* → agenda/device-board`** делают сервис непереносимым и нарушают контракт «чистая бизнес-логика + тонкий React-слой», подрывая foundation↔analyzer переиспользование.
- **Прямой доступ к Web Audio вне engine'а** приводит к утечкам `MediaStream`/`AudioContext`, конфликтам за микрофон и неконтролируемому lifecycle — особенно опасно на пути к shipped-кандидату `DRONE_TIGHT`.
- **Дублирование калибровочных чисел `DRONE_TIGHT`** в client вместо thin-facade (§калибровка) создаёт рассинхрон между пакетом-каноном, benchmark-sync и клиентом → расхождение метрик gate.
- **Разморозка сетевых пакетов** (`tdoa`/`localizer`/`tracker`/`transport`) через случайный импорт до прохождения hard-gate нарушает стратегию Single-Node-First.

## Рекомендации

- Ввести автоматическую проверку графа в CI (`dependency-cruiser` или eslint-boundaries) с явными правилами: запрет `core → *`, `agenda ↔ device-board`, `services/* → services/*` (кроме исключений §1a/§1e), `* → apps/client`.
- Добавить lint-правило, запрещающее вне `audio-engine-service` идентификаторы `AudioContext`, `getUserMedia`, `createAnalyser`, `decodeAudioData`, `MediaStream` (allowlist по пути пакета).
- Добавить правило на запрет прямого `useMembranaStore.getState().registerModule(` вне store; регистрация — только через `MembranaRegistry`.
- Настроить `no-restricted-imports` для `detectors/*`: разрешены только `@membrana/core`, `@membrana/detector-base`, `@membrana/audio-engine-service`; запрет любых `*-detector-service` друг у друга и импортов детекторов из `fft-analyzer`.
- Поставить diff-guard: JSON `curated-drone-templates.json` в пакете и в `data/detectors-benchmark/v0.2/` должны совпадать; падение CI при рассинхроне и при появлении числовых литералов калибровки в `droneTightCalibration.ts`.

## Чеклист weekly review (граф пакетов)

- [ ] Прогнан `dependency-cruiser`/аналог — 0 циклов между внутренними пакетами.
- [ ] `@membrana/core` не импортирует ни один `@membrana/*` (проверить граф входящих ребер только).
- [ ] Нет ребра `agenda ↔ device-board` (в обе стороны).
- [ ] Ни один пакет из `packages/*` и `packages/services/*` не импортирует из `apps/client/*`.
- [ ] Каждый `packages/services/*` зависит только от `@membrana/core` + внешних npm (исключения §1e явно оправданы).
- [ ] Ни один `*-detector-service` не импортирует другой детектор; `fft-analyzer` не тянет детекторы.
- [ ] Прямых обращений к Web Audio API вне `audio-engine-service` — нет (grep + lint зелёный).
- [ ] Регистрация модулей/плагинов идёт только через `MembranaRegistry` (нет прямого `registerModule` из store).
- [ ] Замороженные сетевые пакеты (`tdoa/localizer/tracker/transport`) не имеют входящих импортов из клиента.
- [ ] `DRONE_TIGHT` JSON синхронен между пакетом-каноном и benchmark-каталогом; client-facade без дублей чисел.
