# Метаданные сеанса

| Поле | Значение |
|------|----------|
| Дата (UTC) | 2026-06-26T05:30:00.000Z |
| Команда | консилиум (ручная фиксация; `yarn consilium` — сбой proxy/API) |
| Модель | — (протокол синтезирован по CONSILIUM_PROMPT + позиция Teamlead) |
| Файл | `docs/seanses/neural-detectors-strategy-2026-06-26.md` |
| Порядок ролей | Teamlead → Структурщик → Математик → Музыкант → Верстальщик |
| Связанные документы | `INTEGRATIONS_STRATEGY.md`, `WHITE_PAPER.md` §8, `DETECTOR_BENCHMARK.md`, `desktop-product-line-2026-06-17` |

**Вопрос:**

Консилиум: нейросетевые детекторы — стратегия, стек, модули; согласование приоритетов спринтов с позицией Teamlead (UserCase на трёх интерфейсах сейчас; нейро — после спринтов 1–4; продукт free-tier: датасет+трек → детектор → отчёт).

**Позиция Teamlead (пользователь, финальное мнение):**

- Нейродетектор нужен даже на **free** тарифе: пользователь выжимает максимум из ~1 ГБ аудио-библиотеки; базовый инструмент настольной версии — собрать свой датасет и сценарий **датасет + трек → детектор → отчёт**. Это фокус **следующей** недели.
- **Эта** неделя: UserCase device-board стабилен на трёх внешних интерфейсах — **кабинет пользователя**, **Membrana Studio** (Electron), **лёгкое настольное Device Board**.
- Ближайшие спринты (порядок): (1) технический долг, (2) device_board на сервере в кабинете, (3) device_board в Electron Membrana Studio, (4) рефакторинг модуля микрофон и плагинов (async + критический анализ детекторов). Только **после** этого — контрактная основа нейродетекторов на уровне архитектуры монорепо.

---

# Консилиум: нейросетевые детекторы и пересмотр приоритетов спринтов

**Повестка:** Что такое нейродетекторы в Membrana; стратегия и стек (эшелоны 1.B, сервисы, плагины); согласовать **отложение** `NeuralDetector` до спринтов 1–4; связать продуктовую цель free-tier с device-board UserCase и тремя интерфейсами; таблица спринтов с DoD.

**Участники:** Teamlead (Vesnin), Структурщик (Ozhegov), Математик (Dynin), Музыкант, Верстальщик (Rodchenko).

**Порядок реплик:** Teamlead → Структурщик → Математик → Музыкант → Верстальщик (циклически)

---

[Teamlead]: Открываю с продуктового угла. Нейродетектор для нас — не «магия ради stage-gate», а **инструмент владельца гигабайта**: из своей sample library собрать датасет, прогнать трек через детектор, получить отчёт. Это сценарий **датасет + трек → детектор → отчёт** — базовый UX настольной линейки на free-тарифе. Но сегодня мы **не** начинаем контракт `NeuralDetector`: сначала UserCase async-v2 должен одинаково жить в кабинете, Studio и Device Board. Без стабильного сценарного рантайма нейро повиснет в воздухе.

[Структурщик]: Согласен с порядком. Три оболочки — три host-bridge контракта: web/cabinet (HTTP + WS), Studio (Electron + полный `apps/client`), Device (лёгкий Electron + только `device-board`). Общее ядро — `@membrana/device-board` runtime, `@membrana/core` async-контракты. Нейро-сервисы (`yamnet`, `clap`) подключаются **только** в Studio/web-контуре с микрофоном; Device по консилиуму desktop-product-line звук не анализирует. Значит спринты 2–3 — про **размещение графа сценария**, не про inference.

[Математик]: Уточню термин. **Нейросетевой детектор** — предобученная модель (YAMNet, CLAP, AST…), принимающая `AudioWindow` 3–7 с и возвращающая `confidence ∈ [0,1]`. В отличие от DSP (FFT, шаблоны), признаки не проектируем вручную. Stage-gate: P≥85%, R≥90%; лучший FFT `DRONE_TIGHT` — P 85.5%, R 88.3%. Нейро — ставка закрыть recall. Но **математика без стабильного пайплайна записи/трека бессмысленна**: сначала L20 stress, async re-arm, три хоста.

[Музыкант]: Для меня критично: детекторы (DSP и будущие neural) получают кадры **только** через `audio-engine.LiveSampler`. Рефакторинг микрофона в спринте 4 — про async-хуки, отсутствие утечек `setInterval`, корректный stop/start при смене трека из библиотеки. Именно это нужно для сценария «трек из 1 ГБ → окно → score → журнал». Пока recording-pipeline на трёх интерфейсах ведёт себя по-разному — не трогаем TF.js.

[Верстальщик]: Три интерфейса — три UX-поверхности одного UserCase. В кабинете — встроенный device-board в веб-оболочке; в Studio — полный client + FS; в Device — компактный редактор сценария. Визуальная цель недели: **один и тот же сценарий** (alpha/beta/gamma async-v2) запускается без расхождений. Отчёт детектора (будущий) — плагин-таблица в Studio; в кабинете — виджет в журнале. DESIGN-токены общие; плотность layout разная.

[Teamlead]: Фиксирую расхождение с `MAIN_DAY_ISSUE` от 26.06: задача A (`NeuralDetector` сегодня) **переносится** за спринты 1–4. Утренний план устарел по воле Teamlead — обновим `STRATEGIC_PLAN_WEEK` и буфер `CURRENT_TASK.md`, не ломая архив.

[Структурщик]: Спринт 1 — техдолг: незакоммиченные insight/opencode артефакты, RAG-тесты P1, lint device-board, гигиена `.sync-readme-out.txt`. Спринт 2 — **cabinet**: device-board как модуль кабинета на сервере (`background-cabinet` pairing, сценарий по API). Спринт 3 — **Studio Electron**: тот же runtime через host-bridge jobs (`db-ap-r7`). Спринт 4 — **микрофон**: async hub, критический разбор template-match vs legacy DSP, подготовка точки подключения neural без реализации.

[Математик]: После спринта 4 логично открыть **архитектурный** эпик нейро: `NeuralDetector` в `detector-base`, scaffold → реализация YAMNet/CLAP по `INTEGRATIONS_STRATEGY` §4.1, бенчмарк `yarn benchmark:detectors`. Fine-tune и `background-acoustic` — только если zero-shot в browser не дотягивает. Продуктовый сценарий free-tier не требует fine-tune на старте: достаточно zero-shot + пользовательский порог в отчёте.

[Музыкант]: Связка **датасет + трек → детектор → отчёт** на free: пользователь помечает сэмплы в library (до 1 ГБ), device-board сценарий читает трек, микрофонный модуль (или file playback через engine) подаёт окна, детектор пишет в journal, плагин рендерит отчёт. Это **неделя 2+**, но контракты journal и `AcousticObservation` закладываем при спринте 4. Neural family в `DetectionResult` уже есть.

[Верстальщик]: Для отчёта на free нужен минимальный UI: таблица «файл | confidence | метка пользователя | совпадение», экспорт CSV. Не ждём ensemble-board — достаточно одного активного детектора (сначала template-match, потом CLAP). Карточка в DESIGN.md: family `neural` отдельным цветом.

[Teamlead]: Принимаю. Нейро на free — **да**, но **после** стабилизации трёх хостов. Иначе пользователь соберёт датасет, а сценарий упадёт на cabinet/Studio/Device — репутационный ущерб.

[Структурщик]: Стек нейро (когда дойдём) без изменений: эшелон 0 browser (`tfjs`, `onnxruntime-web`), сервисы в `packages/services/detectors/{yamnet,clap}`, agentic отдельно, **не** в `background-media`. Агрегатор `drone-analyzer-board` — после первого живого neural. Циклы запрещены: analyzer → только `detector-base` + `audio-engine`.

[Математик]: Матрица приоритетов §2 INTEGRATIONS_STRATEGY сохраняется. YAMNet и CLAP — Σ=9, zero-shot. Для пользовательского датасета на free важнее **калибровка порога** на его разметке (few-shot kNN — эшелон 0.5), чем новая архитектура. Это эпик после YAMNet skeleton, не блокер спринтов 1–4.

[Музыкант]: Спринт 4 должен ответить: какие DSP-детекторы оставляем в магистрали (template-match / trends), что архивируем (harmonic, cepstral, spectral-flux — как в плане дня, но **внутри** спринта 4, не сегодня). Критический анализ — честные цифры `DETECTOR_BENCHMARK`, не удаление ради удаления.

[Верстальщик]: Три интерфейса — чеклист smoke: один UserCase JSON, три entrypoint'а, одинаковые коллекторы (`device-board-collectors-v05`). Расхождения UI (модалки, sidebar) — hotfix внутри спринта 1–2, не отдельный эпик.

[Teamlead]: Риски: (1) раздувание спринта 2 cabinet + server deploy; (2) Electron FS в Studio vs sandbox в cabinet; (3) MAIN_DAY_ISSUE и registry всё ещё тянут neural — нужен `yarn task:sync-readme` и запись в registry deferral. Решение: явный эпик `neural-tier-1b-contract` со статусом **deferred** до конца спринта 4.

[Структурщик]: `membrana-studio-desktop` и device-board в cabinet — разные `apps/*`, общий `@membrana/device-board`. DRY: runtime в пакете, host-bridge в каждом app. Спринт 2 и 3 можно частично параллелить после спринта 1, если разные исполнители.

[Математик]: Для консилиума фиксирую определение **нейродетектора** в одну строку репозитория: *«Analyzer-сервис family=neural, реализующий `DroneDetector` через pretrained-модель без обязательного fine-tune на первом этапе»*. Контракт `NeuralDetector` — расширение с `predict` и `InferenceContext`, не замена `DroneDetector`.

[Музыкант]: Agentic (`agentic-claude`) — не блокер free-tier сценария; полезен для разметки спорных сэмплов в library. Оставляем в бэклоге 1.B, не в спринтах 1–4.

[Верстальщик]: Продуктовая формулировка для пользователя free: *«Загрузите звуки, соберите набор, запустите сценарий — получите отчёт, где алгоритм услышал дрон»*. Без слов ONNX и stage-gate. Документировать в `docs/INSIGHTS` или README sample-library после спринта 4.

[Teamlead]: Итоговое голосование. Все пять ролей: **принимаю** отложение нейро-контракта; **принимаю** порядок спринтов 1→4; **принимаю** фокус недели — UserCase на cabinet + Studio + Device Board. Нейро и сценарий датасет→отчёт — **следующая неделя** при зелёном smoke трёх хостов.

---

## Итоговое решение консилиума

| # | Решение | Статус |
|---|---------|--------|
| 1 | Нейродетекторы — эшелон **1.B** (`yamnet`, `clap`, опционально `agentic`); стек browser-first (`tfjs`, `onnxruntime-web`); каталог `INTEGRATIONS_STRATEGY` §4.1 без изменений | Принято |
| 2 | Продуктовая цель free-tier: **датасет + трек → детектор → отчёт** из ~1 ГБ library | Принято (реализация **неделя 2+**) |
| 3 | **Эта неделя:** стабильный UserCase device-board на **кабинет**, **Membrana Studio**, **Device Board** (desktop) | Принято |
| 4 | `NeuralDetector` / архитектурный эпик 1.B — **deferred** до завершения спринтов 1–4 | Принято |
| 5 | Порядок спринтов: (1) техдолг → (2) cabinet deploy → (3) Studio Electron → (4) микрофон+детекторы audit → (5) нейро-контракт | Принято |
| 6 | `MAIN_DAY_ISSUE` 26.06 задача A — **снята с магистрали дня**; обновить недельный план и registry | Принято |

### Таблица спринтов (ближайшее время)

| Спринт | Фокус | DoD (кратко) | Риски |
|--------|-------|--------------|-------|
| **1. Техдолг** | RAG-тесты, lint, гигиена repo, async-v2 L18–L20 | `turbo test` green по RAG; device-board smoke; PR hygiene | Размытие scope |
| **2. Cabinet** | device_board на сервере в кабинете пользователя | UserCase запускается в web-cabinet; pairing/сценарий по API | background-cabinet контракт |
| **3. Studio** | device_board в Electron Membrana Studio | Тот же UserCase через host-bridge; FS journal | Electron preload parity |
| **4. Микрофон** | async refactor, audit DSP/template-match | Нет утечек; единый playback→detect path; список «оставить/архив» DSP | Пересечение с удалением harmonic* |
| **5. Нейро (арх.)** | `NeuralDetector`, YAMNet/CLAP skeleton, бенчмарк | Контракт в `detector-base`; первый neural в benchmark | Преждевременный fine-tune |

### Стек нейродетекторов (когда спринт 5)

```
audio-engine → detector-base (NeuralDetector) → yamnet | clap | agentic
                      ↓
           apps/client plugins (отчёт, drone-analyzer-board)
```

Foundation: `@membrana/audio-engine-service`, `@membrana/detector-base`.  
Analyzer: `@membrana/yamnet-detector-service`, `@membrana/clap-detector-service`.  
Не смешивать: `background-media` (blobs), `background-office` (интеграции).  
Sidecar `background-acoustic` — только если browser не тянет модель.

### Definition of Done (неделя текущая)

- [ ] UserCase async-v2 (alpha/beta/gamma) smoke на **cabinet**, **Studio**, **Device Board**
- [ ] Зафиксирован deferral neural в `docs/tasks/registry.json` / недельном плане
- [ ] Спринт 1 стартован: RAG P1 закрыт или Issue; L20 stress по roadmap
- [ ] Протокол консилиума в `docs/seanses/` (этот файл)

---

**Секретарь:** протокол сохранён. При восстановлении API можно перегенерировать расширенную версию:  
`yarn consilium --save-as neural-detectors-strategy-2026-06-26-v2 "<повестка из метаданных>"`
