<!-- канал: llm — протокол произведён yarn consilium -->

# Метаданные сеанса

| Поле | Значение |
|------|----------|
| Дата (UTC) | 2026-07-30T14:50:16.573Z |
| Команда | `yarn consilium` |
| Модель | xai/grok-4.5 |
| Файл | `docs/seanses/task-archive-cold-store-m7-lifecycle-integration-2026-07-30.md` |
| Порядок ролей | Верстальщик → Teamlead → Музыкант → Математик → Структурщик → Архитектор |
| Повестка | `docs/meeting/task-archive-cold-store/M7_AGENDA.md` |

**Вход сеанса** (что комната действительно получила):

| Вход | Носитель | Размер | Отпечаток | Доставка |
|------|----------|-------:|-----------|----------|
| повестка (эхо в голове) | `docs/meeting/task-archive-cold-store/M7_AGENDA.md` | 2560 | `e5ad02f00942` | полностью |
| инструкция консилиума | `docs/prompts/CONSILIUM_PROMPT.md` | 4494 | `b6bd1a8dc127` | полностью |
| координация ролей | `docs/VIRTUAL_TEAM_PROMPT.md` | 8034 | `75959c7f060d` | **обрезан** |
| контекст: Архитектура | `docs/ARCHITECTURE.md` | 6034 | `33f0886d9bac` | **обрезан** |
| контекст: Дизайн | `docs/DESIGN.md` | 5998 | `c0c614192971` | полностью |
| контекст: Сервисы | `docs/SERVICES.md` | 6034 | `cf5d799f7980` | **обрезан** |
| архив RAG | — | 105 | `4190ddf6c311` | полностью |
| повестка | `docs/meeting/task-archive-cold-store/M7_AGENDA.md` | 2560 · 1 п. | `e5ad02f00942` | полностью |

> ⚠ Часть входа не доехала до комнаты целиком. Утверждения протокола о своём входе
> сверять с этой таблицей, а не с текстом реплик.

**Вопрос:**

Вопрос P8: Как обновить insight-task-archive-storage и task lifecycle после вердиктов M1-M6: что становится новой ревизией/решением инсайта, что является task work, какие последующие задачи нужно завести, и почему сам факт нового cold archive или migration planning не доказывает Learned/Operationalized L/O по инсайту? Вердикт обязан назвать insight update policy, task work boundary, follow-up tasks, L/O non-proof rule, review/ratification path, forbidden interpretation.

---

# Консилиум: M7 — Insight/task lifecycle integration (`task-archive-cold-store`)

**Повестка:** P8 — как обновить `insight-task-archive-storage` и task lifecycle после вердиктов M1–M6: новая ревизия/решение инсайта, граница task work, follow-up задачи, почему cold archive / migration plan не доказывает L/O; обязательные поля вердикта.

**Участники:** Teamlead (Tarasov), Архитектор (Vesnin), Структурщик (Ozhegov), Математик (Dynin), Музыкант (Kuryokhin), Верстальщик (Rodchenko).

**Порядок реплик:** Верстальщик → Teamlead → Музыкант → Математик → Структурщик → Архитектор

---

[Верстальщик]: С витрины карточки инсайта читатель обязан видеть честный статус, не декоративный «архив готов = L/O». M2 уже сказал: evidence закрывает task, не insight. На карточке `insight-task-archive-storage` после M7 — явная ревизия решения (hybrid SoT, checkpoint в repo), бейдж статуса остаётся ниже L/O, пока нет рабочего Notary и живого write-path. Фальшь: зелёный «Operationalized» от одного markdown-плана миграции.

[Teamlead]: Планка матча узкая. M1–M6 — вход, обратный ранг запрещён. Здесь не пишем код и не гоняем миграцию. Решение комнаты: что канонизируем в INSIGHT как ревизию, что уходит в backlog task cards, кто ратифицирует до «implementation done», и жёсткое L/O non-proof. Связка на вердикт: Архитектор — форма ревизии; Структурщик — леммы boundary; Математик — предикат non-proof; я — follow-up и review path.

[Музыкант]: На слух M1–M6 — уже сведённый master-tape дизайна: Mongo SoT, checkpoint в repo, Notary sole writer, legacy markdown = candidate. Но master-tape партитуры ≠ final bounce продукта. Новый cold archive на бумаге — это count-in, не take на ленте. L/O слышу только когда Notary реально пишет `(task_closure, taskId)` и recovery/audit не фальшивят mono-take «Mongo wins» без emergency-метки.

[Математик]: Формализую без UI. Пусть I — insight, R — revision decision document, T — множество task closures с evidence e ∈ Evidence_task. M2: `proves_closure(e, taskId)` ⇏ `L(I) ∨ O(I)`. Предикат non-proof: `¬(∃ design∨plan∨checkpoint_schema : marks_LO(I))`. L/O требует отдельного evidence класса implementation+operation, не тождественного cold-record evidence. Ревизия R канонизирует M1–M6 как decision set D, не как proof set P_LO.

[Структурщик]: Леммы, иначе синонимы. **Insight revision** — словарная статья решения в `INSIGHT.md` / decision log инсайта: SoT, checkpoint, evidence contract, write path, recovery, migration policy. **Task work** — карточки исполнения (Notary, Mongo schema, export/checkpoint job, migration import). **Canonical decision** ≠ **done implementation**. Граница: M1–M6 текст вердиктов → revision; код/деплой/import run → backlog. Не смешивать «протокол заседания» с «закрытой задачей в registry».

[Архитектор]: Конструкция: инсайт обновляется **ревизией решения** (supersede прежней premise «repo JSONL = cold SoT»), ссылкой на M1–M6 как ADR-пакет по cold-store, без смены статуса на L/O. Цена альтернативы «сразу L/O»: ложь канона и бестиарий молчаливого зелёного. Затронутые модули по форме: `docs/insights/insight-task-archive-storage/`, task registry follow-ups, `background-office` (будущий Notary home) — но home кода сегодня не утверждаем как done. Рекомендация: policy = append revision + status remains pre-L/O.

[Верстальщик]: На витрине follow-up карточек нужны читаемые имена без легенды: не «сделать архив», а срезы — schema cold-record, ArchiveNotary write API, checkpoint export, migration candidate import, audit/recovery drill. Каждая карточка — свой DoD; общая лента «M7 закрыл инсайт» запрещена как подпись к пакету.

[Teamlead]: Follow-up нарезаю как матчи, не как веер: (1) Mongo cold-record + evidence contract по M2; (2) ArchiveNotary sole writer + key `(task_closure, taskId)` по M4; (3) ColdArchiveCheckpoint / repo manifest count+hash по M3; (4) recovery/audit path по M5; (5) migration import through Notary + stubs/link map по M6; (6) insight doc revision PR — отдельно, тонкий, без кода. Шестая — документальная ратификация ревизии; 1–5 — implementation. LGTM на 6 не есть LGTM на 1–5.

[Музыкант]: Миграционный план M6 на слух — tape-bake recipe, не сам bake. Legacy markdown как hint: можно настроиться, нельзя зачесть как already archived proof. Если кто-то закроет insight L/O после «написали migration runbook» — это клиппинг доверия, как фейковый end chorus без микрофонов.

[Математик]: Предикат границы task work: работа w ∈ TaskWork ⇔ w изменяет runtime/storage/process с проверяемым DoD ∧ w ∉ {consilium_verdict, insight_revision_text_only}. Ревизия инсайта r: `applies(r) ⇔ documents(D_M1..M6) ∧ ¬claims_LO`. Follow-up минимальный cover: ∀ d ∈ D_M1..M6 ∃ task t: implements(t,d) ∨ explicit_wontfix(d) — дыр в cover не оставляем, но cover ≠ complete(t).

[Структурщик]: Словарь follow-up (имена-леммы, не Issue id из воздуха): `cold-archive-record-schema`, `archive-notary-write-path`, `cold-archive-checkpoint-export`, `cold-archive-recovery-audit`, `legacy-markdown-notary-import`, `insight-task-archive-storage-revision`. Связность: Notary не импортирует UI; checkpoint job читает Mongo, пишет repo carrier; insight revision не зависит от зелёного CI implementation — наоборот, revision **разблокирует** корректные task briefs. Нарушение: task «закрыть инсайт L/O» как dependency от schema PR.

[Архитектор]: Insight update policy фиксирую жёстко: (a) в `INSIGHT.md` секция Decision/Revision: hybrid SoT — records в Mongo `background-office`, repo = checkpoint/export; (b) явно obsolete: «JSONL в repo как cold SoT»; (c) ссылки на вердикты M1–M6 / BRIEF; (d) status ∈ {Direction decided, Implementation pending} — **не** Learned, **не** Operationalized; (e) L/O criteria list выносится отдельно как future evidence checklist, не как галочка от M7.

[Верстальщик]: Review path с витрины капитана: ревизия инсайта — читаемый diff «было premise → стало decision», не простыня протокола. Implementation done — чеклист evidence по M2 (task closure), плюс отдельная строка «insight L/O: open». Два индикатора рядом, как assigned/participated: *decision ratified* / *runtime proven* — иначе снова фальшивое присутствие L/O.

[Teamlead]: Review/ratification path: (1) M7 вердикт этой комнаты → (2) PR ревизии INSIGHT + registry follow-up cards — review Архитектор (форма границ) + Структурщик (леммы/homes) + мой LGTM на комплект карточек; (3) каждая implementation card — свой LGTM по DoD карты, без пакетного «всё M1–M6 сразу»; (4) L/O insight — только отдельный later review при наличии operational evidence, не автоматом от merge Notary. BLOCK: попытка закрыть insight L/O в том же PR, что schema.

[Музыкант]: Forbidden interpretation на слух хором: «раз cold archive спроектирован — мы уже operationalized»; «checkpoint в repo = SoT records»; «migration planning = Learned»; «partial write policy = можно писать в обход Notary»; «emergency restore без метки = steady-state». Это шумовые overtones — в вердикте режем.

[Математик]: L/O non-proof rule одной формулой:
`LO_evidence(I) ∩ {consilium_M1..M7, design_doc, migration_plan, empty_checkpoint_schema, unexecuted_runbook} = ∅`
и
`task_closure_evidence(e) ⇒ closed(task(e)) ∧ ¬⇒ LO(I)`.
Достаточное (направление, не закрываем здесь полностью): live Notary writes + checkpoint round-trip verify(count,hash) + recovery drill под M5 + N real task archives — минимум класс E_impl, отдельный от E_design.

[Структурщик]: Task work boundary ещё раз словарём. **Внутри boundary (task work):** реализация Notary, индексы/ключ `(task_closure, taskId)`, export checkpoint, import pipeline, audit tools, тесты контракта evidence. **Вне boundary (уже decision / не task этой волны):** пересмотр hybrid SoT, смена sole writer, git history rewrite, объявление L/O, UI продукта архива (если всплывёт — отдельный insight/эпик). **Серая зона запрещена:** «заодно поправим SoT обратно в JSONL» — regression против M1, BLOCK.

[Архитектор]: Согласую boundary. Canonical decision set после M7 = ∪{M1..M6} зафиксированный ревизией. Цена: старые абзацы INSIGHT про repo-SoT должны быть marked superseded, не удалены молча — provenance. Implementation slices не имеют права ослаблять M4 sole writer «для удобства миграции» — M6 уже сказал: import only through Notary. Форма follow-up briefs цитирует номер вердикта-источника, не пересказывает заново.

[Верстальщик]: Пустота L/O должна быть честной пустотой: в карточке инсайта `L/O: not proven` + reason code `design_only` / `impl_pending`, не прочерк. Когда появится runtime evidence — смена reason, не мгновенный магический badge. Конструктивизм: факт, не иллюзия прогресса от толщины docs/meeting/.

[Teamlead]: Принимаю нарезку шести follow-up как обязательный cover. Приоритет исполнения после ратификации ревизии: Notary+schema (M2/M4) → checkpoint (M3) → recovery (M5) → migration (M6). Ревизия insight — сразу, тонким PR, чтобы briefs не писались от мёртвой premise JSONL-SoT. Вердикт комнаты не колонизирует execution sprint — только policy.

[Музыкант]: Checkpoint round-trip на слух — хороший meter: count/hash совпали = строй, не = «инсайт выучен организацией». Выученность — когда команда без шпаргалки M* снова не кладёт SoT в git как JSONL full dump. Это operational habit; один green export job этого не доказывает. Поддерживаю non-proof rule Математика.

[Математик]: Review predicate для «implementation task done»:
`done(t) ⇔ DoD(t) greened ∧ ¬claims(t, LO(I)) ∧ respects(t, D_M1..M6)`.
Для «insight revision done»:
`rev_done(I) ⇔ INSIGHT reflects D ∧ obsolete(repo_jsonl_sot) ∧ status ≠ LO ∧ links(M1..M7)`.
Два разных предиката — два разных закрытия. Смешение = false positive на L/O.

[Структурщик]: Homes напоминаю без кода: records — Mongo `background-office`; checkpoint carrier — repo manifest; sole writer module — ArchiveNotary (имя леммы M4); insight home — `docs/insights/insight-task-archive-storage/`. Task cards в registry ссылаются на homes, не плодят второй SoT в markdown task body. Link map/stubs M6 — отдельный артефакт миграции, не замена INSIGHT revision.

[Архитектор]: Forbidden interpretation — полный список в вердикт: (1) M7/M1–M6 ⇒ L/O; (2) наличие cold archive design ⇒ Learned; (3) migration plan/runbook ⇒ Operationalized; (4) repo checkpoint = authoritative record store; (5) task closure evidence = insight proof; (6) partial success policy = multi-writer ok; (7) legacy markdown import without Notary; (8) git history rewrite as cleanup; (9) закрытие insight в implementation PR «за компанию». Это норма запрета, не совет.

[Верстальщик]: Итоговая таблица вердикта должна читаться как шесть полей без отсылок «см. протокол целиком». Я за короткие формулировки в ячейках + Список посылок ниже — как в повестке. Визуально для капитана: одна таблица = один экран решения.

[Teamlead]: Сводим. Insight update policy — ревизия decision, status pre-L/O. Task work boundary — runtime/storage/process only. Follow-up — шесть лемм cover. L/O non-proof — design/plan/consilium ∉ LO_evidence. Review path — Architect+Structurer+Teamlead на revision; per-task LGTM на impl; L/O отдельно later. Forbidden — список Архитектора. Матч M7 — policy, не код. Кто против по существу — сейчас; молчание после = Принимаю.

[Музыкант]: Принимаю. Партитура ревизии отдельно от take Notary. Не путать count-in с bounce.

[Математик]: Принимаю. Предикаты `rev_done` / `done(t)` / `¬design⇒LO` фиксируем в таблице и посылках как нормы этой комнаты, опирающиеся на факт-вердикты M1–M6.

[Структурщик]: Принимаю. Леммы revision vs task work vs L/O evidence разведены; follow-up cover без дыр и без колонизации execution.

[Архитектор]: Принимаю. Форма: revision supersedes repo-JSONL-SoT; canonical = M1–M6; implementation не здесь; L/O не здесь.

[Teamlead]: Единогласно. Фиксирую итоговое решение и DoD комнаты M7 (только policy/doc/registry slice — без migration execution).

[Верстальщик]: Принимаю. На витрине после M7: decision ratified possible; L/O badge — нет.

[Музыкант]: Ещё раз якорь: cold archive **protocol** — это строй оркестра по нотам; L/O — регулярные концерты без фальши. Ноты приняли — зал ещё не полный. Принимаю.

[Математик]: Cover-полнота follow-up: пять implementation + одна revision doc = 6; equivalent partition of D_M1..M6. Нет seventh «close LO» task в обязательном cover. Принимаю.

[Структурщик]: Запрет синонима: не называть revision PR «implementation of cold store». Имя = `insight-task-archive-storage-revision`. Принимаю.

[Архитектор]: Затронутые артефакты формы после комнаты: `INSIGHT.md` revision section, опционально `DECISIONS.md`/`STATUS` инсайта, `docs/tasks/registry.json` cards — без touch production Mongo в рамках M7 DoD. Принимаю.

---

## Итоговое решение консилиума

| Поле | Решение |
| --- | --- |
| Insight update policy | Записать **новую ревизию решения** в `docs/insights/insight-task-archive-storage/` (INSIGHT + status): канон = hybrid SoT (M1), evidence contract (M2), `ColdArchiveCheckpoint`/manifest count+hash (M3), ArchiveNotary sole writer + key `(task_closure, taskId)` + partial policy (M4), recovery Mongo-wins / emergency explicit (M5), migration candidate/hint + import only via Notary + stubs/link map + no git history rewrite (M6). **Supersede** прежнюю premise «repo JSONL = cold SoT»; owner premise «server-side cold + small repo checkpoint» — в тексте ревизии явно. Статус после ревизии: **Direction decided / Implementation pending** — **не** Learned, **не** Operationalized. Ревизия ссылается на M1–M7; старые абзацы SoT помечаются superseded (provenance), не молчаливый delete. |
| Task work boundary | **Canonical decision (не task work):** текст вердиктов M1–M6 и policy M7 / insight revision. **Task work backlog:** всё, что меняет runtime/storage/process с машинным DoD — schema cold-record, Notary write-path, checkpoint export в repo carrier, recovery/audit tooling & drill, legacy import pipeline through Notary, tests/invariants. **Вне волны / запрет в тех же cards:** смена SoT обратно на repo full dump, multi-writer, git history rewrite, UI продукта архива, **закрытие insight как L/O**. Implementation не пересматривает D_M1..M6 «заодно». |
| Follow-up tasks | Обязательный cover (имена-леммы → registry cards): (1) `cold-archive-record-schema` (M2); (2) `archive-notary-write-path` (M4); (3) `cold-archive-checkpoint-export` (M3); (4) `cold-archive-recovery-audit` (M5); (5) `legacy-markdown-notary-import` (M6); (6) `insight-task-archive-storage-revision` (doc-only, M7 policy). Приоритет после merge (6): (1)(2) → (3) → (4) → (5). Отдельной обязательной card «close insight L/O» **нет**. |
| L/O non-proof rule | `task_closure` / cold-record evidence **доказывает закрытие задачи**, не L/O инсайта (M2). Множество {consilium M1–M7, design/protocol, migration plan/runbook, schema without live writes, checkpoint format without verified round-trip, unexecuted import} **∩ LO_evidence(insight) = ∅**. L/O только отдельным later review при **implementation+operation** evidence (live Notary, verify count/hash, recovery drill M5, реальные архивы задач) — критерий фиксируется checklist’ом в ревизии, не галочкой M7. |
| Review / ratification path | (1) Вердикт M7 → (2) PR `insight-task-archive-storage-revision` + заведение follow-up cards: review **Архитектор** (границы/supersede SoT), **Структурщик** (леммы/homes/связанность briefs), **Teamlead LGTM** на комплект; (3) каждая impl-card — **отдельный** LGTM по DoD card, без пакетного close; (4) insight L/O — **отдельный** later gate, не automerge от Notary/checkpoint. **BLOCK:** claims L/O в том же PR, что schema/Notary/migration; regression SoT; writer besides Notary. |
| Forbidden interpretation | Запрещено читать M7/M1–M6 как: L/O или Learned уже достигнуты; design/plan cold archive = Operationalized; repo checkpoint/manifest = SoT records; task closure evidence = proof по инсайту; partial policy = multi-writer; legacy markdown = proof без Notary; git history rewrite «для чистоты»; закрытие insight «за компанию» в implementation PR; revision PR = «implementation cold store done». |

**Definition of Done (комната M7 / P8 only):**

- Протокол с таблицей шести полей и секцией **Список посылок** принят.
- PR ревизии инсайта: supersede repo-JSONL-SoT, канон M1–M6, status ≠ L/O, checklist будущего L/O evidence без галочки «done».
- В registry заведены (или явно слинкованы) six follow-up леммы; нет card «mark insight L/O now».
- Нет commit’ов runtime Notary/migration execution в DoD этой комнаты.
- Ratification path (Architect + Structurer + Teamlead) пройден на revision PR.

---

## Список посылок

1. **Норма (M0):** порядок вопросов Q1→Q3→Q2→Q5→Q4→Q6→Q7; M7 = Q7 Insight/task lifecycle integration.
2. **Норма (M1):** hybrid SoT — records в Mongo `background-office`; repo — checkpoint/export carrier, не SoT records.
3. **Норма (M2):** cold-record evidence доказывает task closure, **не** insight L/O.
4. **Норма (M3):** `ColdArchiveCheckpoint`; repo manifest доказывает identity count/hash, не SoT-записи.
5. **Норма (M4):** ArchiveNotary — sole writer; ключ `(task_closure, taskId)`; partial write policy как в M4.
6. **Норма (M5):** steady-state Mongo wins; emergency restore только explicit + sufficient backup.
7. **Норма (M6):** legacy markdown — candidate/hint, не proof; import only through Notary; stubs/link map; no git history rewrite.
8. **Факт (вход повестки):** `docs/insights/insight-task-archive-storage/INSIGHT.md` ранее предлагал repo JSONL как cold SoT.
9. **Факт/норма (слово владельца входе):** cold archive может жить server-side; repo держит small hash/checkpoint snapshot.
10. **Норма (границы M7_AGENDA):** не решать actual implementation code, migration execution, closing insight L/O without implementation evidence.
11. **Норма (форма вердикта M7):** обязательны insight update policy, task work boundary, follow-up tasks, L/O non-proof rule, review/ratification path, forbidden interpretation + Список посылок.
12. **Норма (канон исполнения команды):** LGTM/закрытие — по DoD артефакта; design/consilium ≠ operational proof; молчаливый зелёный / фальшивый badge статуса — дефект приёмки.

---

*Реплик в диалоге: 36; каждый участник высказался не менее одного раза.*
