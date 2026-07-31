<!-- канал: llm — протокол произведён yarn consilium -->

# Метаданные сеанса

| Поле | Значение |
|------|----------|
| Дата (UTC) | 2026-07-30T14:28:51.290Z |
| Команда | `yarn consilium` |
| Модель | xai/grok-4.5 |
| Файл | `docs/seanses/task-archive-cold-store-m3-repo-checkpoint-2026-07-30.md` |
| Порядок ролей | Teamlead → Математик → Верстальщик → Архитектор → Структурщик → Музыкант |
| Повестка | `docs/meeting/task-archive-cold-store/M3_AGENDA.md` |

**Вход сеанса** (что комната действительно получила):

| Вход | Носитель | Размер | Отпечаток | Доставка |
|------|----------|-------:|-----------|----------|
| повестка (эхо в голове) | `docs/meeting/task-archive-cold-store/M3_AGENDA.md` | 2939 | `43f664b176ab` | полностью |
| инструкция консилиума | `docs/prompts/CONSILIUM_PROMPT.md` | 4494 | `b6bd1a8dc127` | полностью |
| координация ролей | `docs/VIRTUAL_TEAM_PROMPT.md` | 8034 | `75959c7f060d` | **обрезан** |
| контекст: Архитектура | `docs/ARCHITECTURE.md` | 6034 | `33f0886d9bac` | **обрезан** |
| контекст: Дизайн | `docs/DESIGN.md` | 5998 | `c0c614192971` | полностью |
| контекст: Сервисы | `docs/SERVICES.md` | 6034 | `cf5d799f7980` | **обрезан** |
| архив RAG | — | 105 | `4190ddf6c311` | полностью |
| повестка | `docs/meeting/task-archive-cold-store/M3_AGENDA.md` | 2939 · 1 п. | `43f664b176ab` | полностью |

> ⚠ Часть входа не доехала до комнаты целиком. Утверждения протокола о своём входе
> сверять с этой таблицей, а не с текстом реплик.

**Вопрос:**

Вопрос P4: Что именно остаётся в репозитории как проверяемый checkpoint/ledger/manifest для серверного cold archive после M1 hybrid SoT и M2 evidence contract: какие поля обязательны, как маленький repo-слепок доказывает тождество серверного архива без хранения всего cold archive в git, и какие элементы являются sanity-check, а не каноном records? Вердикт обязан назвать форму repo checkpoint, required fields, identity proof, sanity-check only, forbidden interpretation и не решать Q5 writer/idempotency/API, Q4 recovery/restore, Q6 migration, Q7 lifecycle по существу.

---

# Консилиум: M3 — Repo checkpoint для task-archive-cold-store (P4)

**Повестка:** P4 — что именно остаётся в репозитории как проверяемый checkpoint/ledger/manifest для серверного cold archive после M1 hybrid SoT и M2 evidence contract: форма артефакта, обязательные поля, proof тождества без хранения всего архива в git, sanity-check vs канон records; без Q5/Q4/Q6/Q7 по существу.

**Участники:** Teamlead (Tarasov), Математик (Dynin), Верстальщик (Rodchenko), Архитектор (Vesnin), Структурщик (Ozhegov), Музыкант (Kuryokhin).

**Порядок реплик:** Teamlead → Математик → Верстальщик → Архитектор → Структурщик → Музыкант

---

[Teamlead]: Планка M3 узкая. M1: Mongo office — канон, repo — carrier. M2: cold-record с `proof` уже закрыт. Сегодня только: что лежит в git как маленький слепок, какие поля, как доказать тождество серверного архива, что — sanity, что checkpoint **не** значит. Q5 writer, Q4 restore, Q6 migration, Q7 lifecycle — за дверью. Кто тянет write-path в эту комнату — BLOCK. Начинаем с формы, не с API.

[Математик]: Формализую. Пусть A — упорядоченное мультимножество канонических cold-records (M2). Нужна функция `H: Serialize(A) → digest`, и checkpoint C такой, что `verify(C, A) ⇔ H(A) = C.contentHash ∧ |A| = C.recordCount` (и согласованные границы эпохи, если есть). C ≪ A по размеру. C не содержит records; C содержит инвариант множества. Без канонической сериализации hash «совпал» — не доказательство.

[Верстальщик]: С витрины агента и капитана checkpoint обязан читаться без легенды: одна карточка-манифест, не простыня JSONL. Видны: версия схемы, сколько закрытий учтено, digest, момент слепка. Фальшь витрины: зелёный «архив в repo», когда в git только hash. Пустота честная: нет digest — нет «синхронизировано». Layout UI продукта не рисую; требую машинно-читаемые поля с человекочитаемыми именами.

[Архитектор]: Конструкция из M1: repo — checkpoint/export carrier, не SoT. Значит артефакт — **manifest одного epoch-среза**, не ledger транзакций writer и не копия collection. Один файл (или пара: manifest + опц. тонкий index ids) под фиксированным путём в docs/meeting или docs/tasks — уточнит Структурщик-словарь. Граница: manifest доказывает *тождество набора records против Mongo*, не *право записи* и не *процедуру restore*. Цена альтернативы «полный JSONL в git» — уже запрещена владельцем и M1.

[Структурщик]: Леммы, иначе синонимы. **Cold archive** — append-only collection в `background-office` Mongo (M1). **Cold-record** — документ M2 (`task_closure` + sufficient proof). **Repo checkpoint** — файл-слепок инвариантов архива, не SoT и не export-dump. **Identity proof** — криптографический digest канонической сериализации множества records. **Sanity-check** — вспомогательные id/count/sample, по которым нельзя восстановить канон и нельзя опровергнуть SoT в одиночку. Имя артефакта предлагаю: `cold-archive-checkpoint` (manifest), не `registry`, не `archive.jsonl`.

[Музыкант]: На слух это meters на master-tape, не вторая лента. Mongo — take; repo — VU-метр и footprint сессии: сколько take закрыто, какой hash микса. Если в git кладём весь cold archive — клиппинг репо и ложный SoT. Checkpoint не должен звучать как «задача закрыта, потому что id в markdown». Proof закрытия уже в M2 на сервере; здесь только «микс на сервере = тот же отпечаток, что в манифесте».

[Teamlead]: Словарь принял: checkpoint ≠ registry ≠ JSONL-SoT. Математик — канон сериализации и что входит в H. Не тащим idempotency key writer — это Q5.

[Математик]: В H входят только канонические поля cold-record M2 в стабильном порядке ключей (JSON canonical / JCS или эквивалент: sorted keys, UTF-8, без insignificant whitespace), records упорядочены по `(closedAt, taskId)` строго. Исключить из H: Mongo `_id` если он не часть контракта M2, server-only timestamps вне record, порядок insert. Минимальный C: `schemaVersion`, `recordTypeFilter` (= `task_closure`), `recordCount`, `contentHash` (alg + hex), `hashAlg`, `closedAtRange` или `headClosedAt`/`tailClosedAt`, `checkpointAt`. Опционально `merkleRoot` — если позже понадобится inclusion proof без полного A; для M3 достаточно single digest всего множества.

[Верстальщик]: Тогда на витрине манифеста строка: `contentHash: sha256:…`, `records: N`, диапазон `closedAt`. Sample taskIds — мелким шрифтом как «проверка связи», не как список архива. Если показать sample как «вот весь архив» — фальшивое присутствие в git. Бейдж смысла: `carrier: checkpoint`, никогда `source of truth`.

[Архитектор]: Форма артефакта фиксирую: **versioned JSON manifest** один файл — `ColdArchiveCheckpoint`. Не git-notes, не tag message alone, не размазанный ledger по PR. Причина: проверяемость diff’ом и одним `jq`/скриптом без git-археологии. Связь с Mongo: не connection string в git; логическая связь — `collectionLogicalId` / `archiveHome: background-office/task-closure-cold` + digest. Физический URI/restore — Q4, молчим.

[Структурщик]: Путь-лемма (имя, не write-path): что-то вроде `docs/tasks/cold-archive-checkpoint.json` или рядом с task-archive meeting — точный path может выбрать носитель позже, **форма** важнее path. Запрещённые имена-синонимы в каноне: `registry.json` как cold SoT, `*.jsonl` append в repo как штатный архив. Допустим рядом **тонкий** `taskId[]` только как sanity bloom/sample — и в манифесте явное `role: sanity-check-only`.

[Музыкант]: Single digest vs merkle: на слух для M3 хватит одного hash всего микса — как fingerprint альбома. Merkle — когда Q4/Q5 попросят «докажи, что этот take входил, не выгружая пластинку». Не закладываем merkle обязательным полем сейчас; оставляем дверь, не мебель.

[Teamlead]: Решение по merkle: не required. Required — contentHash + count + schema. Дальше: что **запрещено** читать из checkpoint. Говорите прямо.

[Математик]: Предикат тождества: `identical(C, A_mongo) ⇔ C.recordCount = |A| ∧ C.contentHash = H(canonical(A)) ∧ filter(A)=task_closure`. Из C **не** следует `closed(taskId)` для id ∉ A и даже для id из sanity-sample без запроса к Mongo/record. Sample ids: `sample ⊆ π_taskId(A)`, проверка `sample ⊆ π_taskId(A_mongo)` — necessary, not sufficient для full identity. Достаточность только через H.

[Верстальщик]: Forbidden interpretation для читателя PR: «есть checkpoint — задачи закрыты»; «taskId в sample — proof M2»; «нет файла в git — архива нет»; «digest устарел на день — можно писать в markdown вместо office». Честные состояния манифеста, когда появятся writers (не здесь): `present | stale-unknown | missing` — но кто обновляет stale — Q5.

[Архитектор]: Forbidden жёстко по M1+M2:
1) checkpoint как steady-state SoT;
2) repo JSONL/full records dump как канон;
3) подмена `sufficient(proof)` наличием id в checkpoint;
4) dual-read «сначала git, потом Mongo» как два SoT;
5) checkpoint как insight L/O или hot-registry flip.
Checkpoint = **верифицируемый отпечаток** canonical home, не home.

[Структурщик]: Sanity-check only — закрытый список, чтобы не расползлось:
- `sampleTaskIds` (ограниченный N, напр. ≤32 или head/tail);
- `epicIdHistogram` / top epic counts — опционально;
- `recordCount` **в одиночку** (count без hash — только smoke);
- human `notes` / `generatedBy` — метаданные слепка, не records.
Канон records — только Mongo documents M2. Checkpoint fields канона *слепка*: schemaVersion, hash, count, home id, time bounds, hashAlg.

[Музыкант]: Ещё раз по тракту: agent сверяет meters (C) с tape (Mongo). Расхождение hash — красный индикатор «микс не тот», не команда «восстанови из git». Restore-рецепт — другая комната. Здесь только что должно быть слышно при compare.

[Teamlead]: Математик, зафиксируй required fields списком без воды. Архитектор — одна фраза identity proof. Структурщик — artifact name.

[Математик]: Required fields C:
- `schemaVersion` (checkpoint schema, отдельно от record schemaVersion);
- `archiveHome` (логический id: office cold task_closure);
- `recordType` = `task_closure`;
- `recordCount`: uint;
- `hashAlg`: например `sha256`;
- `contentHash`: hex digest H(canonical serialize ordered records);
- `canonicalization` (id профиля: sorted-keys JSON + sort key `(closedAt, taskId)`);
- `closedAtMin`, `closedAtMax` (из множества A; пустой архив — null/omit по правилу пустого);
- `checkpointAt` (когда слепок вычислен).
Не required: merkle, full id list, proof bodies, taskSnapshot.

[Верстальщик]: Пустой архив: count=0, contentHash = H(empty) — честный нуль, не отсутствие файла. Иначе витрина путает «ещё не завели checkpoint» и «архив пуст».

[Архитектор]: **Identity proof:** равенство `contentHash` (и `recordCount` + type/home filter) между manifest в repo и пересчётом H по канонической сериализации records из Mongo. Малый слепок доказывает тождество **целиком набора**, не поштучно; поштучный inclusion — вне M3 (опц. merkle later). Без выгрузки A в git: verifier тянет A с server SoT (или из export stream), считает H, сравнивает с C из repo.

[Структурщик]: **Checkpoint artifact:** один JSON-файл manifest `ColdArchiveCheckpoint` (имя типа/схемы), role в шапке/поле: `role: repo-checkpoint-carrier`. Не ledger транзакций, не append-only log в git. Связь ids: `taskId` только в sanity sample. `epic_id` counts — sanity. Никаких `status=closed` внутри checkpoint как замены record.

[Музыкант]: Согласен: одна «карточка сессии» fingerprint, не playlist всех take в репозитории. Playlist — на сервере.

[Teamlead]: Граница deferred — проговорите списком, чтобы не колонизировать Q4–Q7.

[Математик]: Deferred формально: алгоритм writer/когда пересчитывать H (Q5); идемпотентность и API (Q5); процедура restore/export и что делать при mismatch (Q4); миграция markdown/registry → cold (Q6); insight lifecycle (Q7). В M3 только определение C и verify-предиката.

[Верстальщик]: С витрины PR-читателя mismatch = «отпечаток не сходится», без кнопки «починить из git» в этом вердикте. DoD комнаты — спецификация полей и запретов, не скрипт CI writer.

[Архитектор]: Цена выбранной формы: verify всегда требует доступ к Mongo (или полному export stream) — это честно при hybrid SoT. Альтернатива «ids-only в git» дешевле, но **не** доказывает тождество тел records/proof M2 — отвергаем как identity proof; ids остаются sanity.

[Структурщик]: Словарь закрываю. Синоним на вход запрещён: называть checkpoint «ledger SoT», «cold registry», «archive mirror». Допустимо: manifest, checkpoint, carrier snapshot. Поле `contentHash` — единственный несущий identity; sample — нет.

[Музыкант]: Принимаю single-fingerprint. Если позже услышим «докажи один take без полного A» — merkle в следующей комнате, не сейчас.

[Teamlead]: Сводка на стол. Artifact = versioned JSON ColdArchiveCheckpoint. Required = schemaVersion, archiveHome, recordType, recordCount, hashAlg, contentHash, canonicalization, closedAtMin/Max, checkpointAt. Identity = H(canonical A) match. Sanity = sampleTaskIds, count-alone, notes. Forbidden = SoT, proof-замена, full dump, dual-SoT. Deferred = Q5/Q4/Q6/Q7. Возражения по существу M3?

[Математик]: Уточнение пустого A: `closedAtMin`/`closedAtMax` = null, `contentHash = H([])` фиксированный константой канона. Иначе предикат дырявый. Принимаю остальное.

[Верстальщик]: Принимаю. Витрина: нулевой архив ≠ missing manifest.

[Архитектор]: Принимаю. Форма не расползается в restore.

[Структурщик]: Принимаю. Леммы разведены; path файла — носитель, не вердикт содержания.

[Музыкант]: Принимаю. Master-tape на office, meters в git.

[Teamlead]: LGTM по комнате M3/P4. Матч — таблица вердикта и Список посылок. Пишем.

[Математик]: Контрольный инвариант в DoD: существует чистая функция `computeColdArchiveContentHash(records) → digest`, детерминированная; `verifyCheckpoint(C, records) → bool`. Без UI, без writer.

[Верстальщик]: DoD для читаемости: в BRIEF/ADR-фрагменте таблица полей с колонкой «canon | sanity | forbidden-as-sot».

[Архитектор]: Рекомендация зафиксирована: один manifest, hybrid SoT не ломаем.

[Структурщик]: Импорт/зависимость: checkpoint не создаёт пакет-сервис в client; это docs/data carrier. Связанность с office — логический `archiveHome`, не npm-edge.

[Музыкант]: Финальный take: не дублировать proof M2 в git «для удобства» — это снова вторая лента.

[Teamlead]: Состав связки на исполнение после ратификации владельцем — не эта комната; здесь только вердикт формы. Закрываю обсуждение. Все шесть — «Принимаю» зафиксированы. Сводная таблица.

---

## Итоговое решение консилиума

| Поле | Решение |
| --- | --- |
| Checkpoint artifact | Один versioned **JSON manifest** типа `ColdArchiveCheckpoint` (repo checkpoint/export **carrier**): маленький слепок инвариантов server-side cold archive. Не JSONL-дамп records, не append-only ledger в git, не `registry` как SoT, не git-tag/notes как единственный носитель. Логическая привязка: поле `archiveHome` → canonical home M1 (`background-office` Mongo append-only, records M2 `task_closure`). Точный path в дереве repo — носитель/соглашение реализации, не содержание вердикта. |
| Required fields | `schemaVersion` (схема **checkpoint**, отдельно от schemaVersion cold-record); `archiveHome`; `recordType` = `task_closure`; `recordCount`; `hashAlg` (канон комнаты: `sha256`); `contentHash`; `canonicalization` (профиль: canonical JSON / sorted keys + порядок records по `(closedAt, taskId)`); `closedAtMin`, `closedAtMax` (для пустого A — `null`); `checkpointAt`. **Не** required: merkleRoot, полный список taskId, тела records/proof/snapshot, URI Mongo, writer metadata как часть identity. |
| Identity proof | `identical(C, A) ⇔` filter(A)=`task_closure` @ `archiveHome` ∧ `C.recordCount = \|A\|` ∧ `C.contentHash = H(canonicalSerialize(A))`, где A — множество/упорядоченный канон records из **Mongo SoT** (или полного export-stream того же SoT), не из git. Малый repo-слепок доказывает тождество **всего набора** без хранения A в git: verifier читает C из repo, читает A с сервера, пересчитывает H, сравнивает. Поштучный inclusion proof без полного A — **не** обязанность M3 (merkle — опция later, не required). |
| Sanity-check only | `sampleTaskIds` (ограниченный sample/head-tail, не полный индекс); любые histogram/top `epic_id`; `recordCount` **без** matching hash; `notes` / `generatedBy` / human commentary; присутствие id в sample **не** доказывает `sufficient(proof)` и **не** заменяет cold-record. Sanity может опровергнуть грубый drift, но **не** является каноном records и **не** достаточна для identity. |
| Forbidden interpretation | Checkpoint **не** steady-state SoT; **не** разрешение считать задачу closed; **не** замена M2 `proof` / `taskSnapshot`; **не** full mirror archive в git; **не** dual-SoT («сначала git, потом Mongo»); **не** evidence insight L/O; **не** hot-registry; **не** процедура restore «восстановим архив из checkpoint» (нет тел records); **не** write/idempotency контракт. Расхождение hash — сигнал нетождества набора, не лицензия писать cold в markdown/JSONL repo. |
| Boundary deferred to later rooms | **Q5** — кто/когда пишет checkpoint, idempotency, API writer; **Q4** — recovery/restore/export procedure при match/mismatch; **Q6** — migration legacy markdown/archive/registry; **Q7** — insight lifecycle. M3 не специфицирует CI writer и не колонизирует соседние ID в DoD исполнения. |

### Definition of Done (только M3 / P4)

- В каноне задачи/ADR-фрагменте cold-store зафиксированы: форма `ColdArchiveCheckpoint`, required fields, предикат `verifyCheckpoint`, список sanity-only, forbidden interpretation.
- Описана (спекой, не обязательно кодом в этой комнате) детерминированная канонизация и `H` для records M2; пустой архив: `recordCount=0`, фиксированный `H([])`, min/max closedAt = null.
- Явно разделены: checkpoint schemaVersion vs record schemaVersion; archiveHome vs path файла в git.
- Нет решений по Q4/Q5/Q6/Q7 в теле вердикта; нет требования класть bodies cold-records в repo.

---

## Список посылок

1. **[норма]** M0: порядок комнат `Q1 → Q3 → Q2 → Q5 → Q4 → Q6 → Q7`; M3 = Q2 Repo checkpoint; запрет решать Q5/Q4/Q6/Q7 по существу в этой комнате.
2. **[норма]** M1: SoT model = **hybrid**; canonical home cold records = `background-office` MongoDB append-only collection; repo = checkpoint/export carrier, **не** steady-state SoT.
3. **[норма]** M1 forbidden: cold archive как mutable task table; repo JSONL как штатный SoT; `background-media` как home; silent dual-write как два SoT.
4. **[норма]** M2: required cold-record поля и `recordType=task_closure`; `proof` удовлетворяет `sufficient(proof)`; notes/branch/chat LGTM/screenshot/hot-registry/repo JSONL не proof; evidence record не доказывает insight L/O.
5. **[норма]** Владелец: в repo допускается только небольшой hash/checkpoint-слепок, не весь cold archive.
6. **[норма]** Checkpoint должен сверять архив records контракта M2, а не изобретать другой состав записи.
7. **[факт]** Повестка `docs/meeting/task-archive-cold-store/M3_AGENDA.md` требует вердикт-таблицу: Checkpoint artifact, Required fields, Identity proof, Sanity-check only, Forbidden interpretation, Boundary deferred + секцию «Список посылок».
8. **[норма]** Тождество набора records доказывается криптографическим digest канонической сериализации, а не наличием выборочных id в git.
9. **[норма]** Выборочные id/count-without-hash/notes — sanity-check only; канон records остаётся на server SoT.

---

*Реплик в диалоге: 43; каждый участник высказался не менее одного раза.*
