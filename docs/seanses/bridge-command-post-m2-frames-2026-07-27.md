<!-- канал: llm — протокол произведён yarn consilium -->

# Метаданные сеанса

| Поле | Значение |
|------|----------|
| Дата (UTC) | 2026-07-27T17:01:13.752Z |
| Команда | `yarn consilium` |
| Модель | xai/grok-4.5 |
| Файл | `docs/seanses/bridge-command-post-m2-frames-2026-07-27.md` |
| Порядок ролей | Teamlead → Архитектор → Музыкант → Структурщик → Математик → Верстальщик |
| Повестка | `docs/meeting/bridge-command-post/M2_AGENDA.md` |

**Вопрос:**

V2: фреймы процедуры мостика по ядру — trigger, steps, gates, homes и ответственные носители

---

# Консилиум: V2 — фреймы процедуры мостика по ядру

**Повестка:** Каковы фреймы процедуры капитанского мостика по ядру: trigger · steps · gates · homes — и кто ответственный носитель каждого фрейма? Что запускает мостик; какие шаги обязательны при открытии/закрытии и какие свободны; какие гейты действительны (машинная проверка); где живут дома артефактов; ответственные за каждый фрейм (закон: фрейм без исполнителя — процедура не готова). Список посылок обязателен.

**Участники:** Teamlead (Tarasov), Архитектор (Vesnin), Музыкант (Kuryokhin), Структурщик (Ozhegov), Математик (Dynin), Верстальщик (Rodchenko).

**Порядок реплик:** Teamlead → Архитектор → Музыкант → Структурщик → Математик → Верстальщик

---

[Teamlead]: Положение: M1 ратифицирован — cast angelina/farrell/parrot; мостик — свободный режим с повторяемыми открытием и закрытием. Задача комнаты — нарезать фреймы по ядру, не лезть в M3–M6. Решение: идём от trigger к homes, каждый фрейм — с носителем. Связка: Архитектор форму, Структурщик словарь и homes, Математик — предикаты гейтов. Без исполнителя фрейм = BLOCK процедуры.

[Архитектор]: Конструкция: мостик не конвейер и не «чат без каркаса». Несущие детали — trigger (вход в режим), open/close steps (повторяемые скобки), free body (разговор), gates (точки ожидания капитана), homes (где лежит след). Украшение «каждый ход — шаг процедуры» ломает норму двух режимов. Затронуты: `scripts/bridge.mjs`, `docs/meeting/<id>/`, carrier close в вечернем манифесте. Рекомендация: пять именованных фреймов, не больше.

[Музыкант]: На слух: trigger — это не playhead автоматом. Прецедент 22.07: приветствие = presence, ноль действий до явного слова. «На мостик» — явный downbeat сессии, не ambient noise. Свободное тело мостика — jam; open/close — count-in и final take. Если смешаем jam с pipeline — получим клиппинг импровизации процедурой. Несу gate «ждать капитана» как паузу на шине, не как таймаут-фейл всего микса.

[Структурщик]: Леммы, иначе снова синонимы. **Trigger** — событие входа в режим мостика. **Step** — повторяемое действие open/close или опциональный каркас тела. **Gate** — машинно проверяемый предикат «дальше нельзя / ждём». **Home** — канонический путь/контейнер артефакта. **Carrier** — кто исполняет фрейм (persona | script | kit). Закон M2: `frame ⇒ carrier ≠ ∅`. Не путать home конспекта (scratch) с home прецедента (`docs/precedents/`).

[Математик]: Формализую без UI. Пусть сессия S имеет фазу `φ ∈ {idle, open, free, close, sealed}`. Trigger: `idle → open` только по явному слову капитана (не presence). Gate — булев предикат `g(ctx) → pass|wait|stop`, детерминированный по ctx, без «постараться». Homes — инъекция типа артефакта в путь; два типа в один home запрещены. Чистая проверка: для каждого frame id существует ровно один primary carrier в описи.

[Верстальщик]: С витрины капитана состояние должно читаться без легенды: idle / на мостике / ждём капитана / закрыт вечером. Пульт (M5) не рисуем, но контракт фреймов обязан дать честные метки фаз — иначе позже лента станет декором. Open/close — видимые скобки; free body не маскировать прогресс-баром «шаг 3 из 7».

[Teamlead]: Фиксирую запрет: тело мостика не дробить на обязательный конвейер «конспект → долги → чеканка» как hard-steps. Это кандидаты-действия внутри free, часть уйдёт в M3/M6. Обязательны скобки open и close. Дальше — точный trigger.

[Архитектор]: Trigger-форма: слово капитана, открывающее режим (канон-фраза вроде «на мостик» / эквивалент явной команды сессии), **не** факт presence и не приветствие. Presence обновляет «капитан в диалоге», но `φ` остаётся idle. Цена ошибки: автооткрытие по hello ломает прецедент 22.07 и порождает ложные артефакты дня. Модуль: bridge session state + запись в meeting-контейнер при open.

[Музыкант]: Согласен. Presence — room tone; trigger — «поехали». Отдельно: повторное «на мостик» при уже open — идемпотентный no-op или мягкий status, не второй open-home. Иначе дубли тактов и два конспекта на одну смену.

[Структурщик]: Словарь trigger: `bridge.open_command` (явная команда) ≠ `bridge.presence` (сигнал). Home старта сессии: `docs/meeting/bridge-<date>/` или действующий MEETING-контейнер дня мостика — один контейнер на сессию open→close. Внутренности графа правды не определяем (M3), но home «куда писать open-маркер» — да.

[Математик]: Предикат trigger: `canOpen(S) ⇔ φ=idle ∧ explicitOpenCommand`. `presence ∧ ¬explicitOpenCommand ⇒ ¬canOpen`. Идемпотентность: `φ=open ∨ φ=free ⇒ open_command → no_state_change` (status only). Это зуб, не пожелание.

[Верстальщик]: Капитану после trigger достаточно одной строки статуса: «мостик открыт · session id · lead=angelina». Пустая сессия без open-маркера не показывается как «активный мостик» — честная пустота.

[Teamlead]: Steps. Режем: **S1 open** (обязателен), **S2 free-body** (свободный режим, действия по слову капитана), **S3 close** (обязателен, вечер/явное закрытие). Внутри free — *допустимые жесты* (конспект, долги, чеканка-заготовка), но не hard pipeline. Носители назначим после списка жестов-каркаса.

[Архитектор]: S1 open минимальный состав шагов-подпунктов: (1) создать/привязать meeting-home сессии, (2) зафиксировать cast по M1 (declared ⇒ resolvable ∨ explicitAbsent), (3) session-scribe режим если lead absent, (4) объявить φ=open→free. Не входит: чеканка кристаллов, пульт, разбор кейсов M4. S3 close: carrier `scripts/bridge.mjs close` + след в вечернем контуре — прецедент манифеста; без close сессия не sealed.

[Музыкант]: В free-body конспект — как scratch-дорожка: пишется по ходу, не гейтит разговор. Долги/попугай — жест «если капитан или lead поднял», live parrot обязателен только если долги заявлены при open (M1) — это gate на входе free, не отдельный обязательный step-конвейер. Чеканка — жест-отсылка к M3, здесь только «можно инициировать», не спецификация.

[Структурщик]: Имена steps как lemmata: `bridge.open`, `bridge.free`, `bridge.close`. Жесты free (не steps ядра): `gesture.conspect`, `gesture.debts`, `gesture.mint_intent` — в описи M2 помечаем `optional_gesture`, home и carrier могут быть TBD со ссылкой на M3/M6, но **не** пустой carrier у обязательного frame. Обязательные frames: trigger-handling, open, free-mode (как режим, не pipeline), close, plus gates/homes registry.

[Математик]: Обязательность: `mandatory(f) ∈ {true,false}`. Для close: `sealed(S) ⇔ close_ok`. Вечерний ритуал может требовать `∀ open sessions: sealed` — это gate внешнего контура, не сюжет M5. Жесты: число жестов в free не входит в предикат готовности процедуры; готовность = все mandatory frames имеют carrier и home.

[Верстальщик]: На статусе не показывать optional gestures как чеклист 1/2/3 — иначе визуально конвейер. Чеклист только: open ✓ · free · close ✓. Жесты — события ленты (когда будет M5), не ступени прогресса.

[Teamlead]: Gates — только машинные. Кандидаты: G_open_cast (M1 resolvable), G_parrot_if_debts, G_wait_captain (явные точки вопроса капитану), G_close_carrier (close script ok), G_no_action_on_presence. Не гейт: «хороший конспект», «достаточно поговорили».

[Архитектор]: G_wait_captain — единственный gate с семантикой wait (не stop): процедура не падает, φ остаётся free, помечается `awaiting=captain`. Машинно: флаг в session state + отсутствие автопродолжения критичных жестов (чеканка/close) без ответа. Close без капитана — отдельная норма: close может инициировать вечерний контур/lead по правилу дня, но *содержательные* вердикты капитана не суррогатируются — это уже граница M3/роли, здесь: close-механика ≠ подмена слова капитана.

[Музыкант]: G_no_action_on_presence — pre-amp mute: presence event не запускает open, mint, debts. Сирена/детектор из импровизаций — M4; здесь только слот «future case instructions», без разбора. G_parrot_if_debts: если open declaration debts=true и parrot not live → stop open (не wait), по M1.

[Структурщик]: Опись gates:

| id | предикат (смысл) | fail |
|----|------------------|------|
| `gate.presence_is_not_trigger` | presence ⇏ open | ignore actions |
| `gate.cast_resolvable` | M1 invariant | stop open |
| `gate.parrot_live_if_debts` | debts⇒parrot live | stop open |
| `gate.await_captain` | critical prompt | wait |
| `gate.close_carrier` | bridge.mjs close ok | stop seal |

Homes не гейтят качество текста — только наличие пути/запись маркера.

[Математик]: Семантика fail: `stop` блокирует переход фазы; `wait` удерживает фазу; `ignore` отбрасывает событие. Тотальность: каждое inbound event type отображается в ровно один обработчик. Тест: hello → ignore re open; open_cmd → open; debts+¬parrot → stop; mint_without_captain_when_required → wait.

[Верстальщик]: Wait-состояние честно: «ждём капитана: <вопрос-ярлык>», не спиннер без причины. Stop open — красный блок с reason[] (cast/parrot), по конструктивизму Родченко: состояние = сообщение.

[Teamlead]: Homes. Не колонизируем M3: home кристаллов = «граф правды (определит M3)». Наши дома — то, без чего open/close/conspect-след не живут.

[Архитектор]: Homes ядра мостика:

1. **Session home** — `docs/meeting/<bridge-session-id>/` (MEETING-контейнер): open-маркер, cast snapshot, phase, close receipt.  
2. **Conspect home** — scratchpad/рабочий конспект сессии: *пока без канона* — фиксируем как `home.conspect = session-scratch (non-canon)` до отдельного канона; не притворяться, что канон есть.  
3. **Precedents home** — `docs/precedents/` — только если жест «вынести прецедент»; не автопис при open.  
4. **Truth-graph home** — external ref → M3.  
5. **Close articulation** — след close в вечернем манифесте/carrier output (скрипт).

[Музыкант]: Конспект non-canon — нормально: как draft take до master. Главное не писать draft в precedents молча. Append-only имён — M4; home для имён сессии пусть session home держит id, без переименования mid-flight.

[Структурщик]: Словарь homes в манифесте процедуры: `home.session`, `home.conspect_scratch`, `home.precedents`, `home.truth_graph_ref`, `home.close_receipt`. Запрет: gesture.mint пишет в home.session «как будто кристалл» — нарушена граница, это M3. Export только через явные жесты.

[Математик]: Инвариант: `write(artifact_type, home) ∈ allowed_map`. allowed_map минимален в M2; расширение M3/M6 — PR. Проверка close: ∃ close_receipt в home.close_receipt ∨ эквивалент exit code 0 carrier с логом в session home.

[Верстальщик]: Для человека path session home должен быть в open-статусе одной строкой (кликабельно позже на пульте). Non-canon conspect подписать «черновик», чтобы не путали с прецедентом.

[Teamlead]: Носители — закон фрейма. Primary + optional support. Angelina — lead диалога и open/close orthography в чате; scripts — механика; parrot — memory когда долги; Farrell — voice без обязательности live; session-scribe — режим записи при absent lead.

[Архитектор]: Назначение:

| Frame | Primary carrier | Support |
|-------|-----------------|---------|
| trigger interpret (presence vs open) | `scripts/bridge` session runtime / kit | angelina озвучивает статус |
| bridge.open | angelina (lead) или session-scribe при absent | cast check kit; parrot if debts |
| bridge.free | angelina (lead dialogue) | farrell optional voice; gestures ad hoc |
| gate.await_captain | runtime flag + angelina announces | — |
| gesture.conspect | session-scribe / angelina | home.conspect_scratch |
| gesture.debts | parrot (memory·kit) | angelina |
| gesture.mint_intent | lead инициирует; **исполнение M3** | archivist ref |
| bridge.close | `scripts/bridge.mjs close` | angelina подтверждает sealed; вечерний контур |

Фрейм mint_intent без полного carrier исполнения — допустим как *жест-ссылка*, mandatory=false до M3. Остальные mandatory — carriers полные.

[Музыкант]: Farrell не носитель open/close — только голос в free, 0–3 локальных реплики, не основание вердиктов (гость). Не вешаем на него gate. Parrot не «украшение»: при debts — несущая балка open.

[Структурщик]: Опись carrier kinds закрытая: `llm-persona | pet-local | kit-engine | script | mode:session-scribe`. Согласуется с cast-carrier-contract. `declared ⇒ resolvable ∨ explicitAbsent` проверяется на open. Процедура не готова, если в таблице mandatory frame стоит «TBD» без explicit external-room ref и mandatory=false.

[Математик]: Готовность процедуры P: `ready(P) ⇔ ∀f∈mandatory: carrier(f)≠∅ ∧ home(f)≠∅ ∧ gate(f) machine-defined`. Сейчас mint execution ∉ mandatory. Счётчик: mandatory = {trigger_rule, open, free_mode, close, gates×5, homes×session/conspect/close_receipt}.

[Верстальщик]: В протоколе/манифесте таблицы frame→carrier читаемы как конструктор: без прозы «все помогают». Пустое support — норма; пустой primary — брак.

[Teamlead]: Спорный край: является ли «конспект» обязательным step при open. Ставлю **нет**: open не требует non-empty conspect. Конспект — жест. Возражения — сейчас.

[Архитектор]: Согласен. Иначе мостик-короткая команда («статус и close») раздувается бумагой. Open пишет structural markers; prose — по необходимости.

[Музыкант]: На слух: короткая сессия без draft — валидный take. Не форсировать room tone записью ради записи.

[Структурщик]: Лемма: `conspect ∈ optional_gesture`. Home.conspect_scratch может быть пустым файлом/отсутствовать до первого жеста — тогда gate на close **не** требует conspect.

[Математик]: `close_ok ⇏ conspect_nonempty`. Явный контрпример-тест в DoD.

[Верстальщик]: Не показывать пустой конспект как ошибку. Empty state: «конспект не велся» — честно, серым.

[Teamlead]: Второй край: close только вечером или по явной команде днём? Норма: close = явный carrier вызов; вечерний манифест **потребляет** close, но не единственный trigger close. Дневной close допустим.

[Архитектор]: Форма: trigger close = слово капитана / команда сессии / вечерний ритуал-инициатор. Home receipt один; повторный close идемпотентен. Не смешивать с «закрытие заседания bridge-command-post» — другой контейнер.

[Музыкант]: Дневной close — как stop на середине репетиции: нормально, если sealed честный. Не держать φ=free до ночи без нужды.

[Структурщик]: `bridge.close` ≠ `meeting.bridge-command-post.close`. Разные id, разные homes. Синоним-слой запрещён.

[Математик]: Идемпотентность close: `close(close(S))=sealed`. Вторая команда → ok/no-op.

[Верстальщик]: Статус после close: «мостик sealed · receipt …». Не «offline» без различия idle never-opened vs sealed.

[Teamlead]: Сводим вердикт. Проверяю на колонизацию: M3/M4/M5/M6 только refs. Список посылок — отдельной секцией. Кто не принимает — говорить сейчас.

[Архитектор]: Принимаю форму пяти зон: trigger rule · steps{open,free,close} · gates · homes · carriers. Mint/debts UX details — вне.

[Музыкант]: Принимаю. Presence mute — жёстко. Free не pipeline.

[Структурщик]: Принимаю при условии канонических id в таблице решения и closed enum carrier kinds.

[Математик]: Принимаю. Предикаты canOpen/close_ok/ready(P) — в DoD как проверяемые зубы (тест/скрипт-след).

[Верстальщик]: Принимаю. Фазы для будущей витрины: idle | open/free | await_captain | sealed; без фейкового прогресса жестов.

[Teamlead]: Вердикт: **LGTM** на каркас фреймов M2. Связка на внедрение описи: Структурщик (MANIFEST/id), Математик (предикаты/тесты гейтов), script carrier за Музыкантом/ops по bridge.mjs close уже есть — не раздувать. Исполнение — после ратификации владельца. Матч: процедура мостика готова как каркас без TBD на mandatory.

---

## Список посылок

Входы вердикта (не выводы этой комнаты):

| # | Посылка | Тип |
|---|---------|-----|
| P1 | Вердикт M1 (27.07): cast = angelina(lead·llm-persona, live не обязателен) + farrell(voice·pet-local) + parrot(memory·kit-engine, live обязателен если долги в открытии); session-scribe при absent; инвариант declared ⇒ resolvable ∨ explicitAbsent | факт (ратификация M1) |
| P2 | Норма двух режимов: процедурный и свободный не смешиваются; мостик — свободный разговор капитана со скобками open/close | норма |
| P3 | Прецедент 22.07: приветствие/presence владельца — сигнал присутствия, не команда; ноль действий до явного слова | норма (прецедент) |
| P4 | Прецедент открытия 25.07: повторяемые действия на open | факт/норма прецедента |
| P5 | Close carrier: `scripts/bridge.mjs close` в вечернем манифесте | факт (код/манифест) |
| P6 | Закон: фрейм без исполнителя — процедура не готова | норма (BRIEF/ядро процедур) |
| P7 | Дома-сейчас: `docs/precedents/`, граф правды (вне M2), `docs/meeting/<id>/`, scratchpad-конспект без канона | факт (текущее дерево docs) |
| P8 | Ограничение заседания: существа M3–M6 не вердиктить; допустимы ссылки на существование | норма (MEETING_ACTIVE / M2_AGENDA) |
| P9 | DAG P1: C1→C2; фреймы опираются на состав/носители M1 | факт (протокол M0/M1 order) |
| P10 | Инсайт/контракт носителей: род participant закрытый; resolvable id (cast-carrier line) | норма/факт линии cast-carrier |

---

## Итоговое решение консилиума

| Вопрос | Решение |
|--------|---------|
| Что есть trigger мостика | **Явная open-команда капитана** (слово/команда сессии «на мостик» или эквивалент). **Не** presence/приветствие. Presence обновляет присутствие, не меняет фазу idle→open |
| Presence vs trigger | Раздельные события: `bridge.presence` ⇏ open; `gate.presence_is_not_trigger` = ignore actions на open/mint/debts |
| Повторный open | Идемпотентный no-op + status, если уже open/free |
| Обязательные steps | **`bridge.open`** → **`bridge.free`** (режим, не конвейер) → **`bridge.close`**. Иных mandatory steps нет |
| Свободное тело | Жесты по слову капитана/lead: `gesture.conspect`, `gesture.debts`, `gesture.mint_intent` — **optional**, не hard pipeline «конспект→долги→чеканка» |
| Конспект обязателен? | **Нет.** Empty conspect допустим; close не требует nonempty conspect |
| Close когда | Явная команда **или** инициация вечерним контуром; не «только ночь». Идемпотентен. `bridge.close` ≠ закрытие заседания bridge-command-post |
| Gates (машинные) | (1) `gate.presence_is_not_trigger` → ignore; (2) `gate.cast_resolvable` → stop open; (3) `gate.parrot_live_if_debts` → stop open; (4) `gate.await_captain` → wait (φ остаётся free); (5) `gate.close_carrier` → stop seal если carrier fail. Не гейты: «качество конспекта», «достаточно поговорили» |
| Homes | `home.session` = `docs/meeting/<bridge-session-id>/`; `home.conspect_scratch` = non-canon scratch (канона нет — не притворяться); `home.precedents` = `docs/precedents/` (только жест выноса); `home.truth_graph_ref` → M3; `home.close_receipt` = выход `scripts/bridge.mjs close` + маркер в session |
| Фазы φ | `idle → open → free ⇄ await_captain → close → sealed` |
| Carriers (primary) | trigger-rule/runtime: **script/kit session**; open: **angelina** (else **session-scribe**); free: **angelina**; await announce: **angelina** + runtime flag; conspect: **session-scribe/angelina**; debts: **parrot**; mint_intent: lead initiate, **исполнение → M3** (gesture mandatory=false); close: **`scripts/bridge.mjs close`**, angelina подтверждает sealed |
| Farrell | Не carrier open/close/gates; optional voice в free; не основание вердиктов |
| mint / граф / пульт / кейсы M4 / пороги попугая | **Не специфицированы** здесь; только слоты-ссылки |
| ready(процедура) | ∀ mandatory frames: carrier ≠ ∅ ∧ home ≠ ∅ ∧ gates machine-defined |
| Вердикт Teamlead | **LGTM** каркаса M2; к ратификации владельца |

**Каркас steps (канон M2):**

1. **Trigger-rule** — explicit open only; presence mute  
2. **Open** — session home + cast check (+ parrot if debts) + φ=free  
3. **Free** — диалог; optional gestures  
4. **Gates** — таблица stop/wait/ignore выше  
5. **Close** — carrier script → sealed + receipt  
6. **Homes/carriers** — таблицы выше; закон frame⇒carrier  

---

## Definition of Done (только V2 / M2)

1. В манифесте/описи процедуры мостика зафиксированы id: `bridge.presence`, `bridge.open_command`, `bridge.open`, `bridge.free`, `bridge.close`, пять `gate.*`, пять `home.*`, optional `gesture.*` — без TBD на mandatory.  
2. Таблица frame → primary carrier → home опубликована в артефакте комнаты M2 (протокол + перенос в meeting docs по ритуалу заседания).  
3. Зуб (тест или чистый предикат в kit/script): presence не открывает сессию; open_cmd открывает; debts∧¬parrot ⇒ отказ open; close идемпотентен; close ⇏ требует conspect.  
4. Явная пометка non-canon для conspect scratch и ref «truth graph → M3» без спецификации чеканки.  
5. Нет обязательств DoD на UI пульта (M5), кейсы импровизаций (M4), механику кристаллов (M3), пороги попугая (M6).  
6. Ратификация владельца на вердикт M2.

---

*Реплик в диалоге: 55; каждый участник высказался не менее одного раза.*
