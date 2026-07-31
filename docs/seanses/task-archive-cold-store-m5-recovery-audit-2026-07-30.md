<!-- канал: llm — протокол произведён yarn consilium -->

# Метаданные сеанса

| Поле | Значение |
|------|----------|
| Дата (UTC) | 2026-07-30T14:39:38.651Z |
| Команда | `yarn consilium` |
| Модель | xai/grok-4.5 |
| Файл | `docs/seanses/task-archive-cold-store-m5-recovery-audit-2026-07-30.md` |
| Порядок ролей | Teamlead → Музыкант → Математик → Структурщик → Архитектор → Верстальщик |
| Повестка | `docs/meeting/task-archive-cold-store/M5_AGENDA.md` |

**Вход сеанса** (что комната действительно получила):

| Вход | Носитель | Размер | Отпечаток | Доставка |
|------|----------|-------:|-----------|----------|
| повестка (эхо в голове) | `docs/meeting/task-archive-cold-store/M5_AGENDA.md` | 3096 | `ca354c4be90a` | полностью |
| инструкция консилиума | `docs/prompts/CONSILIUM_PROMPT.md` | 4494 | `b6bd1a8dc127` | полностью |
| координация ролей | `docs/VIRTUAL_TEAM_PROMPT.md` | 8034 | `75959c7f060d` | **обрезан** |
| контекст: Архитектура | `docs/ARCHITECTURE.md` | 6034 | `33f0886d9bac` | **обрезан** |
| контекст: Дизайн | `docs/DESIGN.md` | 5998 | `c0c614192971` | полностью |
| контекст: Сервисы | `docs/SERVICES.md` | 6034 | `cf5d799f7980` | **обрезан** |
| архив RAG | — | 105 | `4190ddf6c311` | полностью |
| повестка | `docs/meeting/task-archive-cold-store/M5_AGENDA.md` | 3096 · 1 п. | `ca354c4be90a` | полностью |

> ⚠ Часть входа не доехала до комнаты целиком. Утверждения протокола о своём входе
> сверять с этой таблицей, а не с текстом реплик.

**Вопрос:**

Вопрос P6: Как проверять, восстанавливать и разбирать расхождения cold archive после M1 hybrid SoT, M2 evidence contract, M3 ColdArchiveCheckpoint и M4 write path: какие audit checks делают checkpoint и Mongo SoT сходящимися, какой export/backup достаточно иметь, что делать при hash mismatch, missing checkpoint, повреждённом или недоступном office, и какие recovery действия разрешены без переписывания append-only истории? Вердикт обязан назвать audit checks, export/backup requirements, mismatch triage, emergency repo SoT boundary, forbidden healing, reportable statuses и не решать Q6 migration legacy archive и Q7 insight lifecycle по существу.

---

# Консилиум: M5 Recovery and audit — cold archive (P6)

**Повестка:** P6 — как проверять, восстанавливать и разбирать расхождения cold archive после M1 hybrid SoT, M2 evidence contract, M3 `ColdArchiveCheckpoint` и M4 write path: audit checks, export/backup, mismatch triage, emergency repo SoT boundary, forbidden healing, reportable statuses. Не решать Q6 migration legacy archive и Q7 insight lifecycle по существу.

**Участники:** Teamlead (Tarasov), Музыкант (Kuryokhin), Математик (Dynin), Структурщик (Ozhegov), Архитектор (Vesnin), Верстальщик (Rodchenko).

**Порядок реплик:** Teamlead → Музыкант → Математик → Структурщик → Архитектор → Верстальщик

---

[Teamlead]: Планка матча M5 узкая: audit + recovery без переписывания append-only. M1–M4 закрыты — Mongo канон, repo carrier, checkpoint = `recordCount + contentHash`, partial = retry export без delete. Не лезем в Q6 legacy migration и Q7 insight. Связка: Математик — предикаты схождения и статусы; Структурщик — леммы audit/export/emergency; Архитектор — emergency boundary; Верстальщик — reportable без фальшивого зелёного. Матч — таблица вердикта + полный список посылок.

[Музыкант]: На слух cold archive — master-tape в office, repo — control-room meters, не вторая лента. Hash mismatch — клиппинг-индикатор, не лицензия «перезаписать take». Missing checkpoint — нет bounce-метки, лента при этом может быть цела. Повреждённый office — тогда и только тогда emergency: объявить recovery и временно слушать export/repo. Healing, который mute’ит или вырезает кадры с Mongo, — запрещённый overdub.

[Математик]: Формализую без UI. Пусть \(R\) — упорядоченное множество канонических cold-records из Mongo SoT, \(H = hash(canonicalize(R))\), \(n = |R|\). Checkpoint \(C = (n_C, H_C, \ldots)\). Предикат схождения: `converged(C,R) ⇔ n_C = n ∧ H_C = H`. Audit checks — тотальная функция `audit(C,R) → status`, status из закрытого enum. Mismatch: `n_C ≠ n` ∨ `H_C ≠ H` ∨ ошибка canonicalization — разные ветки triage, не один «fix».

[Структурщик]: Леммы, иначе синонимы. **Audit check** — чистая сверка carrier↔SoT, не write-path. **Export material** — полный канонический дамп records + манифест identity (count/hash) + метаданные checkpoint; dirty working tree не material. **Emergency SoT** — явно объявленный режим, не «repo вдруг канон». **Healing** — действие, меняющее историю; forbidden = любое rewrite/delete/rehash канона. Не смешивать sanity samples M3 с records.

[Архитектор]: Конструкция: два контура. Steady-state — Mongo SoT, repo только checkpoint/export. Emergency — временный SoT из **committed** export/checkpoint **только** при недоступности/повреждении office и явном объявлении recovery; граница снимается, когда Mongo восстановлен и `converged`. Цена «тихого» repo-as-SoT — dual-write ложь M1. Форма recovery: restore Mongo from export → recompute H → сверить/выставить checkpoint → снять emergency. Не Q6.

[Верстальщик]: С витрины оператора/аудитора статусы обязаны читаться без легенды. Не один бейдж «ok/fail». Нужен закрытый алфавит: converged, count_mismatch, hash_mismatch, canonicalization_error, missing_checkpoint, office_unavailable, office_corrupt, emergency_repo_sot, restore_in_progress, restore_complete, audit_blocked. Фальшивый зелёный при mismatch — декор без несущей. UI продукта не рисуем; требую имена статусов в вердикте.

[Teamlead]: Принял алфавит статусов как планку reportable. Дальше — что именно входит в audit checks. Не «посмотреть глазами», а машинные предикаты. Математик — перечень; Структурщик — home каждого check.

[Музыкант]: На тракте audit слышу три прохода meters: (1) checkpoint на месте и парсится; (2) count; (3) contentHash после того же canonicalize, что notary/exporter. Sanity samples — room tone, не proof. Если Mongo недоступен — audit не врёт «converged», он честно `office_unavailable` / `audit_blocked`.

[Математик]: Audit checks (закрытый список):
1. `checkpoint_present` — артефакт `ColdArchiveCheckpoint` читаем после commit.
2. `schema_valid` — обязательные поля checkpoint (вкл. `recordCount`, `contentHash`).
3. `mongo_reachable` — SoT доступен.
4. `recompute_count`: \(n \stackrel{?}{=} n_C\).
5. `recompute_hash`: \(H(R) \stackrel{?}{=} H_C\) при той же canonicalization, что M3.
6. `idempotency_surface` (опц. deep): нет дубликатов ключа `(recordType=task_closure, taskId)` в выборке SoT.
Fail любого → не `converged`. Samples ∉ proof.

[Структурщик]: Homes: checkpoint — repo path carrier (M3); SoT — `background-office` Mongo append-only (M1); canonicalize/hash — чистая функция в контуре notary/exporter (M3/M4), один словарь, без второго хешера «для audit». Export writer и audit reader разделяют контракт identity; audit **не** пишет в Mongo и **не** коммитит repo. Словарь: **restore** ≠ **re-notarize** ≠ **migrate legacy**.

[Архитектор]: Export/backup requirements — достаточный материал: (a) full canonical records dump из Mongo в детерминированном порядке canonicalize; (b) identity manifest: `recordCount + contentHash` (+ алгоритм/версия canonicalization); (c) последний **committed** `ColdArchiveCheckpoint` в git после review; (d) proof остаётся **внутри** cold-record, отдельный «скрин proof» не backup. Недостаточно: local dirty export, sanity samples, hot-registry, markdown hints (M2). Repo не хранит весь архив — owner input; полный dump живёт вне git как backup media.

[Верстальщик]: На карточке recovery оператор видит: есть ли committed checkpoint, доступен ли office, последний известный `(count, hash)`, статус triage. Пустота backup — `backup_missing`, не прочерк. Не подменяю статусы «почти ok».

[Teamlead]: Mismatch triage — развести ветки. Hash mismatch при M4 partial **не** лицензия писать cold в repo или delete Mongo — это уже норма M4. Фиксируем дерево решений без healing-rewrite.

[Музыкант]: Слышу четыре фальстарта, которые люди делают под паникой: (1) подкрутить checkpoint hash под Mongo; (2) подкрутить/удалить Mongo record под checkpoint; (3) дописать «исправленный» task_closure с тем же taskId в обход idempotency; (4) объявить dirty JSONL каноном. Все четыре — overdub master-tape. Разрешённый recovery sound: replay export → Mongo, retry CheckpointExporter, re-audit.

[Математик]: Triage как тотальная функция по наблюдениям:
- `¬checkpoint_present` → `missing_checkpoint`: если Mongo ok — derive checkpoint from Mongo (M4 retry), commit/PR; не invent hash.
- `n_C ≠ n` → `count_mismatch`: diff идентификаторов ключей; Mongo wins в steady-state; repo не дописывает records.
- `n_C = n ∧ H_C ≠ H` → `hash_mismatch`: проверить canonicalization version/byte-identity; при расхождении канона — `canonicalization_error`; иначе расхождение payload — Mongo canonical, re-export.
- canonicalize throw → `canonicalization_error`: stop, no heal.
- Mongo unreachable/corrupt → ветка emergency (отдельно).
Никогда: `delete_mongo` / `rewrite_history` как triage action.

[Структурщик]: Лемма **mismatch ≠ mandate to write archive into repo**. Carrier обновляется только через CheckpointExporter from Mongo (M4). При count/hash mismatch permitted actions: diagnose; re-run export from SoT; open PR checkpoint; report status. Forbidden: ручной edit `contentHash`; force-push checkpoint «чтобы зелёный»; prune Mongo. Deep audit может **читать** set of keys для diff-отчёта — это report, не SoT mutation.

[Архитектор]: Emergency repo SoT boundary — узкая дверь. Условия входа (все): (1) office unavailable **или** integrity check говорит corrupt (не читается / внутренний invariant fail beyond mismatch with repo); (2) есть **достаточный** export/backup material (committed checkpoint + full dump с манифестом, согласованные между собой предпочтительно); (3) **явное объявление** recovery mode (человек/оператор), не автопереключение агента. В режиме: restore path **в** Mongo из export; repo/export — temporary authority for rebuild only. Выход: Mongo up → audit converged → revoke emergency → repo снова carrier. Local dirty tree **никогда** не emergency SoT (вход M5).

[Верстальщик]: Emergency на витрине — отдельный стойкий бейдж `emergency_repo_sot`, не тот же цвет что `converged`. Снятие бейджа только после `restore_complete` ∧ `converged`. Иначе фальшь «уже ок».

[Teamlead]: Forbidden healing — закрытый список в вердикт. Reportable statuses — алфавит Верстальщика + restore_*. Boundary deferred — Q6/Q7 явно. Держим темп.

[Музыкант]: Ещё раз на слух разрешённое: retry notarize только при отсутствии record и valid proof (M4), не «на всякий случай»; retry export/commit; restore Mongo from backup dump; recompute checkpoint from restored Mongo. Запрещённое: edit past records; delete on mismatch; re-hash in place; склеить legacy markdown в cold как proof (это уже Q6, здесь только запрет как healing).

[Математик]: Forbidden healing (предикаты действий):
`¬rewrite_record(r)`, `¬delete_record(r)` ради схождения, `¬mutate_proof`, `¬manual_set_contentHash`, `¬dedupe_by_drop` (drop дубликата переписывает историю — конфликт idempotency решается reject second write at write-path, не audit-delete), `¬promote_non_proof`.
Разрешённые: `export_from_mongo`, `commit_checkpoint`, `restore_mongo_from_export`, `declare/revoke_emergency`, `report(status)`.
Idempotency key остаётся `(task_closure, taskId)` — audit не чеканит второй record.

[Структурщик]: Словарь forbidden vs allowed кладём в одну словарную статью recovery policy, home — контур office+exporter docs/ADR следствия M5, не UI. Export requirements уточняю: backup media держит **full R**; git держит **C** (малый слепок). Восстановление office без full R **невозможно** честно — тогда status `backup_insufficient`, не silent partial rebuild из одних samples.

[Архитектор]: Если dump и checkpoint расходятся между собой (backup internal mismatch) — не угадывать. Приоритет при emergency rebuild: full dump с проверяемым манифестом; checkpoint — ожидаемый H после restore; если dump без манифеста — `backup_insufficient` / ручная эскалация, не авто-SoT. Git checkpoint alone without records dump **не** восстанавливает архив (owner: repo ≠ весь архив). Это цена hybrid SoT — фиксируем в requirements.

[Верстальщик]: Reportable statuses (полный закрытый список для вердикта):
`converged`,
`missing_checkpoint`,
`count_mismatch`,
`hash_mismatch`,
`canonicalization_error`,
`office_unavailable`,
`office_corrupt`,
`backup_missing`,
`backup_insufficient`,
`emergency_repo_sot`,
`restore_in_progress`,
`restore_complete`,
`audit_blocked`,
`partial_repo_lag` (Mongo ok, checkpoint stale/missing after M4 partial — честное имя лага carrier).
Нет статуса `healed_ok` без audit.

[Teamlead]: `partial_repo_lag` — хорошая честность M4. В triage: Mongo canonical → only retry export. Сводим таблицу. Архитектор — emergency one-liner; Математик — audit one-liner; Структурщик — deferred boundary.

[Музыкант]: Согласен с `partial_repo_lag` как отдельной нотой: это не corruption office, это «meters не догнали tape». Путать с `hash_mismatch` после кривого ручного edit — вредно; после ручного edit всё равно mismatch, но healing путь тот же: от Mongo, не от руки.

[Математик]: Уточнение identity audit: сравнение только после одного `canonicalize` byte-stable. Если в checkpoint промурована version канона и она ≠ runtime — `canonicalization_error`, не `hash_mismatch`. Инвариант: `converged ⇒ mongo_reachable ∧ checkpoint_present ∧ count∧hash`. `restore_complete` не имплицирует `converged` без повторного audit — два статуса.

[Структурщик]: Boundary deferred: **Q6** migration map legacy markdown/archive/registry; **Q7** insight lifecycle; exact CLI flags/implementation code; выбор vendor backup media; политика retention backup TTL (можно ops-след, не эта комната). В M5 не определяем, как legacy стать proof — только что non-proof не healing material.

[Архитектор]: Рекомендация формы: вердикт M5 = policy table. Emergency boundary = explicit recovery declaration + unavailable/corrupt office + sufficient committed export/dump; temporary authority only to rebuild Mongo; dual-SoT в steady-state запрещён. Затронутые модули по смыслу: background-office cold collection, CheckpointExporter, audit job/report — без кода здесь. ADR-след от M5, не от Q6.

[Верстальщик]: Принимаю таблицу. На отчёте audit одна строка = один status из алфавита + `(n, n_C, H_short, H_C_short)` tabular; reason-code не prose-only. Empty office с пустым checkpoint — отдельный edge: `converged` при n=0 только если обе стороны пусты и hash пустого канона совпал; иначе не рисовать ok.

[Teamlead]: Edge n=0 — да, честный `converged` только при взаимной пустоте и hash empty-canonical. Иначе missing/mismatch. Запрет «зелёный потому что нечего проверять» при missing checkpoint.

[Музыкант]: Пустая лента и отсутствующий bounce-файл — разные звуки: empty converged vs missing_checkpoint. Не мешать.

[Математик]: Предикат empty: `empty_converged ⇔ checkpoint_present ∧ n=0 ∧ n_C=0 ∧ H=H_C=H(∅)`. `missing_checkpoint ∧ mongo_empty` → status `missing_checkpoint` ( treаt: export empty checkpoint), не auto-converged.

[Структурщик]: Лемма зафиксирована. Export empty checkpoint — валидный carrier. Backup requirements для empty — манифест нулевой выборки всё равно нужен, если policy требует checkpoint after M3.

[Архитектор]: Да. Форма не требует «обязательно records», требует **согласованность** carrier и SoT. Emergency при пустом SoT бессмысленен — нечего restore; office_unavailable при известном ненулевом backup — классический emergency path.

[Верстальщик]: В алфавит не плодим `empty_ok`; это под-случай `converged`. Читается теми же meters count=0.

[Teamlead]: Сводка на стол. Audit checks — шесть предикатов Математика. Export — full R + manifest + committed C; dirty ≠ backup. Triage — дерево; Mongo wins steady-state. Emergency — явная дверь. Forbidden — rewrite/delete/manual hash/promote non-proof. Statuses — список Верстальщика. Deferred — Q6/Q7/CLI/TTL vendor. Кто не принимает — сейчас; иначе LGTM на вердикт.

[Музыкант]: Принимаю. Master-tape Mongo; meters repo; emergency — объявленный take заново, не тихий overdub.

[Математик]: Принимаю. `converged ⇔ count∧hash∧present∧reachable`; restore_complete ⇏ converged без re-audit.

[Структурщик]: Принимаю. Словарь разведён; deferred Q6/Q7 не смешан. Homes: SoT Mongo, carrier checkpoint, backup media full dump.

[Архитектор]: Принимаю. Граница emergency узкая; dual-SoT steady-state не вводим. Форма M5 закрывает Q4 порядка M0.

[Верстальщик]: Принимаю. Reportable алфавит без фальшивого зелёного; `partial_repo_lag` честен к M4.

[Teamlead]: LGTM. Матч M5 сыгран: таблица + список посылок. Код/CLI — вне комнаты. Q6/Q7 не открываем.

---

## Итоговое решение консилиума

| Поле | Решение |
| --- | --- |
| Audit checks | (1) `checkpoint_present` — committed `ColdArchiveCheckpoint` читаем; (2) `schema_valid` — есть `recordCount`, `contentHash` (+ версия canonicalize при наличии в контракте); (3) `mongo_reachable` — SoT доступен; (4) `recompute_count` — \(n = n_C\) по каноническим records Mongo; (5) `recompute_hash` — \(H(canonicalize(R)) = H_C\) тем же каноном, что M3/M4; (6) опц. deep: поверхность idempotency — нет скрытых дубликатов ключа `(recordType=task_closure, taskId)` (report only). Sanity samples ∉ checks/proof/SoT. `converged` только при present ∧ reachable ∧ count ∧ hash (вкл. честный empty: \(n=n_C=0\) ∧ \(H=H(∅)\)). Audit **не пишет** в Mongo и **не** коммитит repo. |
| Export / backup requirements | **Достаточно:** (a) full dump канонических records \(R\) в детерминированном порядке canonicalize; (b) identity manifest: `recordCount + contentHash` (+ id/версия алгоритма canonicalization); (c) последний **committed/reviewed** `ColdArchiveCheckpoint` в git; (d) `proof` — поле внутри cold-record, не отдельный «скрин». **Недостаточно / не backup:** local dirty export, sanity samples, hints/notes/branch/chat/screenshot/hot-registry/repo JSONL как proof (M2), один только checkpoint без full \(R\) (repo — малый слепок, не весь архив). Full \(R\) хранится в backup media вне git; git — carrier \(C\). Dump↔manifest internal mismatch → не угадывать; `backup_insufficient` при отсутствии проверяемого full dump. |
| Mismatch triage | Steady-state: **Mongo canonical**. `missing_checkpoint` (+ Mongo ok) → derive checkpoint from Mongo, commit/PR (M4 retry), не invent hash. `count_mismatch` → diff ключей/отчёт; re-export from Mongo; не дописывать records в repo как SoT. `hash_mismatch` при равном count → проверить version/byte-canonicalization; при fail канона → `canonicalization_error` (stop); иначе payload drift → Mongo wins, re-export checkpoint. `canonicalization_error` → stop, no heal. `partial_repo_lag` (Mongo ok, carrier stale/absent after partial M4) → только retry export/commit, no delete. Mismatch **не** лицензия: write full cold archive into repo, delete/rewrite Mongo, manual `contentHash`. Office path → см. emergency. |
| Emergency repo SoT boundary | Вход **только при всех:** (1) office `unavailable` **или** `corrupt` (не читается / integrity fail beyond ordinary mismatch); (2) достаточный material: full dump + manifest, предпочтительно согласованный с committed checkpoint; (3) **явное объявление** recovery mode оператором (не авто агента). В режиме: repo/export — **временный** authority **только** для rebuild Mongo; не steady-state dual-SoT. Выход: Mongo restored → `audit` → `converged` → revoke emergency → repo снова carrier. **Никогда** emergency SoT: dirty working tree, samples, non-proof hints. Checkpoint alone without dump **не** восстанавливает архив. |
| Forbidden healing | Rewrite/edit past cold-records; delete records ради схождения; mutate `proof`; ручной `contentHash`/`recordCount` в checkpoint «под зелёный»; force-push «healing» checkpoint; drop-дубликатов в SoT как audit-heal (idempotency — reject на write-path, не delete в audit); promote non-proof (markdown/registry/JSONL/hints) в canonical; re-notarize overwrite того же `(task_closure, taskId)` в обход idempotency. **Разрешено без rewrite history:** export_from_mongo; commit/PR checkpoint; restore_mongo_from_export; declare/revoke emergency; report(status); retry notarize **только** если record отсутствует и valid proof (M4). |
| Reportable statuses | Закрытый алфавит: `converged` · `missing_checkpoint` · `count_mismatch` · `hash_mismatch` · `canonicalization_error` · `office_unavailable` · `office_corrupt` · `backup_missing` · `backup_insufficient` · `emergency_repo_sot` · `restore_in_progress` · `restore_complete` · `audit_blocked` · `partial_repo_lag`. Инвариант: `restore_complete` ⇏ `converged` без повторного audit; нет `healed_ok` в обход audit; empty ok только как под-случай `converged`, не отдельный «зелёный за пустоту» при `missing_checkpoint`. |
| Boundary deferred to later rooms | **Q6** migration map legacy markdown/archive/registry (по существу не решать). **Q7** insight lifecycle (по существу не решать). Exact implementation/CLI flags; vendor/TTL retention backup media; UI layout audit-экрана. |

**Definition of Done (если применимо):** policy M5 зафиксирована протоколом; реализация audit job / export restore path / status enum — отдельные задачи вне этой комнаты; не открывать Q6/Q7 этим вердиктом.

---

## Список посылок

1. **норма (M0):** порядок вопросов `Q1 → Q3 → Q2 → Q5 → Q4 → Q6 → Q7`; M5 = Q4 Recovery and audit.
2. **норма (M1):** hybrid SoT; canonical records — `background-office` MongoDB append-only; repo — checkpoint/export carrier, не steady-state SoT; repo emergency SoT только при явно объявленном recovery.
3. **норма (M2):** cold-record `task_closure` с required fields и `proof`; hints/notes/branch/chat/screenshot/hot-registry/repo JSONL — not proof; archive evidence не доказывает insight L/O.
4. **норма (M3):** артефакт `ColdArchiveCheckpoint`; identity = recompute H over canonical Mongo records и compare `recordCount + contentHash`; sanity samples ≠ records/proof/SoT.
5. **норма (M4):** writers ArchiveNotary, CheckpointExporter, RepoAgent/Human, Close initiator; sequence valid proof → notarize → derive checkpoint from Mongo → repo commit/PR; idempotency key `(recordType=task_closure, taskId)`; partial Mongo ok + repo fail → Mongo canonical, retry export/commit, no delete.
6. **норма (M4/M5 вход):** hash mismatch не лицензия писать cold archive в repo или delete Mongo records.
7. **норма (вход M5):** git artifacts durable only after commit/review; local dirty export is not recovery.
8. **факт (слово владельца / вход):** repo содержит небольшой проверяемый слепок, не весь архив.
9. **норма (граница комнаты):** не решать Q6 migration legacy archive и Q7 insight lifecycle по существу; не фиксировать exact CLI/code.
10. **норма (решение M5):** audit = read-only сверка carrier↔SoT теми же canonicalize/hash, что write path.
11. **норма (решение M5):** достаточный restore material = full canonical dump \(R\) + identity manifest + committed checkpoint; full \(R\) вне git.
12. **норма (решение M5):** steady-state при mismatch — Mongo wins; permitted = diagnose, re-export, report; emergency — узкая дверь (unavailable/corrupt + sufficient backup + explicit declaration).
13. **норма (решение M5):** forbidden healing = любые действия, переписывающие append-only историю или подменяющие identity/proof вручную.
14. **норма (решение M5):** закрытый алфавит reportable statuses (таблица выше); `restore_complete` требует повторного audit для `converged`.

---

*Реплик в диалоге: 43; каждый участник высказался не менее одного раза.*

---

## Полное эхо вопроса

Вопрос P6: Как проверять, восстанавливать и разбирать расхождения cold archive после M1 hybrid SoT, M2 evidence contract, M3 ColdArchiveCheckpoint и M4 write path: какие audit checks делают checkpoint и Mongo SoT сходящимися, какой export/backup достаточно иметь, что делать при hash mismatch, missing checkpoint, повреждённом или недоступном office, и какие recovery действия разрешены без переписывания append-only истории? Вердикт обязан назвать audit checks, export/backup requirements, mismatch triage, emergency repo SoT boundary, forbidden healing, reportable statuses и не решать Q6 migration legacy archive и Q7 insight lifecycle по существу.

---

## Полное эхо повестки

# M5 — Recovery and audit для `task-archive-cold-store`

**P6 —** Как проверять, восстанавливать и разбирать расхождения cold archive после
закрытых M1/M2/M3/M4: какие проверки делают `ColdArchiveCheckpoint` и Mongo SoT
сходящимися, какой export/backup достаточно иметь, что делать при hash mismatch,
missing checkpoint, повреждённом/недоступном office, и какие recovery действия
разрешены без переписывания append-only истории? Вердикт обязан назвать audit checks,
restore/export requirements, mismatch triage, emergency repo SoT boundary, forbidden
healing, и полный список посылок. **Не решать Q6 migration legacy archive и Q7 insight
lifecycle по существу.**

Общее задание — [`BRIEF.md`](BRIEF.md).

## Уже закрыто

M0 порядок:

```text
Q1 -> Q3 -> Q2 -> Q5 -> Q4 -> Q6 -> Q7
```

M1 Source of truth:

- hybrid SoT;
- canonical records: `background-office` MongoDB append-only collection;
- repo: checkpoint/export carrier, не steady-state SoT;
- repo emergency SoT возможен только при явно объявленном recovery.

M2 Evidence contract:

- cold-record `task_closure` содержит required fields и `proof`;
- hints/notes/branch/chat/screenshot/hot-registry/repo JSONL are not proof;
- archive evidence не доказывает insight L/O.

M3 Repo checkpoint:

- artifact: `ColdArchiveCheckpoint`;
- identity: recompute H over canonical records from Mongo SoT and compare
  `recordCount + contentHash`;
- sanity samples are not records/proof/SoT.

M4 Write path:

- writers: ArchiveNotary, CheckpointExporter, RepoAgent/Human, Close initiator;
- normal sequence: valid proof → notarize → derive checkpoint from Mongo → repo commit/PR;
- idempotency key: `(recordType=task_closure, taskId)`;
- partial: Mongo ok + repo fail leaves Mongo canonical; retry export/commit, no delete.

M5 corresponds to Q4 from M0: **Recovery and audit**.

## Границы вопроса

Нужно решить только:

- какие audit checks доказывают, что repo checkpoint соответствует Mongo SoT;
- что является достаточным export/backup material для восстановления;
- что делать при mismatch count/hash/canonicalization;
- где проходит emergency boundary, когда repo/export может временно стать источником;
- какие healing actions запрещены, потому что переписывают append-only историю;
- какие статусы audit/recovery должны быть reportable.

Не решать здесь:

- migration map legacy markdown/archive/registry;
- insight lifecycle status;
- exact implementation code / CLI flags.

## Входы

- Владелец: repo содержит небольшой проверяемый слепок, не весь архив.
- M1/M2/M3/M4 verdicts above.
- M4 partial failure: hash mismatch is not license to write cold archive to repo or delete
  Mongo records.
- Git artifacts are durable only after commit/review; local dirty export is not recovery.

## Требуемая форма вердикта

Таблица:

| Поле | Решение |
| --- | --- |
| Audit checks | ... |
| Export / backup requirements | ... |
| Mismatch triage | ... |
| Emergency repo SoT boundary | ... |
| Forbidden healing | ... |
| Reportable statuses | ... |
| Boundary deferred to later rooms | ... |

После таблицы — обязательная секция **Список посылок**.
