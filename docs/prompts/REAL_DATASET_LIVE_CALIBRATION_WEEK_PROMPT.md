# Промпт: Реальный датасет → live-сопоставление → калибровка журнала (неделя)

> **Стратегический task-промпт на неделю** (Cursor IDE / Claude / другой LLM).  
> Процесс: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).  
> Размер: **L** (эпик, 5–7 рабочих дней).  
> Ожидаемый артефакт: **несколько PR** + **ручная работа пользователя** с библиотекой сэмплов; к концу недели — `DATASET.md` v0.2 (реальные звуки), откалиброванный журнал client↔cabinet, готовность к детекторам.  
> Реестр: `id` = **`real-dataset-live-calibration`** в [`docs/tasks/registry.json`](../tasks/registry.json).

---

## Контекст

Синтетический bootstrap [`DATASET.md`](../DATASET.md) v0.1 (9 WAV, `yarn dataset:generate`) **недостаточен** для stage-gate и для доверия к детекторам. Перед реализацией и бенчмарком DSP/нейро-детекторов (#47) нужен **правдоподобный корпус реальных записей**, прогнанный через **уже существующие** анализаторы, с переносом отобранных сэмплов в формальный датасет, live-сопоставлением с микрофоном и **калибровкой журнала телеметрии** на клиенте и в cabinet.

**Стратегическое решение Teamlead (2026-06-14):** детекторы и `yarn benchmark:detectors` на полном корпусе — **после** этой недели. Сейчас — **ground truth + инструменты наблюдения**, не новые детекторы.

**Что уже есть в репозитории (используем, не переписываем):**

| Компонент | Путь | Роль в неделе |
|-----------|------|---------------|
| Модуль «Библиотека сэмплов» | `apps/client/src/modules/SampleLibraryModule.tsx` | Коллекции, импорт, классы, playback |
| `@membrana/media-library-service` | `packages/services/media-library/` | CRUD коллекций, квоты, blob |
| `AudioFrameFeed` | `apps/client/src/lib/audioAnalysis/` | Единый источник кадров: mic / sample-library |
| Плагины микрофона | `fft-threshold-test`, `fft-indices-viz`, `sound-quality-viz`, `harmonic-detector-viz`, `trends-fft-analyzer`, `mic-buffer-recorder` | Live-анализ и запись в буфер |
| Плагины библиотеки | `sample-library-player`, `trends-fft-sample-analyzer` | Offline-анализ сэмплов |
| Журнал телеметрии | `apps/client/src/modules/telemetry-journal/` | Локальные записи анализа |
| Cloud sync (MP5) | `useTelemetryCloudSync`, `background-cabinet` Journal | Серверный журнал |
| Cabinet UI | `apps/cabinet` | Просмотр cloud journal |
| Синтетический датасет v0.1 | `data/detectors-benchmark/v0.1/` | Эталон формата manifest; **не удалять** |
| Архитектура библиотеки | [`MEDIA_LIBRARY_ARCHITECTURE.md`](../MEDIA_LIBRARY_ARCHITECTURE.md) §6 | Export manifest → benchmark |

**Связанные документы:**

| Документ | Зачем |
|----------|--------|
| [`VIRTUAL_TEAM_PROMPT.md`](../VIRTUAL_TEAM_PROMPT.md) | Роли, формат ответа |
| [`WHITE_PAPER.md`](../WHITE_PAPER.md) §8, §11 | Stage-gate откладывается до v0.2 датасета |
| [`SINGLE_NODE_DETECTION_FIRST_PROMPT.md`](./SINGLE_NODE_DETECTION_FIRST_PROMPT.md) | #47 — детекторы **после** этой недели |
| [`DETECTOR_BENCHMARK.md`](../DETECTOR_BENCHMARK.md) | Gate criteria (применяем позже) |
| [`MEMBRANE_PLATFORM.md`](../MEMBRANE_PLATFORM.md) §«Облачный журнал» | Client↔cabinet parity |
| [`DESIGN.md`](../DESIGN.md) | UI журнала и библиотеки |
| [`INTEGRATIONS_STRATEGY.md`](../INTEGRATIONS_STRATEGY.md) | Эшелон 0 — только существующие сервисы |

**GitHub Issue:** [#47](https://github.com/officefish/Membrana/issues/47) (родительский эпик; эта неделя — подэтап «данные и калибровка»).

**Блокирует:** реализацию harmonic/cepstral/spectral-flux детекторов, полный прогон `yarn benchmark:detectors` на реальном корпусе.

---

## Промпт целиком (для вставки агенту)

> Всё ниже до раздела **«Заметки для человека-постановщика»** — текст задания для агента на **всю неделю**.

---

### Кто ты

Ты — **координатор виртуальной команды Membrana** под руководством **Vesnin** (Teamlead). Работаешь **итерациями по фазам W1–W5**; перед каждым PR — план (1–2 абзаца + список файлов). Соблюдай [`VIRTUAL_TEAM_PROMPT.md`](../VIRTUAL_TEAM_PROMPT.md), [`ARCHITECTURE.md`](../ARCHITECTURE.md) §1b–1c (только `audio-engine`, hub, `MembranaRegistry`).

**Главный принцип недели:** сначала **данные и наблюдаемость**, потом **детекторы**. Не создавать новые detector-сервисы и не расширять ensemble до закрытия фазы W5.

---

### Стратегическая цель недели

Построить **цепочку доказательств**:

```text
Пользовательские коллекции (реальные WAV)
    → анализ существующими плагинами (offline + live)
    → курированный export в data/detectors-benchmark/v0.2/
    → live-сопоставление mic ↔ шаблоны/сэмплы
    → согласованный журнал (client local + cabinet cloud)
    → только затем — детекторы и stage-gate benchmark
```

**Критерий успеха недели:** оператор (пользователь) может воспроизвести сценарий «записал дрон → проанализировал → увидел в журнале → та же карточка в cabinet → live-микрофон даёт сопоставимый trends/harmonic-профиль с эталонным сэмплом».

---

### Таксономия коллекций (создаёт пользователь)

Пользователь **вручную** создаёт в модуле «Библиотека сэмплов» **не менее четырёх** user-коллекций. Рекомендуемые имена (можно локализовать):

| Коллекция | `class` (метаданные) | Содержание | Минимум сэмплов (цель недели) |
|-----------|----------------------|------------|-------------------------------|
| **Реальные дроны** | `drone-multirotor` | Чистые или почти чистые записи БПЛА | ≥ 10 |
| **Дрон + шум** | `drone-multirotor` + note «mixed» | Дрон на фоне ветра/города/людей | ≥ 10 |
| **Шумные среды** | `wind`, `traffic`, `human-speech`, `bird` | Без дрона; ложноположительные контроли | ≥ 15 |
| **Спокойные / тихие** | `silence` | Фон, комната, парк без целевого сигнала | ≥ 5 |

**Источники звука:** импорт с диска (WAV/MP3), запись с микрофона через `mic-buffer-recorder` → буфер → перенос в коллекцию. Синтетика из v0.1 **не смешивать** с реальными в user-коллекциях. Системный корпус free-v1 — только в `__tariff_dataset__` (read-only, см. эпик [`TARIFF_DATASET_V1_EPIC_PROMPT.md`](./TARIFF_DATASET_V1_EPIC_PROMPT.md)).

**Метаданные на каждый сэмпл (обязательно заполнять по мере импорта):**

- `class` — из `CLASS_OPTIONS` в `SampleLibraryModule`
- `label` — `drone` | `not-drone` | `unlabeled` (до разметки)
- `source` — `disk-import` | `mic-recording`
- `notes` — дистанция, модель дрона, погода, SNR на слух (текст)

---

### Фазы недели

#### Фаза W1 — Наполнение библиотек (День 1, пользователь + агент по запросу)

**Владелец:** пользователь (Музыкант). Агент — только если UI/квоты/импорт ломаются.

**Действия пользователя:**

1. Открыть модуль «Библиотека сэмплов».
2. Создать 4+ коллекции по таблице выше.
3. Импортировать/записать WAV; для каждого — class и label.
4. Проверить `MediaLibraryQuotaBanner` — при remote-server убедиться, что blobs на media-server.

**DoD W1:**

- [ ] ≥ 40 сэмплов суммарно в user-коллекциях (или задокументировано, почему меньше).
- [ ] Нет сэмплов с `unlabeled` в финальных коллекциях дронов/контроля (кроме черновиков в буфере).
- [ ] Скриншот или экспорт списка коллекций в `docs/datasets/week-2026-06-14/collections-inventory.md` (агент помогает сгенерировать из manifest UI).

**Агент (если нужно):** починить импорт, квоты MP4, drag-drop; **не** менять доменную модель без LGTM.

---

#### Фаза W2 — Анализ существующими инструментами (Дни 2–3)

**Владелец:** пользователь + Математик/Музыкант; агент улучшает UX/журналирование.

**Прогон каждого сэмпла (offline):**

| Инструмент | Модуль | Режим | Что фиксируем |
|------------|--------|-------|---------------|
| Trends FFT Sample Analyzer | sample-library | `analysisSource: sample-library` | top-3 шаблона, score, temporal/spectral |
| Harmonic Detector Viz | sample-library | переключатель источника | confidence, fundamentals, isDrone |
| FFT Threshold Test | sample-library | если поддержан feed | pass/fail, пороги |
| Sound Quality Viz | sample-library | опционально | SNR, clarity |
| Sample Player | sample-library | — | убедиться в корректном decode |

**Прогон live (на выборку 5+ сэмплов):**

1. Воспроизвести сэмпл через колонки **или** проиграть в комнате с микрофоном.
2. Те же плагины на модуле «Микрофон» в live-режиме.
3. Сравнить визуально: trends-класс, harmonic confidence, fft-indices.

**Журналирование:** каждый осмысленный прогон → запись в **Журнал телеметрии** (`pluginId`, `analysisSource`, `sampleId` если есть, payload с метриками).

**DoD W2:**

- [ ] Таблица `docs/datasets/week-2026-06-14/analysis-matrix.md`: строка = sampleId, столбцы = trends top-1, harmonic conf, fft-threshold, заметки оператора.
- [ ] ≥ 80% сэмплов класса «реальный дрон» имеют harmonic/trends-профиль, **отличимый** от «спокойных» (качественно, в матрице).
- [ ] Выявлены **ложноположительные** среды (ветер, трафик) — отмечены в матрице для калибровки порогов.
- [ ] Записи журнала создаются без ошибок (local).

**Out of scope W2:** обучение моделей, новые детекторы, автоматическая разметка.

---

#### Фаза W3 — Формальный датасет v0.2 (День 3–4)

**Владелец:** Структурщик + Teamlead.

**Предусловие:** фазы **DS1–DS4** эпика [`TARIFF_DATASET_V1_EPIC_PROMPT.md`](./TARIFF_DATASET_V1_EPIC_PROMPT.md) merged (корпус free-v1, tariff-dataset, benchmark runner).

**Действия:**

1. Курированный корпус **120 × 5 с** уже в `data/detectors-benchmark/v0.2/` (`yarn dataset:sync-free-v1`).
2. Пользовательские полевые записи остаются в **user-коллекциях**; в v0.2 не смешивать без явного курирования.
3. `docs/DATASET.md` — секция v0.2 (free-v1-catalog).
4. При расширении корпуса — новая версия manifest (`v0.3`), не правка bundled free-v1 без bump тарифа.

**DoD W3:**

- [ ] DS1–DS4 в архиве реестра.
- [ ] `data/detectors-benchmark/v0.2/manifest.json` — 120 записей `label: drone|not-drone`.
- [ ] `docs/DATASET.md` описывает v0.2 и отличия от v0.1.
- [ ] README в `data/detectors-benchmark/v0.2/README.md`.

---

#### Фаза W4 — Live-сопоставление mic ↔ эталоны (День 4–5)

**Владелец:** Музыкант + Математик; агент — UX сравнения и шаблоны trends.

**Сценарии (минимум 3):**

| # | Сценарий | Ожидание |
|---|----------|----------|
| L1 | Live микрофон + реальный дрон (или playback эталона в комнате) | trends top-1 ≈ drone-bootstrap или пользовательский шаблон; harmonic confidence выше, чем на тишине |
| L2 | Live микрофон + ветер/трафик | trends **не** drone; harmonic ниже порога |
| L3 | A/B: sample-library playback **vs** mic на тот же сигнал | Профили fft-indices/flux в одном порядке величины (qualitative) |

**Инструменты:**

- `trends-fft-analyzer` — шаблоны сопоставления (sidebar «Шаблоны для сопоставления»); при необходимости сохранить user-шаблоны из лучших сэмплов W2.
- `harmonic-detector-viz` — сравнение `analysisSource: microphone` vs запись в журнале с `sample-library`.
- `AudioFrameFeed` — не дублировать подписки.

**DoD W4:**

- [ ] Документ `docs/datasets/week-2026-06-14/live-matching-protocol.md` с шагами L1–L3 и результатами прогонов.
- [ ] ≥ 1 пользовательский trends-шаблон, derived from реального дрона, сохранён (localStorage или media-server trends-templates).
- [ ] Журнал содержит пары записей «sample offline» + «mic live» для одного сигнала (linked by `sessionNote` в payload).

---

#### Фаза W5 — Калибровка журнала client ↔ cabinet (День 5–7)

**Владелец:** Структурщик + Верстальщик + Teamlead.

**Проблема:** MP5 доставил upload и список, но **parity карточек**, live-badge и фильтры — post-v1 ([`MEMBRANE_PLATFORM.md`](../MEMBRANE_PLATFORM.md)). Эта фаза — **первая итерация калибровки**, не полный консилиум.

**Действия:**

1. **Client:** убедиться, что `useTelemetryCloudSync` поднимает записи W2–W4 в cabinet (prod или dev).
2. **Сервер:** `background-cabinet` Journal API — те же поля `pluginId`, `payload`, `kind` (report vs live).
3. **Сверка:** для 10 записей — local JSON export ≡ cloud запись (ключевые метрики, timestamps, sampleId).
4. **Cabinet UI:** карточка отчёта показывает те же числа, что client `TelemetryJournalModule` (допустимо упрощённый layout, **не** другие значения).
5. **Калибровка порогов** (не детекторов!): fft-threshold / trends weights — документировать в `docs/datasets/week-2026-06-14/threshold-calibration.md` по ложноположительным из W2.

**DoD W5:**

- [ ] Чек-лист parity: 10/10 записей совпадают по payload (скрипт или ручная таблица).
- [ ] `docs/JOURNAL_CALIBRATION.md` (новый) — регламент: что синкается, частота, поля, known gaps.
- [ ] Cabinet lint green; client journal export/import работает.
- [ ] Teamlead LGTM: «можно начинать детекторы на v0.2».

---

### Архитектура / контракт

| Слой | Путь | Ответственность недели |
|------|------|------------------------|
| UI библиотеки | `apps/client/.../SampleLibraryModule` | Коллекции, метаданные |
| UI микрофон + плагины | `apps/client/src/plugins/*` | Анализ mic/sample-library |
| Frame feed | `apps/client/src/lib/audioAnalysis/` | Единый источник кадров |
| Media domain | `@membrana/media-library-service` | Хранение, export |
| Telemetry | `@membrana/telemetry-service`, journal module | Local + sync |
| Data-plane | `background-media`, `background-cabinet` | Blobs, cloud journal |
| Formal dataset | `data/detectors-benchmark/v0.2/` | Manifest + WAV policy |
| Docs | `docs/DATASET.md`, `docs/JOURNAL_CALIBRATION.md` | Регламенты |

**Запрещено на этой неделе:**

- Новые пакеты `*-detector-service` (кроме багфиксов существующего harmonic).
- TDOA, localizer, tracker, transport.
- Расширение Membrane Platform MP7+ без LGTM.
- `new AudioContext()` / `getUserMedia` вне `audio-engine`.
- Прямая регистрация модулей в store — только `MembranaRegistry`.

---

### Definition of Done (вся неделя)

- [ ] Фазы W1–W5 закрыты (чек-листы выше).
- [ ] `data/detectors-benchmark/v0.2/manifest.json` — реальные записи, ≥ 30 строк.
- [ ] `docs/DATASET.md` v0.2 + `docs/JOURNAL_CALIBRATION.md`.
- [ ] `docs/datasets/week-2026-06-14/` — analysis-matrix, live-matching-protocol, threshold-calibration, collections-inventory.
- [ ] Журнал client↔cabinet: 10/10 parity на выборке.
- [ ] `yarn turbo run lint typecheck test build --continue` — зелёный (scope: затронутые пакеты).
- [ ] Запись в реестре: `yarn task:archive real-dataset-live-calibration` с отчётом в #47.
- [ ] **После архивации** — разблокированы task-промпты детекторов (harmonic gate, benchmark full run).

---

### Out of scope (вся неделя)

- Реализация cepstral / spectral-flux / YAMNet / ensemble.
- Полный stage-gate benchmark (precision/recall на v0.2) — **следующая неделя**.
- Полевые мультиузловые испытания.
- Автоматический ML-классификатор.
- Закрытие эпика #67 (можно параллельно Teamlead, не блокирует W1–W5).

---

### Порядок работы ролей

1. **Teamlead** — фиксирует приоритет «данные → журнал → детекторы»; LGTM на export policy и journal parity; блокирует scope creep.
2. **Структурщик** — manifest v0.2, sync контракт, скрипты validate/export, `JOURNAL_CALIBRATION.md`.
3. **Математик** — сопоставление метрик offline vs live; пороги fft/harmonic/trends; **не** новые алгоритмы детекции.
4. **Музыкант** — наполнение коллекций, ручные прогоны L1–L3, чек-лист «слышен как дрон».
5. **Верстальщик** — parity карточек journal client/cabinet; DESIGN.md; cabinet lint.

---

### Формат ответа координатора (планирование дня)

```text
[Teamlead]: фаза Wx, границы, LGTM
[Структурщик]: файлы, контракты, export/sync
[Математик]: метрики, пороги, матрица анализа
[Музыкант]: сэмплы, live-сценарии, качество записи
[Верстальщик]: journal UI parity, a11y

Итоговый артефакт дня: …
Definition of Done дня: …
```

---

### Календарь (рекомендация)

| День | Фаза | Фокус |
|------|------|-------|
| Пн 14.06 | W1 | Коллекции + импорт (пользователь) |
| Вт 15.06 | W2 | Offline-анализ всего корпуса |
| Ср 16.06 | W2–W3 | Матрица + отбор + manifest v0.2 |
| Чт 17.06 | W4 | Live-сопоставление + trends-шаблоны |
| Пт 18.06 | W5 | Journal parity + threshold doc |
| Сб–Вс | буфер | Дозапись сэмплов, ретро, архив задачи |

---

## Заметки для человека-постановщика

1. Обновить #47 комментарием: «Неделя 2026-06-14: real dataset + live calibration — см. `REAL_DATASET_LIVE_CALIBRATION_WEEK_PROMPT.md`».
2. Утром каждого дня: `yarn main-day-issue --focus real-dataset-live-calibration` (после принятия плана).
3. Пользовательские WAV **не** коммитить без проверки PII/лицензии.
4. После недели: `yarn task:archive real-dataset-live-calibration --notes "v0.2 real, journal parity OK"`.

### Проверка после недели

```bash
yarn install
yarn turbo run lint typecheck test build --continue
# manifest
node -e "const m=require('./data/detectors-benchmark/v0.2/manifest.json'); console.log(m.samples?.length)"
```

---

## Связь с дорожной картой

- **WHITE_PAPER §8:** stage-gate 1→2 требует датасет — v0.2 закрывает пробел «только синтетика».
- **#47 Single-Node Detection First:** scaffolding готов; **реализация детекторов** — следующий спринт после этой недели.
- **Membrane Platform v1:** MP1–MP6 archived; журнал калибруется в рамках post-v1 дорожной карты.
