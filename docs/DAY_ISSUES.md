План разработки на 15 мая 2026
Синтез по VIRTUAL_TEAM_PROMPT.md, DAILY_CODE_REVIEW.md, STRATEGIC_PLAN_DAY.md, наброску packages/temp/fft/ и 17 открытых issues в officefish/Membrana (#7–#12, #24–#37; индекс — #37).

Сводка контекста
Источник Главный вывод
STRATEGIC_PLAN_DAY
Фокус дня — Этап 1: drone-detector-service + UI-индикатор + полевые сэмплы
DAILY_CODE_REVIEW
Архитектура в целом верная; критичны импорты, тесты FFT, контракт потока
GitHub #28–#37
Review разложен на тикеты; часть уже не воспроизводится (#36)
CURRENT_TASK / INTEGRATIONS
Имя пакета уточнено: dsp-drone-detector-service (эшелон 0.1), не generic ML
packages/temp/fft
Богатый UX (такты, авто/ручной режим), но устаревшая архитектура (centroid/flux/RMS, прямой telemetry-store, legacy-сервисы)
Расхождение имён: в дневном плане — drone-detector-service, в стратегии интеграций — dsp-drone-detector-service. На сегодня берём второе (гармоники + SNR на FFT-кадрах), а UI из temp — только как референс презентации.

Порядок работы (координатор)
Teamlead (форма + LGTM) → Математик (classifier) → Структурщик (пакет + agenda)
→ Музыкант (поток 48 kHz / буфер) ∥ Верстальщик (индикатор из temp)
→ полевые сэмплы → Teamlead (доки + закрытие issues)
Предложения по ролям
[Teamlead] — Vesnin
Оценка дня: один инкремент — «Одинокий слушатель v0.1»: DSP-детектор + видимый индикатор, без TDOA/ML/sidecar.

Предложения:

Утвердить контракт v0.1 (1 абзац в PR / docs/discussions/dsp-drone-detector-v0.1.md):
Вход: Float32Array magnitudes + sampleRate + fftSize (из fft-analyzer).
Выход: { isDrone, confidence: 0..1, reasoning: string, fundamentals?: number[] }.
Не дублировать centroid/flux/RMS из temp — это отдельная ветка эксперимента.
Приоритет issues на сегодня:
Блокируют интеграцию: #30 (telemetry из плагина), #32 / #10 (тесты math).
Параллельно, если останется время: #24 (ESLint boundaries), #28/#29 (CI visibility).
Отложить: #35, #36 (nice-to-have).
Создать лейбл code-review (запрос из #37) и переразметить #28–#36.
Вечером: обновить WHITE_PAPER § Этап 1 + ARCHITECTURE.md §6 — задача 4 из дневного плана (S).
LGTM-критерий дня: PR с сервисом + индикатором в microphone-stream-viz или отдельном плагине; yarn turbo run lint typecheck test build --continue зелёный.

[Структурщик]
Предложения:

Скаффолдинг packages/services/dsp-drone-detector/ по SERVICES.md:
src/math/classifier.ts — pure
src/service.ts, src/hooks.ts, src/types.ts, src/index.ts
Зависимости: @membrana/core, @membrana/fft-analyzer-service (не другие сервисы).
Закрыть #30: убрать прямой @membrana/telemetry-service из micStreamTelemetry.ts → события через agenda / journal API (как в telemetry-journal модуле).
Каркас drone-analyzer-board (веха 0 из CURRENT_TASK.md) — пустая подписка на DroneScoreEvent; сегодня достаточно заглушки + один источник (DSP).
Цепочка в клиенте:
microphoneStreamHub → fft-analyzer → dsp-drone-detector → micStreamPluginState / новый виджет
Без импортов между модулями FFT ↔ Oscilloscope (проверка из review).
Turbo/CI для нового пакета — задача 5 дневного плана, если останется 1–2 ч.
Связь с issues: #25 (lazy/DI — не блокер v0.1), #24 (ESLint — начать правило apps/client/src/modules ↔ apps/client/src/modules).

[Математик] — Dynin
Предложения:

classifySpectrum(magnitudes, frequencies, sampleRate) — гармонический стек (несущая 80–250 Гц, гармоники до 2–5 кГц, WHITE_PAPER §5.1), не пороги centroid 200–800 из temp.
Переиспользовать уже есть в fft-analyzer/src/math/metrics.ts: spectralCentroid, rms, lowEnergyPercent — только как вспомогательные признаки, не как единственный критерий.
Unit-тесты (3–5 кейсов) — закрывают #32, #10:
синтетический «дрон» (пики на f, 2f, 3f);
белый шум → confidence < 0.3;
тишина;
птица-подобный широкополосный спектр (ложная тревога контролируема).
Документировать окно/наложение — #34 (вечер, 30 мин).
Не переносить логику FFTDroneDetectorService из temp (голосование 2/3 по centroid/flux/RMS) — сохранить в packages/temp/fft как reference; в прод — только harmonic classifier.
[Музыкант]
Предложения:

Зафиксировать в SERVICES.md (короткий § Audio Engine) — закрывает review + подготовка к полевым тестам:
sampleRate: целевой 48000 (fallback 44100 с пометкой в telemetry);
fftSize: 2048 (степень 2);
overlap: 50% для сглаживания (если ещё нет — завести в audio-engine config).
Задача 3 дневного плана: каталог test/audio-samples/{drone,bird,noise}/ + scripts/test-detector-on-samples.mjs (confusion matrix).
Из temp взять только поведение потока: авто-старт при streamAvailable, интервал опроса ~500 ms — но реализовать через plugin.install(), не setInterval в классе плагина.
Полевой критерий дня: recall ≥ 80%, precision ≥ 70% на 6–10 файлах; иначе issue imperfection:classifier.
Issues: #9 (microphoneStreamHub replay) — желательно до интеграции детектора, чтобы поздние подписчики не теряли кадры.

[Верстальщик]
Предложения по переносу из packages/temp/fft:

Брать Не брать
TickStatus — визуализация N тактов сбора
Прямой localStorage конфига → MembranaRegistry / module config
Блок «Дрон / Нет дрона» + confidence
Hardcoded text-gray-400, inline style={{ width }} → DaisyUI + CSS vars из DESIGN.md
Переключатель авто/ручной
PluginCard из legacy tree — использовать текущие виджеты microphone-stream-viz
Статистика (всего / срабатываний)
Polling setInterval(500) в виджете → useSyncExternalStore на singleton
Новый компонент: DroneDetectionIndicator.tsx в apps/client/src/plugins/microphone-stream-viz/ (или подмодуль detector/).

Issues на сегодня: #31, #33 (telemetry-journal — только если трогаем журнал); #27 (Storybook FFT/Oscilloscope) — завтра.

a11y минимум: aria-live="polite" на индикаторе, подписи кнопок авто/ручной.

Итоговый план дня (таймбоксы)
Блок Время Содержание DoD
A. Архитектура
09:00–10:00
Teamlead: контракт + ветка dynin/vesnin
ADR-абзац, LGTM на форму
B. Ядро
10:00–13:00
dsp-drone-detector-service + тесты (#32, #10)
yarn workspace @membrana/dsp-drone-detector-service test ✅
C. Интеграция
13:00–16:00
Подключение к mic plugin; #30 telemetry через agenda
Индикатор в UI при yarn dev
D. UX
16:00–17:30
Порт TickStatus + индикатор (DESIGN.md)
Без прямых импортов между модулями
E. Валидация
17:30–18:30
Сэмплы + test-detector-on-samples.mjs
docs/discussions/drone-detector-v0.1-testing.md
F. Закрытие
18:30–19:00
CI turbo (#29 опц.), обновление WP/ARCHITECTURE
Полный turbo green
Не делаем сегодня (из STRATEGIC_PLAN_DAY §5): TDOA, YAMNet/CLAP, deploy background-office, Linear webhooks, перенос centroid-детектора из temp как production.

Матрица: дневной план ↔ GitHub Issues
Задача дня Issues
DSP classifier + тесты
#10, #32, #34
Mic plugin + telemetry
#30, #11, #9
UI индикатор
#31, #33 (частично), #27 (отложить)
CI / качество
#28, #29, #7, #12
Архитектура / lint
#24, #25 (скорее следующая неделя)
Meta / docs
#35, #36, #37
Итоговый артефакт
Код: @membrana/dsp-drone-detector-service + DroneDetectionIndicator + правка micStreamTelemetry (#30) + скрипт полевой проверки.

Документ: docs/discussions/dsp-drone-detector-v0.1-testing.md с confusion matrix.

Definition of Done:

Классификатор — pure TS, без React/Web Audio

Нет прямых импортов плагин ↔ плагин; telemetry через agenda

UI по DESIGN.md, индикатор с confidence

yarn turbo run lint typecheck test build --continue — успех

Recall ≥ 80% / precision ≥ 70% на стартовом корпусе или открыт issue imperfection:classifier

LGTM Teamlead
Риск дня
Переоценка объёма: STRATEGIC_PLAN_DAY закладывает 5 задач размера M; реалистично за день — B + C + урезанный D + черновик E. Если не успеваем — срезаем полевые сэмплы (оставляем синтетические тесты) и документирование (задача 4) переносим на завтра, но сервис + UI-индикатор не откладываем.

Примечание: gh CLI на машине недоступен; список issues получен через GitHub API. Для yarn ask vesnin --gh-issue N понадобится установить и авторизовать gh.
