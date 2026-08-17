<!-- канал: llm — протокол произведён yarn consilium -->

# Метаданные сеанса

| Поле | Значение |
|------|----------|
| Дата (UTC) | 2026-08-17T14:16:32.817Z |
| Команда | `yarn consilium` |
| Модель | anthropic/claude-sonnet-4-6 |
| Файл | `docs/seanses/server-plugin-foundation-m6r-first-wave-2026-08-17.md` |
| Порядок ролей | Верстальщик → Структурщик → Teamlead → Музыкант → Математик → Архитектор |
| Повестка | `docs/meeting/server-plugin-foundation/M6R_AGENDA.md` |

**Вход сеанса** (что комната действительно получила):

| Вход | Носитель | Размер | Отпечаток | Доставка |
|------|----------|-------:|-----------|----------|
| повестка (эхо в голове) | `docs/meeting/server-plugin-foundation/M6R_AGENDA.md` | 4846 | `4f113bfea185` | полностью |
| инструкция консилиума | `docs/prompts/CONSILIUM_PROMPT.md` | 4494 | `b6bd1a8dc127` | полностью |
| координация ролей | `docs/VIRTUAL_TEAM_PROMPT.md` | 8034 | `75959c7f060d` | **обрезан** |
| повестка | `docs/meeting/server-plugin-foundation/M6R_AGENDA.md` | 4846 · 1 п. | `4f113bfea185` | полностью |

> ⚠ Часть входа не доехала до комнаты целиком. Утверждения протокола о своём входе
> сверять с этой таблицей, а не с текстом реплик.

**Условия прогона:** `--no-context --no-rag --min-replies 30`

**Вопрос:**

Переигрывание M6: первая волна, первый живой плагин membrana.handler.mfcc, честный живой след без невозможных артефактов, приёмка с нормой #1950

---

# Консилиум: M6′ — первая волна плагинов, живой след, приёмка с нормой #1950

**Повестка:** Переигрывание M6: состав первой волны handler-плагинов, первый живой плагин `membrana.handler.mfcc`, честная форма RunRecord без невозможных артефактов, PR-план приёмки с нормой #1950, границы «не делаем».

**Участники:** Teamlead (Тарасов), Архитектор (Веснин), Структурщик (Ожегов), Математик (Дынин), Музыкант (Курёхин), Верстальщик (Родченко).

**Порядок реплик:** Верстальщик → Структурщик → Teamlead → Музыкант → Математик → Архитектор

---

[Верстальщик]: Прежде чем говорить о витринном плагине — зафиксирую контракт M5′ как данность: у `HandlerManifest` нет `displayForm` и `description`, их физически нет в типе. Витрина — это `kind: 'showcase'` с `ShowcaseManifest`. Мой вопрос к комнате: витринный плагин — это не handler и не report, значит он не в шести детекторах по определению. Вопрос о его включении в волну — это вопрос о том, есть ли в волне вообще `kind: 'showcase'`-плагин помимо шести. Жду позиций.

[Структурщик]: Лемма до спора: шесть детекторов — это пакеты `packages/services/*` рода `handler`, дом `background-media/collections`. Это закрыто Т3.5. `ShowcaseManifest` — отдельный вид, контракт M1/M5′ его предусмотрел, переоткрывать M1 не нужно (находка A6-6 правильная). Но включить витринный плагин в первую волну — значит сдавать два рода одновременно, что расширяет DoD. Моя позиция: первая волна — шесть handler; витринный плагин — волна вторая, отдельный PR после приёмки основы. Обоснование ниже у Архитектора.

[Teamlead]: Принимаю лемму Ожегова. Ритм: основа сдаётся с первым живым плагином — норма Т3.11. Дальнейший спор об этом — потеря времени. Витринный плагин в первую волну не включаем — граница честная: он другого рода, его DoD иной (нужен `displayForm`, нужна витрина читателя), и смешивать приёмки значит не принять ни одну из них чисто. Комната обязана закрыть три вещи: состав волны, форму живого следа, PR-план. Прошу Математика — форма RunRecord.

[Музыкант]: Соглашусь с ритмом. Добавлю от DSP-стороны: mfcc — правильный первый кандидат. Детерминированный, постфактум, без накопления состояния. На media живёт `field-node-2026-08` и коллекция «Полевые записи 2026-08» — реальный носитель для прогона. Артефакт `ConvergenceRecord` требует пары live/recompute — у первого прогона её нет, это не дефект, это архитектурная норма: одиночный прогон не конвергирует. `StateRecord` — жилец накопительного плагина, mfcc-детектор таковым не является. Прошу Математика формализовать, что именно входит в RunRecord.

[Математик]: Формализую состав RunRecord для первого живого прогона `membrana.handler.mfcc`. Контракты дают нам три компонента: (1) `RunAddress = { pluginId: 'membrana.handler.mfcc', version, collectionId, runId, mountTarget: 'background-media/collections' }` — адрес записи, уникальный индекс в Mongo коллекции `plugin-results`; (2) `RunFingerprints = { inputHash, configHash }` — отдельный интерфейс, не часть адреса, фиксирует детерминированность прогона; (3) поле `resumeMode: 'fresh'` — первый прогон, не из заморозки. Что НЕ входит: `StateRecord` — его нет у постфактум-детектора без окна накопления; `ConvergenceRecord` — нет пары live/recompute. Итого: RunRecord = { address: RunAddress, fingerprints: RunFingerprints, resumeMode: 'fresh', completedAt, kind } — и всё. Ни один невозможный артефакт не требуется.

[Архитектор]: Конструкция волны. Шесть детекторов — один род, один дом, один тип манифеста. Это когерентная волна: все шесть регистрируются через `registerPlugin`, манифест — `HandlerManifest`, витринных полей нет. Витринный плагин — другой род, другой тип манифеста, другой DoD. Включить его в первую волну — значит смешать два контракта в одном PR и получить нечитаемую приёмку. Граница честная не потому что «M1 закрыт», а потому что две разные приёмки не суммируются в одну без потери ясности. Что до порядка внутри шести: все шесть в одной волне — да, но первый живой — `membrana.handler.mfcc`, остальные пять сдают манифест и заглушку executor без живого прогона в этом PR.

[Верстальщик]: Уточню мою позицию о витрине окончательно. `kind: 'showcase'` контрактом M1/M5′ предусмотрен, `ShowcaseManifest` готов — это данность, не нужно ничего переоткрывать. Граница «не в первой волне» — не «невозможно», а «не сейчас»: витринный плагин требует `displayForm`, требует компонента-читателя в UI, требует отдельной приёмки по DESIGN.md. Первая волна — шесть handler. Витринный — вторая волна или отдельный трек. Моё «принимаю» по этому пункту.

[Структурщик]: Теперь PR-план. Прежний PR-5 требовал `ShowcaseManifest` у шести handler — это структурная ложь, закрытая A6-3. Пересобираю честный план. PR-1: контракты — типы `HandlerManifest`, `RunAddress`, `RunFingerprints`, `RunRecord`, интерфейс `IPluginHost`, `HOME_REGISTRY`, коллекция `plugin-results` с уникальным индексом. PR-2: реестр и хост — `registerPlugin`, `getRegisteredPlugins`, `setPluginEnabled` для обоих домов. PR-3: первый живой плагин `membrana.handler.mfcc` — манифест, executor, RunRecord с `resumeMode: 'fresh'`, живой прогон на коллекции «Полевые записи 2026-08». PR-4: манифесты и заглушки executor для оставшихся пяти handler (harmonic, cepstral, spectral-flux, template-match, yamnet). Норма #1950 — в каждом PR как правило приёмки, не отдельный PR.

[Teamlead]: Хорошо. Норма #1950 — «результаты плагинов не подменяют измеренное сервером» — это контрактное ограничение, проверяемое в каждом PR, не отдельный артефакт. Прошу Математика — как норма #1950 проверяется конкретно в PR-3.

[Математик]: Норма #1950 в PR-3 проверяется так: RunRecord хранит выход executor — вычисленную метрику MFCC поверх проб тракта. Проба тракта — измеренное сервером, RunRecord на него ссылается через `collectionId` и `inputHash`, но не перезаписывает поле пробы. Функционально: executor читает пробы только на чтение, пишет только в `plugin-results`. Никакого обратного патча в коллекцию проб. Это проверяемо структурно: в PR-3 нет ни одного write-пути в коллекцию `samples` или `collections`.

[Музыкант]: Добавлю к форме живого следа: `inputHash` в `RunFingerprints` — это хэш набора проб коллекции на момент прогона. Для коллекции «Полевые записи 2026-08» это фиксирует конкретный срез. Если коллекция позже пополнится — `inputHash` изменится, и это будет новый прогон с новым `runId`. Детерминизм гарантирован: один и тот же `inputHash` + `configHash` дают один и тот же результат MFCC. Это и есть обоснование выбора mfcc первым.

[Архитектор]: Зафиксирую границы «не делаем» — пересмотр прежних девяти с поправками. Первое: не делаем `StateRecord` для `membrana.handler.mfcc` — детектор постфактум, без окна накопления, `StateRecord` — контракт накопительного плагина. Второе: не делаем `ConvergenceRecord` при первом прогоне — нет пары live/recompute. Третье: не включаем витринный плагин в первую волну — другой род, другая приёмка, не потому что «M1 закрыт», а потому что DoD разные. Четвёртое: не делаем `ShowcaseManifest` у handler — физически нет полей, вердикт M5′. Пятое: не переоткрываем M1/M2/M3′/M4/M5′ — контракты закрыты, комната только применяет. Шестое: не производим код в этом заседании — MEETING_BRIEF.md явно. Седьмое: не смешиваем write-путь в коллекцию проб — норма #1950. Восьмое: не делаем PR-5 прежнего плана — невыполним по A6-3. Девятое: не регистрируем `mfcc-detector` как PluginId — не проходит regex M1.

[Верстальщик]: По devX витрины: `getRegisteredPlugins` с narrowing по `kind` позволяет UI читать только `kind: 'showcase'` плагины для отображения. Handler-плагины в витрину не попадают — это не ограничение, это контракт M5′. Когда придёт вторая волна с `ShowcaseManifest` — UI получит `displayForm` и отобразит по нему. Форм шесть закрытых плюс `x-${string}` с fallback — всё есть в M5′. Моя зона готова принять витринный плагин второй волной без переоткрытия контрактов.

[Структурщик]: Уточню PR-план по носителю: Mongo офиса, коллекция `plugin-results`, уникальный индекс `{ pluginId, version, collectionId, runId }` — это M3′. `mountTarget` в `RunAddress` — тип `HomeName`, значение `'background-media/collections'` для всех шести handler. Это фиксирует дом без двусмысленности. PR-1 создаёт схему и индекс, PR-3 пишет первую живую запись.

[Teamlead]: Состав волны — подтверждаю: шесть handler в одной волне, первым живым идёт `membrana.handler.mfcc`. Порядок внутри волны: PR-3 закрывает живой след для mfcc, PR-4 добавляет заглушки остальных пяти. Витринный плагин — вне первой волны, граница обоснована честно. PR-план из четырёх PR принимаю как рабочий. Прошу Математика — итоговый состав RunRecord одной строкой для протокола.

[Математик]: RunRecord первого живого прогона: `{ address: RunAddress, fingerprints: RunFingerprints, resumeMode: 'fresh', completedAt: Date, kind: RunResult['kind'] }`, где `RunAddress = { pluginId: 'membrana.handler.mfcc', version: string, collectionId: string, runId: string, mountTarget: 'background-media/collections' }`, `RunFingerprints = { inputHash: string, configHash: string }`. Точка.

[Музыкант]: Подтверждаю: `membrana.handler.mfcc` проходит regex `^[a-z][a-z0-9]*(\.[a-z][a-z0-9-]*){2}$` — `membrana` (org), `handler` (kind), `mfcc` (slug). `mfcc-detector` не проходит — slug содержит дефис в месте, где нужен slug-сегмент после второй точки: `mfcc-detector` как slug — допустим по regex (`[a-z][a-z0-9-]*`), но полный id `membrana.handler.mfcc-detector` — тоже проходит формально. Уточню: проблема прежнего id была в форме `mfcc-detector` без org и kind — три сегмента обязательны. `membrana.handler.mfcc` — чистый, однозначный, принимаю.

[Архитектор]: Небольшое уточнение по границе витринного плагина — для протокола. Обоснование «не в первой волне» не «требует переоткрытия M1» (это A6-6, ложное) и не «ShowcaseManifest не готов» (он готов, M5′). Настоящее обоснование: витринный плагин требует компонента-читателя на UI-стороне (`displayForm` должен быть отрисован), а UI-контракт этой комнатой не решается — это отдельный трек. Без UI-приёмки `kind: 'showcase'` — это зарегистрированный плагин без витрины, что честно называть незавершённым. Поэтому — вторая волна или отдельный трек с явным DoD.

[Верстальщик]: Принимаю обоснование Веснина. Добавлю: `setPluginEnabled(id: PluginId, enabled)` работает для всех видов — и handler, и showcase. Включённость — операции реестра (M1). Витринный плагин можно зарегистрировать и в первой волне технически, но без UI-читателя приёмка бессмысленна. Граница — не техническая невозможность, а честная неполнота DoD.

[Структурщик]: Финальная сверка PR-плана с нормой #1950. PR-1: контракты не содержат write-пути в измеренные данные — норма соблюдена по конструкции типов. PR-2: реестр и хост — только read/register операции, write — только в `plugin-results`. PR-3: executor `membrana.handler.mfcc` читает пробы, пишет RunRecord в `plugin-results` — проверяется структурно. PR-4: заглушки executor пишут только заглушечный RunRecord — норма соблюдена. Лишнего PR под #1950 нет, норма — условие приёмки каждого PR.

[Teamlead]: Итог. Состав волны: шесть handler, первый живой `membrana.handler.mfcc`. Форма следа: RunRecord = address + fingerprints + resumeMode:'fresh' + completedAt + kind; StateRecord и ConvergenceRecord отсутствуют — не дефект, а честная форма детерминированного постфактум-прогона. PR-план: четыре PR, норма #1950 — условие приёмки каждого. Витринный плагин — вне первой волны, обоснование в протоколе. Девять границ подтверждены и поправлены. Комната закрыта.

[Математик]: Посылки вердикта зафиксированы? Прошу секретаря — список в протокол; лишняя посылка нарушает норму так же, как недостающая.

[Архитектор]: Согласен. Список посылок — ровно то, на чём стоит вердикт, без выводов самой комнаты.

---

## Итоговое решение консилиума

| Вопрос | Решение |
|--------|---------|
| Состав первой волны | Шесть детекторов: harmonic, cepstral, spectral-flux, template-match, yamnet, mfcc — все рода `handler`, дом `background-media/collections`, манифест `HandlerManifest`. Все шесть в одной волне; первый живой — `membrana.handler.mfcc` (PR-3), остальные пять — манифест и заглушка executor (PR-4). |
| Витринный плагин в первой волне | Нет. Контракт `kind: 'showcase'` и `ShowcaseManifest` готовы (M1/M5′), переоткрытия M1 не требуется. Граница честная: витринный плагин без UI-читателя (`displayForm`) — незавершённый DoD; это отдельный трек или вторая волна. |
| Первый живой плагин | `membrana.handler.mfcc` — подтверждён. Проходит regex M1 `^[a-z][a-z0-9]*(\.[a-z][a-z0-9-]*){2}$`. Детерминированный, постфактум, без накопления состояния. |
| Честная форма живого следа | RunRecord = `{ address: RunAddress, fingerprints: RunFingerprints, resumeMode: 'fresh', completedAt, kind }`. `RunAddress = { pluginId, version, collectionId, runId, mountTarget: 'background-media/collections' }`. `RunFingerprints = { inputHash, configHash }` — отдельный интерфейс. `StateRecord` — отсутствует (нет накопления). `ConvergenceRecord` — отсутствует (нет пары live/recompute). Оба отсутствия — норма, не дефект. |
| PR-план приёмки | **PR-1:** типы `HandlerManifest`, `RunAddress`, `RunFingerprints`, `RunRecord`, `IPluginHost`, `HOME_REGISTRY`, схема коллекции `plugin-results` с индексом `{ pluginId, version, collectionId, runId }`. **PR-2:** реестр и хост — `registerPlugin`, `getRegisteredPlugins`, `setPluginEnabled`. **PR-3:** `membrana.handler.mfcc` — манифест, executor, живой прогон на «Полевые записи 2026-08», RunRecord в `plugin-results`. **PR-4:** манифесты и заглушки executor для harmonic, cepstral, spectral-flux, template-match, yamnet. Норма #1950 — условие приёмки каждого PR, не отдельный PR. |
| Норма #1950 | Результаты плагинов не подменяют измеренное сервером: executor читает пробы только на чтение, пишет только в `plugin-results`; write-путь в `samples`/`collections` отсутствует — проверяется структурно в каждом PR. |
| Границы «не делаем» | 1. Не делаем `StateRecord` для `membrana.handler.mfcc` — детектор без накопления. 2. Не делаем `ConvergenceRecord` при первом прогоне — нет пары. 3. Витринный плагин не в первой волне — DoD неполный без UI-читателя. 4. Не добавляем витринные поля в `HandlerManifest` — их физически нет (M5′). 5. Не переоткрываем M1/M2/M3′/M4/M5′. 6. Не производим код в этом заседании (MEETING_BRIEF.md). 7. Не пишем в коллекцию проб из executor (норма #1950). 8. Не реализуем PR-5 прежнего плана (невыполним, A6-3). 9. Не используем `mfcc-detector` как PluginId — три сегмента обязательны по M1. |

---

## Список посылок

| Посылка | Тип |
|---------|-----|
| M1_VERDICT.md: манифест — пять полей `id · version · kind · mountTarget · triggers`; PluginId regex `^[a-z][a-z0-9]*(\.[a-z][a-z0-9-]*){2}$`; расширения `HandlerManifest` / `ReportManifest` / `ShowcaseManifest`; включённость — операции реестра; `PluginExecutor.execute(ctx)` → `RunResult { completedAt, kind }` | норма |
| M2_VERDICT.md: дома `background-office/journal` и `background-media/collections`; `IPluginHost { mountTargetId, registerPlugin, getRegisteredPlugins }`; `HOME_REGISTRY`; `mountTarget: HomeName` | норма |
| M3′: `RunAddress = { pluginId, version, collectionId, runId, mountTarget: HomeName }`; `RunFingerprints = { inputHash, configHash }` — отдельный интерфейс; `StateRecord` — заморозка накопительного, поля `windowStart/windowEnd`; `resumeMode: 'from-freeze' | 'fresh'` — поле `RunRecord`; `windowSize` — в `HandlerManifest`; `ConvergenceRecord { liveRunId, recomputeRunId, ... }`; носитель — Mongo офиса, коллекция `plugin-results`, уникальный индекс `{ pluginId, version, collectionId, runId }` | норма |
| M4_VERDICT.md (с эрратумом): `PLUGIN_TRIGGERS` закрыт (`journal.entry_created`, `collections.collection_created`, `collections.sample_added`); каналы `notify` / `request`; fire-and-forget; догонялка — чтение по `RunAddress`; `request(pluginId: PluginId, ...)` | норма |
| M5′: `ShowcaseManifest = база + displayForm: DisplayForm + description?`; `DisplayForm` закрытый (`row | table | zone-map | histogram | time-series | x-${string}` с обязательным fallback); чтение — `getRegisteredPlugins` с narrowing; `setPluginEnabled(id: PluginId, enabled)`; у `HandlerManifest` / `ReportManifest` витринных полей нет | норма |
| Т3.5 шторма: шесть детекторов (harmonic, cepstral, spectral-flux, template-match, yamnet, mfcc) — норма первой волны | норма |
| Т3.11 шторма: основа сдаётся с первым живым плагином | норма |
| Факт репозитория: шесть детекторов — пакеты `packages/services/*` | факт |
| Факт репозитория: на media живёт устройство `field-node-2026-08` и коллекция «Полевые записи 2026-08» с пробами тракта | факт |
| MEETING_BRIEF.md норма #1950: результаты плагинов не подменяют измеренное сервером | норма |
| MEETING_BRIEF.md: код — только после вердиктов | норма |

---

**Definition of Done (PR-3 — первый живой след):**
- `membrana.handler.mfcc` зарегистрирован через `registerPlugin` в `background-media/collections`
- Executor выполнен на коллекции «Полевые записи 2026-08»
- В Mongo коллекции `plugin-results` присутствует запись RunRecord с полями: `address` (все пять полей RunAddress), `fingerprints` (inputHash + configHash), `resumeMode: 'fresh'`, `completedAt`, `kind`
- `StateRecord` и `ConvergenceRecord` в записи отсутствуют
- Нет ни одного write-пути в коллекцию `samples` или `collections` (норма #1950)
- `pluginId` проходит regex M1

---

*Реплик в диалоге: 23 от шести советчиков; каждый участник высказался не менее двух раз. [Ангелина] не вступала — опровергать нечего.*
