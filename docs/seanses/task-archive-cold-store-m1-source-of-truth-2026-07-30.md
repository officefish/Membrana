<!-- канал: llm — протокол произведён yarn consilium -->

# Метаданные сеанса

| Поле | Значение |
|------|----------|
| Дата (UTC) | 2026-07-30T14:19:11.750Z |
| Команда | `yarn consilium` |
| Модель | xai/grok-4.5 |
| Файл | `docs/seanses/task-archive-cold-store-m1-source-of-truth-2026-07-30.md` |
| Порядок ролей | Архитектор → Teamlead → Музыкант → Верстальщик → Математик → Структурщик |
| Повестка | `docs/meeting/task-archive-cold-store/M1_AGENDA.md` |

**Вход сеанса** (что комната действительно получила):

| Вход | Носитель | Размер | Отпечаток | Доставка |
|------|----------|-------:|-----------|----------|
| повестка (эхо в голове) | `docs/meeting/task-archive-cold-store/M1_AGENDA.md` | 2598 | `b5be8d9b50db` | полностью |
| инструкция консилиума | `docs/prompts/CONSILIUM_PROMPT.md` | 4494 | `b6bd1a8dc127` | полностью |
| координация ролей | `docs/VIRTUAL_TEAM_PROMPT.md` | 8034 | `75959c7f060d` | **обрезан** |
| контекст: Архитектура | `docs/ARCHITECTURE.md` | 6034 | `33f0886d9bac` | **обрезан** |
| контекст: Дизайн | `docs/DESIGN.md` | 5998 | `c0c614192971` | полностью |
| контекст: Сервисы | `docs/SERVICES.md` | 6034 | `cf5d799f7980` | **обрезан** |
| архив RAG | — | 105 | `4190ddf6c311` | полностью |
| повестка | `docs/meeting/task-archive-cold-store/M1_AGENDA.md` | 2598 · 1 п. | `b5be8d9b50db` | полностью |

> ⚠ Часть входа не доехала до комнаты целиком. Утверждения протокола о своём входе
> сверять с этой таблицей, а не с текстом реплик.

**Вопрос:**

Вопрос P2: Что является каноническим source of truth холодного архива закрытых задач: background-office/MongoDB append-only collection, repo JSONL или hybrid, где сервер хранит канонические records, а git хранит только проверяемый checkpoint; какие операции являются append-only каноном, какие derived, и когда repo emergency SoT? Вердикт обязан выбрать одну модель SoT, назвать append-only/derived/fallback/forbidden и не решать Q2 checkpoint fields, Q3 evidence fields, Q5 write path, Q6 migration, Q7 lifecycle по существу.

---

# Консилиум: SoT холодного архива закрытых задач (M1 / Q1)

**Повестка:** P2 — канонический source of truth холодного архива закрытых задач: `background-office`/MongoDB append-only collection, repo JSONL или hybrid (сервер — канон records, git — проверяемый checkpoint); граница append-only/derived; условия emergency SoT для repo. Не решать Q2/Q3/Q5/Q6/Q7 по существу.

**Участники:** Teamlead (Tarasov), Архитектор (Vesnin), Структурщик (Ozhegov), Математик (Dynin), Музыкант (Kuryokhin), Верстальщик (Rodchenko).

**Порядок реплик:** Архитектор → Teamlead → Музыкант → Верстальщик → Математик → Структурщик

---

[Архитектор]: Граница прежде вкуса. Холодный архив закрытых задач — не живая таблица registry и не media-домен. Владелец явно допустил `background-office` + MongoDB и небольшой checkpoint в git. Три модели: office-mongo (канон только на сервере), repo-jsonl (канон в дереве), hybrid (records на сервере, git — проверяемый слепок). Рекомендую hybrid: форма «канон живёт у office, repo не врёт, что он SoT».

[Teamlead]: Планка матча узкая — выбрать ровно одну модель SoT и назвать append-only / derived / fallback / forbidden. Не лезем в поля checkpoint, evidence, writer, migration, lifecycle insight. Связка: Архитектор — форма дома; Структурщик — леммы границ; Математик — предикат append-only. Старый insight с `archive.jsonl` как cold SoT — вход, не вердикт. Играем hybrid, если комната не покажет, что dual-truth неизбежен.

[Музыкант]: На слух repo JSONL как единственный master-tape — это лента в чемодане: агент офлайн слышит, сервер молчит, объём registry снова раздувается или JSONL растёт в git-шуме. Office-mongo чистый — master на mmbrn.tech, но без checkpoint в repo нет count-in «что считалось каноном на коммите». Hybrid: сервер играет take, git держит meters/hash — не вторую партитуру.

[Верстальщик]: С витрины оператора и агента фальшь такая: бейдж «архив в репо» при том, что правда на Mongo, или наоборот. Нужна одна честная подпись дома: cold SoT = office. Checkpoint в git — не карточка задачи, а индикатор целостности (есть/нет/stale), без притворства, что JSONL — полная история. UI продукта здесь не рисуем; требую в вердикте запрет подмены cold archive «редактируемой таблицей задач».

[Математик]: Формализую без UI. Пусть R — множество архивных записей закрытых задач. SoT-модель задаёт функцию author(r): кто имеет право создать канонический r. Append-only: операция A допустима ⇔ A добавляет r с новым id (или идемпотентный повтор того же ключа), не update-in-place полей смысла и не delete канона. Derived D = f(R) пересчитываемо; D ⊄ SoT. Repo как emergency SoT: предикат `office_unreachable ∧ recovery_declared` — временно author переносится, иначе repo ⊭ SoT.

[Структурщик]: Леммы, иначе синонимы. **Cold archive record** — иммутабельная запись закрытой задачи после архивации, home = collection в `background-office`/MongoDB. **Checkpoint** — проверяемый слепок/hash-носитель в git, не словарь полной истории. **Registry** — горячий/рабочий индекс открытого контура, не cold SoT. **Export/JSONL dump** — derived или recovery carrier. Граница пакета: domain — `background-office` (как Linear/Claude в BACKGROUND_SERVERS), media — не дом. Hybrid = sole author records на office + checkpoint carrier в repo.

[Архитектор]: Цена office-mongo pure: простой SoT, но repo-агенты и CI без сети теряют доказуемый якорь «на этом SHA архив сходился». Цена repo-jsonl: противоречит слову владельца («не обязан лежать в репо») и снова грузит git историей. Hybrid дороже контрактом checkpoint later (Q2), но граница ясна уже сейчас: author records ≠ carrier snapshot. Беру hybrid.

[Teamlead]: Слово владельца — вход высшего ранга: cold может жить на office+Mongo, в repo — небольшой hash/checkpoint. REVIEW, где server API «избыточен», — исторический вход insight-контура, не отмена владельца. Матч: hybrid. Кто тянет repo-jsonl «потому что проще скрипту» — разрушает комбинацию. Фиксируем и идём в границу операций.

[Музыкант]: Append-only на слух — это record take на ленту: archive_closed_task, не re-record поверх. Коррекция смысла закрытой задачи — не overwrite, а новый компенсирующий take (если вообще дозволим later) либо запрет; в M1 достаточно сказать: mutate-in-place канона forbidden. Derived — выборки, markdown-витрины, локальный JSONL export для grep — можно пересвести с master, не путать с master.

[Верстальщик]: Честная пустота: если office недоступен, UI/агент не рисует «архив пуст», а статус `office_unavailable` / `checkpoint_only`. Emergency SoT repo — редкая авария с явной декларацией, не тихий fallback на каждый offline. Иначе витрина снова врёт dual-write’ом.

[Математик]: Список канонических append-only операций (смысл, не API): (1) append archive record при переходе задачи в cold; (2) append-only служебные маркеры целостности/эпохи на стороне office, если нужны для recovery — без правки тела record. Не канон: edit registry row «как будто open», rewrite JSONL line, delete record из cold «чтобы почистить». Derived: любой materialize в repo JSONL, отчёты, grep-индексы, UI lists.

[Структурщик]: Запрещённая интерпретация одним предложением: cold archive ≠ mutable task table и ≠ «второй registry.json в Mongo». Collection append-only по смыслу; open-task lifecycle остаётся в своём hot-контуре. Repo JSONL из старого INSIGHT — кандидат в derived/export, не SoT. Mirror/cache — статус Mongo только если выберем repo-jsonl; при hybrid Mongo — SoT, не cache.

[Архитектор]: Уточняю модель SoT model = hybrid, не office-mongo. Разница: hybrid явно включает git checkpoint как first-class non-SoT carrier; office-mongo оставлял бы checkpoint «вне модели». Владелец просил слепок — значит hybrid. Q2 поля checkpoint не открываем: только роль «проверяемый checkpoint».

[Teamlead]: Принимаю hybrid. Условие emergency: repo временно SoT только при объявленном recovery (office потерян/повреждён и есть процедура restore), не при «у меня нет VPN». После восстановления office снова sole author; repo-записи recovery либо вливаются append-only, либо помечаются derived — детали writer/migration = Q5/Q6, здесь не решаем.

[Музыкант]: Media-сервер в тракте не участвует — BACKGROUND_SERVERS уже развёл домены. Архив задач — office-шина, как Linear. Не тащим cold tasks на media library: другой tape, другой смысл.

[Верстальщик]: В таблице вердикта строка Forbidden обязана читаться без легенды: «не подменять cold archive редактируемой task table; не считать repo JSONL каноном в нормальном режиме; не dual-write office+repo как два SoT». Иначе следующие комнаты нарисуют два бейджа «истина».

[Математик]: Инвариант hybrid: `canonical(r) ⇔ r ∈ MongoCold ∧ appendOnly(r)`. `checkpoint(sha) = H(projection(R*))` — проверка, не author. Repo emergency: `SoT_repo_temp ⇔ recovery_flag ∧ ¬office_ok`; длительность — до cutover обратно, без параллельного author с двух сторон (иначе нарушен sole author, как dual-write в tariff M2).

[Структурщик]: Словарь закрываю. SoT model: **hybrid**. Canonical home: `background-office` MongoDB append-only collection. Repo: checkpoint carrier (+ optional recovery export). Derived: JSONL dumps, markdown archive views, любые read-models. Fallback: repo only under emergency recovery. Forbidden: mutable cold table; repo-jsonl as steady-state SoT; media as home; silent dual SoT.

[Архитектор]: Конструкция держит: office author records; git — verifiable checkpoint; append-only граница на archive events; derived — всё пересчитываемое; emergency — явный и временный. Соседние Q2/Q3/Q5/Q6/Q7 не колонизируем полями и API. Рекомендация комнате — принять таблицу.

[Teamlead]: Вердикт: **hybrid**. LGTM по границам матча. Кто в DoD протащит schema checkpoint или migration map — BLOCK как выход за M1. Связка на фиксацию протокола: секретарь пишет таблицу + Список посылок; исполнение кода — не этот сеанс.

[Музыкант]: Принимаю. Master-tape на office, meters в git, JSONL — bounce для ушей агента, не второй master. Emergency — как запись с резервной станции: только когда основная студия сгорела, и все слышат объявление.

[Верстальщик]: Принимаю. На витрине статуса архива один дом истины — office; checkpoint — индикатор сверки; emergency — отдельный честный режим, не серый «берём файл из репо всегда».

[Математик]: Принимаю. Предикаты sole author / append-only / derived / emergency_recovery достаточны для M1; поля record и checkpoint откладываем. Численно: ноль параллельных author’ов в нормальном режиме.

[Структурщик]: Принимаю. Леммы cold record / checkpoint / derived export / emergency SoT — без синонима «archive = registry». Нарушение слабой связанности: пихать cold tasks в media или в client store как SoT.

[Архитектор]: Ещё раз цена отказа от hybrid в пользу repo-jsonl: игнор входа владельца и возврат объёма в git. Отказ в пользу pure office-mongo: теряем явную роль checkpoint, которую владелец уже назвал. Hybrid — единственная форма, стыкующая оба входа без dual-SoT.

[Teamlead]: Положение: комната сошлась. Решение — hybrid, без «зависит». DoD только на артефакт вердикта M1, без захвата Q2+. Матч SoT сыгран.

[Музыкант]: Коротко: не пишем overwrite на cold take. Всё, что «поправим строку в JSONL» — шум, не канон.

[Верстальщик]: Коротко: не рисуем archive.jsonl как единственную полку правды в нормальной работе.

[Математик]: Коротко: author = office; H(·) в git; emergency ⇒ временный author repo под флагом recovery.

[Структурщик]: Коротко: Mongo cold collection — SoT; repo — checkpoint/export; registry — не cold; media — не home.

[Архитектор]: Финальная форма таблицы готова к записи. Расхождений по модели не осталось.

[Teamlead]: Закрываю дискуссию. Все шесть — «Принимаю». Пишем итог.

---

## Итоговое решение консилиума

| Поле | Решение |
| --- | --- |
| SoT model | **hybrid** |
| Canonical append-only operations | Append канонического cold-record закрытой задачи в MongoDB collection `background-office`; (опц.) append служебных маркеров эпохи/целостности на office **без** mutate тела record. Нет update-in-place и delete канонического смысла record в нормальном режиме. |
| Derived views | Repo JSONL dump/export; markdown/registry-проекции «для чтения»; UI/agent read-models; любые пересчитываемые индексы и отчёты из Mongo cold. Checkpoint в git — **не** SoT records, а проверяемый carrier/слепок. |
| Repo fallback condition | Repo временно единственный SoT **только** при явно объявленном recovery: office недоступен или cold collection повреждена, идёт процедура восстановления. После restore office снова sole author; параллельный dual-author запрещён. Обычный offline агента ≠ emergency SoT. |
| Forbidden interpretation | Cold archive ≠ mutable task table / второй `registry.json`. Repo JSONL ≠ steady-state SoT. Mongo ≠ «просто cache», если выбран hybrid (Mongo — канон records). Media/`background-media` ≠ home архива задач. Тихий dual-write office+repo как два SoT — запрещён. |

**Согласие ролей:** Архитектор — Принимаю; Teamlead — Принимаю; Музыкант — Принимаю; Верстальщик — Принимаю; Математик — Принимаю; Структурщик — Принимаю.

### Список посылок

1. **норма** — Владелец: холодный архив не обязан лежать в репозитории; допустим `background-office` на `mmbrn.tech` + MongoDB; в repo может оставаться небольшой hash/checkpoint-слепок.
2. **факт** — M0 ратифицирован владельцем: порядок `Q1 → Q3 → Q2 → Q5 → Q4 → Q6 → Q7`; M1 = Q1 Source of truth.
3. **факт** — Повестка M1 запрещает решать по существу Q2 checkpoint fields, Q3 evidence fields, Q5 write path, Q6 migration, Q7 insight lifecycle.
4. **факт** — `docs/insights/insight-task-archive-storage/INSIGHT.md` ранее предлагал `docs/tasks/archive.jsonl` как cold SoT (разгрузка `registry.json`).
5. **факт** — `docs/insights/insight-task-archive-storage/REVIEW.md` требовал atomic write, `timestamp`, `epic_id`; server API тогда оценивался как избыточный.
6. **факт** — `docs/BACKGROUND_SERVERS.md`: Linear/Claude — domain `background-office`; media не является домом для этого архива.
7. **норма** — Требование вердикта: ровно одна модель SoT из `{office-mongo, repo-jsonl, hybrid}`; назвать append-only / derived / fallback / forbidden; запрет подмены cold archive mutable task table.
8. **норма** — Инвариант sole author (как в смежных контурах dual-write): в нормальном режиме один author канонических records; checkpoint/export не становятся вторым SoT.

**Definition of Done (только M1 / Q1):**

- В протоколе зафиксирована ровно одна модель: **hybrid**.
- Таблица вердикта заполнена: SoT model, Canonical append-only operations, Derived views, Repo fallback condition, Forbidden interpretation.
- Секция **Список посылок** присутствует; входы не смешаны с выводами комнаты.
- Нет нормативных решений по полям checkpoint (Q2), evidence (Q3), write path (Q5), migration (Q6), insight lifecycle (Q7).
- Явный запрет: cold archive как mutable task table; repo JSONL как штатный SoT; media как home.

---

*Реплик в диалоге: 32; каждый участник высказался не менее одного раза.*

---

## Полное эхо повестки

# M1 — Source of truth для `task-archive-cold-store`

**P2 —** Что является каноническим source of truth холодного архива закрытых задач:
`background-office`/MongoDB append-only collection, repo JSONL, или гибрид, где сервер
хранит канонические records, а git хранит только проверяемый checkpoint; какие операции
являются append-only каноном, какие — производными представлениями, и при каких условиях
repo снова становится единственным источником истины? Вердикт обязан выбрать ровно одну
модель SoT, назвать границу append-only/derived, запретить подмену cold archive mutable
task table, и перечислить полный список посылок. **Не решать Q2 checkpoint fields, Q3
evidence fields, Q5 write path, Q6 migration и Q7 insight lifecycle по существу.**

Общее задание — [`BRIEF.md`](BRIEF.md).

## Уже ратифицировано владельцем

M0 установил и владелец ратифицировал порядок:

```text
Q1 -> Q3 -> Q2 -> Q5 -> Q4 -> Q6 -> Q7
```

M1 соответствует Q1 из M0: **Source of truth**.

## Границы вопроса

Нужно решить только:

- канонический дом закрытой задачи после архивации;
- является ли MongoDB collection в `background-office` SoT или только mirror/cache;
- является ли repo JSONL SoT или только fallback/export/checkpoint carrier;
- какие операции должны быть append-only по смыслу;
- какие материалы допускаются только как derived views или recovery exports;
- когда repo может временно/аварийно стать SoT.

Не решать здесь:

- форму repo checkpoint и поля ledger/manifest;
- полный evidence contract архивной записи;
- конкретный writer/idempotency key/API;
- migration map старых markdown/archive/registry;
- статус L/O у `insight-task-archive-storage`.

## Входы

- Владелец: холодный архив не обязан лежать в репозитории; возможен `background-office`
  на `mmbrn.tech` + MongoDB; в repo может оставаться небольшой hash/checkpoint-слепок.
- `docs/insights/insight-task-archive-storage/INSIGHT.md`: прежняя версия предлагала
  `docs/tasks/archive.jsonl` как cold SoT, чтобы разгрузить `registry.json`.
- `docs/insights/insight-task-archive-storage/REVIEW.md`: требуются atomic write,
  `timestamp`, `epic_id`; server API тогда считался избыточным.
- `docs/BACKGROUND_SERVERS.md`: Linear/Claude остаются domain `background-office`,
  media не является домом для этого архива.

## Требуемая форма вердикта

Таблица:

| Поле | Решение |
| --- | --- |
| SoT model | one of: office-mongo / repo-jsonl / hybrid |
| Canonical append-only operations | ... |
| Derived views | ... |
| Repo fallback condition | ... |
| Forbidden interpretation | ... |

После таблицы — обязательная секция **Список посылок**.

---

## Полное эхо вопроса

Вопрос P2: Что является каноническим source of truth холодного архива закрытых задач: background-office/MongoDB append-only collection, repo JSONL или hybrid, где сервер хранит канонические records, а git хранит только проверяемый checkpoint; какие операции являются append-only каноном, какие derived, и когда repo emergency SoT? Вердикт обязан выбрать одну модель SoT, назвать append-only/derived/fallback/forbidden и не решать Q2 checkpoint fields, Q3 evidence fields, Q5 write path, Q6 migration, Q7 lifecycle по существу.
