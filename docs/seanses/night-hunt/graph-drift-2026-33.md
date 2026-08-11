# Night Hunt: monorepo-dependency-graph

| Поле | Значение |
|------|----------|
| Week | 2026-33 |
| Generated (UTC) | 2026-08-11T08:30:37.316Z |
| Channel | claude |

---

# Weekly-отчёт `monorepo-dependency-graph` — 2026-33

## Находки

- **Класс нарушения «cross-service import»**: сервис из `packages/services/*` импортирует другой сервис напрямую (`@membrana/fft-analyzer-service` → `@membrana/audio-engine-service` и т.п.). По §1a допустимы только `@membrana/core` + внешние npm; единственное исключение — `detectors/*` (см. §1e). Все прочие межсервисные рёбра — нарушение.
- **Класс нарушения «detector cross-import»**: рёбра между `*-detector-service` (например `harmonic → yamnet`, `cepstral → spectral-flux`). По §1e детектор зависит **только** от `@membrana/core` + `@membrana/detector-base`; горизонтальные связи запрещены.
- **Класс нарушения «core не изолирован»**: любое ребро `@membrana/core → @membrana/*` (агенда, device-board, любой сервис). По §1 `core` — листовой узел графа, не зависит ни от кого внутри проекта.
- **Класс нарушения «agenda ↔ device-board»**: прямое ребро между `@membrana/agenda` и `@membrana/device-board` в любую сторону — запрещено §1 (оба зависят только от `core`).
- **Класс нарушения «Web Audio в обход engine»**: `new AudioContext()`, `getUserMedia`, `createAnalyser`, `decodeAudioData` вне `@membrana/audio-engine-service` (§1b). Формально не ребро графа, но нарушение центрального узла — трекать в этом же отчёте.

## Риски

- **Циклы через `detector-base`**: `detector-base` зависит от `audio-engine-service` (§1e); если какой-либо сервис начнёт импортировать `detector-base` в обратную сторону — возникнет цикл `audio-engine ← detector-base ← service`. Высокий риск при добавлении shared-типов.
- **Дрейф калибровки `DRONE_TIGHT`**: числа могут просочиться из `apps/client` или `background-media` в shipped-каталог в обход канона `template-match/src/data/curated-drone-templates.json` (§«Калибровка»). Дублирование чисел = скрытая зависимость данных, не видимая в графе импортов.
- **Разъезд benchmark-sync**: `data/detectors-benchmark/v0.2/curated-drone-templates.json` и пакетный JSON держатся в sync вручную — риск молчаливого расхождения, ломающего `yarn benchmark:detectors`.
- **Оживление frozen-пакетов**: `tdoa/localizer/tracker/transport` (@stage 2) могут быть по ошибке подключены в `apps/client` до прохождения hard-gate (precision ≥85%, recall ≥90%) — нарушение заморозки §1e.
- **Прямой `registerModule`**: обход `MembranaRegistry` через `useMembranaStore.getState().registerModule(...)` (§1c) привязывает клиента к внутреннему API store — архитектурная зависимость вне фасада.

## Рекомендации

- **CI-правило графа**: добавить проверку (dependency-cruiser / eslint-plugin-boundaries) с матрицей разрешённых рёбер: `core → ∅`; `agenda,device-board → core`; `service → core + npm`; `detector → core + detector-base`; `apps/client → *`. Любое ребро вне матрицы = fail.
- **Detection циклов**: включить acyclic-проверку в тот же CI-шаг; отдельно алертить на рёбра, ведущие в `detector-base` из сервисов.
- **Grep-guard на Web Audio**: lint-правило, запрещающее `AudioContext|getUserMedia|createAnalyser|decodeAudioData` вне `packages/services/audio-engine/**`.
- **Sync-тест каталога**: тест-ассерт, сравнивающий `template-match/src/data/curated-drone-templates.json` с `data/detectors-benchmark/v0.2/...` (fail при diff); grep на числовые литералы порогов в `apps/client/src/lib/droneTightCalibration.ts`.
- **Freeze-guard**: запретить импорт `@membrana/{tdoa,localizer,tracker,transport}-service` из `apps/client` до снятия флага gate.

---

## Чеклист weekly review — граф зависимостей

**Изоляция ядра и слоёв**
- [ ] `@membrana/core` не импортирует ни один внутренний пакет.
- [ ] Нет ребра `@membrana/agenda ↔ @membrana/device-board`.
- [ ] `agenda` и `device-board` зависят только от `core`.

**Сервисы (`packages/services/*`)**
- [ ] Ни один сервис не импортирует другой сервис (кроме `detectors/*` по §1e).
- [ ] Сервисы зависят только от `@membrana/core` + внешних npm.
- [ ] Публичный API каждого сервиса — только через `src/index.ts` (нет deep-import'ов).
- [ ] `fft-analyzer` и прочие analyzer вне `detectors/` не импортируют детекторы.

**Детекторы (`packages/services/detectors/*`)**
- [ ] Каждый `*-detector-service` зависит только от `core` + `detector-base`.
- [ ] Нет горизонтальных импортов между детекторами.
- [ ] `detector-base` зависит только от `core` + `audio-engine-service` (нет обратных рёбер → нет цикла).
- [ ] Frozen-пакеты `tdoa/localizer/tracker/transport` не подключены в `apps/client`.

**Web Audio / центральный узел**
- [ ] Прямых обращений к Web Audio API вне `audio-engine-service` нет.
- [ ] Новые аудио-фичи потребляют engine через публичный API (LiveSampler / хуки).

**Регистрация клиента**
- [ ] Нет прямых вызовов `useMembranaStore.getState().registerModule(...)` — только `MembranaRegistry`.
- [ ] Все модули регистрируются как lazy; `finalizeRegistration()` вызывается один раз.

**Данные калибровки (скрытые зависимости)**
- [ ] Канон `DRONE_TIGHT` живёт только в `template-match/src/data/curated-drone-templates.json`.
- [ ] Benchmark-JSON в sync с пакетным.
- [ ] `apps/client/.../droneTightCalibration.ts` — thin facade без дублирования чисел.

**Общее**
- [ ] Граф ацикличен (CI acyclic-check зелёный).
- [ ] Все межпакетные импорты идут через алиасы `@membrana/*`, не через относительные пути.
