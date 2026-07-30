<!-- канал: llm — протокол произведён yarn consilium -->

# Метаданные сеанса

| Поле | Значение |
|------|----------|
| Дата (UTC) | 2026-07-30T14:23:50.236Z |
| Команда | `yarn consilium` |
| Модель | xai/grok-4.5 |
| Файл | `docs/seanses/task-archive-cold-store-m2-evidence-contract-2026-07-30.md` |
| Порядок ролей | Структурщик → Математик → Архитектор → Верстальщик → Музыкант → Teamlead |
| Повестка | `docs/meeting/task-archive-cold-store/M2_AGENDA.md` |

**Вход сеанса** (что комната действительно получила):

| Вход | Носитель | Размер | Отпечаток | Доставка |
|------|----------|-------:|-----------|----------|
| повестка (эхо в голове) | `docs/meeting/task-archive-cold-store/M2_AGENDA.md` | 2727 | `b2a6f95294e5` | полностью |
| инструкция консилиума | `docs/prompts/CONSILIUM_PROMPT.md` | 4494 | `b6bd1a8dc127` | полностью |
| координация ролей | `docs/VIRTUAL_TEAM_PROMPT.md` | 8034 | `75959c7f060d` | **обрезан** |
| контекст: Архитектура | `docs/ARCHITECTURE.md` | 6034 | `33f0886d9bac` | **обрезан** |
| контекст: Дизайн | `docs/DESIGN.md` | 5998 | `c0c614192971` | полностью |
| контекст: Сервисы | `docs/SERVICES.md` | 6034 | `cf5d799f7980` | **обрезан** |
| архив RAG | — | 105 | `4190ddf6c311` | полностью |
| повестка | `docs/meeting/task-archive-cold-store/M2_AGENDA.md` | 2727 · 1 п. | `b2a6f95294e5` | полностью |

> ⚠ Часть входа не доехала до комнаты целиком. Утверждения протокола о своём входе
> сверять с этой таблицей, а не с текстом реплик.

**Вопрос:**

Вопрос P3: Какие closure evidence обязаны попасть в канонический cold-record закрытой задачи при SoT-модели M1 hybrid: background-office/MongoDB — канон records, git — checkpoint/export carrier; какие поля обязательные, какие optional/derived, что считается forbidden hint вместо доказательства, и почему evidence archive не доказывает insight L/O? Вердикт обязан назвать минимальный evidence contract, отделить required от optional/derived, назвать forbidden hints и не решать Q2 checkpoint shape/hash fields, Q5 writer/idempotency/API, Q4 recovery procedure, Q6 migration, Q7 lifecycle по существу.

---

# Консилиум: M2 — Evidence contract cold-record закрытой задачи

**Повестка:** P3 / Q3 — минимальный evidence contract канонического cold-record закрытой задачи при SoT-модели M1 hybrid (`background-office`/MongoDB — канон records, git — checkpoint/export carrier): required vs optional/derived, forbidden hints, почему archive evidence не доказывает insight L/O. Без Q2/Q4/Q5/Q6/Q7 по существу.

**Участники:** Teamlead (Tarasov), Архитектор (Vesnin), Структурщик (Ozhegov), Математик (Dynin), Музыкант (Kuryokhin), Верстальщик (Rodchenko).

**Порядок реплик:** Структурщик → Математик → Архитектор → Верстальщик → Музыкант → Teamlead

---

[Структурщик]: Начинаю со словаря, иначе снова синонимы. **Cold-record** — каноническая append-only запись закрытия задачи в home MongoDB office, не строка registry и не markdown в git. **Closure evidence** — набор адресуемых доказательств, что задача закрыта, а не «помечена done». **Hint** — утверждение без машинно сверяемой ссылки на артефакт. Леммы M1: канон records — office; repo — carrier слепка, не SoT записи.

[Математик]: Формализую без UI. Пусть R — cold-record. Предикат допустимости: `valid(R) ⇔ required(R) ⊆ dom(R) ∧ ∀ e ∈ required(R): verifiable(e) ∧ schemaVersion(R) ∈ Supported`. `verifiable(e)` — существует внешний или внутренний якорь (PR number, commit SHA, issue id, actor id), а не свободный текст. Hint: `¬verifiable(h)`. L/O инсайта — отдельный предикат над другим объектом; из `valid(R)` он не следует.

[Архитектор]: Конструкция простая: cold-record = снимок истины закрытия + ссылки на доказательства, не журнал разработки и не insight-lifecycle. Граница комнаты жёсткая: состав полей evidence и запрет подмен; форма checkpoint/hash — Q2; writer/idempotency — Q5. Рекомендую минимальный контракт: идентичность задачи, факт закрытия, время, схема, связь с PR/SHA/review/issue где применимо, actor-след — без Merkle и без API.

[Верстальщик]: С витрины аудитора и капитана карточка «закрыто» без PR/SHA/review — фальшивое присутствие, как бейдж «исполнитель» без следа. Требую, чтобы required evidence читались как факты с якорями, а не как проза «сделано». Пустота честная: нет issue — поле отсутствует или `null` с причиной optional, не выдуманный номер. Layout не рисую — только контракт данных для будущей витрины архива.

[Музыкант]: На слух закрытие без take на ленте — mono-фальшь: объявили «готово», а merge-SHA не записан. Evidence — это master-tape закрытия: task id, snapshot статуса, PR, SHA, review, issue state. Hint «вроде влили» — щелчок в пустоту, не proof. Archive лента не доказывает, что инсайт *усвоен* (L) или *встроен в процесс* (O): это другой трек, Q7, не путать шины.

[Teamlead]: Планка матча узкая: минимальный evidence contract, required vs optional/derived, forbidden hints, явный отказ выводить L/O. Не лезем в checkpoint shape, writer, recovery, migration, insight lifecycle. Связка: Структурщик — леммы полей; Математик — предикат valid; Архитектор — граница контракта; остальные — против фальши и подмены. Держим состав, без украшательства.

[Структурщик]: Словарь полей. **taskId** — стабильный id карточки. **taskSnapshot** — замороженный срез полей задачи на момент закрытия (title, status=closed, epic_id, leadPersona…), не live-ссылка в mutable registry. **closureTimestamp** — время фиксации закрытия. **schemaVersion** — версия контракта record. **links**: pr, merge/commit SHA, reviewArtifact, issueRef. **provenance**: actor, requestId?, sourceCommit?. Без этих лемм optional/required снова смешаются.

[Математик]: Минимальное ядро required предлагаю как множество K: `{ schemaVersion, recordType=task_closure, taskId, epic_id, closedAt, status=closed, taskSnapshot, closureProof }`, где `closureProof` — непустое множество якорей из алфавита `{ prRef, headSha|mergeSha, reviewRef, issueState }` с правилом достаточности. Инвариант: `closedAt` монотонен в append-only коллекции относительно порядка вставки record (не путать с git history). Derived не входят в K.

[Архитектор]: Цена толстого snapshot — дублирование; цена тонкого — потеря смысла при мутации registry. При hybrid SoT snapshot **обязан** быть self-contained для чтения канона без git. Но не весь git tree: только поля задачи, нужные для аудита закрытия. PR body целиком, diff, CI logs — optional или внешние по ссылке. `epic_id` — required по входу REVIEW/insight storage: без эпика архив не клеится к контуру.

[Верстальщик]: Читаемость snapshot: status должен быть явно `closed`/`done` канона задач, не «похоже закрыли». Если issue не было — не рисовать зелёный «issue ok». Три честных слоя в контракте: (1) always-on identity+time+schema+epic; (2) proof links; (3) optional enrichment. Фальшь — один бейдж «archived» без расшифровки proof.

[Музыкант]: Review artifact на слух — это LGTM/accept след, не «кто-то глянул». Без review при закрытии через PR — дыра в take; но не все задачи идут через PR (docs-only?). Нужно правило достаточности proof, не слепой чеклист из пяти галочек. Иначе клиппинг процесса: невозможное required убьёт честные закрытия.

[Teamlead]: Согласен с Курёхиным: required — не «всё сразу», а **достаточный набор**. Тарасовская планка: закрытие без *какого-либо* проверяемого якоря — BLOCK. Форму «какой минимальный набор якорей» пусть Математик зафиксирует предикатом, Структурщик — именами полей. Не путаем с Q5 (как писать).

[Структурщик]: Имена якорей (леммы, не API): `prRef` {host, number | url}, `commitSha` (полный SHA), `reviewRef` {type: lgtm|accept|teamlead_verdict, ref}, `issueRef` {tracker, id, state}. `taskSnapshot` — объект с обязательными подполями: `taskId`, `title`, `status`, `epic_id`, `leadPersona?`. `actor` — persona/user id закрывшего. `requestId` — optional корреляция. `sourceCommit` — optional SHA операции закрытия в repo-carrier, не замена merge SHA задачи.

[Математик]: Предикат достаточности proof: `sufficient(P) ⇔ (prRef ∈ P ∧ commitSha ∈ P) ∨ (commitSha ∈ P ∧ reviewRef ∈ P) ∨ (issueRef ∈ P ∧ issueRef.state ∈ TerminalClosed ∧ reviewRef ∈ P)`. То есть «память» и голый issue open — недостаточны; связка PR+SHA — канонический путь кода; docs/process — issue terminal + review. Инвариант: `commitSha` если есть — full-length hex, не branch name. Branch name ∉ verifiable anchors.

[Архитектор]: Это форма, не процедура recovery. Forbidden как класс: любые поля, которые *подменяют* proof намёком — `notes: "влили вчера"`, `branch: feature/x`, `ci: green`, `memory: "owner said ok"`, `registryOnly: true` без якорей. Optional: labels, url к markdown archive path в repo (carrier path — указатель, не SoT), short PR title, milestone. Derived: `yearMonth` из `closedAt`, displayUrl из prRef, hash record — если появится, то в Q2, здесь не специфицируем.

[Верстальщик]: Forbidden hints с витрины: «✅ done», «LGTM в чате» без ref, «см. вчерашний созвон», зелёный pipeline без SHA, screenshot без id. Optional enrichment можно показывать серым вторичным текстом; required proof — primary, `tabular-nums` для дат/номеров когда дойдёт до UI. Сейчас фиксируем только что данные не врут витрине.

[Музыкант]: Почему archive ≠ insight L/O: cold-record говорит «задача сыграна до конца и сдана с take». Insight L — «команда усвоила смысл»; O — «смысл встроен в ритуал/код/канон». Это отдельные партии. Можно закрыть task archive storage implementation и всё ещё иметь insight в draft. Смешивать шины — гарантированный клиппинг Q7 заранее; комната Q7 пусть решает lifecycle, мы только ставим забор.

[Teamlead]: Забор принимаю. В вердикте отдельной строкой: evidence contract **не** доказывает L/O. Кто притащит в DoD этой комнаты «обновить insight status» — колонизация Q7, BLOCK. Дальше добиваем минимальный required список до закрытия стола.

[Структурщик]: Сводка required (канон record body): `schemaVersion`, `recordType` (`task_closure`), `taskId`, `epic_id`, `closedAt` (ISO timestamp), `status` (`closed`), `taskSnapshot` (self-contained), `actor`, `proof` (объект/массив якорей, satisfying sufficient). Связь task↔PR↔SHA↔review↔issue — через `proof` и snapshot ids, не через narrative. Repo path / export generation — не поля SoT-записи как обязательные.

[Математик]: Optional/derived формально: Optional = `{ requestId, sourceCommit, issueRef (если не использован в sufficient), prTitle, labels[], archiveMarkdownPath, externalUrls[], notes? }` — notes только как free text *дополнительно* к valid proof, никогда вместо. Derived = `{ closedAtBucket, prUrl (из prRef), snapshotDigest? }` — digest не специфицируем (Q2). Forbidden = всё, что претендует на proof при `¬verifiable`.

[Архитектор]: `taskSnapshot` минимальные ключи: taskId, title, status, epic_id, optional leadPersona/supportPersonas, optional acceptance criteria ids — без полного git tree. REVIEW требовал atomic write и timestamp+epic_id — timestamp у нас `closedAt`, atomic — норма writer'а, но **механизм** atomic/idempotency уходит в Q5; здесь только то, что record *содержит* timestamp и epic_id как required fields.

[Верстальщик]: Итоговая таблица для читателя вердикта должна разделять три полки: must / may / forbidden. И четвёртая полка: «не следует L/O». Иначе снова один абзац, где всё смешано, и следующий агент «довыведет» insight status из archive.

[Музыкант]: Ещё forbidden на слух: `closedBecause: "stale"` без actor+time+policy ref; авто-close ботом без review/issue terminal; дублирующий «SoT: registry.json» как proof (registry — hot/mutable контур, не cold evidence). M1 уже запретил repo JSONL как штатный SoT — не возвращаем его под видом evidence.

[Teamlead]: Матч собран. Фиксируем вердикт таблицей повестки. Definition of Done — только про контракт evidence и документ вердикта, без checkpoint API и без migration. Принимаю состав ниже; спорящие — явное «Принимаю» по кругу.

[Структурщик]: Принимаю. Леммы полей и разделение required/optional/derived/forbidden — в итог. Q2 shape не трогали.

[Математик]: Принимаю. Предикат `valid` + `sufficient(proof)` + независимость от L/O — в итог. Хеши/Merkle не специфицировал.

[Архитектор]: Принимаю. Граница модулей: home record — office MongoDB; git path в optional pointer max. Writer/recovery/migration/lifecycle — deferred.

[Верстальщик]: Принимаю. Честная витрина: proof primary, hints forbidden, L/O не из archive.

[Музыкант]: Принимаю. Шины task-closure и insight L/O разведены; фальшивый final bounce без SHA/PR/review — out.

[Teamlead]: LGTM по комнате M2/Q3. Вердикт — таблица + список посылок. Исполнение контракта в коде — после Q5; сегодня только канон evidence. Матч сыгран.

---

## Итоговое решение консилиума

| Поле | Решение |
| --- | --- |
| Required evidence | **Минимальный evidence contract cold-record (`task_closure`)** в каноне MongoDB office: (1) `schemaVersion`; (2) `recordType = task_closure`; (3) `taskId`; (4) `epic_id`; (5) `closedAt` (UTC timestamp); (6) `status = closed` (терминальный статус канона задач); (7) `taskSnapshot` — self-contained срез на закрытие: как минимум `taskId`, `title`, `status`, `epic_id` (+ optional persona fields внутри снимка); (8) `actor` (кто зафиксировал закрытие); (9) `proof` — непустой набор якорей, удовлетворяющий `sufficient(proof)`: **`(prRef ∧ commitSha) ∨ (commitSha ∧ reviewRef) ∨ (issueRef ∈ TerminalClosed ∧ reviewRef)`**. Якоря: `prRef` (number/url), `commitSha` (full SHA), `reviewRef` (LGTM/accept/teamlead_verdict + ref), `issueRef` (tracker, id, terminal state). Связь task/PR/SHA/review/issue — только через эти поля, не narrative. |
| Optional/derived evidence | **Optional:** `requestId`, `sourceCommit` (SHA операции/export-carrier, не замена merge/task SHA), `prTitle`, `labels[]`, `archiveMarkdownPath` (указатель на repo carrier, не SoT), `externalUrls[]`, `notes` (только *сверх* valid proof), issue/PR поля сверх минимального якоря. **Derived:** календарные бакеты из `closedAt`, display URL из `prRef`, прочие вычисляемые представления. **Не входят в required и не специфицируются здесь:** root/Merkle hash, sequence range, checkpoint envelope (Q2). |
| Forbidden hints | Утверждения вместо `verifiable` proof: свободный текст «сделано/влили/на память»; branch name как «SHA»; «CI green» без commit; LGTM/accept только в чате без `reviewRef`; screenshot/созвон без id; `registry.json` / repo JSONL как штатный proof SoT; status flip в hot registry без cold-record; auto-close без actor и без sufficient proof; подмена proof полем `notes`. |
| Evidence not proving insight L/O | Cold-record доказывает **закрытие задачи с якорями**. Он **не** влечёт Learned/Operationalized инсайта: L/O — предикаты другого объекта и комнаты Q7. Наличие archive evidence ≠ insight усвоен или встроен в ритуал/канон. |
| Boundary deferred to later rooms | **Q2** — checkpoint shape, hash/Merkle/sequence fields; **Q5** — writer API, atomic write mechanism, idempotency key; **Q4** — recovery/export/restore procedure; **Q6** — migration map legacy markdown/registry; **Q7** — insight lifecycle / обновление `insight-task-archive-storage`. M1 SoT hybrid не пересматривается. |

**Definition of Done (M2 / Q3 only):**

- Вердикт зафиксирован: required / optional-derived / forbidden / non-implication L/O / boundaries.
- Минимальный evidence contract и предикат `sufficient(proof)` названы без API writer и без checkpoint hash schema.
- В DoD нет обязательств Q2/Q4/Q5/Q6/Q7 по существу.
- Список посылок полон и не содержит выводов этой комнаты.

---

## Список посылок

1. **[факт/норма M0]** Порядок комнат: `Q1 → Q3 → Q2 → Q5 → Q4 → Q6 → Q7`; текущая комната = Q3 Evidence contract.  
2. **[норма M1]** SoT model = hybrid: канон records — `background-office` MongoDB append-only; git — checkpoint/export carrier, не steady-state SoT.  
3. **[норма M1]** Forbidden ранее: cold archive как mutable task table; repo JSONL как штатный SoT; `background-media` как home; silent dual-write как два SoT.  
4. **[норма владельца]** Cold archive может жить вне git; repo хранит небольшой проверяемый слепок.  
5. **[норма/вход REVIEW]** Для task-archive-storage отмечались atomic write, `timestamp`, `epic_id` как обязательные аспекты; прежний server API — избыточен (механизм atomic → Q5, поля timestamp/epic_id — предмет evidence).  
6. **[норма процесса задач]** Закрытие карточек должно быть доказательным: registry/archive, PR/SHA/review/issue state не сводятся к «на память».  
7. **[норма границ повестки M2]** Не решать по существу Q2 checkpoint shape/hash, Q5 writer/idempotency/API, Q4 recovery, Q6 migration, Q7 insight lifecycle.  
8. **[факт повестки]** Входы комнаты перечисляют кандидатов evidence: task snapshot, PR, SHA, review artifact, issue state, actor/requestId/sourceCommit, schemaVersion.

---

*Реплик в диалоге: 30; каждый участник высказался не менее одного раза.*
