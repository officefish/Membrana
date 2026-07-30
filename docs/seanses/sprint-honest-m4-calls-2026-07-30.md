<!-- канал: llm — протокол произведён yarn consilium -->

# Метаданные сеанса

| Поле | Значение |
|------|----------|
| Дата (UTC) | 2026-07-30T07:42:10.692Z |
| Команда | `yarn consilium` |
| Модель | xai/grok-4.5 |
| Файл | `docs/seanses/sprint-honest-m4-calls-2026-07-30.md` |
| Порядок ролей | Математик → Архитектор → Верстальщик → Teamlead → Структурщик → Музыкант |
| Повестка | `docs/meeting/sprint-honest-performers/M4_AGENDA.md` |

**Вопрос:**

Серверные вызовы исполнителя: что вызывается (принятие контракта, ревью, отказ), что вызов возвращает, где живёт ответ как вещдок, отношение к панельной цепочке процедур и норме «отказ адресуется владельцу». ВАЖНО: комната M1 уже назвала локус и форму записи — это вопрос ЭТОЙ комнаты, вынесенный не в свой черёд; M4 не связана предрешением, обязана рассмотреть альтернативы заново и назвать СВОИ основания. Предмет — формат спринта, не код; вердикты M1-M3 вход; чужие вопросы 5-9 не решать

---

# Консилиум: серверные вызовы исполнителя (sprint-honest M4)

**Повестка:** формат спринта, не код. Что вызывается у исполнителя (принятие контракта, ревью, отказ), что вызов возвращает, где живёт ответ как вещдок, отношение к панельной цепочке процедур и норме «отказ адресуется владельцу». Вход — вердикты M1–M3. M1 назвала локус/форму записи вне очереди; M4 не связана предрешением, обязана рассмотреть альтернативы заново. Чужие вопросы 5–9 не решать.

**Участники:** Teamlead (Tarasov), Архитектор (Vesnin), Структурщик (Ozhegov), Математик (Dynin), Музыкант (Kuryokhin), Верстальщик (Rodchenko).

**Порядок реплик:** Математик → Архитектор → Верстальщик → Teamlead → Структурщик → Музыкант

---

[Математик]: Формализую без UI и без привязки к локусу M1. Пусть S — sprintId, p — personaId. Кандидатные акты исполнителя — закрытое множество A = {accept_contract, review, refuse}. Каждый акт — функция call(a, S, p, payload) → Result, где Result ∈ {ok(receipt), err(reason)}. Вещдок e ∈ Evidence(S) существует ⇔ ∃ persistent ref, для которого subject(e)=p ∧ kind(e)∈K_call ∧ resolves(ref). Пока не зафиксируем: (1) алфавит A, (2) форму Result, (3) предикат «e квалифицирует акт» — остальное не определено.

[Архитектор]: Конструкция сначала. Три слоя, которые нельзя смешивать: (α) панельная цепочка процедур — оркестрация окна спринта; (β) серверный вызов — точка входа акта исполнителя; (γ) лента Evidence — append-only след. M1 могла назвать home записи заранее — для M4 это гипотеза, не фундамент. Альтернативы home: registry-файл спринта; отдельный call-log; поле в карточке задачи; событие в journal ведущей. Цена смешения β и γ — вызов «успешен в воздухе», а вещдока нет. Рекомендую развести контракт вызова и home следа до выбора одного home.

[Верстальщик]: С витрины капитана и агента три исхода обязаны читаться без легенды: принял контракт · сделал ревью · отказался. Фальшь — бейдж «принято» при отсутствии адресуемого ref. Пустой отказ («—») хуже явного `refused → owner`. Не рисую layout кабинета: требую в контракте данных status-enum на акт + addressable ref + адресат при refuse. Если отказ уходит «в никуда» или только в лог агента — витрина врёт норме «отказ адресуется владельцу».

[Teamlead]: Планка матча узкая. Не вердиктим аудитора, ведущую, память, судьбу 213 карточек — это 5–9. M1–M3 вход: кто исполнитель (проекция assigned/participated), что контракт до входа, что ревью партитуры исполнителем. Сегодня — только вызовы и квитанции. Связка: Математик — предикаты и Result; Архитектор — границы β/γ; Структурщик — леммы и homes; Верстальщик — читаемость исхода; Музыкант — тракт «нажал → на ленте». Без квитанции матч не сыгран.

[Структурщик]: Леммы, иначе синонимы. **Вызов исполнителя (PerformerCall)** — именованный акт a∈A с субъектом p и sprintId S, инициированный по контракту окна. **Квитанция (Receipt)** — значение Result.ok: стабильный id + a + S + p + ts + (опц.) payloadHash. **Отказ (Refusal)** — Result ветки refuse либо err с reason∈R_closed; не «молчаливый no-op». **Вещдок** — запись e, у которой ref указывает на Receipt или на канонический отказной объект. Панельная цепочка **не** есть вызов: цепочка может *требовать* вызов, но сама квитанцию не чеканит. Home квитанции — отдельная словарная статья, не «где удобно логу».

[Музыкант]: На слух это count-in и take-sheet, не сам трек спринта. Accept — «партитуру взял»; review — «прослушал и отметился»; refuse — «снялся с пульта» и сигнал ушёл владельцу, не в reverbr комнаты. Клиппинг доверия: панель кричит «исполнитель на шине», а на ленте тишина — mono-фальшь из M1. Квитанция должна щёлкнуть как mark на tape: без mark’а вызов = жест в воздухе. Отказ без адреса владельца — как emergency-stop в никуда: зал не знает, что концерт отменён.

[Математик]: Инварианты. I1: ∀ успешного call ∃! e∈Evidence(S) с kind=call_receipt ∧ callId. I2: refuse(S,p) ⇒ ∃ notice n: addressee(n)=owner ∧ links(n, callId). I3: review без prior accept_contract в том же S — либо err(precondition), либо явный bypass-флаг в контракте окна (не молчание). I4: Result тотален: нет «void». Кандидатный enum Result: `accepted | reviewed | refused | rejected_precondition | conflict`. «Conflict» — повторный accept при уже refused и т.п. Численно: один callId → ровно один terminal status.

[Архитектор]: Альтернативы возврата вызова заново, без M1. **V1** — синхронный DTO {status, receiptId, evidenceRef}; цена: сервер обязан уметь писать evidence в том же такте. **V2** — 202 + poll по callId; цена: витрина и панель ждут второй ноги, риск «оторванного» status. **V3** — только side-effect в log, HTTP 204; цена: нет машинного Result, ломает I4. Рекомендация формы: V1 для accept/refuse (атомарность нормы owner-notice), review может быть V1 с коротким payload (verdict + notesHash). Home evidence не обязан совпадать с transport: transport несёт ref, home — append-only store.

[Верстальщик]: Если V3 — на витрине нечего честно повесить, только спиннер-ложь. Для капитана отказ: одна строка `refused` + reason-code + «адресовано владельцу» (не thread агентов). Для accept/review: status + короткая метка времени + link на вещдок, не простыня. Панельная цепочка рисует *шаг* («ждём accept»); вызов рисует *факт* («accept есть/нет»). Смешать в одном бейдже — снова фальшивое присутствие M1.

[Teamlead]: V3 снимаю как сдачу тренировки. V2 — запас под bulk, не канон M4. Держим V1, пока Математик не найдёт противоречие. Норма «отказ → владелец»: это не UX-вежливость, а правило матча — иначе owner не может снять/переназначить окно. Кто пишет notice — сервер при commit refuse, не «исполнитель сам напишет мемо если вспомнит». BLOCK любому дизайну, где refuse = local flag без owner-addressable следа.

[Структурщик]: Словарь homes, альтернативы без предрешения M1. **H1** — `Evidence(S)` лента спринта (единый journal исполнения). **H2** — `PerformerCallLog` отдельная лемма, проецируется в Evidence предикатом qualifies. **H3** — поля карточки registry.json / task card. **H4** — память персоны / angelina journal. H3 отвергаю: карточка задачи ≠ окно спринта, leadPersona уже врала. H4 отвергаю: субъектный журнал не SoT процедуры. Между H1 и H2: H1 проще (один SoT); H2 чище, если call-объекты живут дольше окна и auditable отдельно. Связь с панелью: панель читает проекцию status(S,p,a), не пишет Receipt.

[Музыкант]: H4 на слух — дневник в гримёрке, не master-tape зала. H3 — стикер на пюпитре. Беру H1 как default mix: все take marks на одной ленте Evidence(S), kind различает accept/review/refuse. H2 оставлю как alternative, если Структурщик докажет конфликт частоты/retention с прочими evidence kinds из M1. Отказной notice — не отдельный «альбом»: это event kind=`owner_notice` с link на refuse receipt, иначе два master’а.

[Математик]: Предикат панели vs вызова. Пусть Chain = упорядоченные узлы процедур окна. `node_requires(n, a)` — контрактная нужда в акте. `node_satisfied(n,S) ⇔ ∃ e: matches(e,a,S) ∧ status(e)∈Success`. Панель двигает курсор только по satisfied; она не создаёт e. Отказ: `refused(S,p) ⇒ ∀ n: node_requires(n, accept|review) → node_satisfied = false` и окно переходит в terminal `blocked_by_refusal` либо `awaiting_owner` — это уже статус окна, не Result вызова. Развожу: Result вызова локален акту; status окна — агрегант. M4 фиксирует первое; агрегат окна может быть входом соседней комнаты, но не размывает A.

[Архитектор]: Граница с M2/M3. M2 дал «контракт до входа» — значит accept_contract потребляет ref на текст/версию контракта окна (payload: contractVersion). M3 дал «ревью исполнителем» — review потребляет ref на тот же contractVersion + verdict∈{lgtm, changes_requested, abstain?}. M4 не переопределяет смысл ревью: только *форму вызова и следа*. Отказ — до или после accept: допускаю refuse_pre_accept и withdraw_post_accept как один kind `refuse` с phase в payload, либо два kind. Цена одного kind — проще A; цена двух — проще предикаты панели. Склоняюсь к одному `refuse` + phase.

[Верстальщик]: phase в payload для витрины ок, если status сверху один: `refused`. Не плодить бейджи «снялся до» / «снялся после» без нужды капитана — secondary text. Важно: `changes_requested` в review — не отказ от роли исполнителя; это другой цвет. Смешать review-verdict=refuse role — ложь конструкции. Три колонки смысла: роль (исполняю/отказался) · контракт (принят) · ревью (вердикт к тексту).

[Teamlead]: Держим три акта, не пять. accept_contract · review · refuse. Review-вердикты — payload, не отдельные server-calls верхнего уровня. Кто вправе звать: subject p ∈ assigned(S) по M1; shadow_work (only_participated) — **не** получает accept API в каноне честности, иначе легитимируем работу вне плана. Исключение — только явный reassign owner’ом (это уже смена Assignments, не M4). Планка: call без assigned → rejected_precondition.

[Структурщик]: Уточняю лемму адресата. **Owner** в норме отказа — владелец продукта/капитан контура исполнения, не leadPersona карточки и не «первый в CC». Notice: {to: ownerId, sprintId, personaId, callId, reason, ts}. Канал доставки (Linear/memo/UI inbox) — **транспорт**, не home нормы; home нормы — что notice существует как вещдок с addressee=owner. Панельная цепочка при refuse: stop + surface notice; не retry accept автоматически. Словарь reason: closed set R = {overload, scope_dispute, conflict_interest, blocked_dependency, other} — other с обязательным noteHash.

[Музыкант]: На слух assigned-only на accept — правильный door policy: кто не на пюпитре, не жмёт count-in. Review после accept — иначе «критик из зала». Refuse всегда звучит владельцу: короткий reason-code, без эссе. Если other без noteHash — зуб на err, не soft. Цепочка панели после refuse не должна играть дальше «как будто» — hard mute ветки исполнителя до owner resolve (resolve — не наш вопрос 5–9, только что mute есть).

[Математик]: Сводка предикатов для вердикта. `canCall(S,p,a) ⇔ assigned(S,p) ∧ window_open(S) ∧ pre(a,S,p)`. pre(accept)=¬accepted∧¬refused; pre(review)=accepted∧¬refused∧contractVersion_match; pre(refuse)=¬refused∧(true). `commit(call) → Result` атомарно пишет Receipt и, если a=refuse, Notice. `evidence_ref(Receipt)` обязателен в ok. Идемпотентность: повтор accept при already accepted → ok(same receiptId) или conflict — выбираю **idempotent ok** для accept/review-get, **conflict** для accept после refuse. Так панель безопасна к retry.

[Архитектор]: Идемпотентность accept — да, цена ниже. Форма Receipt минимальна: `{receiptId, sprintId, personaId, act, ts, contractVersion?, reviewVerdict?, reason?, evidenceRef, noticeRef?}`. noticeRef обязателен при act=refuse. Где physical home: рекомендую **H1** Evidence(S) как SoT вещдока; call endpoint — writer в этот SoT + возврат V1 DTO. Не registry.json. Не memory/*.md как SoT. Документ формата спринта (не код) описывает writer-контракт; реализация — позже, вне M4-вердикта по «файлу X строка Y», если путь не канонизирован.

[Верстальщик]: Минимальный Receipt для витрины капитана: act, status, ts, link(evidenceRef); для refuse + «→ owner» по noticeRef. Панель: три чек-точки по актам, не прогресс-бар «50%». Empty: `canCall=false` показывает reason (not_assigned / window_closed / precondition), не серую кнопку-загадку. Это контракт отображаемых полей, не JSX.

[Teamlead]: Фиксирую направление к вердикту. Вызовы: три. Возврат: V1 Result. Вещдок: H1 Evidence(S). Отказ: Notice → owner обязателен. Панель: consumer, не author квитанций. Shadow не зовёт. M1-локус, если совпал с H1 — совпадение post-factum, основание — наши альтернативы H1–H4, не defer к M1. Математик — закрой enum Result одним списком; Структурщик — леммы в таблицу; остальные — Accept/Block по таблице.

[Структурщик]: Леммы финал. PerformerCallAct ∈ {accept_contract, review, refuse}. PerformerCallResult status ∈ {ok, rejected_precondition, conflict}. При ok — Receipt; при refuse+ok — Receipt+Notice(owner). EvidenceEntry kind ∈ {call_receipt, owner_notice} (минимум). PanelChainNode: read-model, depends on exists(receipt). Нарушена слабая связанность, если Panel пишет Receipt или если UI шлёт refuse без server commit. Не решаем auditor/angelina API.

[Музыкант]: Принимаю микс: три кнопки на пульте, mark на общей ленте, refuse — page владельцу. Review-вердикт = аннотация take, не снятие с программы. Без mark’а панель не двигает курсор — иначе снова фальшь live-MIDI без tape. Готов к итогу.

[Математик]: Enum закрываю. Act = accept_contract | review | refuse. Terminal call status = ok | rejected_precondition | conflict. Receipt.payload: accept→{contractVersion}; review→{contractVersion, verdict∈{lgtm, changes_requested}}; refuse→{phase∈{pre_accept, post_accept}, reason∈R, noteHash?}. Success-предикат для панели: ok∧act=needed. I2 notice сохранён. Альтернатива «review как отдельный HTTP resource» отклонена: rec(review) достаточно. Готов к единому решению.

[Архитектор]: Рекомендация формы: server-call writer → Evidence(S); DTO V1; панель read-only к Receipt; owner notice на refuse — часть commit, не best-effort. ADR на код не требуем, пока нет path в main: вердикт — в протоколе спринт-формата. Затронутые «модули» смысла: sprint execution projection (M1), contract version (M2), review payload (M3), call/receipt/notice (M4). Принимаю.

[Верстальщик]: Принимаю. Витрина: три акта, честные status, refuse→owner виден, panel ≠ call. Не расширяю в 5–9.

[Teamlead]: Вердикт комнаты — **LGTM** на форму ниже. Связка на исполнение позже: Структурщик (леммы/homes в канон формата), Математик (предикаты/зубы idempotency), Архитектор (границы panel/call), Верстальщик (поля витрины), Музыкант (smoke тракта accept→tape). Код сегодня не пишем — матч M4 сыгран как формат. Чужие 5–9 не открываем.

[Структурщик]: Принимаю. SoT вещдока — Evidence(S); H2 не выбран; H3/H4 отвергнуты основаниями связанности и SoT.

[Музыкант]: Принимаю. Отказ без owner-notice = клиппинг — в норме запрещён.

[Математик]: Принимаю. Идемпотентный ok на повтор accept; conflict на accept-после-refuse; I1–I4 в DoD формата.

[Архитектор]: Принимаю. Совпадение с M1-локусом — не defer, а независимый выбор H1.

[Верстальщик]: Принимаю. Три колонки смысла на витрине: роль · контракт · ревью — без смешения refuse и changes_requested.

[Teamlead]: Состав вердикта закрыт. Полное эхо — в итоговй таблице. Нагрузка следующей комнате — не переписывать A и home без нового BLOCK по зубу.

---

## Итоговое решение консилиума

| Вопрос | Решение |
|--------|---------|
| Предмет комнаты | Формат спринта (M4): серверные вызовы исполнителя, Result, home вещдока, связь с панельной цепочкой, норма отказа→владелец. Не код. Не вопросы 5–9. |
| Связь с M1–M3 | **Вход:** M1 — исполнитель = проекция assigned/participated; M2 — контракт до входа (contractVersion); M3 — ревью партитуры исполнителем. **M1-локус/форма записи** — не предрешение: M4 рассмотрела H1–H4 заново. |
| Алфавит вызовов (Act) | Ровно три: `accept_contract`, `review`, `refuse`. Вердикты ревью (`lgtm` \| `changes_requested`) — **payload** review, не отдельные top-level calls. Снятие роли ≠ `changes_requested`. |
| Кто вправе звать | `canCall ⇔ assigned(S,p) ∧ window_open(S) ∧ pre(act)`. Shadow (`only_participated`) — **нет** accept/review/refuse API. Reassign — смена Assignments (вне размытия M4), не «тихо пустить shadow». |
| Preconditions (pre) | accept: ¬accepted ∧ ¬refused. review: accepted ∧ ¬refused ∧ contractVersion match. refuse: ¬refused (phase: `pre_accept` \| `post_accept` в payload). |
| Что возвращает вызов | **V1** синхронный Result: `status ∈ {ok, rejected_precondition, conflict}` + при ok — **Receipt** `{receiptId, sprintId, personaId, act, ts, payload…, evidenceRef, noticeRef?}`. **V2/V3 отклонены** (poll-разрыв; 204 без машинного Result). |
| Идемпотентность | Повтор accept/review при том же успехе → `ok` + тот же receiptId. Accept после refuse → `conflict`. |
| Где живёт ответ как вещдок | **H1 выбран:** лента `Evidence(S)` — SoT. kinds минимум: `call_receipt`, `owner_notice`. **H2** (отдельный CallLog) — не выбран. **H3** (поля task card / registry) — отвергнут (карточка ≠ окно; leadPersona уже врала). **H4** (memory/angelina journal) — отвергнут (не SoT процедуры). Transport DTO несёт `evidenceRef`, не заменяет home. |
| Отношение к панельной цепочке | Панель = **read-model / оркестрация** (`node_requires` / `node_satisfied` по receipts). Панель **не** author квитанций. Вызов = writer Evidence. Смешение panel→write Receipt = нарушение связанности. После refuse: hard stop ветки исполнителя до owner resolve (сам resolve — не M4). |
| Норма «отказ адресуется владельцу» | При `act=refuse` ∧ `status=ok` commit **атомарно** пишет Notice `{to: owner, sprintId, personaId, callId, reason, ts}` и `noticeRef` в Receipt. Owner = владелец/капитан контура, не leadPersona и не CC. Канал доставки (UI/Linear/…) — транспорт; home нормы — существование notice-вещдока. Best-effort «напишет мемо» — **запрещён**. |
| Reason отказа | Closed set R: `overload`, `scope_dispute`, `conflict_interest`, `blocked_dependency`, `other` (+ `noteHash` обязателен для `other`). |
| Совпадение с M1 | Если M1 указывала Evidence-ленту — **post-factum совпадение**, основание M4 — сравнение H1–H4, не defer. |
| Вне скоупа (явно) | Аудитор ≠ исполнитель; ведущая; память спринта; судьба 213 карточек; реализация endpoint/path в monorepo; owner-reassign protocol детали (5–9). |

**Definition of Done (формат / канон спринта, не код):**

1. В каноне sprint-honest зафиксированы Act (3), Result status (3), Receipt fields, Notice на refuse.
2. Предикаты `canCall`, `pre`, I1 (ok ⇒ evidence), I2 (refuse ⇒ owner notice), I4 (Result тотален) — текстом проверяемы.
3. Явно разделены: PanelChain (consumer) vs PerformerCall (writer Evidence).
4. H3/H4/V3 поименованы как анти-паттерны.
5. Review payload не смешивается с refuse; shadow не получает call API.
6. Код/PR не требуется для закрытия M4; зубы на idempotency/notice — при первой реализации writer’а.

---

## Список посылок
1. **норма** — M1: «исполнитель спринта» машинно есть проекция `Assignments(S)` × `Evidence(S)` (assigned/participated/status), а не persona, git-branch или `leadPersona` задачи.  
2. **норма** — M1: `assigned` и `participated` различны; фактический исполнитель = `participated`; shadow_work = only_participated; честное исполнение плана = ∃ honest_pair.  
3. **норма** — M1: участие квалифицируется адресуемым следом `e ∈ Evidence(S)` с `qualifies` (kind∈K_exec, resolvable ref, окно/grace) — не label, ветка, presence/CC.  
4. **норма** — M2: до входа в исполнение зафиксирован контракт окна (версия/текст контракта как вход последующих актов).  
5. **норма** — M3: исполнитель делает ревью партитуры/контракта окна (смысл ревью задан до M4; M4 не переопределяет его).  
6. **норма** — повестка M4: кандидатные акты вызова — принятие контракта, ревью, отказ; предмет — формат спринта, не код.  
7. **норма** — повестка/канон контура: «отказ адресуется владельцу» (owner/капитан), не в никуда и не только в локальный лог агента.  
8. **норма** — повестка: вердикты M1–M3 — вход; M1 назвала локус/форму записи вне очереди, M4 не связана этим предрешением и обязана заново рассмотреть альтернативы home.  
9. **норма** — M0/повестка: порядок sprint-honest и скоуп комнаты — только вопрос 4; чужие вопросы 5–9 (аудитор, ведущая, память, судьба 213 карточек и т.п.) не решать.  
10. **факт** — в контуре задач/реестра уже живут формальные `leadPersona`/карточки без проверяемого следа исполнения (фон M0/M1 про фальшивое присутствие), поэтому home вещдока нельзя отождествлять с полем карточки задачи.

*Реплик в диалоге: 34; каждый участник высказался не менее одного раза.*
