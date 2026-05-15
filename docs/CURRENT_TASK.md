C:\Users\user190825\practice\Membrana>yarn analyzers:research:week:dry
Каталог §4: найдено 40 известных имён для дедупликации.
HuggingFace: ok=true, status=200, items=80
arXiv: ok=false, status=429, items=0
--- DRY RUN: контекст, который ушёл бы в Anthropic ---
Ты — аналитик-исследователь проекта Membrana, ведёшь «радар» внешних
аналайзеров звука (модели, датасеты, статьи), которые могли бы пополнить
каталог §4 файла docs/INTEGRATIONS_STRATEGY.md.

Жёсткие правила приоритизации, которые НЕ обсуждаются и которым ты подчиняешь любую рекомендацию:

1. Локально лучше, чем свой сервер; свой сервер лучше, чем внешний API.
2. Zero-shot/off-the-shelf лучше, чем fine-tune; fine-tune лучше, чем обучение с нуля.
3. Open-weights локально лучше, чем self-host; self-host лучше, чем платный API.

Тебе подаётся:
A) Релевантный фрагмент INTEGRATIONS_STRATEGY.md (принципы §1, матрица §2,
каталог §4 — то, что уже известно команде).
B) Сырые данные из HuggingFace Hub (audio-classification) и arXiv (cs.SD / eess.AS)
за последний период — кандидаты, которые могут быть новыми.

Не выдумывай факты вне поданного контекста. Если сведений о модели мало —
так и пиши («метаданные скудны»), не гадай о лицензии или качестве.

---

## docs/INTEGRATIONS_STRATEGY.md (фрагмент, ограничен по символам)

# INTEGRATIONS_STRATEGY.md — стратегия экспериментальных интеграций анализа звука

> Документ для ролей **Структурщика**, **Математика**, **Музыканта** и **Teamlead**.
> Определяет, **какие** анализаторы звука (классические DSP, нейросети, LLM) мы пробуем подключать к Membrana,
> **в каком порядке** и **как** — в виде analyzer-сервисов, плагинов и (где нужно) серверных компонентов.
>
> Статус: **v0.1 — рабочая стратегия экспериментов.** Утверждается Teamlead-ом; правки — через PR.
>
> Согласуется с: [`WHITE_PAPER.md`](./WHITE_PAPER.md), [`ARCHITECTURE.md`](./ARCHITECTURE.md), [`SERVICES.md`](./SERVICES.md), [`MODULE_AND_PLUGIN_UI.md`](./MODULE_AND_PLUGIN_UI.md).

---

## 0. TL;DR

1. Мы строим **детектор дрона по 3–7 секундному фрагменту аудио** как цепочку экспериментов. Цель каждого эксперимента — отдать число `probability ∈ [0..1]` и набор объясняющих признаков, не углубляясь в обучение и платные сервисы, пока не исчерпан более «дешёвый» уровень.
2. Все интеграции делятся на **четыре эшелона** по принципу «**локально → свой сервер → внешний API**». Внутри эшелона действует правило «**zero-shot/pretrained > fine-tune > обучение с нуля**» и «**open-weights/бесплатно > self-host с лицензией > платно по кредитам**».
3. Каждая интеграция — это **новый analyzer-сервис** в `packages/services/*` (или его конфигурация), потребляющий кадры из `@membrana/audio-engine-service` и публикующий `AcousticObservation` по контракту из `WHITE_PAPER.md §7`. UI — отдельный плагин поверх существующего модуля микрофона.
4. Результаты разных детекторов **сравниваются единым отчётом** (плагин-агрегатор), а не подменяют друг друга. Это даёт честную картину «что вообще работает на нашем материале» без преждевременной фиксации на одной модели.
5. Каталог §4 — **снимок**, не догма. Раз в неделю авто-радар (`yarn analyzers:research:week`, GitHub Action `Weekly analyzers research`) обходит HuggingFace Hub и arXiv, предлагает новых кандидатов и патчи к §4. Подробности — §10.

---

## 1. Принципы и приоритеты

Приоритеты сформулированы пользователем и являются **жёсткими**: они не балансируются качеством или удобством разработки, они выбираются первыми.

### 1.1 Иерархия размещения (locality)

```
[Эшелон 0]  Браузер клиента (Vite + WebAssembly / WebGPU / TFJS / onnxruntime-web)
    ▼ если не помещается / нет нужной библиотеки
[Эшелон 1]  Локальный узел рядом с микрофоном (Node.js, Python sidecar, ONNX Runtime, на той же машине)
    ▼ если нужны GPU / большая модель / общий доступ
[Эшелон 2]  Свой сервер (расширение `packages/background-*`, FastAPI/Node, self-host open-weights)
    ▼ если своих ресурсов нет или нужно сравнить с эталоном
[Эшелон 3]  Внешний платный API (HuggingFace Inference, Replicate, ...)
```

Правило выбора: **никогда не подниматься на следующий эшелон, пока на текущем не исчерпаны разумные кандидаты**. «Разумные» = публично доступные, с понятной лицензией, с шансом дать сигнал на нашей задаче.

### 1.2 Иерархия способа применения модели

```
[Способ A]  Zero-shot / off-the-shelf pretrained (нет обучения вообще)
    ▼
[Способ B]  Few-shot / прототипы / эмбеддинги + классификатор поверх (минимум разметки, без backprop)
    ▼
[Способ C]  Fine-tune предобученной модели на DroneAudioDataset (несколько часов GPU)
    ▼
[Способ D]  Обучение с нуля (только если C исчерпан)
```

### 1.3 Иерархия экономики

```
[Стоимость 0]  Open weights + локальное исполнение      (предпочтительно)
[Стоимость 1]  Open weights + self-host на нашем сервере (допустимо)
[Стоимость 2]  Платный API с кредитами                  (последняя мера)
```

### 1.4 Сводное правило

> Сначала **локально без обучения и бесплатно**. Затем — добавляем по одному измерению: разрешаем сервер, потом обучение, потом кредиты. **Каждый шаг — только когда предыдущий честно проверен и зафиксирован отчётом.**

---

## 2. Матрица оценки кандидата (Score)

Каждый кандидат получает четыре оценки и суммарный приоритет.

| Ось                                 | Значение и баллы                                                                                                     |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **L** (locality)                    | `3` browser • `2` node-local • `1` own-server • `0` external API                                                     |
| **T** (training-free)               | `2` zero-shot / off-the-shelf • `1` нужен лёгкий fit (kNN/SVM поверх эмбеддингов) • `0` нужен fine-tune или обучение |
| **C** (credit-free)                 | `2` open weights + локально • `1` open weights + self-host • `0` платный API                                         |
| **Q** (ожидаемое качество на дроне) | `0..3` экспертная оценка по обзорам/паперам (пересматривается после первого замера)                                  |

**Приоритет = L + T + C + Q** (макс. 10).
Чем выше — тем раньше делаем эксперимент. При равенстве — первым идёт тот, что **проще встроить в существующий каркас** (`audio-engine` уже даёт ему вход).

Эта матрица — рабочий инструмент Teamlead-а; её значения обновляются после первого замера на нашем датасете.

---

## 3. Эшелоны

### 3.1 Эшелон 0 — В браузере клиента

**Платформа:** `apps/client` + analyzer-сервис в `packages/services/*`.
**Runtime:** WebAssembly / WebGPU / WebGL.
**Библиотеки:** `@tensorflow/tfjs`, `@tensorflow-models/yamnet`, `onnxruntime-web`, `tfjs-tflite`, `meyda`, чистый TS DSP.
**Плюсы:** ноль инфраструктуры, ноль кредитов, приватность (звук не покидает устройство), мгновенная итерация в Vite-dev.
**Минусы:** ограничение по размеру модели (≲ 100–200 МБ практически), холодный старт, ограниченная производительность без WebGPU.

### 3.2 Эшелон 1 — Локально на той же машине (рядом с микрофоном)

**Платформа:** Node.js worker / Python sidecar / нативный бинарник, запускаемый рядом с клиентом.
**Runtime:** ONNX Runtime (Node), `tfjs-node`, PyTorch CPU/CUDA, `librosa`, `whisper.cpp` (для дисквалификации речи), `ggml`-варианты.
**Транспорт:** WebSocket / HTTP loopback / Native messaging.
**Плюсы:** можно гонять полноразмерные PANNs/AST/BEATs, использовать GPU, держать большие файлы моделей.
**Минусы:** нужен отдельный процесс на машине пользователя; кросс-платформенная упаковка.

### 3.3 Эшелон 2 — Свой сервер

**Платформа:** новый пакет `packages/background-acoustic` (или расширение `packages/background-office`) — Node/NestJS-фасад, за которым стоит Python-инференс (PyTorch / ONNX Runtime / Triton).
**Транспорт:** REST/WS с авторизацией `X-Membrana-Token` (как в `background-office`).
**Плюсы:** возможность вынести GPU в один узел, обновлять модели независимо от клиентов, агрегировать наблюдения от множества узлов сети Membrana (соответствует WP §4.1).
**Минусы:** инфраструктура, нужно поддерживать.

### 3.4 Эшелон 3 — Внешний API

**Платформа:** обёртка-сервис, дёргающий HTTP API.
**Кандидаты:** HuggingFace Inference Endpoints, Replicate, Banana, Sieve, отраслевые SaaS.
**Используется только** как эталон для сравнения и в случае, если эшелоны 0–2 не дают результата нужного качества за разумные усилия. Кредиты — последний ресурс.

---

## 4. Каталог кандидатов

Все оценки даны по матрице из §2; колонка **«Σ»** — суммарный приоритет.
Каждый кандидат сопоставлен со слоем сервиса (foundation/analyzer) и со способом интеграции.

### 4.1 Эшелон 0 (в браузере, без обучения, без кредитов)

| #   | Кандидат                                                                                                                                                                          | Способ       | L   | T   | C   | Q   | Σ     | Целевой пакет                                     |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | --- | --- | --- | --- | ----- | ------------------------------------------------- |
| 0.1 | **Чистый DSP-детектор** (harmonic stack + blade-pass frequency + RMS/SNR на готовых FFT-кадрах)                                                                                   | без модели   | 3   | 2   | 2   | 1   | **8** | `@membrana/dsp-drone-detector-service` (analyzer) |
| 0.2 | **YAMNet (TF.js)** — 521 класс AudioSet; берём score по `Aircraft`, `Helicopter`, `Propeller, airscrew`, `Engine`                                                                 | A: zero-shot | 3   | 2   | 2   | 2   | **9** | `@membrana/yamnet-analyzer-service`               |
| 0.3 | **CLAP (LAION `clap-htsat-unfused`)** через onnxruntime-web — zero-shot text↔audio, промпты: «drone propeller», «quadcopter», «helicopter», «wind», «ambient city», «human voice» | A: zero-shot | 3   | 2   | 2   | 2   | **9** | `@membrana/clap-analyzer-service`                 |
| 0.4 | **AST / PaSST (AudioSet)** в onnxruntime-web (квантованная)                                                                                                                       | A: zero-shot | 3   | 2   | 2   | 2   | **9** | `@membrana/ast-analyzer-service`                  |
| 0.5 | **OpenL3 / VGGish эмбеддинги + kNN** по нескольким референсным записям дрона                                                                                                      | B: few-shot  | 3   | 1   | 2   | 2   | **8** | `@membrana/embedding-knn-analyzer-service`        |
| 0.6 | **MFCC + лёгкий MobileNet/MLP**, портированный из DroneAudioDataset baseline в TFJS                                                                                               | C: fine-tune | 3   | 0   | 2   | 2   | **7** | `@membrana/mobile-cnn-drone-service`              |

> Все Эшелон-0-сервисы получают кадры через `audio-engine.LiveSampler` и дополнительно используют `fft-analyzer` для общих признаков (где это уместно). React-обёртка кладётся **только** в `hooks.ts` сервиса, согласно `SERVICES.md`. UI выводится в плагине, который подписывается на `microphoneStreamHub` (паттерн из `microphone-stream-viz`).

### 4.2 Эшелон 1 (локально на той же машине, без обучения, без кредитов)

| #   | Кандидат                                                                                                                          | Способ | L   | T   | C   | Q   | Σ     | Целевой пакет                                                               |
| --- | --------------------------------------------------------------------------------------------------------------------------------- | ------ | --- | --- | --- | --- | ----- | --------------------------------------------------------------------------- |
| 1.1 | **PANNs CNN14 (ONNX Runtime Node)** — AudioSet, 527 классов, выше YAMNet                                                          | A      | 2   | 2   | 2   | 3   | **9** | `@membrana/panns-analyzer-service` + `packages/background-acoustic` sidecar |
| 1.2 | **BEATs (Microsoft)** — SOTA на AudioSet                                                                                          | A      | 2   | 2   | 2   | 3   | **9** | тот же sidecar, второй endpoint                                             |
| 1.3 | **CLAP full** (без квантования) локально через `onnxruntime-node`                                                                 | A      | 2   | 2   | 2   | 2   | **8** | sidecar                                                                     |
| 1.4 | **EfficientAT / PaSST** локально                                                                                                  | A      | 2   | 2   | 2   | 2   | **8** | sidecar                                                                     |
| 1.5 | **Whisper.cpp** — **используется как «фильтр анти-речи»**: если фрагмент уверенно классифицирован как речь, drone-score снижается | A      | 2   | 2   | 2   | 1   | **7** | foundation: `@membrana/voice-gate-service`                                  |
| 1.6 | **OpenL3 / PANNs эмбеддинги + kNN/SVM** на DroneAudioDataset (few-shot, без backprop)                                             | B      | 2   | 1   | 2   | 3   | **8** | sidecar                                                                     |

> На этом эшелоне впервые появляется новый foundation: `packages/background-acoustic` — sidecar, который выставляет общую HTTP-обёртку над Python/ONNX-инференсом. Несколько analyzer-сервисов в `packages/services/*` будут лишь тонкими клиентами к этому sidecar (контракт — JSON через WS/HTTP). Это укладывается в `WHITE_PAPER.md §6` (узел делает локальный инференс) и не нарушает `SERVICES.md` (analyzer-сервис не зависит от других сервисов; sidecar — внешний npm-пакет с точки зрения сервиса).

### 4.3 Эшелон 2 (свой сервер, допустимо обучение)

| #   | Кандидат                                                                                                                      | Способ | L   | T   | C   | Q   | Σ     | Целевой пакет                                          |
| --- | ----------------------------------------------------------------------------------------------------------------------------- | ------ | --- | --- | --- | --- | ----- | ------------------------------------------------------ |
| 2.1 | **Self-hosted PyTorch inference (PANNs/AST/BEATs)** в `packages/background-acoustic` на отдельном узле                        | A      | 1   | 2   | 1   | 3   | **7** | `background-acoustic` (server mode)                    |
| 2.2 | **Fine-tune PANNs/AST на DroneAudioDataset + наши записи**, экспорт ONNX, деплой на свой сервер                               | C      | 1   | 0   | 1   | 3   | **5** | тот же сервер + офлайн-пайплайн `scripts/train-drone/` |
| 2.3 | **Кастомный CNN на лог-мел спектрограммах** (как в Al-Emadi 2019, Jeon 2017) — обучаем с нуля только если 2.2 не дал прироста | D      | 1   | 0   | 1   | 2   | **4** | тот же сервер                                          |
| 2.4 | **DronePrint-style открытое множество** (Kolamunna 2021) — различение моделей дронов                                          | C      | 1   | 0   | 1   | 2   | **4** | тот же сервер                                          |

> На этом эшелоне впервые легально появляется обучение, и только потому, что бесплатные эшелоны 0–1 не должны быть «доучены любой ценой». Любой fine-tune начинается **после** того, как off-the-shelf модели прошли по нашему датасету и зафиксировали baseline.

### 4.4 Эшелон 3 (внешние API, как эталон)

| #   | Кандидат                                                                                               | Способ | L   | T   | C   | Q   | Σ       | Целевой пакет                                             |
| --- | ------------------------------------------------------------------------------------------------------ | ------ | --- | --- | --- | --- | ------- | --------------------------------------------------------- |
| 3.1 | **HuggingFace Inference API** для AST/PANNs/CLAP (бесплатный тариф первым, платный — по необходимости) | A      | 0   | 2   | 0–1 | 2   | **4–5** | `@membrana/hf-remote-analyzer-service`                    |
| 3.2 | **Replicate / Banana / Sieve** хостинг AST/CLAP                                                        | A      | 0   | 2   | 0   | 2   | **4**   | тот же сервис, разные провайдеры по конфигу               |
| 3.3 | **Edge Impulse Studio** — обучить классификатор у них и получить REST-endpoint                         | C      | 0   | 0   | 0   | 2   | **2**   | тот же сервис                                             |
| 3.4 | Отраслевые «drone audio» SaaS                                                                          | —      | 0   | 2   | 0   | 1–2 | **3–4** | не приоритет; учитываем только если появится открытый API |

> Внешний API в этом эшелоне всегда вторичен. Его роль — **эталон для сравнения**, чтобы ответить на вопрос «не лучше ли наша локальная модель, чем то, что доступно за деньги». Кредиты тратятся минимально и только когда есть конкретная гипотеза для проверки.

---

## 5. Архитектурные паттерны интеграции в Membrana

Все эксперименты ложатся на уже зафиксированную архитектуру без её расширения. Ниже — три повторяющихся шаблона; новый эксперимент использует ровно один из них.

### 5.1 Шаблон A — «In-browser analyzer» (Эшелон 0)

```
audio-engine.LiveSampler ──► <name>-analyzer-service.service.ts (pure TS)
                              │
                              ├── модель: ONNX/TFJS, лежит в src/model/ или CDN
                              ├── pre/post-processing: math/ (мел, нормализация)
                              └── publish: DroneScoreEvent { probability, perClass, modelId }
                                      ▲
                  apps/client/src/plugins/<name>-viz/   (UI + подписка через hub)
```

- **Foundation-зависимости:** только `@membrana/audio-engine-service` + опционально `@membrana/fft-analyzer-service` (если нужен спектр, уже посчитанный).
- **Никаких прямых обращений к Web Audio из плагина** — берём готовые кадры и `AnalyserNode` через engine (`ARCHITECTURE.md §1b`).
- **Регистрация плагина** — только через `MembranaRegistry.registerPlugin(...)` (`ARCHITECTURE.md §1c`).

### 5.2 Шаблон B — «Local sidecar analyzer» (Эшелон 1)

```
audio-engine ──► <name>-analyzer-service (TS-клиент)
                      │  WS/HTTP к loopback:port
                      ▼
              packages/background-acoustic   (Node/Python sidecar)
                      │
                      └── PANNs / BEATs / AST / Whisper.cpp / kNN
```

- `background-acoustic` появляется как **второй background-пакет** в духе `background-office` (`ARCHITECTURE.md §1d`): автономен, не зависит от `@membrana/core`/`agenda`/`device-board`, общается через HTTP с заголовком `X-Membrana-Token`.
- В TS-сервисе живёт только клиент и сериализация фрагмента (16 kHz mono, PCM Float32). Модель и тяжёлые зависимости (PyTorch/ONNX) — в sidecar.
- Sidecar запускается локально пользователем (рядом с клиентом) или, в эшелоне 2, на собственном сервере по тому же контракту.

### 5.3 Шаблон C — «Remote inference analyzer» (Эшелоны 2–3)

```
audio-engine ──► <provider>-analyzer-service ──► HTTPS к нашему серверу (Э2)
                                              └► HTTPS к стороннему API (Э3)
```

- Один и тот же analyzer-сервис может работать в обоих режимах через конфиг `{ endpoint, apiKey, modelId }`.
- Учётные данные хранятся только в `apps/client` через защищённые механизмы; в Cloud-агенте — через переменные окружения секретов.
- Лимит на оплачиваемые вызовы зашит в конфиге (rate-limit + бюджет) — это часть DoD для Эшелона 3.

### 5.4 Плагин-агрегатор «Сравнительный отчёт»

`apps/client/src/plugins/drone-analyzer-board/` — **один** UI-плагин, который:

1. Подписывается на `DroneScoreEvent` от всех зарегистрированных analyzer-сервисов.
2. Показывает таблицу: `модель | probability | время инференса | top-N признаков | флаг confident`.
3. Кладёт результаты в журнал (`@membrana/agenda`-расписание уже даёт сторадж и lifecycle).
4. Позволяет загрузить 3–7-секундный wav и прогнать его через все живые модели одной кнопкой.

Этот плагин — **точка истины** для сравнения интеграций и наполнения матрицы §2 реальными числами.

---

## 6. Дорожная карта экспериментов

Каждый шаг завершается артефактом: PR + запись отчёта в `drone-analyzer-board` + обновление колонки `Q` в матрице §4.

### Веха 0 — Каркас сравнения (без новых моделей)

1. `packages/services/dsp-drone-detector` — кандидат **0.1**. Чистый DSP: harmonic stack, blade-pass frequency, SNR. Использует только `fft-analyzer` и `audio-engine`. Дает baseline.
2. `apps/client/src/plugins/drone-analyzer-board` — плагин-агрегатор (§5.4) с заглушкой одного источника.
3. Контракт `DroneScoreEvent` фиксируется в `@membrana/core` (расширение `AcousticObservation` из WP §7 полем `droneScore`).

**Выход:** UI, в который можно подключать новые детекторы; baseline DSP-числа на DroneAudioDataset (offline batch-режим).

### Веха 1 — Zero-shot в браузере

4. `packages/services/yamnet-analyzer` — кандидат **0.2**. Подключаем TFJS-модель, считаем взвешенный `droneScore` по релевантным классам AudioSet.
5. `packages/services/clap-analyzer` — кандидат **0.3**. Зашиваем 6–8 промптов; softmax по cosine similarity.
6. `packages/services/ast-analyzer` — кандидат **0.4**, квантованная AST.

**Выход:** три zero-shot браузерных детектора, сравнённых в одном UI с DSP-baseline.

### Веха 2 — Few-shot эмбеддинги в браузере

7. `packages/services/embedding-knn-analyzer` — кандидат **0.5**. OpenL3/YAMNet-эмбеддинги + kNN по 5–20 эталонным записям дрона/не-дрона. Модель эталонов — конфиг сервиса.

**Выход:** первая «настроенная под нас» модель без обучения.

### Веха 3 — Локальный sidecar

8. `packages/background-acoustic` — новый background-пакет (Шаблон §5.2). Python/ONNX Runtime, эндпоинты `/infer/panns`, `/infer/ast`, `/infer/beats`, `/infer/clap`.
9. Analyzer-сервисы-клиенты: `panns-analyzer`, `beats-analyzer` (кандидаты **1.1**, **1.2**). `clap-analyzer` и `ast-analyzer` получают опциональный «remote»-режим.
10. `@membrana/voice-gate-service` — Whisper.cpp в sidecar (кандидат **1.5**) как фильтр «это речь, не дрон».

**Выход:** прирост качества от полноразмерных моделей; цена — необходимость поднять локальный sidecar.

### Веха 4 — Сравнительный отчёт и выбор финалистов

11. Прогон всего набора Эшелона 0 + Эшелона 1 на одном тестовом корпусе (DroneAudioDataset + наши полевые записи).
12. Обновление колонки `Q` в матрице §4 реальными числами (ROC-AUC, accuracy, FPR на «городской фон»).
13. Решение Teamlead: какие интеграции переходят в `drone-detector-service` как production-кандидаты (см. WP §6 строку `drone-detector-service`).

### Веха 5 — Дообучение (только если §4 этого требует)

14. `scripts/train-drone/` — пайплайн fine-tune PANNs/AST на нашем размеченном корпусе (кандидат **2.2**).
15. Экспорт в ONNX, деплой через `background-acoustic`.
16. A/B сравнение с zero-shot финалистом из вехи 4.

### Веха 6 — Внешние API как эталон

17. `packages/services/hf-remote-analyzer` (кандидаты **3.1–3.2**) с жёстким бюджетом вызовов.
18. Одноразовый прогон на тестовом корпусе для сравнения; результат — строка в матрице, не в проде.

> Вехи 0–3 идут строго по порядку. Вехи 5 и 6 запускаются **только после** Вехи 4 и **только если** её отчёт показал, что бесплатно-локальные средства не справляются.

---

## 7. Definition of Done для одного эксперимента

Эксперимент = интеграция одного кандидата из §4. Считается завершённым, когда выполнены **все** пункты:

- [ ] Создан analyzer-сервис в `packages/services/<name>/` по `SERVICES.md` (foundation `audio-engine` уже подключён).
- [ ] Сервис экспортирует `service.ts` (чистая логика), `hooks.ts` (тонкая обёртка), `types.ts`, `index.ts`. **Никаких Web Audio API напрямую** (только через `audio-engine`).
- [ ] Сервис публикует унифицированный `DroneScoreEvent` (см. §5.4) с полями `probability`, `modelId`, `modelVersion`, `latencyMs`, `topFeatures`.
- [ ] В `drone-analyzer-board` появилась строка сравнения с этим сервисом.
- [ ] Прогон на тестовом корпусе (DroneAudioDataset + 1 наш полевой набор) выполнен; ROC-AUC, accuracy, FPR на «не-дрон» зафиксированы в PR.
- [ ] Обновлена колонка `Q` в матрице §4 для этого кандидата.
- [ ] Обновлены `packages/services/README.md` и `WHITE_PAPER.md §6` (если появился новый сервис).
- [ ] `yarn typecheck`, `yarn lint`, `yarn build` проходят.
- [ ] LGTM от Teamlead.

Дополнительно для Шаблона B/C (sidecar/remote):

- [ ] Контракт HTTP/WS зафиксирован в README сервиса.
- [ ] Аутентификация через `X-Membrana-Token` (для своего сервера) или явный конфиг ключей (для внешнего API).
- [ ] Конфигурируемый rate-limit и оценка стоимости вызова (для Эшелона 3).

---

## 8. Анти-паттерны (чего не делаем)

- **Не подключаем внешний API первым, потому что «это быстрее»**. Это нарушает §1.1 и обнуляет цель стратегии.
- **Не начинаем с fine-tune**. Любое обучение — после off-the-shelf baseline. Это нарушает §1.2.
- **Не создаём «один большой drone-service»**, в котором перемешаны все модели. Каждая модель — отдельный analyzer-сервис, сравнение — в плагине-агрегаторе (§5.4). Это требование `SERVICES.md` и условие чистого сравнения.
- **Не дергаем Web Audio API из плагина или analyzer-сервиса напрямую** — только через `@membrana/audio-engine-service` (`ARCHITECTURE.md §1b`).
- **Не регистрируем модули/плагины в обход `MembranaRegistry`** (`ARCHITECTURE.md §1c`).
- **Не храним секреты внешних API в репозитории**. Для Cloud-агента — через Cursor Secrets; для разработчика — через локальный `.env`.
- **Не рассматриваем каталог §4 как закрытый список.** Если кандидат не в каталоге — это не повод его игнорировать; это повод дождаться следующего отчёта радара (§10) или запустить `yarn analyzers:research:week` вручную и предложить правку §4.

---

## 9. Открытые вопросы и риски

1. **Тестовый корпус.** DroneAudioDataset — публичный baseline, но он смещён в сторону «чистых» записей. Нужны наши полевые записи разных условий (ветер, удаление, городской шум). Запланировать сбор в Вехе 0.
2. **WebGPU/WebAssembly производительность.** Реальная скорость CLAP/AST в браузере известна по бенчмаркам, но не на нашем железе. Замер — часть Вехи 1.
3. **Лицензии моделей.** YAMNet (Apache-2), PANNs (MIT), CLAP (Apache-2), BEATs (MIT) — пригодны. AST (BSD) — пригодна. Любая новая модель — проверка лицензии перед PR.
4. **Размер бандла.** TFJS-модели и onnxruntime-web могут раздуть клиент. Решение — выносить модели в отдельные чанки + lazy-load на уровне плагина, как уже сделано в `microphone-stream-viz`.
5. **Sidecar `background-acoustic`** требует решения по упаковке (Docker / pyinstaller / отдельный установщик). Это блок к Вехе 3 и будет отдельной задачей Teamlead-а.
6. **Стандарт `DroneScoreEvent`** должен быть согласован с будущим `AcousticObservation` из WP §7 до начала Вехи 0, иначе придётся переписывать клиентов.
7. **Устаревание каталога §4.** Зафиксированный набор моделей быстро отстанет от ландшафта. Митигация — авто-радар (§10): он не подменяет суждение Teamlead-а, но обеспечивает регулярный приток новых кандидатов и не даёт документу превратиться в «вечный снимок весны 2026».

---

## 10. Процесс ревизии каталога (weekly analyzers research)

Каталог §4 — **снимок** ландшафта; чтобы он не устаревал тихо, в репозитории
живёт авто-радар внешних аналайзеров.

### 10.1 Что делает радар

- Раз в неделю обходит публичные источники без кредитов: HuggingFace Hub
  (`pipeline_tag=audio-classification`, сортировки по `lastModified` и `likes`)
  и arXiv API (`cs.SD` / `eess.AS` + ключевые запросы про дронов и теггинг звука).
- Парсит §4 текущей стратегии, выделяет уже известные имена для дедупликации.
- Через Anthropic (тот же ключ, что у `code-review` и `plan:week`) просит модель
  отсеять дубли, выставить оценки `L/T/C/Q` по матрице §2, предложить эшелон
  и готовые diff-строки для §4.
- Перезаписывает `docs/WEEKLY_ANALYZERS_RESEARCH.md`. История — в `git log`.

### 10.2 Как запустить

| Команда                                   | Что делает                                                                                                                                              |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `yarn analyzers:research:week`            | Полный прогон: источники + Anthropic + запись отчёта. Требует `ANTHROPIC_API_KEY` в `.env`.                                                             |
| `yarn analyzers:research:week:dry`        | Только сбор источников и распечатка контекста, **без** обращения к Anthropic. Полезно для проверки сети и отладки промпта.                              |
| GitHub Action `Weekly analyzers research` | Cron понедельник **06:00 UTC** (на час раньше `Weekly strategic plan`). Коммитит `docs/WEEKLY_ANALYZERS_RESEARCH.md` в `main` от `github-actions[bot]`. |

### 10.3 Куда подключён результат

- ✅ **Недельный план (`yarn plan:week`)** — читает свежий
  `WEEKLY_ANALYZERS_RESEARCH.md` и обязан учитывать его при формировании задач
  на горизонт следующей недели (см. встроенную инструкцию в `_strategic-plan.mjs`).
- ❌ **Ежедневное code-review (`yarn code-review`)** — радар **не** подключается.
  Это документ для стратегии, не для авто-комментариев к коду.
- 🔁 **Сам каталог §4** обновляется не радаром, а Teamlead-ом: радар лишь
  предлагает diff-строки, окончательное решение и измеренное `Q` остаются за человеком.

### 10.4 Definition of Done одного запуска радара

- [ ] `docs/WEEKLY_ANALYZERS_RESEARCH.md` обновлён (или явно помечен «новых кандидатов нет»).
- [ ] В отчёте есть разделы 1–5 по шаблону из `_analyzers-research.mjs`.
- [ ] Кандидаты с `Σ ≥ 7` и `Дубликат? = нет` снабжены готовыми diff-строками для §4.
- [ ] Жёсткие приоритеты §1.1–§1.3 не нарушены: ни одна рекомендация не повышает эшелон без причины.

### 10.5 Что радар намеренно НЕ делает

- Не запускает сами модели и не измеряет качество — это работа отдельных экспериментов из §6.
- Не правит §4 автоматически: только предлагает diff и помечает рекомендации Teamlead-у.
- Не ходит за платными API и не использует ничьих кредитов, кроме Anthropic-вызова для синтеза.
- Не ходит в источники, требующие авторизации; всё, что использует — это публичные эндпоинты HF Hub и arXiv.

---

## 11. Связанные документы и следующий шаг

- Архитектура и границы — [`ARCHITECTURE.md`](./ARCHITECTURE.md).
- Правила сервисов — [`SERVICES.md`](./SERVICES.md).
- Регистрация модулей/плагинов — [`MODULE_AND_PLUGIN_UI.md`](./MODULE_AND_PLUGIN_UI.md).
- Стратегическая цель — [`WHITE_PAPER.md`](./WHITE_PAPER.md).
- Дизайн UI — [`DESIGN.md`](./DESIGN.md).

**Следующий шаг (рекомендуется Teamlead-у):** утвердить вехи 0 и 1, открыть отдельные задачи `/service dsp-drone-detector`, `/service yamnet-analyzer`, `/service clap-analyzer` и плагин `drone-analyzer-board` — это минимально-достаточный набор, чтобы получить первое сравнение детекторов **локально, без обучения и без кредитов**, и честно понять, насколько дорогие эшелоны вообще нужны.

---

## Уже известные имена из §4 (для быстрой дедупликации)

- чистый dsp-детектор
- чистый dsp-детектор (harmonic stack + blade-pass frequency + rms/snr на готовых fft-кадрах)
- yamnet (tf.js)
- yamnet (tf.js) — 521 класс audioset; берём score по aircraft, helicopter, propeller, airscrew, engine
- clap (laion `clap-htsat-unfused`)
- clap (laion clap-htsat-unfused) через onnxruntime-web — zero-shot text↔audio, промпты: «drone propeller», «quadcopter», «helicopter», «wind», «ambient city», «human voice»
- ast / passt (audioset)
- ast / passt (audioset) в onnxruntime-web (квантованная)
- openl3 / vggish эмбеддинги + knn
- openl3 / vggish эмбеддинги + knn по нескольким референсным записям дрона
- mfcc + лёгкий mobilenet/mlp
- mfcc + лёгкий mobilenet/mlp, портированный из droneaudiodataset baseline в tfjs
- panns cnn14 (onnx runtime node)
- panns cnn14 (onnx runtime node) — audioset, 527 классов, выше yamnet
- beats (microsoft)
- beats (microsoft) — sota на audioset
- clap full
- clap full (без квантования) локально через onnxruntime-node
- efficientat / passt
- efficientat / passt локально
- whisper.cpp
- используется как «фильтр анти-речи»
- whisper.cpp — используется как «фильтр анти-речи»: если фрагмент уверенно классифицирован как речь, drone-score снижается
- openl3 / panns эмбеддинги + knn/svm
- openl3 / panns эмбеддинги + knn/svm на droneaudiodataset (few-shot, без backprop)
- self-hosted pytorch inference (panns/ast/beats)
- self-hosted pytorch inference (panns/ast/beats) в packages/background-acoustic на отдельном узле
- fine-tune panns/ast на droneaudiodataset + наши записи
- fine-tune panns/ast на droneaudiodataset + наши записи, экспорт onnx, деплой на свой сервер
- кастомный cnn на лог-мел спектрограммах
- кастомный cnn на лог-мел спектрограммах (как в al-emadi 2019, jeon 2017) — обучаем с нуля только если 2.2 не дал прироста
- droneprint-style открытое множество
- droneprint-style открытое множество (kolamunna 2021) — различение моделей дронов
- huggingface inference api
- huggingface inference api для ast/panns/clap (бесплатный тариф первым, платный — по необходимости)
- replicate / banana / sieve
- replicate / banana / sieve хостинг ast/clap
- edge impulse studio
- edge impulse studio — обучить классификатор у них и получить rest-endpoint
- отраслевые «drone audio» saas

---

## Сырые данные: HuggingFace Hub (pipeline_tag=audio-classification)

- BiologgingSolutions/OceanBEATs | likes=0 downloads=0 | lastModified=2026-05-14T03:37:00.000Z | tags=[torch, audio, sound-event-detection, underwater-acoustics, self-supervised-learning, beats, masked-audio-modeling, audio-classification] | https://huggingface.co/BiologgingSolutions/OceanBEATs
- olaolugbenle/african-lid-v2 | likes=0 downloads=354 | lastModified=2026-05-14T00:47:05.000Z | tags=[transformers, safetensors, wav2vec2, audio-classification, generated_from_trainer, base_model:facebook/wav2vec2-xls-r-300m, base_model:finetune:facebook/wav2vec2-xls-r-300m, license:apache-2.0] | https://huggingface.co/olaolugbenle/african-lid-v2
- hanxunh/AudioMosaic-vit-b16-linear-prob-as20k-attentive | likes=0 downloads=50 | lastModified=2026-05-14T00:18:44.000Z | tags=[AudioMosaic, safetensors, audio, audio-classification, audioset, linear-probe, self-supervised-learning, base_model:hanxunh/AudioMosaic-vit-b16-pretrained] | https://huggingface.co/hanxunh/AudioMosaic-vit-b16-linear-prob-as20k-attentive
- hanxunh/AudioMosaic-vit-b16-linear-prob-as20k | likes=0 downloads=55 | lastModified=2026-05-14T00:18:42.000Z | tags=[AudioMosaic, safetensors, audio, audio-classification, audioset, linear-probe, self-supervised-learning, base_model:hanxunh/AudioMosaic-vit-b16-pretrained] | https://huggingface.co/hanxunh/AudioMosaic-vit-b16-linear-prob-as20k
- hanxunh/AudioMosaic-vit-b16-finetune-envsdd-tta | likes=0 downloads=47 | lastModified=2026-05-14T00:18:40.000Z | tags=[AudioMosaic, safetensors, audio, audio-classification, spoof-detection, envsdd, self-supervised-learning, base_model:hanxunh/AudioMosaic-vit-b16-pretrained] | https://huggingface.co/hanxunh/AudioMosaic-vit-b16-finetune-envsdd-tta
- hanxunh/AudioMosaic-vit-b16-finetune-envsdd-ata | likes=0 downloads=46 | lastModified=2026-05-14T00:18:38.000Z | tags=[AudioMosaic, safetensors, audio, audio-classification, spoof-detection, envsdd, self-supervised-learning, base_model:hanxunh/AudioMosaic-vit-b16-pretrained] | https://huggingface.co/hanxunh/AudioMosaic-vit-b16-finetune-envsdd-ata
- hanxunh/AudioMosaic-vit-b16-finetune-esc-split5 | likes=0 downloads=44 | lastModified=2026-05-14T00:18:36.000Z | tags=[AudioMosaic, safetensors, audio, audio-classification, esc50, self-supervised-learning, base_model:hanxunh/AudioMosaic-vit-b16-pretrained, base_model:finetune:hanxunh/AudioMosaic-vit-b16-pretrained] | https://huggingface.co/hanxunh/AudioMosaic-vit-b16-finetune-esc-split5
- hanxunh/AudioMosaic-vit-b16-finetune-esc-split4 | likes=0 downloads=40 | lastModified=2026-05-14T00:18:34.000Z | tags=[AudioMosaic, safetensors, audio, audio-classification, esc50, self-supervised-learning, base_model:hanxunh/AudioMosaic-vit-b16-pretrained, base_model:finetune:hanxunh/AudioMosaic-vit-b16-pretrained] | https://huggingface.co/hanxunh/AudioMosaic-vit-b16-finetune-esc-split4
- hanxunh/AudioMosaic-vit-b16-finetune-esc-split3 | likes=0 downloads=44 | lastModified=2026-05-14T00:18:32.000Z | tags=[AudioMosaic, safetensors, audio, audio-classification, esc50, self-supervised-learning, base_model:hanxunh/AudioMosaic-vit-b16-pretrained, base_model:finetune:hanxunh/AudioMosaic-vit-b16-pretrained] | https://huggingface.co/hanxunh/AudioMosaic-vit-b16-finetune-esc-split3
- hanxunh/AudioMosaic-vit-b16-finetune-esc-split2 | likes=0 downloads=46 | lastModified=2026-05-14T00:18:30.000Z | tags=[AudioMosaic, safetensors, audio, audio-classification, esc50, self-supervised-learning, base_model:hanxunh/AudioMosaic-vit-b16-pretrained, base_model:finetune:hanxunh/AudioMosaic-vit-b16-pretrained] | https://huggingface.co/hanxunh/AudioMosaic-vit-b16-finetune-esc-split2
- hanxunh/AudioMosaic-vit-b16-finetune-esc-split1 | likes=0 downloads=42 | lastModified=2026-05-14T00:18:27.000Z | tags=[AudioMosaic, safetensors, audio, audio-classification, esc50, self-supervised-learning, base_model:hanxunh/AudioMosaic-vit-b16-pretrained, base_model:finetune:hanxunh/AudioMosaic-vit-b16-pretrained] | https://huggingface.co/hanxunh/AudioMosaic-vit-b16-finetune-esc-split1
- hanxunh/AudioMosaic-vit-b16-finetune-spc2 | likes=0 downloads=47 | lastModified=2026-05-14T00:18:25.000Z | tags=[AudioMosaic, safetensors, audio, audio-classification, speech-commands, self-supervised-learning, base_model:hanxunh/AudioMosaic-vit-b16-pretrained, base_model:finetune:hanxunh/AudioMosaic-vit-b16-pretrained] | https://huggingface.co/hanxunh/AudioMosaic-vit-b16-finetune-spc2
- hanxunh/AudioMosaic-vit-b16-finetune-spc1 | likes=0 downloads=43 | lastModified=2026-05-14T00:18:23.000Z | tags=[AudioMosaic, safetensors, audio, audio-classification, speech-commands, self-supervised-learning, base_model:hanxunh/AudioMosaic-vit-b16-pretrained, base_model:finetune:hanxunh/AudioMosaic-vit-b16-pretrained] | https://huggingface.co/hanxunh/AudioMosaic-vit-b16-finetune-spc1
- hanxunh/AudioMosaic-vit-b16-finetune-as2m | likes=0 downloads=57 | lastModified=2026-05-14T00:18:21.000Z | tags=[AudioMosaic, safetensors, audio, audio-classification, audioset, self-supervised-learning, base_model:hanxunh/AudioMosaic-vit-b16-pretrained, base_model:finetune:hanxunh/AudioMosaic-vit-b16-pretrained] | https://huggingface.co/hanxunh/AudioMosaic-vit-b16-finetune-as2m
- hanxunh/AudioMosaic-vit-b16-finetune-as20k | likes=0 downloads=65 | lastModified=2026-05-14T00:18:18.000Z | tags=[AudioMosaic, safetensors, audio, audio-classification, audioset, self-supervised-learning, base_model:hanxunh/AudioMosaic-vit-b16-pretrained, base_model:finetune:hanxunh/AudioMosaic-vit-b16-pretrained] | https://huggingface.co/hanxunh/AudioMosaic-vit-b16-finetune-as20k
- hanxunh/AudioMosaic-vit-b16-pretrained | likes=1 downloads=50 | lastModified=2026-05-14T00:18:16.000Z | tags=[AudioMosaic, safetensors, audio, self-supervised-learning, masked-modeling, contrastive-learning, audioset, audio-classification] | https://huggingface.co/hanxunh/AudioMosaic-vit-b16-pretrained
- keyvan-ai/wakecore | likes=0 downloads=0 | lastModified=2026-05-13T11:57:08.000Z | tags=[wakecore, audio, speech, hotword, wake-word, voice, keyword-spotting, on-device] | https://huggingface.co/keyvan-ai/wakecore
- davethaler/whale-call-detector | likes=0 downloads=4142 | lastModified=2026-05-13T08:35:52.000Z | tags=[transformers, safetensors, wav2vec2, audio-classification, generated_from_trainer, base_model:facebook/wav2vec2-base, base_model:finetune:facebook/wav2vec2-base, license:apache-2.0] | https://huggingface.co/davethaler/whale-call-detector
- wear-be/xlsr-emotion-int8 | likes=0 downloads=0 | lastModified=2026-05-13T08:00:39.000Z | tags=[onnx, audio, audio-classification, emotion-recognition, wav2vec2, xls-r, int8, base_model:firdhokk/speech-emotion-recognition-with-facebook-wav2vec2-large-xlsr-53] | https://huggingface.co/wear-be/xlsr-emotion-int8
- ASLP-lab/FM-Speech | likes=0 downloads=0 | lastModified=2026-05-13T04:40:18.000Z | tags=[audio-classification, base_model:Qwen/Qwen3-Omni-30B-A3B-Instruct, base_model:finetune:Qwen/Qwen3-Omni-30B-A3B-Instruct, license:apache-2.0, region:us] | https://huggingface.co/ASLP-lab/FM-Speech
- Neopabo/okay-hermes-repcnn-onnx | likes=0 downloads=23 | lastModified=2026-05-12T23:22:33.000Z | tags=[onnx, okay-hermes-repcnn-wakeword, wake-word, keyword-spotting, audio, edge-ai, repcnn, audio-classification] | https://huggingface.co/Neopabo/okay-hermes-repcnn-onnx
- Koras1k/ast-megafinetuned-gtzan-v2-0.97score | likes=0 downloads=16 | lastModified=2026-05-12T22:03:55.000Z | tags=[transformers, safetensors, audio-spectrogram-transformer, audio-classification, music-genre-classification, gtzan, ast, generated_from_trainer] | https://huggingface.co/Koras1k/ast-megafinetuned-gtzan-v2-0.97score
- VasilisAsim/hubert-base-ls960-RAVDESS-finetuned | likes=0 downloads=10 | lastModified=2026-05-12T19:43:23.000Z | tags=[transformers, safetensors, hubert, audio-classification, generated_from_trainer, base_model:facebook/hubert-base-ls960, base_model:finetune:facebook/hubert-base-ls960, license:apache-2.0] | https://huggingface.co/VasilisAsim/hubert-base-ls960-RAVDESS-finetuned
- yuriyvnv/WAVe-1B-Multimodal-NL | likes=2 downloads=29 | lastModified=2026-05-12T19:24:38.000Z | tags=[transformers, safetensors, wave, feature-extraction, audio, speech, multimodal, synthetic-speech] | https://huggingface.co/yuriyvnv/WAVe-1B-Multimodal-NL
- yuriyvnv/WAVe-1B-Multimodal-PT | likes=7 downloads=41 | lastModified=2026-05-12T19:23:59.000Z | tags=[transformers, safetensors, wave, feature-extraction, audio, speech, multimodal, synthetic-speech] | https://huggingface.co/yuriyvnv/WAVe-1B-Multimodal-PT
- detail-co/uhm | likes=1 downloads=0 | lastModified=2026-05-12T18:55:27.000Z | tags=[onnx, safetensors, audio, speech, filler-detection, disfluency, on-device, core-ml] | https://huggingface.co/detail-co/uhm
- xaitalk/ssm-s4-speech-commands | likes=0 downloads=0 | lastModified=2026-05-12T17:02:52.000Z | tags=[xaitalk, xai, explainability, state-space-model, s4, ssm, audio-classification, cross-framework] | https://huggingface.co/xaitalk/ssm-s4-speech-commands
- xaitalk/audionet-audiomnist | likes=0 downloads=29 | lastModified=2026-05-12T17:02:50.000Z | tags=[xaitalk, keras, xai, explainability, audio-classification, 1d-cnn, cross-framework, tensorflow] | https://huggingface.co/xaitalk/audionet-audiomnist
- cstr/titanet-large-GGUF | likes=0 downloads=107 | lastModified=2026-05-11T15:15:07.000Z | tags=[gguf, speaker-verification, speaker-identification, speaker-embedding, crispasr, audio-classification, base_model:nvidia/speakerverification_en_titanet_large, base_model:quantized:nvidia/speakerverification_en_titanet_large] | https://huggingface.co/cstr/titanet-large-GGUF
- T0KII/masri-audioV1 | likes=0 downloads=21 | lastModified=2026-05-11T15:08:11.000Z | tags=[transformers, safetensors, wav2vec2, audio-classification, arxiv:1910.09700, endpoints_compatible, region:us] | https://huggingface.co/T0KII/masri-audioV1
- HearTheSpecies/InsectNet-BE-AN | likes=1 downloads=0 | lastModified=2026-05-11T11:31:41.000Z | tags=[autrainer, audio, ecoacoustic-tagging, HearTheSpecies, audio-classification, arxiv:2412.11943, doi:10.57967/hf/8710, license:cc-by-nc-sa-4.0] | https://huggingface.co/HearTheSpecies/InsectNet-BE-AN
- HearTheSpecies/CoarseSoundNet | likes=1 downloads=0 | lastModified=2026-05-11T09:34:14.000Z | tags=[autrainer, audio, ecoacoustic-tagging, HearTheSpecies, ecoacoustics, audio-classification, arxiv:2412.11943, doi:10.57967/hf/8709] | https://huggingface.co/HearTheSpecies/CoarseSoundNet
- tphakala/BattyBirdNET-onnx | likes=0 downloads=0 | lastModified=2026-05-10T07:01:35.000Z | tags=[onnxruntime, onnx, bioacoustics, bat-detection, birdnet, echolocation, wildlife, audio-classification] | https://huggingface.co/tphakala/BattyBirdNET-onnx
- syamaner/coffee-first-crack-detection | likes=0 downloads=67 | lastModified=2026-05-09T16:49:23.000Z | tags=[transformers, onnx, safetensors, audio-spectrogram-transformer, audio-classification, audio, coffee, first-crack-detection] | https://huggingface.co/syamaner/coffee-first-crack-detection
- livechord-music/livechord-bar-arbitrator | likes=0 downloads=0 | lastModified=2026-05-09T14:40:17.000Z | tags=[onnx, music, music-information-retrieval, downbeat-tracking, bar-tracking, chord-recognition, audio, audio-classification] | https://huggingface.co/livechord-music/livechord-bar-arbitrator
- livechord-music/livechord-beat-refiner | likes=0 downloads=17 | lastModified=2026-05-09T14:40:11.000Z | tags=[pytorch, safetensors, beat_refiner, music, music-information-retrieval, beat-tracking, downbeat-tracking, chord-recognition] | https://huggingface.co/livechord-music/livechord-beat-refiner
- datamatters24/attuned-resonance-voice-tone | likes=0 downloads=11 | lastModified=2026-05-09T13:44:37.000Z | tags=[transformers, audio-classification, speech-emotion-recognition, wav2vec2, call-center, en, base_model:facebook/wav2vec2-base, base_model:finetune:facebook/wav2vec2-base] | https://huggingface.co/datamatters24/attuned-resonance-voice-tone
- matbee/whisper-to-vad | likes=0 downloads=0 | lastModified=2026-05-09T03:36:11.000Z | tags=[onnx, audio, speech-emotion-recognition, valence-arousal-dominance, vad, whisper, audio-classification, en] | https://huggingface.co/matbee/whisper-to-vad
- imanux12/wav2vec2-5lang-detection | likes=0 downloads=54 | lastModified=2026-05-08T10:26:22.000Z | tags=[transformers, safetensors, wav2vec2, audio-classification, arxiv:1910.09700, endpoints_compatible, region:us] | https://huggingface.co/imanux12/wav2vec2-5lang-detection
- AmeerHesham/distilhubert-finetuned-baby_cry | likes=1 downloads=37 | lastModified=2026-05-07T17:27:03.000Z | tags=[transformers, tensorboard, safetensors, hubert, audio-classification, audio, distilhubert, baby-cry] | https://huggingface.co/AmeerHesham/distilhubert-finetuned-baby_cry
- MIT/ast-finetuned-audioset-10-10-0.4593 | likes=354 downloads=509394 | lastModified=2023-09-06T14:49:15.000Z | tags=[transformers, pytorch, safetensors, audio-spectrogram-transformer, audio-classification, arxiv:2104.01778, license:bsd-3-clause, endpoints_compatible] | https://huggingface.co/MIT/ast-finetuned-audioset-10-10-0.4593
- ehcalabres/wav2vec2-lg-xlsr-en-speech-emotion-recognition | likes=250 downloads=37499 | lastModified=2024-10-24T13:29:57.000Z | tags=[transformers, pytorch, tensorboard, safetensors, wav2vec2, audio-classification, generated_from_trainer, doi:10.57967/hf/2045] | https://huggingface.co/ehcalabres/wav2vec2-lg-xlsr-en-speech-emotion-recognition
- speechbrain/emotion-recognition-wav2vec2-IEMOCAP | likes=187 downloads=615785 | lastModified=2024-07-23T07:52:24.000Z | tags=[speechbrain, audio-classification, Emotion, Recognition, wav2vec2, pytorch, en, dataset:iemocap] | https://huggingface.co/speechbrain/emotion-recognition-wav2vec2-IEMOCAP
- audeering/wav2vec2-large-robust-12-ft-emotion-msp-dim | likes=161 downloads=1053208 | lastModified=2024-09-19T08:07:19.000Z | tags=[transformers, pytorch, safetensors, wav2vec2, speech, audio, audio-classification, emotion-recognition] | https://huggingface.co/audeering/wav2vec2-large-robust-12-ft-emotion-msp-dim
- speechbrain/lang-id-voxlingua107-ecapa | likes=144 downloads=148658 | lastModified=2024-11-27T20:12:38.000Z | tags=[speechbrain, audio-classification, embeddings, Language, Identification, pytorch, ECAPA-TDNN, TDNN] | https://huggingface.co/speechbrain/lang-id-voxlingua107-ecapa
- firdhokk/speech-emotion-recognition-with-openai-whisper-large-v3 | likes=109 downloads=19760 | lastModified=2025-11-01T03:19:07.000Z | tags=[transformers, safetensors, whisper, audio-classification, generated_from_trainer, base_model:openai/whisper-large-v3, base_model:finetune:openai/whisper-large-v3, license:apache-2.0] | https://huggingface.co/firdhokk/speech-emotion-recognition-with-openai-whisper-large-v3
- m-a-p/MERT-v1-330M | likes=86 downloads=42125 | lastModified=2025-05-25T05:04:41.000Z | tags=[transformers, pytorch, mert_model, feature-extraction, music, audio-classification, custom_code, arxiv:2306.00107] | https://huggingface.co/m-a-p/MERT-v1-330M
- laion/clap-htsat-fused | likes=85 downloads=20255799 | lastModified=2026-01-12T00:41:49.000Z | tags=[transformers, pytorch, safetensors, clap, feature-extraction, zero-shot audio classification, zero-shot audio retrieval, audio-classification] | https://huggingface.co/laion/clap-htsat-fused
- speechbrain/spkrec-xvect-voxceleb | likes=66 downloads=68801 | lastModified=2024-02-25T16:09:57.000Z | tags=[speechbrain, embeddings, Speaker, Verification, Identification, pytorch, xvectors, TDNN] | https://huggingface.co/speechbrain/spkrec-xvect-voxceleb
- harshit345/xlsr-wav2vec-speech-emotion-recognition | likes=62 downloads=1614 | lastModified=2021-12-12T20:53:33.000Z | tags=[transformers, pytorch, wav2vec2, audio, audio-classification, speech, en, dataset:aesdd] | https://huggingface.co/harshit345/xlsr-wav2vec-speech-emotion-recognition
- speechbrain/emotion-diarization-wavlm-large | likes=56 downloads=293 | lastModified=2024-02-28T13:10:54.000Z | tags=[speechbrain, audio-classification, Emotion, Diarization, wavlm, pytorch, en, dataset:ZaionEmotionDataset] | https://huggingface.co/speechbrain/emotion-diarization-wavlm-large
- audeering/wav2vec2-large-robust-24-ft-age-gender | likes=51 downloads=1676668 | lastModified=2025-03-24T10:02:24.000Z | tags=[transformers, pytorch, safetensors, wav2vec2, speech, audio, audio-classification, age-recognition] | https://huggingface.co/audeering/wav2vec2-large-robust-24-ft-age-gender
- xmj2002/hubert-base-ch-speech-emotion-recognition | likes=50 downloads=3232 | lastModified=2023-05-16T02:27:14.000Z | tags=[transformers, pytorch, hubert, audio-classification, zh, license:apache-2.0, endpoints_compatible, deploy:azure] | https://huggingface.co/xmj2002/hubert-base-ch-speech-emotion-recognition
- m-a-p/MERT-v1-95M | likes=48 downloads=78904 | lastModified=2025-05-25T05:03:07.000Z | tags=[transformers, pytorch, mert_model, feature-extraction, music, audio-classification, custom_code, arxiv:2306.00107] | https://huggingface.co/m-a-p/MERT-v1-95M
- facebook/audiobox-aesthetics | likes=48 downloads=170860 | lastModified=2025-03-04T21:32:30.000Z | tags=[safetensors, model_hub_mixin, pytorch_model_hub_mixin, audio-classification, arxiv:2502.05139, license:cc-by-4.0, region:us] | https://huggingface.co/facebook/audiobox-aesthetics
- alefiury/wav2vec2-large-xlsr-53-gender-recognition-librispeech | likes=47 downloads=58800 | lastModified=2024-03-23T20:43:05.000Z | tags=[transformers, pytorch, safetensors, wav2vec2, audio-classification, generated_from_trainer, dataset:librispeech_asr, base_model:facebook/wav2vec2-xls-r-300m] | https://huggingface.co/alefiury/wav2vec2-large-xlsr-53-gender-recognition-librispeech
- Roblox/voice-safety-classifier | likes=41 downloads=67 | lastModified=2024-07-08T16:30:20.000Z | tags=[transformers, safetensors, wavlm, audio-classification, arxiv:2110.13900, license:cc-by-sa-3.0, endpoints_compatible, region:us] | https://huggingface.co/Roblox/voice-safety-classifier
- speechbrain/lang-id-commonlanguage_ecapa | likes=40 downloads=10486 | lastModified=2024-02-19T14:51:04.000Z | tags=[speechbrain, audio-classification, embeddings, Language, Identification, pytorch, ECAPA-TDNN, TDNN] | https://huggingface.co/speechbrain/lang-id-commonlanguage_ecapa
- dima806/music_genres_classification | likes=38 downloads=601877 | lastModified=2024-10-19T10:57:45.000Z | tags=[transformers, pytorch, safetensors, wav2vec2, audio-classification, base_model:facebook/wav2vec2-base-960h, base_model:finetune:facebook/wav2vec2-base-960h, license:apache-2.0] | https://huggingface.co/dima806/music_genres_classification
- ccmusic-database/music_genre | likes=35 downloads=0 | lastModified=2026-05-04T03:01:18.000Z | tags=[music, art, audio-classification, en, dataset:ccmusic-database/music_genre, license:mit, region:us] | https://huggingface.co/ccmusic-database/music_genre
- facebook/mms-lid-126 | likes=34 downloads=26939 | lastModified=2023-06-13T10:15:48.000Z | tags=[transformers, pytorch, safetensors, wav2vec2, audio-classification, mms, ab, af] | https://huggingface.co/facebook/mms-lid-126
- JaesungHuh/voice-gender-classifier | likes=34 downloads=23418 | lastModified=2025-05-04T11:09:00.000Z | tags=[transformers, safetensors, pytorch_model_hub_mixin, model_hub_mixin, gender-classification, VoxCeleb, audio-classification, dataset:ProgramComputer/voxceleb] | https://huggingface.co/JaesungHuh/voice-gender-classifier
- Rajaram1996/Hubert_emotion | likes=33 downloads=73 | lastModified=2022-11-19T20:10:41.000Z | tags=[transformers, pytorch, hubert, speech, audio, HUBert, audio-classification, endpoints_compatible] | https://huggingface.co/Rajaram1996/Hubert_emotion
- TalTechNLP/voxlingua107-epaca-tdnn | likes=33 downloads=940 | lastModified=2024-11-27T20:06:00.000Z | tags=[speechbrain, audio-classification, embeddings, Language, Identification, pytorch, ECAPA-TDNN, TDNN] | https://huggingface.co/TalTechNLP/voxlingua107-epaca-tdnn
- ccmusic-database/pianos | likes=29 downloads=0 | lastModified=2026-02-27T09:00:20.000Z | tags=[https://github.com/monetjoe/pianos, music, art, audio-classification, en, dataset:ccmusic-database/pianos, license:mit, region:us] | https://huggingface.co/ccmusic-database/pianos
- ccmusic-database/song_structure | likes=29 downloads=0 | lastModified=2026-02-27T08:57:53.000Z | tags=[music, art, audio-classification, en, dataset:ccmusic-database/song_structure, license:mit, region:us] | https://huggingface.co/ccmusic-database/song_structure
- KintsugiHealth/dam | likes=29 downloads=0 | lastModified=2026-03-13T12:07:20.000Z | tags=[audio-classification, en, base_model:openai/whisper-small.en, base_model:finetune:openai/whisper-small.en, license:apache-2.0, region:us] | https://huggingface.co/KintsugiHealth/dam
- prithivMLmods/Common-Voice-Gender-Detection | likes=28 downloads=170030 | lastModified=2025-11-12T02:21:55.000Z | tags=[transformers, safetensors, wav2vec2, audio-classification, voice-gender-detection, male, female, biology] | https://huggingface.co/prithivMLmods/Common-Voice-Gender-Detection
- ccmusic-database/bel_canto | likes=26 downloads=0 | lastModified=2026-02-27T09:15:09.000Z | tags=[music, art, audio-classification, en, dataset:ccmusic-database/bel_canto, license:mit, region:us] | https://huggingface.co/ccmusic-database/bel_canto
- ccmusic-database/chest_falsetto | likes=26 downloads=0 | lastModified=2026-02-27T09:19:23.000Z | tags=[music, art, audio-classification, en, dataset:ccmusic-database/chest_falsetto, license:mit, region:us] | https://huggingface.co/ccmusic-database/chest_falsetto
- ccmusic-database/erhu_playing_tech | likes=26 downloads=0 | lastModified=2026-02-27T09:08:37.000Z | tags=[music, art, audio-classification, en, dataset:ccmusic-database/erhu_playing_tech, license:mit, region:us] | https://huggingface.co/ccmusic-database/erhu_playing_tech
- ccmusic-database/Guzheng_Tech99 | likes=26 downloads=0 | lastModified=2026-02-27T09:06:02.000Z | tags=[music, audio-classification, zh, dataset:ccmusic-database/Guzheng_Tech99, license:mit, region:us] | https://huggingface.co/ccmusic-database/Guzheng_Tech99
- superb/hubert-large-superb-er | likes=25 downloads=63558 | lastModified=2021-11-04T16:03:28.000Z | tags=[transformers, pytorch, hubert, audio-classification, speech, audio, en, dataset:superb] | https://huggingface.co/superb/hubert-large-superb-er
- bookbot/distil-ast-audioset | likes=24 downloads=212 | lastModified=2023-09-12T14:17:44.000Z | tags=[transformers, pytorch, tensorboard, safetensors, audio-spectrogram-transformer, audio-classification, generated_from_trainer, en] | https://huggingface.co/bookbot/distil-ast-audioset
- superb/wav2vec2-base-superb-sid | likes=23 downloads=654 | lastModified=2021-11-04T16:03:40.000Z | tags=[transformers, pytorch, wav2vec2, audio-classification, speech, audio, en, dataset:superb] | https://huggingface.co/superb/wav2vec2-base-superb-sid
- superb/hubert-base-superb-er | likes=22 downloads=4665 | lastModified=2021-11-04T16:03:24.000Z | tags=[transformers, pytorch, hubert, audio-classification, speech, audio, en, dataset:superb] | https://huggingface.co/superb/hubert-base-superb-er
- OpenMuQ/MuQ-large-msd-iter | likes=22 downloads=275027 | lastModified=2025-08-15T10:45:28.000Z | tags=[pytorch, safetensors, music, audio-classification, en, zh, arxiv:2501.01108, license:cc-by-nc-4.0] | https://huggingface.co/OpenMuQ/MuQ-large-msd-iter
- OpenMuQ/MuQ-MuLan-large | likes=21 downloads=58920 | lastModified=2025-08-21T19:00:44.000Z | tags=[pytorch, music, audio-classification, en, zh, arxiv:2501.01108, license:cc-by-nc-4.0, region:us] | https://huggingface.co/OpenMuQ/MuQ-MuLan-large
- foduucom/baby-cry-classification | likes=20 downloads=0 | lastModified=2024-07-23T09:01:33.000Z | tags=[joblib, baby-cry-classification, machine-learning, audio-analysis, signal-processing, acoustic-feature-extraction, audio-classification, speech-recognition] | https://huggingface.co/foduucom/baby-cry-classification
- amiriparian/ExHuBERT | likes=19 downloads=199 | lastModified=2024-12-15T23:25:42.000Z | tags=[transformers, pytorch, hubert, audio-classification, Speech Emotion Recognition, SER, Transformer, HuBERT] | https://huggingface.co/amiriparian/ExHuBERT

---

## Сырые данные: arXiv (cs.SD / eess.AS, последние работы по запросу)

(arXiv вернул HTTP 429)

---

# Задание

Сформируй ОДИН markdown-документ — еженедельный отчёт радара. Файл будет
сохранён как `C:\Users\user190825\practice\Membrana\docs\WEEKLY_ANALYZERS_RESEARCH.md` и перезаписан целиком при следующем запуске
(история — в git). Используй именно эти заголовки уровня ## и ###, без отклонений.

## 1. Сводка

- Дата отчёта: `2026-05-14T16:54:02.373Z`. Окно поиска: с `2026-05-07T16:54:02.373Z` по `2026-05-14T16:54:02.373Z`.
- 3–6 предложений: что главное появилось за неделю и есть ли причина двигать каталог §4.
- Если значимых новинок нет — честно отметь это.

## 2. Новые кандидаты

Таблица. Колонки строго в этом порядке:

`№` | `Кандидат` | `Источник` | `Эшелон` | `L` | `T` | `C` | `Q` | `Σ` | `Дубликат?` | `Заметки`

- `№` — сквозная нумерация (1, 2, 3, …).
- `Кандидат` — имя модели/работы и короткая поясняющая фраза (1 строка).
- `Источник` — `HuggingFace` или `arXiv` + ссылка в формате `[link](url)`.
- `Эшелон` — 0/1/2/3 по §3 INTEGRATIONS_STRATEGY.md.
- `L/T/C/Q` — оценки по матрице §2 (целые числа).
- `Σ` — сумма L+T+C+Q.
- `Дубликат?` — `да` / `нет` / `вариант X.Y` со ссылкой на строку §4, если этот кандидат пересекается с уже известным.
- `Заметки` — 1–2 фразы: лицензия (если известна), почему интересно, что мешает.

Сортировка строк: по `Σ` убыванию; внутри одного `Σ` — по эшелону (0 → 3).
Если кандидатов нет — оставь только заголовок раздела и фразу «За период новых кандидатов не найдено».

## 3. Предлагаемые правки §4 INTEGRATIONS_STRATEGY.md

- Для каждого кандидата, у которого `Σ ≥ 7` И `Дубликат? = нет`, выдай готовую строку
  для подходящей таблицы §4.1 / §4.2 / §4.3 / §4.4 — в виде diff-блока:

```diff
+ | X.Y | **Имя** … | … | L | T | C | Q | **Σ** | целевой пакет |
```

- Если кандидат уточняет уже известный (вариант существующей строки) — предложи
  правку существующей строки тем же diff-форматом (`-` + `+`).
- Если кандидатов с `Σ ≥ 7` нет — раздел из одной фразы «Правки не предлагаются».

## 4. Рекомендации Teamlead-у

- 2–5 буллетов, что делать с этим отчётом: какие кандидаты двигать в каталог,
  какие требуют точечного замера, какие отбросить и почему.
- Соблюдай приоритеты §1.1/§1.2/§1.3: ни в каком случае не рекомендуй платный API,
  если локальный вариант не исчерпан, и не рекомендуй fine-tune, если zero-shot не замерен.

## 5. Сырые источники

### HuggingFace (audio-classification, top по lastModified + likes)

Маркированный список: `id` + (likes/downloads, теги, lastModified). Без обработки, как пришло.
Если HF вернул ошибку — короткая строка «HuggingFace API: HTTP <code>».

### arXiv (cs.SD / eess.AS, релевантные запросы)

Маркированный список: title + ссылка + 1 строка из summary. Без обработки.
Если arXiv вернул ошибку — короткая строка «arXiv API: HTTP <code>».

Ограничения формата:

- Язык — русский.
- Никаких сроков в днях/неделях/часах — это документ-радар, а не план.
- Не цитируй INTEGRATIONS_STRATEGY.md длинными блоками — ссылайся на §X.Y.
- Не предлагай обходить запрет прямой работы с Web Audio API (см. ARCHITECTURE.md §1b).
  --- END DRY RUN ---
  Длина контекста: 56979 символов; источники: HuggingFace Hub (audio-classification) / arXiv (cs.SD / eess.AS).
