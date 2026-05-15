<!-- Сгенерировано: 2026-05-15T05:39:40.675Z (yarn plan:day) -->
<!-- Период: последние сутки (since="1 day ago"); горизонт: следующий день -->
<!-- Источник цели: WHITE_PAPER.md -->

# План на следующий день

**Дата:** 2026-05-15  
**Статус:** готов к выполнению  
**Горизонт:** следующие сутки (one-day sprint)

---

## 1. Что сделано за период (последние сутки)

### Инфраструктура CI/CD и документация

1. **Еженедельный радар аналайзеров** (`INTEGRATIONS_STRATEGY.md`): новый документ с матрицей оценки звуковых детекторов (L/T/C/Q), каталогом кандидатов по эшелонам (DSP → YAMNet → CLAP → fine-tune), архитектурными шаблонами интеграции в Membrana. Автоматический radar запущен в `scripts/_analyzers-research.mjs` (HF Hub + arXiv + Claude-синтез).

2. **Workflow еженедельного радара** (`.github/workflows/weekly-analyzers-research.yml`): новый GitHub Action, запускается по расписанию (пн 06:00 UTC) за час до недельного плана, перезаписывает `docs/WEEKLY_ANALYZERS_RESEARCH.md`, не блокирует code-review.

3. **Workflow юнит-тестов** (`.github/workflows/unit-tests.yml`): отдельный быстрый CI на `yarn turbo run test --continue`, результат не включён в общий статус.

4. **Persona-система и task-промпты**: новые роли Vesnin (Teamlead) и Dynin (Математик), систематизация `ask-persona` скрипта (--gh-issue, --save-as, автосохранение в `docs/discussions/`), две task-промпта: `API_SERVER_BOOTSTRAP_PROMPT.md` (Этап 1 background-office, merged) и `SERVER_DEPLOYMENT_PROMPT.md` (Этап 5, публичный деплой сервера).

5. **Журнал разработки background-office** (`docs/discussions/background-office-v0.1.md`): полная хронология v0.1 от идеи до 200 OK на GET /health.

### Сервис телеметрии и плагины

6. **@membrana/telemetry-service** (новый foundation-пакет): in-memory TelemetryJournal с append, dedupe, TTL-лимитами. Полная реализация — core (service.ts) + React-хук (useTelemetryJournal) + тесты (Vitest). По правилам SERVICES.md: чистая TS-логика отделена от React-обёртки.

7. **Интеграция микрофонного плагина на новый lifecycle**: plugin.install() / teardown переведены с React-хуков на подписку к microphoneStreamHub (singleton-state через useSyncExternalStore). Добавлен файл `micStreamPluginState.ts` с явной отправкой телеметрии.

8. **Модуль UI журнала телеметрии** (`apps/client/src/modules/telemetry-journal/`): новый модуль категории «Мониторинг» с компонентами JournalEntryRow, детальной типизацией. Регистрация через MembranaRegistry (lazy-loading).

### Background-office (Node.js сервер)

9. **Пакет packages/background-office** (merged, полная реализация): NestJS-сервер с модулями claude/ (controller + 4 service для persona-взаимодействия), github/ (GitHub App auth + Octokit), linear/ (controller + service), webhooks/ (Linear signature + raw body handler), health controller, config (zod-based env.schema), e2e тест, Swagger. Не входит в граф `packages/services/*`, автономен. README + .env.example с явным разделением семей секретов (internal gate / outbound / inbound signing).

10. **Swagger-документация** к background-office endpoints (claude/, linear/, webhooks/, health).

### Фиксы

11. **TS2322 в client#build** (commit `1ccd014`): снята связь `TConfig` между `loader` и `defaultConfig` в `LazyModuleParams` — публичная сигнатура теперь `loader: () => Promise<{ default: ComponentType<any> }>`, с комментарием. Вывод `TConfig` остаётся только из `defaultConfig`. CI проходит: `yarn turbo run lint typecheck test build --continue` — 34/34 tasks successful.

12. **Дублирование title в telemetry-journal UI**: удалено из модуля body.

---

## 2. Привязка к стратегической цели

### Текущий этап дорожной карты

Мы находимся между **Этапом 0 (Фундамент)** и **Этапом 1 (Одинокий слушатель)**:

- ✅ **Фундамент уплотняется**: audio-engine + fft-analyzer работают, их тестирование автоматизировано.
- ✅ **Инфраструктура для новых сервисов готова**: MembranaRegistry, plugin-lifecycle, правила SERVICES.md кристаллизованы и проверены на двух пакетах (telemetry-service + background-office).
- ✅ **Система persona помощи** (Teamlead, Математик) готова к роботизированной разработке сервисов.
- ⏳ **Готовимся к Этапу 1**: нужны `drone-detector-service` (бинарная классификация на спектре), UI индикатор уверенности.

### Что приближает к цели, что — отвлекает

| Коммиты | Приближение | Рейтинг |
|---------|-------------|--------|
| telemetry-service, plugin-lifecycle, registry | Фундамент для трекинга и логирования целей (§5 WHITE_PAPER) | ✅ Прямое |
| background-office (Node.js сервер) | Инфраструктура для persona-контекста и будущих интеграций; не блокирует Этап 1 | ⚠ Параллельное развитие |
| Еженедельный radar аналайзеров | Систематизация выбора detector/classifier (§4 INTEGRATIONS_STRATEGY); стратегическое решение | ✅ Стратегическое |
| Workflow CI/CD (unit-tests, analyzer-radar) | Автоматизация, опережающее тестирование | ✅ Инфра |
| TS2322 фикс | Блокатор CI → prod-releasability | ✅ Критическое |

### Недостающие сервисы для Этапа 1–2

По WHITE_PAPER § Дорожная карта и коммитам:

- **`drone-detector-service`** ← **ПРИОРИТЕТ**: analyzer поверх fft-analyzer, выдаёт бинарную классификацию + confidence на базе гармонических признаков. Контракт: `AcousticObservation` → `{ isDrone: bool, confidence: 0..1, reasoning: string }`.
- `tdoa-service` ← потребуется для Этапа 2, но после drone-detector.
- `transport-service` ← инфраструктура распределённого обмена observations, потребуется, когда будут 2+ узла.
- `localizer-service`, `tracker-service` ← позже (Этапы 3–4).

---

## 3. Риски и долг

### Технические риски

| Риск | Проявление | Палиатив |
|------|-----------|----------|
| **Скорость sound = 340 м/с** | Для больших квадратов (>2 км) задержка превысит 6 сек; трек будет «плыть» | Этап 3: сегментирование на соты по 2–4 км (§9 WHITE_PAPER). Пока в Этапе 1 — один микрофон, не актуально. |
| **Синхронизация времени между узлами** | GPS-PPS доступен не везде; NTP/PTP даёт ±миллисекунды, а нужны микросекунды | На Этап 2–3: кросс-калибровка по известным источникам. Пока v0.1 — один узел, не актуально. |
| **Многолучёвость (отражения от зданий)** | TDOA портится в городских условиях | Этап 3: GCC-PHAT, медианная фильтрация, избыточная геометрия узлов. Пока не до TDOA. |
| **Неполнота классификации** | Тихие дроны, маскировка под птиц | Этап 5+: расширение классификатора, обучение на реальных данных. Пока начнём с очевидных случаев (мультироторы на средних оборотах). |

### Накопленный долг

1. **react-hooks/exhaustive-deps warnings** в telemetry-journal (2 warning'а): отмечено как мелкий технический долг, не блокирует.
2. **packages/temp/Journal/** — переходное хранилище UI-компонентов журнала: впоследствии уедут в отдельный пакет-сервис или модуль. Пока там же.
3. **Persona-система не полна**: только yarn ask; будущие интеграции с Linear API и GitHub webhooks (на задачи из issues) отложены на background-office v0.2+.

### Нарушения границ пакетов

✅ **Не обнаружено** — граф зависимостей соблюдён:
- telemetry-service → core (OK)
- background-office → autono­mous (OK)
- client → может зависеть от всего (OK)
- Сервисы не зависят друг от друга (OK)

---

## 4. План на следующий день

### Задача 1: `drone-detector-service` (ядро)

**Цель:**  
Реализовать первый analyzer-сервис: бинарная классификация FFT-спектра на "дрон" vs "не-дрон" по гармоническим признакам (§5.1 WHITE_PAPER).

**Пакет / слой:**  
`packages/services/drone-detector/` → analyzer (зависит от `@membrana/core` + `@membrana/fft-analyzer-service`).

**Связь с WHITE_PAPER:**  
§ Этап 1 дорожной карты, § 4.5 Классификация, § 5.1 Акустический портрет дрона (несущая 80–250 Гц, гармоники до 2–5 кГц).

**Definition of Done:**
1. ✅ Реализована функция `classifySpectrum(spectrum: Float32Array): { isDrone: boolean, confidence: number, fundamentals?: number[] }` в `src/math/classifier.ts` (чистая TS, без Web Audio).
2. ✅ Хук `useDroneDetector(config?: DetectorConfig)` в `src/hooks.ts`, оборачивает вызов классификатора над потоком FFT-результатов.
3. ✅ Экспорт из `src/index.ts`: класс/фабрика, хук, типы `DetectorConfig`, `DetectionResult`.
4. ✅ Покрытие юнит-тестами (Vitest): 3–5 test cases (чистые спектры с известными гармониками, белый шум, край случаев).

**Роль:**  
Математик (классификатор + алгоритм признаков) + Структурщик (scaffolding пакета).

**Размер:**  
**M** — алгоритм простой (FFT уже вычислен), но нужна экспериментация с пороговыми значениями и признаками.

---

### Задача 2: Интеграция `drone-detector-service` в UI (Этап 1 демонстрация)

**Цель:**  
Добавить в микрофонный плагин реал-тайм индикатор "есть ли дрон сейчас" с уровнем уверенности; новый виджет в dashboard.

**Пакет / слой:**  
`apps/client/src/plugins/microphone-stream-viz/` + новый модуль или компонент в dashboard.

**Связь с WHITE_PAPER:**  
§ Этап 1 дорожной карты: "UI: индикатор 'слышу дрон' + уровень уверенности".

**Definition of Done:**
1. ✅ Новый компонент `DroneDetectionIndicator.tsx` (цвет, числовой confidence, звуковой сигнал при срабатывании — опцион).
2. ✅ Подписка на `useFftAnalyzer()` → цепь → `useDroneDetector()` в плагине или отдельном модуле.
3. ✅ Состояние хранится в singleton-state (как микроphone-stream) или простом React-state.
4. ✅ Демонстрация: UI показывает индикатор в real-time при захвате звука с микрофона.

**Роль:**  
Верстальщик (UI) + Структурщик (подключение хуков).

**Размер:**  
**M** — интеграция готовых частей, небольшая логика на клиенте.

---

### Задача 3: Тестирование `drone-detector-service` на реальных данных (полевое)

**Цель:**  
Собрать 3–5 примеров записей (реальный дрон, птица, ветер, шум улицы, тишина) и проверить, что классификатор работает с приемлемой точностью (recall > 80%, precision > 70% на первой итерации).

**Пакет / слой:**  
Экспериментальный: `test/audio-samples/` + документация в `docs/TESTING_METHODOLOGY.md` § Акустическое тестирование.

**Связь с WHITE_PAPER:**  
§ Ограничения и риски, § 9 Метрики успеха (доля ложных тревог < 5%). Этап 1 требует убедиться, что признак стабилен (см. дорожную карту).

**Definition of Done:**
1. ✅ Собраны записи в `test/audio-samples/drone/`, `test/audio-samples/bird/`, `test/audio-samples/noise/`, минимум по 2 файла на класс.
2. ✅ Создана скрипта `scripts/test-detector-on-samples.mjs`: загружает аудио, прогоняет через drone-detector, выдаёт матрицу ошибок (confusion matrix).
3. ✅ Документирован результат в `docs/discussions/drone-detector-v0.1-testing.md` с выводами о точности и рекомендациями по настройке.
4. ✅ Если accuracy < 70% — открыть GitHub Issue с меткой "imperfection:classifier" и отложить полевые испытания.

**Роль:**  
Музыкант (подбор аудиосэмплов, настройка параметров классификатора) + QA.

**Размер:**  
**M** — требует полевой работы или поиска публичных датасетов, но сама скрипта простая.

---

### Задача 4: Документирование Этапа 1 и контрольный чек-лист

**Цель:**  
Обновить WHITE_PAPER § Этап 1 с актуальным статусом, добавить в docs/CURRENT_TASK.md чек-лист "Что нужно для completion Этапа 1".

**Пакет / слой:**  
Документация (docs/), не код.

**Связь с WHITE_PAPER:**  
§ Дорожная карта, § Статус и порядок изменения (через PR с /architect).

**Definition of Done:**
1. ✅ WHITE_PAPER § Этап 1 содержит ссылки на реализованные сервисы и UI-компоненты.
2. ✅ docs/CURRENT_TASK.md пополнен разделом "Этап 1: Одинокий слушатель" с numbered задачами (1–4 выше + бонусные).
3. ✅ ARCHITECTURE.md обновлена таблица в § 6 (mapping слоёв на пакеты): ✅ audio-engine, ✅ fft-analyzer, ✅ drone-detector-service.
4. ✅ PR reviewed и merged.

**Роль:**  
Teamlead (обзор стратегии, лок).

**Размер:**  
**S** — чистое документирование.

---

### Задача 5: CI для drone-detector-service (опцион, если останется ёмкость)

**Цель:**  
Добавить в Turbo pipeline сборку и тестирование нового пакета, убедиться, что `yarn turbo run build test` собирает его без ошибок.

**Пакет / слой:**  
Инфраструктура (turbo.json, CI, .github/workflows/); сам пакет в tasks 1–2.

**Связь с WHITE_PAPER:**  
Принцип 1: "Дешёвый узел — умная сеть". CI гарантирует, что сервис интегрируется безболезненно.

**Definition of Done:**
1. ✅ turbo.json обновлён с tasks drone-detector-service (build, test, lint, typecheck).
2. ✅ `yarn turbo run build --include-dependencies` собирает drone-detector-service.
3. ✅ CI (ci.yml) проходит зелёный на PR с drone-detector-service.

**Роль:**  
Структурщик (turbo config) + DevOps.

**Размер:**  
**S** — шаблонный; копируем из audio-engine, fft-analyzer, меняем имя.

---

## 5. Что НЕ делаем на этом горизонте

1. **Две и более узла (синхронизация, TDOA).** Этап 2 начнётся после completion Этапа 1. Синхронизация — сложная задача (GPS-PPS, калибровка), отложена.

2. **Нейросетевой классификатор.** INTEGRATIONS_STRATEGY поясняет, что сначала идёт DSP (гармонические признаки), затем YAMNet/CLAP. Первая итерация (Этап 1) — только простой алгоритм.

3. **RF-приёмник, видео-верификация.** Модальность расширяется на Этапе 6. Пока фокус только на акустике.

4. **Public deployment background-office.** Этап 5 — отдельная задача (см. SERVER_DEPLOYMENT_PROMPT.md). Сейчас сервер работает на localhost; продукшена после того, как Этап 1–2 стабилизируются.

5. **Полное покрытие persona-системы (Linear API webhooks, GitHub Issues).** background-office v0.1 готов к приёму webhooks, но сама интеграция Linear/GitHub отложена на v0.2. Пока используется yarn ask для локального взаимодействия.

6. **Масштабирование на сотни узлов.** Этап 7. До этого — работаем с 1–5 узлами в тесте.

---

## 6. Проверки в конце периода

1. **Юнит-тесты drone-detector-service** проходят, покрытие ≥ 80%:
   - `yarn workspace @membrana/drone-detector-service run test` → ✅ pass.

2. **Интеграция в client без ошибок TypeScript**:
   - `yarn workspace @membrana/client run build` → ✅ pass, нет TS-ошибок.
   - `yarn workspace @membrana/client run typecheck` → ✅ pass.

3. **Демонстрация на UI** — запустить `yarn dev`, заглушить микрофон, увидеть:
   - Индикатор "Дрон: нет (confidence 0.05)" на пустом звуке.
   - Индикатор "Дрон: да (confidence 0.92)" при воспроизведении дронового семпла из `test/audio-samples/drone/`.

4. **Матрица ошибок классификатора** в `docs/discussions/drone-detector-v0.1-testing.md`:
   - Recall (нашли реальные дроны) ≥ 80%.
   - Precision (не false-positive на шуме) ≥ 70%.
   - Если нет — GitHub Issue с меткой "imperfection:classifier" и рекомендациями по доработке.

5. **CI полностью зелёный**:
   - `yarn turbo run lint typecheck test build --continue` → ✅ 35+/35+ tasks successful (добавился drone-detector).
   - GitHub Actions проходят без warnings.

6. **Документирование**:
   - WHITE_PAPER § Этап 1 обновлён с ссылками на реализацию.
   - ARCHITECTURE.md обновлена таблица mapping'а (см. Задача 4).
   - docs/CURRENT_TASK.md содержит чек-лист "Этап 1 — COMPLETED" или "Этап 1 — В ПРОЦЕССЕ (X/5 задач)".

---

## Резюме

**На следующий день** фокусируемся на **Этапе 1 дорожной карты** (WHITE_PAPER § Этап 1 — Одинокий слушатель):

- ✅ **Задача 1** (M): Реализовать `drone-detector-service` — бинарный классификатор по спектру.
- ✅ **Задача 2** (M): Интегрировать в UI — индикатор "слышу дрон" в real-time.
- ✅ **Задача 3** (M): Полевое тестирование на реальных аудиосэмплах, матрица ошибок.
- ✅ **Задача 4** (S): Документирование и чек-лист completion.
- ⏸ **Задача 5** (S, опцион): CI для новых пакетов, если останется.

Контрольный критерий успеха: индикатор "дрон / не-дрон" работает стабильно на реальных записях с recall ≥ 80%, precision ≥ 70%, все CI зелёные, документация актуальна.

---

**Документ готов к использованию как синхронизационный объект для дневного планёрки и код-ревью.**