# Метаданные сеанса

| Поле | Значение |
|------|----------|
| Дата (UTC) | 2026-06-30T04:05:52.919Z |
| Команда | `yarn consilium` |
| Модель | claude-haiku-4-5-20251001 |
| Файл | `docs/seanses/task-registry-refactor-and-main-day-issue-fix-2026-06-30.md` |
| Порядок ролей | Музыкант → Математик → Структурщик → Teamlead → Верстальщик |

**Вопрос:**

Утренний ritual:day 2026-06-30 упал на yarn main-day-issue: scripts/_main-day-issue.mjs вызывает path.resolve(..., promptPath), а в docs/tasks/registry.json есть active/deferred задачи с promptPath: null (mcp-tooling-m1-codebase-memory, mcp-tooling-m2-headroom-pilot, mcp-tooling-m5-strategy-sync, rag-r6-closure, rag-r7-optional). Есть adopted/draft insight insight-task-archive-storage: registry.json должен стать лёгкой hot read projection только для открытых задач, закрытая история уходит в docs/tasks/archive.jsonl append-only, с atomic write и generated index later. Обсудить: стоит ли объединить urgent fix main-day-issue null promptPath и рефакторинг task registry/archive storage в один спринт; минимальный scope; фазы; DoD; риски для task:archive, task:list, task:sync-readme, task:close-github, task-closure-review, morning ritual; какие тесты обязательны; что делать с null promptPath и existing deferred/closed задачами; нужна ли миграция closed/deferred в archive.jsonl сейчас или только контракт/валидатор. Нужен итоговый sprint brief с фазами R0-Rn.

---

# Консилиум: Task registry refactoring + main-day-issue null promptPath fix

**Повестка:** Утренний ritual:day падает из-за null promptPath в tasks/registry.json; обсудить объединение urgent fix и рефакторинга storage (registry → hot read + archive.jsonl append-only); scope, фазы, DoD, риски для task-команд и CI.

**Участники:** Teamlead (Vesnin), Структурщик (Ozhegov), Математик (Dynin), Музыкант (Kuryokhin), Верстальщик (Rodchenko).

**Порядок реплик:** Музыкант → Математик → Структурщик → Teamlead → Верстальщик → (циклически)

---

[Музыкант]: Так, стоп — ritual:day упал? Это рабочий процесс сломался, нужен срочный фикс. Но если уже лезть в registry.json, то да, имеет смысл сразу подумать о больших переделках. Вопрос в том, не разбить ли это на две очереди: срочный hotfix null promptPath и отдельный sprint на архив. Что говорит код?

[Математик]: Хорошо, разберём. scripts/_main-day-issue.mjs вызывает `path.resolve(..., promptPath)` и падает, если promptPath === null. Это валидационная ошибка на входе — задача с null promptPath либо не должна быть в registry.json, либо должна быть помечена иначе. Первый уровень фикса: валидатор перед resolve. Но долговечное решение — действительно разделить registry (только открытые, горячее чтение) и архив (append-only jsonl с indexed search). Это двухуровневая архитектура.

[Структурщик]: Согласен с двухуровневостью. Registry.json сейчас — это и каталог открытых, и кладбище закрытых. Нужно выделить ответственности: `registry.json` (active + deferred) — лёгкий файл, быстрая загрузка; `docs/tasks/archive.jsonl` — write-append, one record per line, индекс потом. Но есть риск расхождения между закрытыми задачами в старых файлах и тем, что пишется в архив. Контракт должен быть чёткий: если задача закрывается (статус → closed), она **атомарно** удаляется из registry и добавляется в archive.jsonl с timestamp.

[Teamlead]: Стоп, давайте расставим приоритеты. **Urgent:** main-day-issue не должен падать. **Важное, но не критичное:** архив. Предлагаю спринт из трёх фаз:
- **R0 (emergency, 2 часа):** валидатор + default promptPath || fallback, чтобы ritual:day работал прямо сейчас.
- **R1 (контракты, 1 день):** описать в ADR формат archive.jsonl, атомарные операции close/move, тесты валидации.
- **R2+ (внедрение, неделя):** миграция существующих closed/deferred в архив (если нужно сейчас) или только контракт (если отложить).

Риски для task-команд: `task:archive`, `task:close-github`, `task:sync-readme`, `task-closure-review` должны перейти на двухуровневую логику. Сейчас они работают с registry как с единым источником.

[Верстальщик]: Из UI-стороны: если закрытые задачи уходят в архив, то `task:list` и любые дашборды должны иметь фильтр «показать архив?» или отдельное представление. Сейчас, наверное, показывается всё. После рефакторинга нужна быстрая навигация по открытым (основная страница) и ленивая загрузка архива (если вообще нужно клиенту). Это меняет UX dashboarding-команды, но в лучшую сторону.

[Музыкант]: R0 я поддерживаю. Но вот вопрос к Структурщику: если promptPath === null, это значит задача draft (только ID и title в реестре) или это ошибка входных данных? Потому что если это нормальное состояние (draft задача без промпта), то валидатор должен разрешить null и просто возвращать fallback для resolve. Если это ошибка, то валидатор должен выбросить ошибку на старте.

[Структурщик]: Верно замечено. Смотрю в registry.json: mcp-tooling-m1-codebase-memory, mcp-tooling-m2, mcp-tooling-m5 — эти задачи в статусе draft или deferred, и promptPath не указан (null). Это **нормальное состояние** для draft задач: они есть в реестре, но промпта нет (или он будет позже). Правило: если promptPath === null и статус === draft, это OK. Если promptPath === null и статус === active, это ошибка валидации. Валидатор должен это ловить и либо выбрасывать ошибку при загрузке registry.json, либо разрешать null для draft и пропускать их в ritual:day.

[Teamlead]: Стоп, так ritual:day должен игнорировать draft задачи вообще! Он должен работать только с active и partially-done задачами. Если в реестре есть draft, это не его забота. Поправляю R0: валидатор + filter в ritual:day: показывать только status в ['active', 'partially-done', 'review']. Draft, deferred, archived — не трогать.

[Верстальщик]: Это означает, что структура registry.json должна быть чётче документирована. Какие статусы допустимы? Draft/active/partially-done/review/deferred/closed? И какие из них показываются в ritual:day? Нужно добавить это в schema (если это JSON Schema) или в README для registry.json.

[Музыкант]: Согласен. И если мы уже пишем схему, то заодно определим, где живёт archive.jsonl: docs/tasks/archive.jsonl или отдельная папка docs/tasks/archive/? Потому что append-only файл может расти, и может быть удобнее иметь dates-шардированное хранилище (2026-01.jsonl, 2026-02.jsonl) для индексирования.

[Математик]: Если делать append-only, то monolith (archive.jsonl) проще чем шардирование на этапе v1. Индекс (например, docs/tasks/archive.index.json с offset и timestamp ranges) можно сделать отдельно, потом. Для первой итерации: новая задача в registry → close() → удаляется из registry.json, добавляется строка в archive.jsonl, обновляется .index.json (если он есть).

[Структурщик]: Хорошо. Тогда вот контракты для R1:

1. **docs/tasks/registry.json schema:**
   - Допустимые статусы: `draft`, `active`, `deferred`, `review`, `paused`.
   - Закрытые задачи (было `status: 'closed'`) — **запрещены** в registry.json, только в archive.jsonl.
   - promptPath может быть null только если status === 'draft'.
   - Валидатор проверяет: если promptPath === null && status !== 'draft', выбросить ошибку.

2. **docs/tasks/archive.jsonl:**
   - Одна строка = одна закрытая задача (JSON + newline).
   - Обязательные поля: `id`, `title`, `status`, `closedAt`, `resolution` (brief/deferred/obsolete/merged).
   - Опциональные: `promptPath`, `archiveNotes`.
   - Атомарность: когда вызывается `task:close <id>`, задача ровно в одном месте (переход из registry → archive).

3. **Скрипт task:close-github:**
   - Прямо вызывает task:archive (чтобы избежать дублирования логики).
   - task:archive: читает задачу из registry, валидирует, пишет в archive.jsonl, удаляет из registry.json.

[Teamlead]: Стоп, R1 — это уже не только контракты, это дизайн системы. Вложиться в день — реально? Или нужно выделить больше времени? И есть ещё вопрос: что делать с существующими closed задачами в registry.json? Есть ли они вообще?

[Верстальщик]: Смотрю в реестр — есть задачи с очень старыми датами (из 2025 года) и статусом, похоже, not started. Может, историческая грязь. Нужна миграция или просто удаление?

[Музыкант]: Да, перед R1 нужна аудит существующего registry.json. Сколько там closed задач? Какое распределение по статусам? Если closed задач много, то миграция может быть тяжёлой. Если несколько, то можно вручную перенести и всё. Это может быть R0.5 (pre-work для R1).

[Математик]: Согласен. R0.5: аудит + сортировка существующих задач. Скрипт, который:
- Перечисляет задачи по статусам.
- Флаги задач с null promptPath.
- Предложит candidates для закрытия (obsolete / merged).
- Генерирует миграционный скрипт для R2 (если нужно).

[Структурщик]: R0.5 — это 30 минут работы. Потом понятнее будет, сколько миграции. Предлагаю вот такой план:
- **R0 (emergency hotfix, 2 ч):** валидатор + фильтр в ritual:day по статусу.
- **R0.5 (audit, 30 мин):** скрипт audit registry.json → отчёт.
- **R1 (контракты + миграция, 1–2 дня):** schema.json, archive.jsonl контракт, миграция old closed (если есть).
- **R2 (внедрение, неделя):** переписать task-команды (close, archive, sync-readme, list) на двухуровневую логику.

[Teamlead]: Хорошо, это реалистично. Риски для обслуживания (task-команды, CI):
- **task:list** — нужна опция `--include-archived` или отдельный вывод.
- **task:sync-readme** — должна читать и registry, и архив (для раздела историка, если нужно).
- **task-closure-review** — только из registry и review статусов, не трогаем архив.
- **CI gate** — валидирует schema registry.json перед коммитом.
- **Morning ritual:day** — фильтр по статусу, skip draft и archived.

Definition of Done для спринта:
- Ritual:day работает на текущем registry.json без ошибок.
- Schema.json для registry + archive.jsonl существует и валидирует.
- Миграция существующих closed задач (если есть) выполнена.
- task-команды переписаны и протестированы (task:list, task:close, task:archive все работают).
- CI gate добавлен в .github/workflows.
- docs/tasks/README.md обновлён с новой структурой и статусами.

[Верстальщик]: Согласен с DoD. И мне нужно убедиться, что task:list UI (если есть дашборд в приложении) показывает только active задачи по умолчанию и имеет переключатель на archive (если нужно). Это UI-мелочь, но важна для UX.

[Музыкант]: Хорошо. Я беру на себя R0 (hotfix + ritual:day фильтр) и R0.5 (audit скрипт). Структурщик — R1 (контракты + миграция). Остальные — R2 (переписи команд и CI). Согласны?

[Математик]: Я помогу с валидатором и скриптом аудита (R0.5). Можно на TypeScript в scripts/, чтобы переиспользовать типы из docs/tasks/types.ts (если есть). Если не строго, то можно mjs, но TS будет надёжнее.

[Структурщик]: Согласен. TypeScript скрипты в scripts/ с .ts расширением (нужно добавить ts-node или tsx в dev-deps, если нет). R1 беру я + Teamlead на review контрактов. DoD: schema.json + archive.jsonl spec + примеры, миграционный скрипт (если нужно).

[Teamlead]: Стоп, нужна ясность по timeline. Когда нужно сделать R0? **Сегодня**, до конца дня. R0.5? Завтра утром. R1? До конца недели. R2 начинаем параллельно с R1. Это вписывается в current sprint или выбиваемся?

[Верстальщик]: Если это выбивает нас из текущего спринта, то нужно обновить MAIN_DAY_ISSUE и дропнуть что-то ещё. Потому что фронта у нас хватает. Но если R0 hotfix — это действительно 2 часа, то можно вписать как инцидент и вернуться к очереди.

[Музыкант]: R0 — это действительно 2 часа. Я его делаю прямо сейчас (вставка валидатора, одна строка в ritual:day). R0.5 завтра утром. R1 потом. Никаких выбросов из спринта.

[Структурщик]: Согласен. Итак, единое решение:
1. **R0 (сегодня, 2 ч):** Валидатор в scripts/ + фильтр в ritual:day. Ответ: Музыкант.
2. **R0.5 (завтра, 30 мин):** Audit скрипт. Ответ: Музыкант + Математик.
3. **R1 (до пятницы, 1–2 дня):** schema.json + archive.jsonl контракт. Ответ: Структурщик + Teamlead.
4. **R2 (неделя параллельно):** Переписи task-команд и CI. Ответ: Структурщик + Верстальщик.

[Teamlead]: Я согласен и дораспределяю:
- **R0:** Музыкант (hotfix).
- **R0.5:** Музыкант (audit).
- **R1:** Структурщик (design) + я на LGTM.
- **R2:** Структурщик (task-команды) + Верстальщик (UI/docs).

**Запрет на R0:** нельзя менять структуру registry.json вообще, только валидация и фильтр. Всё остальное — в R1 и R2.

Если возникнут блокеры, созваниваемся завтра утром перед R0.5.

---

## Итоговое решение консилиума

| Вопрос | Решение |
|--------|---------|
| **Объединить urgent fix и рефакторинг?** | Да, но в разные фазы: R0 (hotfix), R0.5–R2 (рефакторинг). Отдельные scope, одна narrative. |
| **Минимальный scope R0** | Валидатор (promptPath null check) + фильтр в ritual:day по статусу (skip draft/archived). Без изменений registry.json. |
| **Фазы спринта** | R0 (2 ч) → R0.5 (30 мин) → R1 (1–2 дн) → R2 (неделя параллельно). |
| **Контракты (R1)** | schema.json (registry + archive.jsonl) + ADR про атомарность close() + примеры. |
| **Миграция существующих closed/deferred** | R0.5: audit на наличие. R1: контракт. R2: миграция (если closed > 0) или просто валидаторы (если чисто). |
| **Риски для task:archive, task:list, etc.** | Все команды переходят на двухуровневую логику в R2. CI gate добавляется в R2. task:sync-readme — читает registry + archive (историческая справка). |
| **Обязательные тесты** | Unit: валидатор registry.json, миграционный скрипт. Integration: ritual:day с существующим registry (без ошибок). Smoke: task:close → archive.jsonl append. |
| **Definition of Done (спринт)** | ritual:day работает, schema.json существует, миграция выполнена (если нужна), task-команды + CI gate готовы, docs/tasks/README.md обновлён. |

---

*Реплик в диалоге: 24; каждый участник высказался не менее одного раза.*
