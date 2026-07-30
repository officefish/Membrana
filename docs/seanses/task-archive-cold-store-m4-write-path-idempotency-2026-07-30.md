<!-- канал: llm — протокол произведён yarn consilium -->

# Метаданные сеанса

| Поле | Значение |
|------|----------|
| Дата (UTC) | 2026-07-30T14:35:20.468Z |
| Команда | `yarn consilium` |
| Модель | xai/grok-4.5 |
| Файл | `docs/seanses/task-archive-cold-store-m4-write-path-idempotency-2026-07-30.md` |
| Порядок ролей | Структурщик → Музыкант → Верстальщик → Архитектор → Teamlead → Математик |
| Повестка | `docs/meeting/task-archive-cold-store/M4_AGENDA.md` |

**Вход сеанса** (что комната действительно получила):

| Вход | Носитель | Размер | Отпечаток | Доставка |
|------|----------|-------:|-----------|----------|
| повестка (эхо в голове) | `docs/meeting/task-archive-cold-store/M4_AGENDA.md` | 3018 | `b8c0bbefa40e` | полностью |
| инструкция консилиума | `docs/prompts/CONSILIUM_PROMPT.md` | 4494 | `b6bd1a8dc127` | полностью |
| координация ролей | `docs/VIRTUAL_TEAM_PROMPT.md` | 8034 | `75959c7f060d` | **обрезан** |
| контекст: Архитектура | `docs/ARCHITECTURE.md` | 6034 | `33f0886d9bac` | **обрезан** |
| контекст: Дизайн | `docs/DESIGN.md` | 5998 | `c0c614192971` | полностью |
| контекст: Сервисы | `docs/SERVICES.md` | 6034 | `cf5d799f7980` | **обрезан** |
| архив RAG | — | 105 | `4190ddf6c311` | полностью |
| повестка | `docs/meeting/task-archive-cold-store/M4_AGENDA.md` | 3018 · 1 п. | `b8c0bbefa40e` | полностью |

> ⚠ Часть входа не доехала до комнаты целиком. Утверждения протокола о своём входе
> сверять с этой таблицей, а не с текстом реплик.

**Вопрос:**

Вопрос P5: Кто и когда пишет канонический cold-record и repo checkpoint при закрытии задачи после M1 hybrid SoT, M2 evidence contract и M3 ColdArchiveCheckpoint, как защищаемся от дублей, частичной записи, повторного запроса и расхождения локального git SHA с server-side record? Вердикт обязан назвать writer roles, normal write sequence, idempotency key, partial failure policy, retry semantics, Git SHA consistency, forbidden interpretation и не решать Q4 recovery/restore, Q6 migration legacy archive, Q7 insight lifecycle по существу.

---

# Консилиум: M4 write path и idempotency cold-archive

**Повестка:** P5 / M4 — кто и когда пишет канонический cold-record и repo checkpoint при закрытии задачи после M1 hybrid SoT, M2 evidence contract и M3 ColdArchiveCheckpoint; защита от дублей, частичной записи, повторного запроса и расхождения локального git SHA с server-side record. Не решать Q4 recovery/restore, Q6 migration legacy, Q7 insight lifecycle по существу.

**Участники:** Teamlead (Tarasov), Архитектор (Vesnin), Структурщик (Ozhegov), Математик (Dynin), Музыкант (Kuryokhin), Верстальщик (Rodchenko).

**Порядок реплик:** Структурщик → Музыкант → Верстальщик → Архитектор → Teamlead → Математик

---

[Структурщик]: Леммы, иначе снова синонимы. **Cold-record writer** — единственный server-side путь в `background-office`, пишущий append-only Mongo-коллекцию канона (M1). **Checkpoint writer** — путь, который *только читает* Mongo SoT и материализует `ColdArchiveCheckpoint` (M3); он не invent’ит записи. **Repo committer** — носитель export/PR, не SoT. **Idempotency key** — словарный ключ дедупа на insert, не «память оператора». Без разведения этих трёх ролей write-path снова смешает homes.

[Музыкант]: На слух это три шины, не один fader «архив». Сначала master-tape на сервере (cold-record), потом meter по Mongo (checkpoint hash/count), потом send в repo — и только как bounce экспорта. Если сначала шлёпаем JSON в git, а Mongo потом — клиппинг: локальный take громче канона. Evening batch и `task:archive` обязаны идти evidence-driven по M2, не «на память» с пюпитра.

[Верстальщик]: С витрины оператора/агента статус закрытия обязан читаться без легенды: `accepted | duplicate | rejected_proof | retryable | blocked`. Фальшь: зелёный «в архиве», пока Mongo не подтвердил record id. Uncommitted checkpoint в рабочей копии — не бейдж «durable»; максимум `local_dirty`, иначе декор вместо истины. Layout продукта не рисуем — только честные метки исхода write-path.

[Архитектор]: Конструкция из M1–M3: SoT — Mongo append-only; repo — checkpoint carrier. Форма write-path: **close с proof → notarize cold-record на сервере → derive checkpoint from SoT → repo commit/PR**. Обратный порядок запрещён конструкцией. Writer cold-record — только privileged archive command/service office; клиент/агент локально Mongo не пишет. Checkpoint не второй SoT и не «ещё одна запись task_closure». Цена альтернативы dual-write в repo JSONL+Mongo — два home, уже отвергнуто M1.

[Teamlead]: Планка матча узкая: writer roles, sequence, idempotency key, partial failure, retry, Git SHA consistency, forbidden, boundary. Не лезем в Q4/Q6/Q7. Связка: Структурщик — леммы homes; Архитектор — порядок notarize; Математик — ключ и предикаты BLOCK vs retry; Музыкант — evidence-driven close; Верстальщик — честные статусы. «Почти записали в git» — не матч. Держим состав.

[Математик]: Формализую без UI. Пусть R — payload cold-record (M2), k — idempotency key. Операция `notarize(k, R) → {created(R*), existing(R*), reject(reason)}`. Инвариант append-only: повтор с тем же k и эквивалентным R даёт `existing`, не второй документ. Эквивалентность: canonical bytes R совпадают (или сервер хранит hash тела под k). Разный R при том же k → `reject(conflict)` = BLOCK, не silent overwrite. Checkpoint: `H = hash(canon(records from Mongo))`; repo файл не входит в H как источник.

[Структурщик]: Idempotency key фиксирую словарно: для `recordType=task_closure` ключ = `(recordType, taskId)`. Один task — один канонический closure-record в SoT. Не `closedAt`, не actor, не commitSha: иначе retry по сети плодит «разные» ключи. Epic_id и snapshot — поля тела, не ключ. Уникальный индекс Mongo на этой паре — home дедупа, не «проверка потом скриптом».

[Музыкант]: Retry на слух — это тот же take с тем же cue, не новый дубль в архиве. Если сервер сказал `existing` с тем же contentHash тела — партия уже на ленте, играем дальше checkpoint. Если proof не сходится M2 — не «ещё раз громче», а stop: нет evidence — нет archive. Hot-registry и chat в proof-тракт не пускаем — M2 уже вырезал этот шум.

[Верстальщик]: Для partial failure витрина не должна склеивать шаги. Четыре честных полосы: (1) record notarized, (2) checkpoint derived, (3) repo committed, (4) PR/review если требуется процессом. «1 ок, 3 упал» ≠ откат Mongo «для красоты симметрии». Пустота checkpoint в repo при живом Mongo — `export_pending`, не `not_archived`.

[Архитектор]: Partial failure policy по границам: Mongo fail → record нет → checkpoint/repo **не** пишем от локальной фантазии. Mongo ok, derive checkpoint fail → retry только derive/export; record не пересоздаём. Checkpoint bytes ok локально, git commit/PR fail → SoT уже Mongo; repo — догнать export’ом, **без** нового notarize и без подмены SHA в уже записанном record. Запрет: «компенсирующая» delete из append-only ради симметрии — это уже Q4, здесь только stop/retry policy.

[Teamlead]: BLOCK vs retryable — коротко. BLOCK: нет/битый proof M2; writer не authorized; conflict idempotency (тот же taskId, другое тело); попытка писать repo как SoT; подстановка локального dirty SHA в канон. Retryable: сеть/5xx/timeout на notarize; concurrent first-write (проиграть unique → read existing); checkpoint recompute I/O; git push/CI flake. Нет LGTM пути «запишем JSONL в repo и потом как-нибудь Mongo».

[Математик]: Normal sequence как предикатная цепочка. P0: `proofValid(R) ∧ status=closed`. P1: `notarize(k,R) ∈ {created, existing_equiv}`. P2: `checkpoint = derive(Mongo)` ∧ `recordCount/hash` согласованы с SoT (M3 identity). P3: `repo_commit(checkpoint)` опционален для *каноничности record*, обязателен для *носителя export в git*, но P3 ⇏ усиливает SoT. Инвариант: ¬P1 ⇒ ¬P2_authoritative_from_local; локальный файл до P1 не существует как truth.

[Структурщик]: Writers — закрытый словарь. (1) **ArchiveNotary** (`background-office`): единственный create/idempotent-put cold-record. (2) **CheckpointExporter**: read-only к Mongo + write артефакта manifest (server job или controlled CLI, тот же канон hash). (3) **RepoAgent/Human**: commit/PR manifest после успешного derive. (4) **Close initiator** (task:archive / evening batch / agent): собирает R и proof, вызывает notary API; сам в коллекцию не лезет. Прямой mongo insert из workstation — `нарушена слабая связанность` home.

[Музыкант]: Evening batch слышу как scheduled pass по evidence, не как DJ «закрываем всё, что в чате мелькало». Если take уже notarized — batch делает no-op/`existing`, не второй drop. Если proof тонкий — skip/BLOCK в отчёте batch, не дописывание hints в proof. Иначе ночной прогон станет генератором фантомных closure.

[Верстальщик]: Git SHA consistency с витрины: в cold-record `proof.commitSha` — это SHA **работы задачи** (PR/commit already on remote), не SHA будущего commit checkpoint. Путать их — фальшивый монтаж. Checkpoint manifest не обязан тащить «ожидаемый» commit себя; identity — contentHash записей Mongo (M3). Бейдж «SHA совпал» для export — сравнение recompute H с server, не trust local git show.

[Архитектор]: Согласен с разведением SHA. В record не пишем `checkpointCommitSha` как условие канона — иначе циклическая зависимость record↔repo. Если позже понадобится связь export→commit, это metadata носителя или отдельное поле post-factum вне M4 identity; не блокируем notarize ожиданием PR checkpoint. Форма: **server record первичен и самодостаточен (M2 snapshot+proof)**; git — зеркало агрегата.

[Teamlead]: Запретные интерпретации фиксирую как красные. Нельзя: uncommitted file = durable archive; JSONL/markdown в repo = steady-state SoT; повтор close = вторая запись; «починим partial тем, что удалим из Mongo»; agent local git sha вписать в proof «чтобы сшлось»; checkpoint sanity sample как record. Нарушение — BLOCK без романтики. Q4 как чинить mismatch после факта — не эта комната.

[Математик]: Retry semantics. Notarize: at-least-once safe благодаря k; клиент повторяет тот же k и те же canonical bytes. Jitter/backoff на retryable transport. После `existing_equiv` — идемпотентный успех, переходим к derive. После `conflict` — stop, ручной разбор вне auto-retry (не Q4 procedure, только класс исхода). Derive checkpoint: чистая функция от Mongo snapshot; повторяема; гонки export решаются last-derive-wins на *файле носителя*, SoT не меняется. Repo: rerere commit того же contentHash; не менять record.

[Структурщик]: Normal write sequence процедурой, без кода: (1) Close initiator проверяет lifecycle+собирает taskSnapshot+proof. (2) POST/command в ArchiveNotary с Idempotency-Key/k. (3) Notary валидирует M2, пишет или возвращает existing. (4) Ответ notary = единственный ack «record в SoT». (5) CheckpointExporter пересчитывает manifest из Mongo (весь archiveHome scope как в M3). (6) RepoAgent коммитит/PR только bytes из шага 5. (7) Review носителя — процесс git, не нотаризация record. Шаг 6/7 падение не откатывает 3.

[Музыкант]: Расхождение local git SHA vs server: если агент посчитал hash по грязной копии или не тому canonicalization — meter красный, в ленту record это не пишем. Сверка всегда: выгрузить/опереться на server SoT → H; repo файл — лишь сравнить. Локальный `git rev-parse` не участвует в notarize. Иначе снова «на слух сошлось» вместо evidence.

[Верстальщик]: Forbidden interpretation для UI/отчётов: «задача в архиве» = только наличие канонического record в Mongo (или явный ack notary), не наличие строки в PR и не local path. Evening report: `notarized` отдельно от `checkpoint_exported`. Иначе капитан видит один зелёный там, где два разных слоя.

[Архитектор]: Boundary deferred — явно. Q4: recovery/restore after mismatch, rebuild, who heals. Q6: migration legacy markdown/registry. Q7: insight lifecycle. Exact Nest handlers/indexes code — implementation later. Здесь только procedural contract write/idempotency. Рекомендация формы: таблица вердикта как в повестке; ADR не обязателен, если M1–M3 уже ADR-класс — M4 = operational companion.

[Teamlead]: Сводим. Writers: Notary / Exporter / Repo committer / Initiator — как у Структурщика. Sequence: proof→notarize→derive→repo. Key: `(task_closure, taskId)`. Partial: never checkpoint-as-truth before notarize; no delete-compensate. Retry: transport+derive+git; BLOCK conflict/proof/auth. Git SHA: proof sha = task work remote; checkpoint identity = Mongo hash; local dirty ≠ truth. Математик — добей предикат equiv; все — к «Принимаю».

[Математик]: `equiv(R,R*)` ⇔ canonicalization(M3-совместимая) даёт тот же digest тела под полями канона M2; сервер при created сохраняет digest. `existing_equiv` ⇔ k найден ∧ digests equal. `conflict` ⇔ k найден ∧ digests ≠. Политика partial: состояние системы после fail классифицируем `(record∈{0,1}, export∈{0,1,dirty})`; допустимые retry-цели — функции только от этого, без Q4 heal. Для M4 достаточно: (0,_) → retry notarize; (1,0|dirty) → retry derive/commit; (1,1) → done. Принимаю формализацию.

[Структурщик]: Принимаю. Homes не смешиваем: Mongo create path один; export path один; git не SoT. Ключ без closedAt — подтверждаю, иначе evening retry после clock skew плодит конфликты.

[Музыкант]: Принимаю. Evidence first, master-tape server, repo — bounce. Дубли take глушим ключом, не громкостью.

[Верстальщик]: Принимаю. Статусы шагов раздельные; uncommitted не красится в «архив».

[Архитектор]: Принимаю. Конструкция write-path согласована с hybrid SoT M1 и checkpoint M3; цикл SHA record↔checkpoint не вводим.

[Teamlead]: Вердикт комнаты — таблица ниже. LGTM на форму M4. DoD — фиксация вердикта, без кода и без колонизации Q4/Q6/Q7. Матч — проверяемый procedure contract, не «потом в PR разберёмся».

[Математик]: Принимаю итог. Дополнять Q4 алгоритмом restore здесь не буду — область определения другая.

[Структурщик]: Второе касание: forbidden list должен явно бить «hot-registry/repo JSONL as proof or SoT» — это уже M1/M2, но write-path агенты любят обойти. Вносим в Forbidden interpretation.

[Музыкант]: И «chat/screenshot как notarize trigger» — тот же шум. Initiator без M2 proof не вызывает notary. Да.

[Teamlead]: Внесено. Закрываем обсуждение, секретарь — таблица и Список посылок. Без soft «зависит».

[Верстальщик]: Ещё раз: partial success на витрине batch = построчно taskId→код исхода, не один aggregate green. Это следствие policy, не UI-проект. Принимаю окончательно.

[Архитектор]: Нормальная последовательность — notarize-before-export как несущая балка; всё остальное — equip. Принимаю окончательно.

[Математик]: Идемпотентность at-least-once + conflict-on-divergence — полный каркас против дублей и partial. Принимаю окончательно.

---

## Итоговое решение консилиума

| Поле | Решение |
| --- | --- |
| Writers | **ArchiveNotary** (`background-office`, единственный create/idempotent-put канонического cold-record в Mongo append-only). **CheckpointExporter** (read Mongo SoT → materialize `ColdArchiveCheckpoint`; не создаёт task_closure-записи). **RepoAgent/Human** (commit/PR манифеста-носителя после derive). **Close initiator** (`task:archive` / evidence-driven evening batch / agent): собирает snapshot+proof и вызывает Notary API; прямой write в Mongo/коллекцию с workstation запрещён. |
| Normal write sequence | (1) Close + валидный M2 `proof` и `status=closed` + self-contained `taskSnapshot`. (2) Notarize cold-record на сервере с idempotency key. (3) Ack Notary = record в SoT (`created` \| `existing_equiv`). (4) Derive/update `ColdArchiveCheckpoint` пересчётом count/hash из Mongo (M3 identity). (5) Commit/PR checkpoint bytes в repo. (6) Review git-носителя по процессу repo — не часть канона record. Порядок **только** forward: запрещено repo/checkpoint-first, запрещено считать шаг 5/6 условием существования record. |
| Idempotency key | Для `recordType=task_closure`: **`(recordType, taskId)`**. Тело не входит в ключ. Unique/dedup home на Notary/Mongo. Повтор с тем же ключом и тем же canonical digest тела → `existing_equiv` (успех). Тот же ключ, другой digest → `conflict` (BLOCK). Не использовать `closedAt` / actor / commitSha / epic_id как ключ. |
| Partial failure policy | Mongo/notarize fail → record отсутствует → **не** публиковать authoritative checkpoint из локальной фантазии и **не** commit «как будто SoT». Notarize ok, derive/export fail → record **оставить**; retry только export/derive. Export bytes ok, git/PR fail → SoT = Mongo; retry commit тех же checkpoint bytes; **не** повторный notarize; **не** delete/compensate append-only «для симметрии» (heal — вне M4). Класс состояний `(record∈{0,1}, export∈{0,1,dirty})`: (0,_) → цель notarize; (1,0\|dirty) → цель derive/commit; (1,1) → done. |
| Retry semantics | At-least-once на notarize: клиент шлёт тот же key + те же canonical bytes. Retryable: transport/5xx/timeout, concurrent first-write (unique → read existing), derive I/O, git/CI flake. Non-retryable auto: invalid/missing proof (M2), unauthorized writer, `conflict` idempotency, попытка non-notary write path. После `existing_equiv` — не создавать вторую запись; продолжать derive при необходимости. Evening batch: no-op на уже notarized; skip/BLOCK без proof, не «дописать hints». |
| Git SHA consistency | `proof.commitSha` / PR refs — SHA **уже существующей remote-работы задачи**, не SHA будущего commit checkpoint и не dirty local tree. Identity checkpoint = `contentHash`/count по Mongo (M3), не `git rev-parse` локали. В cold-record **не** требуется `checkpointCommitSha` как условие канона (нет цикла record↔repo). Uncommitted/local file **никогда** не durable truth и не основание ack «в архиве». Сверка export: recompute H from server SoT ↔ bytes носителя. |
| Forbidden interpretation | Uncommitted repo path = SoT/archive; repo JSONL/markdown/hot-registry = steady-state SoT или proof; второй cold-record на тот же taskId «на всякий»; silent overwrite тела при том же key; компенсирующее удаление из append-only в M4; вписывание локального/прогнозного git SHA в proof/record «чтобы сошлось»; checkpoint/sanity sample как record; chat/screenshot/notes/branch как основание notarize; aggregate green batch при partial по taskId; client dual-write Mongo+repo как два home. |
| Boundary deferred to later rooms | **Q4** recovery/restore after mismatch, rebuild, who heals SoT/export. **Q6** migration legacy archive/registry/markdown. **Q7** insight lifecycle. Exact implementation (handlers, index DDL, CLI flags) — после вердикта, не в этой комнате. |

**Definition of Done (M4 only):**

- Вердикт M4 зафиксирован в протоколе с таблицей полей Writers…Boundary и секцией **Список посылок**.
- Write-path описан процедурой notarize→derive→repo без требования кода в этом сеансе.
- Явный запрет колонизации Q4/Q6/Q7 в DoD/решении.
- Любая последующая реализация archive write обязана: единственный Notary home, key `(task_closure, taskId)`, partial policy без delete-compensate, раздельные статусы record vs export.

---

## Список посылок

- **M0 order Q1→Q3→Q2→Q5→Q4→Q6→Q7; M4 = Q5 write path** — факт (повестка M4 / M0).
- **M1 hybrid SoT: canonical records = background-office MongoDB append-only; repo = checkpoint/export carrier, not steady-state SoT** — норма (вердикт M1).
- **M2 required cold-record fields + proof disjunction; hints/notes/branch/chat/screenshot/hot-registry/repo JSONL are not proof** — норма (вердикт M2).
- **M3 artifact `ColdArchiveCheckpoint`; identity = recompute hash/count over Mongo canonical records; sanity samples ≠ records/SoT** — норма (вердикт M3).
- **Owner intent: cold archive server-side, repo small checkpoint** — норма (вход M4 / BRIEF).
- **Existing lifecycle `task:archive` and evening batch must remain evidence-driven, not “на память”** — норма (вход M4).
- **Git/reporting: repo artifacts must be committed/reviewed; uncommitted local files are not durable truth** — норма (вход M4).
- **Граница комнаты: не решать Q4 recovery/restore, Q6 legacy migration, Q7 insight lifecycle по существу; не писать exact implementation code** — норма (повестка M4).

---

*Реплик в диалоге: 36; каждый участник высказался не менее одного раза.*

---

## Полное эхо вопроса

Вопрос P5: Кто и когда пишет канонический cold-record и repo checkpoint при закрытии задачи после M1 hybrid SoT, M2 evidence contract и M3 ColdArchiveCheckpoint, как защищаемся от дублей, частичной записи, повторного запроса и расхождения локального git SHA с server-side record? Вердикт обязан назвать writer roles, normal write sequence, idempotency key, partial failure policy, retry semantics, Git SHA consistency, forbidden interpretation и не решать Q4 recovery/restore, Q6 migration legacy archive, Q7 insight lifecycle по существу.

---

## Полное эхо повестки

# M4 — Write path and idempotency для `task-archive-cold-store`

**P5 —** Кто и когда пишет канонический cold-record и repo checkpoint при закрытии задачи
после M1/M2/M3, как защищаемся от дублей, частичной записи, повторного запроса и
расхождения локального git SHA с server-side record? Вердикт обязан назвать writer roles,
последовательность write/notarize на уровне процедуры, idempotency key, partial failure
policy, retry semantics, и полный список посылок. **Не решать Q4 recovery/restore
procedure, Q6 migration legacy archive и Q7 insight lifecycle по существу.**

Общее задание — [`BRIEF.md`](BRIEF.md).

## Уже закрыто

M0 порядок:

```text
Q1 -> Q3 -> Q2 -> Q5 -> Q4 -> Q6 -> Q7
```

M1 Source of truth:

- hybrid SoT;
- canonical records: `background-office` MongoDB append-only collection;
- repo: checkpoint/export carrier, не steady-state SoT.

M2 Evidence contract:

- required cold-record: `schemaVersion`, `recordType=task_closure`, `taskId`, `epic_id`,
  `closedAt`, `status=closed`, self-contained `taskSnapshot`, `actor`, `proof`;
- `proof` must satisfy
  `(prRef && commitSha) || (commitSha && reviewRef) || (issueRef terminal && reviewRef)`;
- hints/notes/branch/chat/screenshot/hot-registry/repo JSONL are not proof.

M3 Repo checkpoint:

- artifact: versioned JSON manifest `ColdArchiveCheckpoint`;
- required: checkpoint `schemaVersion`, `archiveHome`, `recordType=task_closure`,
  `recordCount`, `hashAlg=sha256`, `contentHash`, `canonicalization`, `closedAtMin`,
  `closedAtMax`, `checkpointAt`;
- identity: recompute H over canonical records from Mongo SoT and compare count/hash;
- sanity samples are not records/proof/SoT.

M4 corresponds to Q5 from M0: **Write path and idempotency**.

## Границы вопроса

Нужно решить только:

- кто имеет право создавать cold-record и checkpoint update;
- нормальный порядок шагов close → record → checkpoint → repo commit/PR or equivalent;
- idempotency key для archive write;
- что делать при duplicate/retry/partial server success/local repo failure;
- как не допустить расхождения локального git SHA с server-side record;
- какие состояния считаются BLOCK vs retryable.

Не решать здесь:

- restore/recovery procedure after mismatch;
- migration of old markdown/archive/registry;
- insight lifecycle status;
- exact implementation code.

## Входы

- Владелец: cold archive server-side, repo small checkpoint.
- M1/M2/M3 verdicts above.
- Existing task lifecycle: `task:archive` and evening batch must remain evidence-driven,
  not “на память”.
- Git/reporting грабля: repo artifacts must be committed/reviewed; uncommitted local
  files cannot be treated as durable truth.

## Требуемая форма вердикта

Таблица:

| Поле | Решение |
| --- | --- |
| Writers | ... |
| Normal write sequence | ... |
| Idempotency key | ... |
| Partial failure policy | ... |
| Retry semantics | ... |
| Git SHA consistency | ... |
| Forbidden interpretation | ... |
| Boundary deferred to later rooms | ... |

После таблицы — обязательная секция **Список посылок**.
