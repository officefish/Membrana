# Консилиум: медиа-библиотека для датасетов и benchmark

**Повестка:** нужна ли отдельная **медиа-библиотека** Membrana для загрузки звуков с диска и записи через плагин микрофона — в поддержку `docs/DATASET.md`, `yarn benchmark:detectors` и stage-gate #47?

**Участники:** Teamlead (Vesnin), Структурщик (Ozhegov), Математик (Dynin), Музыкант, Верстальщик (Rodchenko).

**Порядок реплик:** Музыкант → Математик → Teamlead → Верстальщик → Структурщик → …

**Контекст репозитория (2026-06-09):**
- `data/detectors-benchmark/v0.1/` — 9 синтетических WAV + `manifest.json`; `yarn dataset:generate`, `yarn benchmark:detectors`.
- `datasets/.gitkeep` — заготовка сырого каталога; полевые WAV **не** в git.
- `AudioFileUploadModule` — загрузка File с диска и воспроизведение через `@membrana/audio-engine-service`, **без** каталога/метаданных/экспорта в датасет.
- Плагины микрофона — live DSP/детекция; **нет** единого «сохранить запись в библиотеку с label/class».
- Stage-gate: ≥30 сэмплов на класс; v0.1 далеко от цели.

---

[Музыкант]: Сейчас у нас два разрозненных пути: синтетика через скрипт и разовый upload в UI. Для **реального** датасета нужен третий — **запись с микрофона с меткой класса** и четвёртый — **импорт WAV с диска в каталог с метаданными**. Без этого команда будет копировать файлы руками в `datasets/raw/` и забывать SNR, расстояние, микрофон. Медиа-библиотека для меня — не Spotify, а **реестр сэмплов** с привязкой к benchmark.

[Математик]: Уточню: benchmark (`scripts/benchmark-detectors.mjs`) читает **manifest.json**, не UI. Любая «библиотека» обязана **генерировать или обновлять манифест** в формате, совместимом с `label: drone | not-drone` и полями class/split. Чистая галерея звуков без схемы метаданных **не помогает** математике. Нужен контракт `MediaSample { id, path, class, label, sampleRate, durationSec, source, … }`.

[Teamlead]: Согласен с проблемой, но **не** смешиваем с полноценным DAM-продуктом. Приоритет — **#47 Single-Node**: библиотека должна **кормить** датасет и benchmark, а не стать вторым клиентом. Решение в духе ARCHITECTURE: сервис + тонкий UI-модуль, не логика в каждом плагине микрофона.

[Верстальщик]: `AudioFileUploadModule` уже даёт waveform и спектр — хорошая база для **просмотра** сэмпла. Не дублировать canvas. Нужен экран «библиотека»: таблица DaisyUI (class, label, duration, source), drag-and-drop import, кнопка «добавить в test-split». Запись с микрофона — модалка: выбрать class **до** или **после** записи, preview, Save. a11y: labels на всех select.

[Структурщик]: Пакет `@membrana/media-library-service` (или `sample-catalog-service`) — **leaf** в `packages/services/`, зависит от `core` + возможно `audio-engine-service` для decode peak preview. **Запрещено:** плагины микрофона импортируют друг друга ради save. Поток: mic plugin → hub event `media.sample.captureRequested` → модуль библиотеки / сервис сохраняет WAV + JSON sidecar. Upload module → тот же сервис `importFromFile(file, metadata)`.

[Музыкант]: Запись с микрофона: брать PCM из **engine**, не дублировать `getUserMedia` в библиотеке. Плагин harmonic-detector уже слушает hub — после сессии отдаём Float32Array или MediaRecorder blob в сервис. Важно: **48 kHz mono** как в DATASET v0.1, resample в сервисе если нужно.

[Математик]: Sidecar JSON рядом с WAV или один центральный `catalog.json`? Для benchmark удобнее **один manifest** на версию датасета (`data/detectors-benchmark/v0.2/manifest.json`), а библиотека — **редактор**, который экспортирует subset в manifest. Не два источника правды.

[Teamlead]: Фазируем. **M0 (сейчас):** документ + CLI `yarn media:import` — файл + метаданные → `datasets/raw/`. **M1:** сервис + модуль UI catalog. **M2:** запись из mic plugin. Не блокируем gate синтетикой — библиотека **ускоряет** набор полевых данных, но v0.1 synthetic уже крутит benchmark.

[Верстальщик]: M0 без UI терпимо, если README DATASET описывает структуру `datasets/raw/<class>/`. Но для мотивации команды нужен хотя бы **минимальный UI** в M1 — иначе все опять в markdown. Rodchenko: один route `/lab/samples` или секция в существующем lab.

[Структурщик]: Хранение: `datasets/raw/` локально + `.gitignore` для `*.wav`; в git только manifest синтетики в `data/detectors-benchmark/`. Библиотека читает оба корня через env `MEMBRANA_DATASETS_DIR`. Согласовано с MCP §5 — не коммитить полевые записи с PII.

[Музыкант]: Классы из DATASET.md: drone-multirotor, bird, wind, traffic, human-speech, silence — select в UI, не free text. Для «не уверен» — класс `unlabeled` до ревью Teamlead.

[Математик]: Benchmark должен уметь `--manifest path` и фильтр split. Уже есть v0.1 — расширить, не ломать. Import из библиотеки добавляет строку в manifest с `source: field-recording | disk-import | synthetic`.

[Teamlead]: Конкуренция с `AudioFileUploadModule`? Не заменяем — **делегируем** decode в engine, модуль upload может стать thin wrapper или merge в library viewer позже. Сейчас не refactor upload — **новый** модуль `sample-library` в M1.

[Верстальщик]: Merge позже. Пользовательский сценарий: Import file → заполнить class → видит waveform → «Включить в benchmark v0.2». Запись: Mic panel → «Save to library» → та же форма метаданных.

[Структурщик]: Тесты: сервис — unit на manifest merge, id slug, duplicate detection; без Web Audio в CI headless — mock File. E2e запись — manual checklist, как MCP phase A.

[Музыкант]: Loudness normalize при import? Для датасета **нет** на M1 — храним as-is, SNR в метаданных вручную. Нормализация — отдельная M-задача, иначе испортим benchmark честности.

[Dynin]: Поддерживаю. Метрика успеха библиотеки: **≥5 импортов/записей с полными метаданными** без ручного редактирования JSON. Тогда окупает себя.

[Teamlead]: Размер задачи: **M** на M1+M2 вместе, или **S** только M0 CLI. Реестр: `media-library-dataset` после консилиума. Issue — отдельный, не поглощает #47, но **в скоупе** stage-gate (набор данных).

[Верстальщик]: Принимаю фазы M0→M1→M2. DESIGN.md: таблица + card preview, без тяжёлой медиатеки.

[Структурщик]: Принимаю `@membrana/media-library-service` + hub events; граф чистый.

[Музыкант]: Принимаю. Запись только через engine/hub.

[Математик]: Принимаю. Manifest — единственный вход benchmark.

[Teamlead]: Принимаю итог ниже.

---

## Итоговое решение консилиума

| Вопрос | Решение |
|--------|---------|
| Нужна ли медиа-библиотека? | **Да**, как **каталог сэмплов для датасета/benchmark**, не как общий медиаплеер |
| Отдельный пакет? | **Да:** `@membrana/media-library-service` (имя можно уточнить на LGTM) |
| Загрузка с диска | **Да** — import File → metadata → `datasets/raw/` + запись в manifest |
| Запись с микрофона | **Да (фаза M2)** — через hub/engine, без второго getUserMedia в библиотеке |
| Связь с `AudioFileUploadModule` | **Не дублировать** decode/play; позже возможен merge UI |
| Связь с benchmark | **Обязательна** — export/update `manifest.json` для `yarn benchmark:detectors` |
| Приоритет vs #47 | **В скоупе gate**, фазами: **M0 CLI сейчас**, M1 UI, M2 mic save |
| Полный DAM / облако | **Нет** v1 |

## План фаз

| Фаза | Deliverable | Размер |
|------|-------------|--------|
| **M0** | `yarn media:import <file> --class … --label …` → `datasets/raw/` + sidecar; документ в DATASET.md | S |
| **M1** | `@membrana/media-library-service` + client module «Sample library» (таблица, import, export manifest) | M |
| **M2** | «Save to library» из плагина микрофона (hub event → сервис) | M |

## Definition of Done (первая итерация M0+M1)

- [ ] Import WAV с диска с class/label/source
- [ ] Manifest v0.2 export совместим с `benchmark-detectors.mjs`
- [ ] Полевые WAV не в git; путь через `MEMBRANA_DATASETS_DIR` / `datasets/raw/`
- [ ] Unit-тесты merge manifest
- [ ] Task-промпт + Issue; не нарушает слабую связанность плагинов

## Следующий шаг

1. Teamlead: завести Issue + `docs/prompts/MEDIA_LIBRARY_DATASET_PROMPT.md` + registry `media-library-dataset`.
2. M0: CLI import (можно без UI за 1 PR).
3. После M1 — M2 mic capture.

---

*Протокол: 2026-06-09 · slug: media-library-dataset*
