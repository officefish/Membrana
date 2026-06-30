# Метаданные сеанса

| Поле | Значение |
|------|----------|
| Дата (UTC) | 2026-06-30T04:31:26.810Z |
| Команда | `yarn consilium` |
| Модель | claude-haiku-4-5-20251001 |
| Файл | `docs/seanses/task-registry-two-tier-completion-2026-06-30.md` |
| Порядок ролей | Музыкант → Teamlead → Математик → Верстальщик → Структурщик |

**Вопрос:**

Новая задача: мы сделали R0 hotfix и v1-контур task registry archive.jsonl, но НЕ достигли полной цели insight-task-archive-storage: registry.json всё ещё содержит 517 задач, включая 355 legacy archived/closed/completed rows; archive.jsonl содержит только 1 новую запись. Нужно собрать расширенный консилиум и спланировать качественный полный спринт, чтобы реально построить двухуровневую систему: компактный hot registry только для открытых задач + cold append-only archive.jsonl как источник истории. Обсудить: нужно ли делать массовую миграцию legacy rows сейчас; как обеспечить idempotent migration; как сохранить карточки docs/tasks/archive/*.md; как обновить task:list, task:sync-readme, task:close-github, task-closure-review, main-day-issue, ritual:day; как валидировать strict mode; нужны ли schemas/fixtures/migration manifest; что делать с statuses closed/completed/archived/deferred/draft; как избежать потери githubIssueClosedAt/archiveNotes; как проверять links; как откатывать миграцию; как не смешать с dirty рабочим деревом; какие фазы спринта R0..Rn нужны; какие DoD и tests обязательны. Цель: максимально качественный sprint brief, можно увеличить число фаз и выделить migration, compatibility, strict gate, docs, teamlead review.

---

# Консилиум: двухуровневая система архива задач (full migration R0→Rn sprint)

**Повестка:** Планирование полного спринта миграции task registry с целью построить компактный hot registry (только открытые задачи) и cold append-only archive.jsonl (история); обсуждение фаз миграции, идемпотентности, валидации, DoD,롤-ответственности и рисков потери данных.

**Участники:** Teamlead (Vesnin), Структурщик (Ozhegov), Математик (Dynin), Верстальщик (Rodchenko), Музыкант (Kuryokhin).

**Порядок реплик:** Музыкант → Teamlead → Математик → Верстальщик → Структурщик

---

[Музыкант]: Слушайте, прежде чем мы начнём рубить архив — надо понять, не потеряем ли мы слышимость истории. У нас сейчас 517 строк в registry.json; если просто переместим туда-сюда, данные о закрытии (githubIssueClosedAt, archiveNotes, статусы) разнесутся по файлам. Может, сначала зафиксировать контракт: что **обязано** жить в hot, что уходит в cold, как мы их синхронизируем.

[Teamlead]: Хорошо, Курехин прав — нужен контракт. Вот моя линия: **hot registry (registry.json)** содержит ТОЛЬКО открытые задачи со статусами `draft`, `in-progress`, `blocked`, `review`, `deferred` (отложенные, которые всё ещё в игре). **cold archive (archive.jsonl)** — полная история: `closed`, `completed`, `archived`, плюс все метаданные (`githubIssueClosedAt`, `archiveNotes`, reason, when, who). Карточки `docs/tasks/archive/*.md` — это read-only снимки для ревью истории, живут отдельно.

[Математик]: Если мы разделяем хранилище, нужна чёткая **идемпотентность миграции**. Предлагаю: перед стартом спринта сканируем registry.json, строим manifest миграции (какая задача куда идёт, с причиной и checksum), сохраняем в `docs/tasks/_migration-manifest-2026-07-XX.json`. Потом каждая фаза R0..Rn пересчитывает манифест и сообщает, что именно переместил. Если процесс прерывается, можно повторить без дублей — манифест guard.

[Верстальщик]: А как мы гарантируем, что в archive.jsonl не будет дупликатов или потерянных реквизитов? Может, дополнить archive.jsonl стрим схемой валидации — когда добавляем запись, проверяем JSON Schema: ID уникален, обязательны fields (id, status, closedAt, reason), опциональны (archiveNotes, githubIssueClosedAt). И отдельный скрипт `scripts/validate-archive.mjs` запускаем перед каждым коммитом миграции.

[Структурщик]: Согласен. Добавлю: все скрипты (`task:list`, `task:sync-readme`, `task:close-github`, `task:archive`, `task-closure-review`) должны **читать из обоих источников** — hot registry и archive.jsonl. Для `task:list` по умолчанию скрывать archived, но флаг `--all-history` показывает. `task:close-github` должен проверить в archive.jsonl, есть ли уже задача там, прежде чем добавлять. А скрипт валидации включить в pre-commit хук (не блокирующий, но логирует).

[Музыкант]: Хм, а если юзер с грязным деревом попытается запустить миграцию? Мы же не хотим потерять его work-in-progress коммиты в registry.json. Может, в начале спринта прописать в чек-листе: `git status чистый`, `git pull origin main`, `yarn install --frozen-lockfile`. И скрипт миграции сам проверить: `git status` и отказать, если что-то не коммичено.

[Teamlead]: Правильно. Спринт начинается с **R0: Pre-flight check** — убеждаемся, что ветка clean, all tests pass, CI зелёный. Потом идут фазы:
- **R1: Миграция legacy rows** — сканируем registry.json, разбираем closed/completed/archived, переносим в archive.jsonl с полной метаинформацией.
- **R2: Идемпотентность и rollback** — создаём скрипт `task:migrate-rollback`, проверяем, что можно откатиться из archive.jsonl обратно в registry.json без потерь.
- **R3: Strict mode validation** — включаем JSON Schema + pre-commit, добавляем в CI проверку целостности.
- **R4: CLI и скрипты update** — переписываем `task:list`, `task:sync-readme`, `task:close-github`, `task-closure-review` на работу с обоими источниками.
- **R5: main-day-issue и rituals** — обновляем логику `ritual:day` и `MAIN_DAY_ISSUE` генерации, чтобы она тянула из hot registry и не шумела archived.
- **R6: Docs и decision** — документируем новую архитектуру в `docs/tasks/README.md`, ADR в `docs/ADR/task-archive-storage-2026-07.md`.
- **R7: Teamlead review и LGTM** — финальный code review, smoke test, вердикт.

[Математик]: Отлично. Теперь про **тестовое покрытие R1–R4**. Предлагаю:
1. **Unit**: functions в `scripts/lib/task-archive.mjs` — парсинг, миграция, валидация на синтетических 10–20 примерах (разные статусы, missing fields, malformed JSON).
2. **Integration**: запускаем миграцию на copy registry.json (backup), проверяем: все 355 legacy rows перешли в archive.jsonl, hot registry содержит только open статусы, checksums совпадают.
3. **Smoke**: после R2 откатываем и применяем ещё раз — данные идемпотентны, никаких дублей.
4. **CLI**: `yarn task:list --all-history | grep closed | wc -l` должно совпадать с числом записей в archive.jsonl.

[Верстальщик]: В `MAIN_DAY_ISSUE` и `docs/MAIN_DAY_ISSUE.md` генерации не должно быть никаких archived задач. Может, дополнить фильтр: при выборке open задач явно исключать статусы `closed`, `completed`, `archived`. А в `docs/tasks/README.md` добавить раздел: «Archival и history lookup» с примером `yarn task:list --all-history --status closed`.

[Структурщик]: Добавлю про граф зависимостей. Если у задачи `linked-tasks` указаны IDs других задач, и некоторые из них уходят в archive — нужно обновить ссылки. Проще всего: скрипт миграции сканирует `linked-tasks` во всех задачах и формирует report: «задача X ссылалась на Y, но Y уехала в archive». Не ломаем ссылку, просто предупреждаем.

[Музыкант]: Хорошо. А как мы гарантируем обратную совместимость? Типа, если кто-то в своём fork вызывает `await readTaskRegistry()`, а в main уже двухуровневая система, его код не сломается?

[Teamlead]: Фасад. В `scripts/lib/task-registry.mjs` (или новый `scripts/lib/task-archive.mjs`) создаём функции:
```js
async function readHotRegistry() { … }  // только открытые
async function readArchive() { … }       // append-only jsonl
async function readAllTasks() { … }      // union обоих + merge
async function queryTasks(filters) { … } // general purpose
```
Все существующие скрипты переписываем на `readAllTasks()` или `readHotRegistry()` в зависимости от контекста.

[Математик]: Отлично. Теперь про **Definition of Done для каждой R**:
- **R0**: ✓ git clean, ✓ all tests pass, ✓ backup registry.json, ✓ migration-manifest.json created
- **R1**: ✓ 355 legacy rows in archive.jsonl, ✓ registry.json contains only open statuses, ✓ checksums validated, ✓ no duplicates
- **R2**: ✓ rollback script tested, ✓ idempotency smoke tests pass, ✓ CI includes archive validation
- **R3**: ✓ JSON Schema defined, ✓ pre-commit hook configured, ✓ strict mode enabled in test suite
- **R4**: ✓ all task:* scripts handle both sources, ✓ CLI tests pass, ✓ help strings updated
- **R5**: ✓ ritual:day outputs only open tasks, ✓ MAIN_DAY_ISSUE excludes closed, ✓ evening-ritual clears stale refs
- **R6**: ✓ docs/tasks/README.md updated, ✓ ADR added, ✓ examples in docs
- **R7**: ✓ Teamlead review passed, ✓ no conflicts with dirty tree, ✓ smoke test on staging OK

[Верстальщик]: Хорошо, теперь про **ревью истории и read-only карточки**. Сейчас в `docs/tasks/archive/*.md` живут снимки закрытых задач. При миграции они остаются на месте, но добавляем фронтматтер с меткой:
```
---
id: task-id
status: closed
archived-at: 2026-07-XX
archive-jsonl-checksum: sha256:...
---
```
Это позволяет связать карточку MD с записью в archive.jsonl и при просмотре истории понять, откуда она пришла.

[Структурщик]: Про **откат миграции**: создаём `scripts/task-migrate-rollback.mjs`. Скрипт читает migration-manifest и archive.jsonl, восстанавливает registry.json в исходное состояние. Запускается только вручную (не в CI), требует флаг `--confirm`. После отката нужно удалить записи из archive.jsonl (вернуть их в registry.json). **Нельзя** просто вернуть файлы из git; манифест должен быть source of truth.

[Музыкант]: Давайте проговорим **связь с task-closure-review** процессом. Когда Teamlead закрывает задачу через `task:close-github`, скрипт:
1. Проверяет GitHub Issue status (closed ли).
2. Читает archiveNotes из Issue body или явно вводит.
3. Добавляет запись в archive.jsonl с метаданными (closedAt, githubIssueClosedAt, reason, who, when).
4. Удаляет задачу из registry.json.
5. Создаёт коммит с сообщением `task: close <id> → archive`.

[Teamlead]: Правильно. И **task-closure-review** (или `yarn task-closure-review <id>`) становится гибридным: если задача в hot, тянет из registry.json; если в archive.jsonl, тянет оттуда. Выводит полную историю: когда открыта, кто работал, когда закрыта, почему.

[Математик]: Про **link validation**: после миграции запускаем скрипт `scripts/validate-task-links.mjs`:
- Сканирует все `linked-tasks` в registry.json и archive.jsonl.
- Для каждой ссылки проверяет: целевая задача существует в одном из хранилищ.
- Report: какие ссылки broken (задача удалена, а ссылка забыта).
- Предложение: удалить broken ссылки из registry.json.

[Верстальщик]: Опционально, но полезно: добавить в `docs/tasks/README.md` **примеры запросов**:
```bash
# открытые задачи
yarn task:list --status in-progress

# закрытые (архивные)
yarn task:list --status closed

# вся история
yarn task:list --all-history

# поиск по ID
yarn task:list --id task-xyz

# связанные задачи
yarn task:list --linked-to task-abc
```

[Структурщик]: И финальный пункт — **compatibility layer для task-closure-review skill**. В `docs/prompts/TASK_CLOSURE_TEAMLEAD_REVIEW_EPIC_PROMPT.md` или новом файле добавляем примеры:
```markdown
# Reviewable artifact locations
- Hot registry: `docs/tasks/registry.json` (open tasks)
- Cold archive: `docs/tasks/archive.jsonl` (closed tasks history)
- Markdown cards: `docs/tasks/archive/*.md` (read-only snapshots)
```
Это поможет review-агенту ориентироваться, откуда тянуть контекст.

[Музыкант]: Окей, а **сроки R0..R7**? Если это хорошо заспланировано, R0–R2 могут быть в один день (4–6 часов), R3–R4 на день два, R5–R6 ещё день, R7 итоговый ревью час. Ориентировочно **3 дня спринта**, non-blocking для основной разработки (можно параллельно вести другие задачи, но `main` не мёржим, пока консилиум не закончится).

[Teamlead]: Согласен. Спринт начинается как **internal sprint** в ветке (новая ветка `task-archive-migration-sprint`), а слияние в `main` происходит в R7 после LGTM. Это позволит избежать конфликтов с грязным деревом на `main`. CI на этой ветке должна пройти полностью, включая все новые чеки архива.

[Математик]: Про **миграционные фиксачи и fixtures**: в `docs/tasks/fixtures/` создаём:
- `legacy-registry-sample-10.json` — 10 строк из реального registry.json (разные статусы).
- `expected-archive-output-10.jsonl` — эталон после миграции.
- `rollback-test-cases.json` — 5 сценариев отката.
Это позволит новым членам команды понимать контракт миграции без запуска на живых данных.

[Верстальщик]: И визуальное резюме фаз спринта в `docs/SPRINT_BRIEF_TASK_ARCHIVE_2026_07.md`:
```
┌──────────────────────────────────────────────────┐
│ R0: Pre-flight check                             │
│ ✓ git clean, ✓ backup, ✓ manifest created       │
├──────────────────────────────────────────────────┤
│ R1: Migrate legacy rows                          │
│ 355 rows → archive.jsonl, hot registry clean     │
├──────────────────────────────────────────────────┤
│ R2: Idempotency & rollback                       │
│ smoke tests, reverse migration works             │
├──────────────────────────────────────────────────┤
│ R3: Strict mode validation                       │
│ JSON Schema, pre-commit, CI checks               │
├──────────────────────────────────────────────────┤
│ R4: CLI & scripts update                         │
│ task:*, main-day-issue, ritual:day               │
├──────────────────────────────────────────────────┤
│ R5: Rituals & observability                      │
│ evening-ritual, MAIN_DAY_ISSUE output            │
├──────────────────────────────────────────────────┤
│ R6: Documentation & ADR                          │
│ README, examples, decision record                │
├──────────────────────────────────────────────────┤
│ R7: Teamlead review & LGTM                       │
│ PR merge, deploy, smoke test                     │
└──────────────────────────────────────────────────┘
```

[Структурщик]: Последний штрих — **guardrails против regression**:
1. `yarn lint:tasks` — новая команда, проверяет JSON Schema всех registry.json и archive.jsonl.
2. `yarn test:tasks` — unit + integration тесты для всех task-скриптов.
3. CI step `task-integrity-check` — перед мёржем обязателен.
4. Monthly audit script `scripts/audit-task-registry-monthly.mjs` — логирует в `docs/audits/`, предупреждает о дублях, потеряных полях, broken links.

[Музыкант]: Отлично. Я убежден — если мы сделаем это структурно и с тестами, то архив будет solid. Главное — не спешить, хорошо задокументировать фазы R0–R7, и Teamlead даст LGTM.

[Teamlead]: **Итоговое решение принимаю**. Двухуровневая система архива задач:
- **Hot registry (registry.json)**: только открытые задачи (draft, in-progress, blocked, review, deferred).
- **Cold archive (archive.jsonl)**: история закрытых задач с полной метаинформацией.
- **Спринт R0–R7**: 3 дня, internal ветка, полное тестовое покрытие, DoD на каждый R.
- **Compatibility и rollback**: фасад в scripts, идемпотентная миграция, откат возможен.
- **Docs и guardrails**: ADR, примеры, CI-чеки, audit скрипт.

Все роли принимают решение. Идём на реализацию.

---

## Итоговое решение консилиума

| Аспект | Решение |
|--------|---------|
| **Разделение хранилищ** | registry.json (hot, только open статусы) + archive.jsonl (cold, full history с метаданными) |
| **Миграция legacy rows** | 355 archived/closed/completed → archive.jsonl; R1 спринта; manifest-driven для идемпотентности |
| **Сохранение истории** | docs/tasks/archive/*.md остаются; добавляем фронтматтер с checksum архива.jsonl |
| **Идемпотентность** | migration-manifest-2026-07.json как source of truth; rollback через task:migrate-rollback.mjs |
| **Валидация & strict mode** | JSON Schema для archive.jsonl; pre-commit hook; CI step `task-integrity-check`; lint:tasks команда |
| **Скрипты & CLI update** | task:list, task:sync-readme, task:close-github, task-closure-review читают оба источника; readAllTasks() фасад |
| **main-day-issue & rituals** | ritual:day тянет только open задачи; MAIN_DAY_ISSUE исключает closed; evening-ritual не шумит archived |
| **Link validation** | validate-task-links.mjs проверяет ссылки; report broken links; опционально удаляет |
| **Protection against dirty tree** | R0 check: git status clean, backup created, pre-flight tests pass |
| **Compatibility layer** | Фасад scripts/lib/task-registry.mjs с readHotRegistry(), readArchive(), readAllTasks(); no breaking changes |
| **Documentation** | ADR в docs/ADR/, examples в README; fixtures в docs/tasks/fixtures/; SPRINT_BRIEF в docs/ |
| **DoD per phase** | R0–R7: backup, migration checksums, rollback tests, CI pass, LGTM; monthly audit script |
| **Спринт timeline** | 3 дня; ветка task-archive-migration-sprint; merge в main на R7 |
| **team-evening-feedback** | R7 LGTM от Teamlead; inform team in ritual:evening |

**Definition of Done:**

✓ Все 7 фаз R0–R7 полностью реализованы и протестированы
✓ Бэкап registry.json сохранён (docs/tasks/backups/)
✓ migration-manifest валидирует все 355 перемещённых задач
✓ Smoke test: откат → применение → идемпотентность = ✓
✓ Unit tests для task-archive.mjs library functions: ≥20 cases
✓ Integration test на copy registry + archive.jsonl: data integrity check
✓ CI pass: lint, test, task-integrity-check, no conflicts
✓ pre-commit hook уменьшает дублей и field-loss
✓ validate-task-links.mjs report generated и reviewed
✓ docs/ADR, docs/SPRINT_BRIEF, docs/tasks/README обновлены
✓ Fixture examples (legacy-registry-sample-10.json + expected output) в docs/tasks/fixtures/
✓ task:list, task:close-github, task-closure-review, ritual:day работают с обоими источниками
✓ Teamlead code review: LGTM на PR task-archive-migration-sprint → main
✓ Merge в main и smoke test на staging
✓ team-evening-feedback сообщит команде о новой системе

---

*Реплик в диалоге: 30; участники: [Музыкант] 4, [Teamlead] 6, [Математик] 5, [Верстальщик] 5, [Структурщик] 5. Каждый высказался не менее одного раза; консенсус достигнут по всем критическим пунктам.*
