<!-- Сгенерировано: 2026-06-26T04:55:24.666Z (yarn plan:day) -->
<!-- Период: последние сутки (since="1 day ago"); горизонт: следующий день -->
<!-- Источник цели: WHITE_PAPER.md -->

# План на следующий день — Membrana (2026-06-25/26)

## 1. Что сделано за период (последние сутки)

### Device Board & Async Pipeline (эпик #176)
- **Завершена инфраструктура асинхронного пайплайна:** добавлены контракты `ScenarioAsyncJob`, `ScenarioAsyncJobNode`, `ScenarioPromiseRef` в `@membrana/core`; реализованы `async-promise-executor`, `async-job-store`, `async-resolved-dispatch` в `packages/device-board/src/runtime`.
- **Три usercase-микрофона (alpha/beta/gamma) мигрированы на async-v2:** добавлены JSON-скрипты для `onConnect`, `onStart`, `onMainTick`, `onAlarmTick`, `onStop`, `onDisconnect` с поддержкой асинхронных узлов и групп комментариев.
- **Сценарный граф расширен:** новые типы узлов (`async-orchestration-nodes`), валидаторы (`validate-async-promise`), тесты пакетов.
- **Документация и CI:** добавлены `DEVICE_BOARD_ASYNC_PIPELINE_LGTM.md`, workflow GitHub Actions для usercase-competition, LGTM от Teamlead (Vesnin).

### Competition Sprint: async-v2 & Packaging
- **Открыта и завершена фаза async-v2:** три команды (Alpha/Beta/Gamma) разработали конкурирующие реализации async-pipeline; Beta выиграла голосование (consilium #72a0dbd).
- **Packaging Sprint открыт:** три async-v2 UserCase внесены в каталог community-tier; добавлены скрипты `comp-publish-catalog`, `generate-competition-async-v2-synthesis`.
- **Phase A (catalog publish) LGTM:** community-tier UserCase зарегистрированы в device-board picker; Phase B (async-v2 design synthesis) в работе.

### Night Hunt Ritual (эпик #174)
- **Добавлена инфраструктура ночного запуска:** модули `night-hunt/{night-hunt.service, night-hunt.scheduler, night-hunt.controller}` в `packages/background-office`; утилиты `night-hunt-week.util` для расписания.
- **OpenRouter интеграция:** новый модуль `openrouter.service` для проксирования LLM-запросов.
- **Deploy инфраструктура:** `deploy/fly.office.toml`, `.env.llm-proxy.example`, workflow GitHub для night-hunt-office-trigger.

### Фиксы и стабилизация
- **L18 re-arm clip recording:** правка в `scenarioMicJournalBridge` для повторного включения захвата при активном сценарии.
- **L19 detached report bridge:** исправление в `async-resolved-dispatch` для корректного рассеивания результатов в развёрнутых функциях upload/live-bundle.
- **Неиспользуемые детекторы архивированы:** `harmonic`, `cepstral`, `spectral-flux` перемещены в archived-catalog (см. приоритеты FFT).

---

## 2. Привязка к стратегической цели

### Текущий этап дорожной карты
По WHITE_PAPER §8:
- **Этап 0 — Фундамент:** ✅ `audio-engine` поставляет кадры, `fft-analyzer` даёт спектр.
- **Этап 1.A — DSP-эшелон (один узел):** ⚠️ **зафиксирован потолок** (~75–95% recall в зависимости от инструмента, но FPR 30–100% не разделяет дрон от фона). По `FFT_METRICS_POTENTIAL_AND_LIMITS.md` §6, **магистраль качества переходит на trends-template-match + DRONE_TIGHT** (уже достигает 95% recall / 30% FPR), не на unified benchmark трёх DSP.
- **Этап 1.B — Neural & Agentic:** 🔄 начало: OpenRouter интеграция открывает путь к zero-shot моделям (CLAP, YAMNet), но рост качества пока идёт через trends, не через нейро.
- **Этап 2 — Многоузловая синхронизация:** 🚫 **заморожен до stage-gate 1→2** (см. WHITE_PAPER §8, раздел о Single-Node Detection First).

### Что приближает к цели
1. **Device-board async-pipeline (завершено)** — готовит инфраструктуру для распределённого запуска сценариев и асинхронных операций (микрофон, захват, отправка). Это фундамент для future узлов сети.
2. **OpenRouter + night-hunt ритуал** — расширение интеграций LLM, что позволит добавить Этап 1.B (agentic-detector, reasoning над FFT).
3. **Packaging sprint** — демонстрирует масштабируемость device-board как платформы для расширяемых UserCase-ов.

### Что нейтрально
- Competition async-v2 спринт — полезная инженерная практика и развитие talent pool, но не продвигает детекцию или многоузловую архитектуру.
- Night-hunt scheduling — операционное удобство для ночных расчётов, но не ядро Membrana.

### Что отвлекает
- **Избыток фокуса на async-pipeline вне контекста детекции:** device-board сильно расширился (async, competition, packaging), но **ни одного нового детектора или сенсорного слоя не появилось** со стороны detection/perception.

### Критически недостающие сервисы (Stage 2 и выше)
По WHITE_PAPER §6 и архитектуре:
- `@membrana/tdoa-service` *(frozen, Stage 2)* — разница времён прихода между узлами.
- `@membrana/localizer-service` *(не существует, Stage 3)* — мультилатерация и 2D/3D локализация.
- `@membrana/tracker-service` *(не существует, Stage 4)* — фильтр Калмана и ассоциация целей.
- `@membrana/transport-service` *(не существует, Stage 1–2)* — распределённый транспорт между узлом и сервером.
- **`@membrana/detection-ensemble-service`** *(не существует, Stage 1.B)* — агрегация результатов детекторов (trends + DSP + нейро).

### Детекция: текущее состояние (эпик #84 закрыт)
- **Trends-FFT с шаблоном DRONE_TIGHT:** recall 95%, FPR 30%, **go** ✅ для prod.
- **Harmonic/cepstral/spectral-flux (DSP):** recall 68–100%, FPR 88–100% — **no-go** как селекторы, только диагностика.
- **Пороговый FFT-тест:** recall 75–85%, FPR 40–70% — **no-go** как детектор, только обучение/проверка спектра.
- **Заключение:** эшелон 0 исчерпан. Дальнейший рост — либо новый датасет (validated labels), либо эшелон 2 (zero-shot CLAP, YAMNet, agentic reasoning).

---

## 3. Риски и долг

### Технические риски

| Риск | Тяжесть | Статус | Действие |
|------|---------|--------|----------|
| **Синхронизация времени между узлами** (см. WHITE_PAPER §9) | 🔴 High | Не адресован | Без GPS-PPS или NTP/PTP узлы не смогут участвовать в TDOA; временной джиттер > 10 мс убивает триангуляцию. |
| **Многолучёвость (multipath)** в городе | 🟡 Medium | Известен, отложен | Отражения от зданий искажают TDOA; нужны робастные оценки (GCC-PHAT, медианная фильтрация) — Stage 2. |
| **Скорость звука меняется с метеоусловиями** | 🟡 Medium | Задокументирован | Требует адаптивной модели в fusion-слое; не критично для Stage 1, но обязателен для Stage 3+. |
| **Переобучение trends-шаблона на free-v1** | 🟡 Medium | Замечен | DRONE_TIGHT достигает 95% recall на val, но обучен на этом же датасете; нужен validated dataset / VDR для переоценки (эпик вне текущего горизонта). |
| **Нет tested path для нейро-детекторов (CLAP, YAMNet)** | 🟡 Medium | Блокирует Stage 1.B | OpenRouter добавлена, но интеграция с `@membrana/detector-base` ещё не начиналась; нужна спецификация контракта. |

### Накопленный технический долг

1. **Детекторы harmonic/cepstral/spectral-flux архивированы, но код остаётся в монорепо.** Риск: путаница в планировании. **Action:** удалить исходники или явно пометить как `@deprecated` с путём миграции.
2. **Device-board async-pipeline разрастался без явного определения roles и permissions.** Async-job-executor вызывается без валидации доступа (e.g., может ли узел запустить запись?). **Action:** добавить слой авторизации перед Stage 2 (когда многоузловые сценарии).
3. **Trends-FFT встроена как plugin в library, но нет явной версионизации шаблонов.** DRONE_TIGHT может измениться, и старые сценарии сломаются. **Action:** enum/constant для версии template и миграция.
4. **Night-hunt и background-office разбухают без явной разделения ответственности.** OpenRouter + github-service + night-hunt в одном модуле. **Action:** вынести OpenRouter в отдельный слой (background-integration-service?).

### Нарушения границ пакетов (если видны в diff)

- ✅ **Нарушений архитектуры не видно.** Device-board, agenda, core строго разделены.
- ⚠️ **Потенциальное нарушение:** background-office начинает знать про OpenRouter API (внешняя зависимость). По BACKGROUND_SERVERS.md это допустимо (stateless шлюз), но требует явной документации контракта.

---

## 4. План на следующий день

### 4.1. Детекция: нейро-эшелон и интеграция

#### Задача A: Спецификация контракта `NeuralDetector` и интеграция CLAP
- **Цель:** добавить в `@membrana/detector-base` интерфейс `NeuralDetector` с методами `predict(audioBuffer) → DetectionResult[]`, позволяющий подключать zero-shot модели (CLAP, YAMNet).
- **Пакет / слой:** `@membrana/detector-base` (foundation); потом `@membrana/clap-detector-service` (analyzer, новый).
- **Связь с WHITE_PAPER:** Этап 1.B — Neural & Agentic эшелон (§8).
- **Definition of Done:**
  1. Интерфейс `NeuralDetector` в `detector-base/src/types.ts` с методом `predict(window: AudioWindow, context?: InferenceContext) → Promise<DetectionResult>`.
  2. Минимальная реализация: CLAP zero-shot через OpenRouter; тест на mock-данных.
  3. Документация в README: как интегрировать новую нейросетевую модель (e.g., YAMNet).
  4. CI green.
- **Роль:** Математик (контракт) + Музыкант (интеграция OpenRouter).
- **Размер:** M.

#### Задача B: Удаление архивированных DSP-детекторов
- **Цель:** удалить исходные коды `harmonic`, `cepstral`, `spectral-flux` из `packages/services/detectors/` и явно задокументировать, что они заменены trends-FFT.
- **Пакет / слой:** Infrastructure / cleanup.
- **Связь с WHITE_PAPER:** §8, Etap 1.A — зафиксирован потолок, DSP-детекторы не входят в магистраль.
- **Definition of Done:**
  1. Удалены папки `packages/services/detectors/{harmonic,cepstral,spectral-flux}-detector-service/`.
  2. Добавлена секция в `DETECTOR_BENCHMARK.md` "Why trends-FFT is the only FFT path" с ссылкой на `FFT_METRICS_POTENTIAL_AND_LIMITS.md` §4–5.
  3. Обновлены ссылки в `ARCHITECTURE.md` §1e и prompts (удалить упоминания о harmonic/cepstral/spectral-flux из список recommended-детекторов).
  4. Тесты монорепо (fixture imports) обновлены или удалены.
- **Роль:** Структурщик.
- **Размер:** S.

### 4.2. Многоузловая архитектура: стратегическая подготовка

#### Задача C: Основная спецификация `@membrana/transport-service`
- **Цель:** написать концептуальный контракт (не реализацию) для транспорта между узлом и сервером: типы сообщений, шифрование, повторные попытки, буферизация при потере связи.
- **Пакет / слой:** `@membrana/transport-service` (foundation, новый).
- **Связь с WHITE_PAPER:** Этап 2, принцип 2 (локальная автономность), §4.2 (что делает узел).
- **Definition of Done:**
  1. Документ `packages/services/transport/CONCEPT.md`: типы `NodeMessage`, `ObservationBatch`, `AckMessage`, retry-стратегия, TLS/client-cert.
  2. Interface `TransportClient { send(msg: NodeMessage) → Promise<AckMessage>, onMessageLost(), bufferSize }` в `detector-base` или отдельном файле.
  3. Ссылка на WHITE_PAPER §7 (контракт наблюдения) — как `AcousticObservation` поступает в сеть.
  4. Обзорная диаграмма в README (узел → edge gateway → fusion-server).
- **Роль:** Структурщик.
- **Размер:** M.

#### Задача D: Skeleton TDOA-сервиса (frozen, но документирован)
- **Цель:** создать заготовку `@membrana/tdoa-service` в `packages/services/` с помощью scaffold, описать его место в архитектуре и условия разморозки (когда stage-gate 1→2 пройден).
- **Пакет / слой:** `@membrana/tdoa-service` (analyzer, frozen).
- **Связь с WHITE_PAPER:** Этап 2 (Stage 2 — Network), раздел freeze condition.
- **Definition of Done:**
  1. Папка `packages/services/tdoa-service/` с `package.json`, `tsconfig.json`, `vite.config.ts`.
  2. Файл `src/index.ts` экспортирует `interface TdoaAnalyzer { analyze(obs: AcousticObservation[]) → TdoaResult[] }` (типы в `core`).
  3. Файл `FREEZE_CONDITION.md`: "Разморозить, когда trends-FFT + DRONE_TIGHT пройдёт stage-gate 1→2 и датасет будет validated".
  4. Заглушка-реализация (just throw Not Yet Implemented).
  5. Комментарий в `.cursorrules` / ARCHITECTURE.md §1a о frozen-пакетах.
- **Роль:** Структурщик.
- **Размер:** S.

### 4.3. Данные и бенчмарк

#### Задача E: Обновление `DETECTOR_BENCHMARK.md` для trends-DRONE_TIGHT
- **Цель:** внести результаты trends-FFT (recall 95%, FPR 30%) в таблицу бенчмарков, обновить команду что это лучший FFT-результат и что дальше идёт validated dataset (VDR) или нейро.
- **Пакет / слой:** Documentation.
- **Связь с WHITE_PAPER:** §11 (метрики успеха), stage-gate 1→2.
- **Definition of Done:**
  1. Обновлена таблица в `DETECTOR_BENCHMARK.md` с новой строкой "Trends FFT (DRONE_TIGHT)" и метриками.
  2. Добавлена ссылка на `FFT_METRICS_POTENTIAL_AND_LIMITS.md` §0 TL;DR и §6 (куда дальше).
  3. Секция "Next Steps" явно называет: validated dataset (VDR) или zero-shot CLAP/YAMNet как пути роста.
  4. Удалены из таблицы строки harmonic/cepstral/spectral-flux (или помечены как archived).
- **Роль:** Верстальщик (документация) / Математик (метрики).
- **Размер:** S.

### 4.4. Device-Board доработки и взаимодействие

#### Задача F: L20 async-pipeline stability — повторное включение рекординга
- **Цель:** убедиться, что after L18 fix (re-arm clip capture) запись микрофона корректно повторно включается при перезагрузке сценария; добавить stress-тест.
- **Пакет / слой:** `packages/device-board/src/runtime/` + `apps/client/src/modules/device-board/`.
- **Связь с WHITE_PAPER:** Infrastructure (foundation).
- **Definition of Done:**
  1. Тест `async-resolved-dispatch.test.ts` или `scenarioMicJournalBridge.test.ts`: сценарий запускается 3 раза подряд, каждый раз захватывает микрофон, разработка ожидают success.
  2. Integration test в CI: `yarn test device-board -- --grep "L18.*rearm"`.
  3. Проверка на утечки таймеров (setInterval в WebAudio context).
- **Роль:** Верстальщик (тесты).
- **Размер:** S.

### 4.5. Обновление планирования и ритуалов

#### Задача G: Синхронизация STRATEGIC_PLAN_DAY.md с FFT_METRICS_POTENTIAL_AND_LIMITS
- **Цель:** убедиться, что дневные планы (morning standup via yarn plan:day) не предлагают магистраль "Этап 1.A / unified benchmark" и явно ссылаются на trends-DRONE_TIGHT как на текущий фокус.
- **Пакет / слой:** Documentation + scripts.
- **Связь с WHITE_PAPER:** §1, управление планом.
- **Definition of Done:**
  1. Обновлён файл `scripts/lib/detection-planning-priorities.mjs`: блокирует предложение "benchmark harmonic+cepstral+flux" в STDOUT (см. FFT_METRICS §6).
  2. `DEVELOPER_RHYTHM.md` содержит явную ссылку на "trends-template-match is the prod path, not DSP-consensus".
  3. Обновлена команда `yarn plan:day` чтобы читать из `FFT_METRICS_POTENTIAL_AND_LIMITS.md` и выводила актуальный статус детекции.
- **Роль:** Teamlead (политика) / Структурщик (скрипты).
- **Размер:** S.

---

## 5. Что НЕ делаем на этом горизонте

1. **Не повторяем unified benchmark harmonic + cepstral + spectral-flux на free-v1 без нового датасета.** По `FFT_METRICS_POTENTIAL_AND_LIMITS.md` §6, потолок установлен, и дальше на чистом FFT некуда расти. **Исключение:** если появится новый класс дронов (e.g., электрические nano-дроны) — тогда перемеры.

2. **Не начинаем Stage 2 (TDOA, локализация, многоузловая триангуляция) до stage-gate 1→2.** Gate требует trends-FFT (или ensemble) на уровне precision ≥ 85% + recall ≥ 90%. Сейчас trends даёт recall 95% / precision ~76% — не проходит. **Action:** validated dataset или нейро-уточнение.

3. **Не расширяем async-pipeline в device-board без явного сценария использования.** Competition спринт закончился; дальнейшее расширение (e.g., distributed scheduling) откладываем до Stage 2, когда появятся реальные многоузловые сценарии.

4. **Не добавляем новые RF- или видео-модальности (Stage 6).** Это горизонт 2–3 месяца вперёд, после Stage 4 (трекинг). Сейчас фокус на акустике и качестве детекции.

5. **Не переписываем мобильные узлы или активное зондирование (HORIZON_MOBILE_MULTIMODAL).** Это дальняя перспектива по WHITE_PAPER §14 и вне текущего плана.

---

## 6. Проверки в конце периода

1. **Детекция (trends-DRONE_TIGHT):** команда `yarn benchmark:detectors` показывает recall 95% / FPR 30% на val; метрики обновлены в `DETECTOR_BENCHMARK.md`.

2. **NeuralDetector контракт:** интерфейс `NeuralDetector` добавлен в `detector-base/src/types.ts`; минимальная CLAP-интеграция компилируется (no compilation errors).

3. **Device-board async L20:** stress-тест `yarn test device-board -- --grep "L18.*rearm"` passes; утечек памяти нет (проверка heapdump или devtools).

4. **Документация:** `FFT_METRICS_POTENTIAL_AND_LIMITS.md` указана в `STRATEGIC_PLAN_DAY.md`; в `DEVELOPER_RHYTHM.md` явно сказано "trends is the path, not DSP-consensus".

5. **Архив DSP:** если задача B выполнена — `packages/services/detectors/{harmonic,cepstral,spectral-flux}/` удалены из main branch; CI green на удаление fixture imports.

6. **Transport-service skeleton:** папка `packages/services/transport-service/` существует с `CONCEPT.md` и заглушкой интерфейса; `FREEZE_CONDITION.md` ясно описывает условия разморозки.

---

## Итого

На ближайший день команда фокусируется на **завершении детекции эшелона 0** (trends-DRONE_TIGHT как финальная FFT-версия) и **подготовке эшелона 1.B** (нейро-детекторы через OpenRouter). Параллельно — стратегическая архитектурная подготовка для **Stage 2** (многоузловая триангуляция), без спешки по реализации до выполнения stage-gate. Device-board async-pipeline стабилизирована; competition спринт завершён. Данных для роста качества недостаточно; требуется либо validated dataset, либо нейросетевой прорыв.