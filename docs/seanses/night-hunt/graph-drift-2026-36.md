# Night Hunt: monorepo-dependency-graph

| Поле | Значение |
|------|----------|
| Week | 2026-36 |
| Generated (UTC) | 2026-09-01T08:30:33.241Z |
| Channel | claude |

---

## Находки

- **Граф §1 в норме на верхнем уровне.** `@membrana/core` не втягивает внутренние пакеты; `@membrana/agenda` и `@membrana/device-board` тянут только `core` и не ссылаются друг на друга. Это ядро правил (§1) на неделе 2026-36 держится.
- **Зона риска — `packages/services/detectors/*`.** По §1e у каждого `*-detector-service` допустимы только `@membrana/core` + `@membrana/detector-base` (плюс `audio-engine-service` для типов окна через `detector-base`). Активная реализация `template-match` (production-кандидат, `DRONE_TIGHT`) и `harmonic` — самые вероятные точки протечки cross-detector импортов при переиспользовании DSP-утилит.
- **Дублирование канона калибровки.** JSON `curated-drone-templates.json` живёт в двух местах (пакет template-match + `data/detectors-benchmark/v0.2/`) и обязан быть в sync руками. Это не нарушение графа, но источник дрейфа истины между `yarn benchmark:detectors` и shipped-каталогом.
- **Facade-обход при регистрации.** §1c требует регистрацию только через `MembranaRegistry`; прямой `useMembranaStore.getState().registerModule(...)` запрещён. Для новых аудио-модулей/плагинов это частый регресс.
- **Единственность Web Audio узла.** §1b: только `audio-engine-service` касается `AudioContext`/`getUserMedia`/`createAnalyser`. Любой новый плагин-визуализатор — кандидат на прямой вызов Web Audio в обход engine'а.

## Риски

- **Циклы через `detector-base`.** Если `detector-base` начнёт импортировать конкретный детектор (для «дефолтного» набора) — возникнет цикл `detector-base ↔ *-detector-service`, ломающий §1e.
- **`client → services` в обход `src/index.ts`.** `apps/client` может зависеть от внутренних пакетов, но импорт вглубь (`.../src/service.ts`, `.../data/*.json`) вместо публичного API размывает контракт и делает shipped-калибровку неуправляемой.
- **Импорт `background-*` на клиенте.** Втягивание `@membrana/background-media` / `background-office` типов/логики напрямую в детекторы или сервисы (вместо remote-фасада для user-шаблонов) нарушает §1/BACKGROUND_SERVERS и создаёт скрытую связность frontend↔NestJS.
- **Оживление frozen-пакетов.** `tdoa/localizer/tracker/transport-service` заморожены до hard-gate (precision ≥85%, recall ≥90%). Любой их импорт в клиент до прохождения gate — нарушение стратегии Single-Node-First.
- **Дрейф `DRONE_TIGHT`.** Рассинхрон между пакетным и benchmark-JSON приведёт к тому, что метрики gate считаются по одному набору порогов, а прод отгружает другой.

## Рекомендации

- **Добавить lint-правило графа в CI.** Запретить: любой импорт между `detectors/*`; импорт `detector-base` из конкретного детектора; импорт `background-*` из `packages/services/**` и детекторов; импорт frozen-пакетов из `apps/client`.
- **Запретить deep-import.** Правило `no-restricted-imports` на пути `@membrana/*/src/**` и `@membrana/*/data/**` — потребление только через `@membrana/<pkg>` (публичный `src/index.ts`).
- **CI-проверка sync калибровки.** Шаг, сравнивающий `packages/services/detectors/template-match/src/data/curated-drone-templates.json` с `data/detectors-benchmark/v0.2/curated-drone-templates.json` (fail при diff).
- **Guard на Web Audio.** Grep/ESLint на `new AudioContext`, `getUserMedia`, `createAnalyser` вне `audio-engine-service` — fail в PR.
- **Guard на registry-фасад.** Запрет прямого `useMembranaStore.getState().registerModule(` вне внутренностей store.

---

### Чеклист weekly review графа пакетов

- [ ] `core` не импортирует внутренние пакеты; `agenda ⊥ device-board` (нет взаимных импортов).
- [ ] Каждый `*-detector-service` зависит только от `core` + `detector-base`; нет cross-detector импортов.
- [ ] `detector-base` не тянет конкретные детекторы (нет цикла).
- [ ] Нет импортов `background-office`/`background-media` из `packages/services/**` и `apps/client` детекторной логики (только remote-фасад для user-шаблонов).
- [ ] Frozen-пакеты (`tdoa/localizer/tracker/transport`) не подключены в клиент; gate не пройден.
- [ ] Все межпакетные импорты идут через `@membrana/*` (нет `.../src/*`, `.../data/*.json`).
- [ ] Прямых вызовов Web Audio вне `audio-engine-service` нет.
- [ ] Регистрация модулей/плагинов — только через `MembranaRegistry` (нет `getState().registerModule`).
- [ ] `curated-drone-templates.json` в пакете и в benchmark идентичны.
- [ ] Новые аудио-фичи размещены в отдельных пакетах и не нарушают граф §1.
