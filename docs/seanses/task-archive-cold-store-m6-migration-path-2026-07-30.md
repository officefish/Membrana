<!-- канал: llm — протокол произведён yarn consilium -->

# Метаданные сеанса

| Поле | Значение |
|------|----------|
| Дата (UTC) | 2026-07-30T14:44:41.281Z |
| Команда | `yarn consilium` |
| Модель | xai/grok-4.5 |
| Файл | `docs/seanses/task-archive-cold-store-m6-migration-path-2026-07-30.md` |
| Порядок ролей | Музыкант → Математик → Верстальщик → Архитектор → Структурщик → Teamlead |
| Повестка | `docs/meeting/task-archive-cold-store/M6_AGENDA.md` |

**Вход сеанса** (что комната действительно получила):

| Вход | Носитель | Размер | Отпечаток | Доставка |
|------|----------|-------:|-----------|----------|
| повестка (эхо в голове) | `docs/meeting/task-archive-cold-store/M6_AGENDA.md` | 2811 | `fe37c34247a1` | полностью |
| инструкция консилиума | `docs/prompts/CONSILIUM_PROMPT.md` | 4494 | `b6bd1a8dc127` | полностью |
| координация ролей | `docs/VIRTUAL_TEAM_PROMPT.md` | 8034 | `75959c7f060d` | **обрезан** |
| контекст: Архитектура | `docs/ARCHITECTURE.md` | 6034 | `33f0886d9bac` | **обрезан** |
| контекст: Дизайн | `docs/DESIGN.md` | 5998 | `c0c614192971` | полностью |
| контекст: Сервисы | `docs/SERVICES.md` | 6034 | `cf5d799f7980` | **обрезан** |
| архив RAG | — | 105 | `4190ddf6c311` | полностью |
| повестка | `docs/meeting/task-archive-cold-store/M6_AGENDA.md` | 2811 · 1 п. | `fe37c34247a1` | полностью |

> ⚠ Часть входа не доехала до комнаты целиком. Утверждения протокола о своём входе
> сверять с этой таблицей, а не с текстом реплик.

**Вопрос:**

Вопрос P7: Как перейти от текущих docs/tasks/archive/*.md, docs/tasks/registry.json и README/derived витрин к server-side cold archive после M1-M5 без переписывания истории, потери ссылок и подмены legacy hints на proof? Вердикт обязан назвать migration scope, legacy material classification, import/write strategy, link preservation, rollback/stop conditions, derived repo cleanup policy и не решать Q7 insight lifecycle по существу.

---

# Консилиум: M6 — Migration path для task-archive-cold-store

**Повестка:** P7 — Как перейти от текущих `docs/tasks/archive/*.md`, `docs/tasks/registry.json` и README/derived витрин к server-side cold archive после M1–M5 без переписывания истории, потери ссылок и подмены legacy hints на proof? Вердикт обязан назвать migration scope, legacy material classification, import/write strategy, link preservation, rollback/stop conditions, derived repo cleanup policy; не решать Q7 insight lifecycle по существу.

**Участники:** Teamlead (Tarasov), Архитектор (Vesnin), Структурщик (Ozhegov), Математик (Dynin), Музыкант (Kuryokhin), Верстальщик (Rodchenko).

**Порядок реплик:** Музыкант → Математик → Верстальщик → Архитектор → Структурщик → Teamlead

---

[Музыкант]: На слух миграция — это не remaster старых take, а перенос master-tape на серверную шину. Старые `docs/tasks/archive/*.md` звучат как handoff-записи, не как proof. Если мы вложим stale-карточку в cold-record как «доказательство» — клиппинг доверия: legacy hint прикинется evidence. Слышу scope: только task_closure-кандидаты с проверяемым evidence-контуром M2; registry и README — derived, не соло на ленте.

[Математик]: Формализую. Пусть L — множество legacy-артефактов. Классификация: `candidate(x) ⇔ x ∈ archive_md ∧ ∃ taskId(x) ∧ shape_allows_notary(x)`; `derived(x) ⇔ x ∈ {registry.json, README, index-views}`. Import-предикат: `importable(x) ⇔ candidate(x) ∧ evidence_ok(x per M2) ∧ ¬conflict(taskId)`. Stop: `¬importable ∧ attempted_auto` → halt batch. Identity после импорта — M3 recompute count/hash по Mongo, не по файлам репо.

[Верстальщик]: С витрины читателя старые markdown-пути и ссылки из PR/Issue обязаны остаться честными. Фальшь: «файл удалён, идите в Mongo» без redirect-таблицы. После миграции витрина repo — либо freeze-штамп «archived → cold id», либо тонкий stub с каноническим `taskId`/`recordId`, не регенерация «как будто proof живёт в git». README/index — derived, читают checkpoint/export, не притворяются SoT.

[Архитектор]: Конструкция из M1–M5: SoT — Mongo via ArchiveNotary; repo — checkpoint/export carrier. Миграция не открывает второй write-path в Mongo и не делает bulk insert в обход Notary. Scope: одноразовый (или версионируемый) import-batch legacy task_closure candidates → Notary idempotent-put с ключом `(recordType=task_closure, taskId)`. Не трогаем insight lifecycle (Q7). Repo markdown после cutover — freeze + link map, не живой SoT.

[Структурщик]: Леммы, иначе синонимы. **Legacy archive card** — markdown в `docs/tasks/archive/*.md`, носитель handoff-текста, не proof. **Hot registry** — `docs/tasks/registry.json`, рабочий индекс, derived относительно cold. **Canonical cold-record candidate** — payload, прошедший evidence contract M2 и принятый Notary. **Link map** — таблица `oldPath | ghIssue|PR | taskId | coldRecordKey` в repo как read-only export/carrier, не SoT записей. **Derived vitrine** — README/index, регенерируемые из checkpoint, не из «правды карточки».

[Teamlead]: Планка матча M6: путь переноса без rewrite history, без потери ссылок, без подмены hint→proof. Не играем Q7. Связка: Архитектор — граница import; Математик — stop-предикаты; Структурщик — словарь classification; Верстальщик — честность stub/витрин; Музыкант — «не remaster». Дальше спорим по scope и stop, не по CLI-флагам.

[Музыкант]: Что не берём на master-tape: chat logs, branch names, screenshots, «кажется закрыто» из registry status, JSONL-хвосты репо — M2 уже сказал: не proof. Берём: тело archive-card как *candidate material* + внешние evidence refs (PR merge, issue close, accepted artifact paths), если они есть. Нет evidence — не тихо пишем «closed»; stop или import as `legacy_unverified` только если контракт M2 такое допускает — иначе halt.

[Математик]: Уточняю статус. M2: hints/notes/branch/chat/screenshot/hot-registry/repo JSONL ≠ proof; archive evidence ≠ insight L/O. Значит legacy md сам по себе не доказывает closure. Предлагаю двухслойный import: (1) `provenance: legacy_markdown` + raw body hash; (2) `evidence[]` только из проверяемых ссылок. Notary reject, если payload помечает md-only как `proof`. Предикат stop: duplicate taskId с иным body-hash; missing taskId; broken required evidence ref при claim «proven».

[Верстальщик]: Link preservation на витрине: каждый старый путь `docs/tasks/archive/<file>.md` после freeze содержит блок «cold: taskId=…; migrated=…; do not edit» либо заменяется stub-файлом того же path (чтобы git blame/links из PR не 404). GitHub Issue/PR ссылки не переписываем в истории коммитов — только forward-map в stub и в link map. Переписывание git history — запрет комнаты.

[Архитектор]: Import/write strategy: единственный writer — ArchiveNotary (M4). Мигратор — client Notary API: create/idempotent-put, не mongo shell. Порядок: dry-run classify → report stop-set → import accepted → publish ColdArchiveCheckpoint (M3) → freeze repo archives. Partial repo lag не откатывает Mongo (M4) — значит rollback миграции ≠ delete Mongo records; rollback = stop further import + оставить repo в pre-freeze, cold records остаются append-only (M5 forbidden healing).

[Структурщик]: Classification table в словаре: (A) archive md с taskId и closure-shape → candidate via Notary; (B) registry.json entries → derived reference, могут снабжать taskId/status *hint* мигратору, не evidence; (C) README/tasks index → derived vitrine, после cutover читают checkpoint/link map; (D) посторонние notes/chats — out of scope, не auto-import. Home link map: repo carrier (`docs/tasks/cold-link-map` или эквивалент в checkpoint export) — маленький снимок, не cold store.

[Teamlead]: Фиксирую scope-рамку: мигрируем **task_closure candidates** из archive md через Notary; registry/README — не canonical import. Rollback не «вычистить Mongo». Stop важнее hero-import. Кто против двухслойного provenance+evidence — говорите сейчас.

[Музыкант]: Не против. На слух «legacy_unverified» опасен, если витрина рисует его как зелёный closed. Лучше: Notary принимает record с явным `evidenceGrade: legacy_hint_only | evidenced`, а derived UI обязан показывать grade. Иначе again mono-take «всё закрыто». Если grade не влезает в M2 contract без расширения — тогда md-only = stop, не import. Предпочту stop, чем фальшивый master.

[Математик]: Согласую с M2 без расширения proof: в cold-record поле evidence либо удовлетворяет контракту, либо запись не claim’ит proven closure. Минимальная норма M6: `import_as_canonical ⇔ evidence_satisfies_M2`; иначе `skip|stop`, не «мягкий proof». Batch policy: file-level stop не обязан убивать весь batch, но **batch halt** если доля reject > threshold *или* обнаружен class error (schema drift, Notary down, hash collision). Threshold — ops-параметр вне вердикта; класс ошибок — в вердикте.

[Верстальщик]: Derived repo cleanup policy с витрины: (1) не delete paths сразу — freeze/stub, чтобы ссылки из старых PR жили; (2) README/index переписать на «source: cold checkpoint + link map», убрать тон «registry.json есть SoT архива»; (3) не regenerate archive md из Mongo как будто они снова SoT — regenerate только *derived views* (таблицы/индексы), явно помеченные. Иначе снова dual-SoT.

[Архитектор]: Цена keep-forever md vs stub: keep-forever = drift temptation; stub = path stability + explicit non-SoT. Рекомендация: **freeze then stub-or-banner** на том же path; полный delete — только после отдельного окна и проверки link map, не в M6 cutover. Cold archive в repo не живёт (owner premise) — только checkpoint hash + link map + stubs. Q7 не открываем: status insight не мигрируем «заодно».

[Структурщик]: Write strategy леммами: `MigrationRunner` (имя рабочее) → вызывает только `ArchiveNotary.put`; читает legacy surfaces read-only; пишет отчёт `MigrationReport{accepted, rejected, stopped}`. Запрет: прямой Mongo insert/update/delete; запрет rewrite archive git history; запрет «healing» stale registry в proof. Registry после миграции остаётся hot bookkeeping (как было), но cold не зависит от него (M1/M5: Mongo wins steady-state).

[Teamlead]: Принимаю stop-first на md-only claim proof. Batch: class-error = halt; unit-reject = в отчёт. Stub/freeze paths — да. Delete en masse — вне cutover. Дальше: link preservation и rollback условия добить до таблицы.

[Музыкант]: Ссылки на Issue/PR — как liner notes на обложке: не вырезаем из истории релизов. В cold-record кладём их в `refs[]` (URL/number), в stub — те же refs + taskId. Если в md ссылка битая уже сейчас — не чиним историю; помечаем в report `ref_unresolved`, не подставляем «угаданный» PR.

[Математик]: Rollback formal: состояние R0 (pre-import), R1 (partial import), R2 (import+checkpoint). Rollback R1→R0 *в Mongo* запрещён M5 (no delete/rewrite history). Операционный «rollback» = (a) halt runner; (b) не freeze repo; (c) не объявлять cutover; (d) accepted records остаются, повторный put — idempotent по ключу. Stop conditions set S: missing taskId; duplicate taskId different payload-hash without explicit supersede policy; Notary/evidence schema fail; attempt to treat registry status as proof; checkpoint identity mismatch post-import; Q7-shaped payloads in batch.

[Верстальщик]: Витрина stop: оператор видит MigrationReport без легенды — счётчики accepted/rejected/stopped + reason codes. Фальшь: зелёный «migrated 100%» при stop-set > 0. Stubs: одна конструкция баннера, `tabular-nums` для count в индексе derived. Не рисую UI-код — требую policy: report обязателен до freeze.

[Архитектор]: Supersede policy: M4 key `(task_closure, taskId)` — idempotent-put. Если legacy body ≠ existing Mongo canonical — **stop**, не silent overwrite (M5 no rewrite). Если Mongo пуст для taskId — put. Если equal hash — idempotent ok. Это migration scope guardrail. Boundary: exact CLI, thresholds, insight lifecycle, final archive this insight — later rooms.

[Структурщик]: Cleanup policy словарём: **Freeze** — md/stub immutable banner; **Redirect** — stub path → cold key в link map; **Regenerate** — только derived index/README из checkpoint; **Keep raw forever** — не требуется; **Delete** — отложено post-cutover, отдельное решение. registry.json не «чистим в cold»; не удаляем hot registry как working set.

[Teamlead]: Сводим. Migration scope = legacy archive md → Notary task_closure candidates + link map/checkpoint в repo. Classification = candidate vs derived vs out-of-scope. Import = only Notary, evidence M2, stop on conflict/unproven claim. Links = stubs + link map + no git rewrite. Rollback = halt/no-cutover, no Mongo delete. Cleanup = freeze/stub, regenerate derived only. Q7 — boundary. Круг на явное «Принимаю».

[Музыкант]: Принимаю. Не remaster, не hint-as-proof, stubs как обложки со ссылкой на master-tape в Mongo.

[Математик]: Принимаю. Предикаты candidate/importable/stop и запрет rollback-delete согласованы с M2–M5.

[Верстальщик]: Принимаю. Честные stubs, report до freeze, derived README без позы SoT.

[Архитектор]: Принимаю. Форма: Notary-only import, repo carrier checkpoint+link map+stubs, граница Q7 закрыта.

[Структурщик]: Принимаю. Словарь classification и cleanup без dual-SoT и без прямого Mongo write.

[Teamlead]: LGTM по M6. Матч — migration path зафиксирован; исполнение кода/CLI — не эта комната. Вердикт в таблицу.

[Музыкант]: Ещё раз по краю: screenshot/chat в batch — out of scope, даже «для полноты». Полнота — враг чистого тракта.

[Математик]: Дополняю stop: payload с `recordType ≠ task_closure` в M6 batch → reject/stop class; insight-* типы не импортируем «про запас».

[Верстальщик]: Index/README после cutover: явная строка «архив задач: cold store (Mongo); репо: checkpoint + stubs». Без неё витрина врёт через месяц.

[Архитектор]: Sanity samples checkpoint (M3) не становятся records при миграции — не импортировать samples как closure.

[Структурщик]: Handoff stale card: registry hint может указать taskId для поиска md, но classification остаётся «hint», не повышает evidenceGrade.

[Teamlead]: Закрываю дискуссию. Секретарь — итоговая таблица, DoD, список посылок. Исполнение — отдельная задача после M6.

---

## Итоговое решение консилиума

| Поле | Решение |
| --- | --- |
| Migration scope | Одноразовый (повторяемый idempotent) перенос **legacy task_closure candidates** из `docs/tasks/archive/*.md` в server-side cold archive (Mongo) **только** через ArchiveNotary после M1–M5. В scope также: построение **link map** (old path / GH Issue / PR → `taskId` / cold key) и публикация **ColdArchiveCheckpoint** как repo-carrier. **Вне scope:** содержимое hot `registry.json` как canonical records; README/index как SoT; chat/branch/screenshot/JSONL; insight lifecycle (Q7); bulk delete истории git; прямой write в Mongo. |
| Legacy material classification | **(A) Canonical cold-record candidates:** `docs/tasks/archive/*.md` с извлекаемым `taskId` и shape, допускающим Notary put `recordType=task_closure` — *материал кандидата*, не auto-proof. **(B) Derived / read-only references:** `docs/tasks/registry.json` (hot bookkeeping / hint источника taskId/status), README и index-витрины. **(C) Out of scope / non-proof:** notes, chat, branch names, screenshots, repo JSONL, sanity samples checkpoint — по M2/M3 не proof и не records. Stale handoff card **не** повышает evidence. |
| Import/write strategy | Единственный writer — **ArchiveNotary** (create/idempotent-put, ключ `(task_closure, taskId)`). Мигратор: read-only legacy → classify → dry-run report → put accepted. Payload: raw legacy body + hash + `provenance: legacy_markdown` + `evidence[]` **только** если удовлетворяет evidence contract M2; md/registry **не** маркируются как proof. Existing Mongo: same hash → idempotent ok; different hash → **stop** (no silent overwrite, M5). Partial success: Mongo не откатывается из‑за repo lag (M4). |
| Link preservation | Не переписывать git history. Сохранить стабильность путей: **freeze + stub/banner** на `docs/tasks/archive/*.md` с `taskId`, cold key, refs на Issue/PR. **Link map** в repo (carrier рядом с checkpoint) — forward lookup. Битые refs → `ref_unresolved` в отчёте, без «угадывания». Внешние URL Issue/PR копируются в `refs[]` record при import, не обязаны оставаться единственным SoT. |
| Rollback / stop conditions | **Rollback:** halt runner; не объявлять cutover; не freeze repo; **запрет** delete/rewrite Mongo records (M5). Повтор — idempotent put. **Stop (unit):** нет taskId; claim proven без M2 evidence; registry/chat/hint как proof; `recordType≠task_closure` / insight-shaped; unresolved *required* ref при claim; conflict hash для существующего key. **Halt (batch/class):** Notary/schema unavailable; systematic schema drift; post-import checkpoint identity mismatch (count/hash M3); попытка healing/overwrite. Unit-reject → report, не обязательно halt; class-error → halt. |
| Derived repo cleanup policy | После успешного import + checkpoint + report: **freeze** legacy archive paths (stub/banner, не live SoT); **regenerate only derived** README/index из checkpoint/link map с явной подписью «cold SoT = Mongo»; **не** regenerate archive md как SoT; **не** удалять en masse в cutover (delete — отдельное позднее окно при полной link map); `registry.json` остаётся hot working set, не cold home; в repo — малый carrier: checkpoint hash/identity + link map + stubs (owner: cold не живёт в repo). |
| Boundary deferred to later rooms | Q7 insight lifecycle status/update; exact CLI flags/implementation; numerical reject-threshold ops; post-cutover mass delete stubs; final archive of this insight; любые новые evidence-grade enum beyond M2 (если понадобятся продуктовой витрине — отдельная комната). |

**Definition of Done (M6 path, не код):**
- Зафиксированы scope, classification, Notary-only import, link preservation, stop/rollback, cleanup в протоколе.
- Явный запрет hint→proof и rewrite history.
- Q7 не вердиктился по существу.
- Список посылок заполнен входами M0–M5 + legacy surfaces + owner premise.

---

## Список посылок

1. **[норма]** M0: порядок вопросов Q1→Q3→Q2→Q5→Q4→Q6→Q7; M6 = Q6 Migration path (`M6_AGENDA.md`).
2. **[норма]** M1: hybrid SoT — records в `background-office` Mongo; repo — checkpoint/export carrier.
3. **[норма]** M2: cold-record evidence contract; hints/notes/branch/chat/screenshot/hot-registry/repo JSONL ≠ proof; archive evidence ≠ proof insight L/O.
4. **[норма]** M3: `ColdArchiveCheckpoint`; identity = recompute count/hash по Mongo canonical records; sanity samples ≠ records/proof/SoT.
5. **[норма]** M4: ArchiveNotary — sole create/idempotent-put writer; key `(recordType=task_closure, taskId)`; partial repo lag не откатывает Mongo.
6. **[норма]** M5: Mongo wins steady-state; restore нужен full backup dump + identity manifest; checkpoint alone не восстанавливает records; forbidden healing — reject rewrite/delete history.
7. **[факт]** Legacy surfaces существуют как `docs/tasks/archive/*.md`, `docs/tasks/registry.json`, README/derived index views (повестка M6 / входы).
8. **[норма]** Owner premise: cold archive сам не живёт в repo; repo может держать малый hash/checkpoint snapshot.
9. **[факт/норма]** Проблема bookkeeping: old cards и handoff truth могут быть stale; миграция не должна считать stale card proof without evidence (вход повестки M6).
10. **[норма]** Граница комнаты: не решать Q7 insight lifecycle, exact CLI/code, final archive of the insight (`M6_AGENDA.md` «Не решать здесь»).

---

*Реплик в диалоге: 36; каждый участник высказался не менее одного раза.*
