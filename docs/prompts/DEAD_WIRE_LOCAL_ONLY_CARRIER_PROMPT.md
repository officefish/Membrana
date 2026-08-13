# Промпт: Dead-wire: класс носителя вне git (gitignored) невыразим словарём pending — новая причина local-only-carrier

> **Task-промпт для агента-разработчика** (Cursor IDE / Claude / другой LLM).
> Процесс постановки: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).
> Скопируй блок **«Промпт целиком»** в начало диалога. Размер задачи: **S**.
> Ожидаемый артефакт: **1 PR** — новая причина словаря + учёт gitignore в предикате + тесты.
> Реестр: `id` = `dead-wire-local-only-carrier` в [`docs/tasks/registry.json`](../tasks/registry.json).

---

## Контекст

Вещдок 13.08: команда `cabinet:mp7:prod` несёт носитель `scripts/_ssh-cabinet-mp7-prod.mjs`,
который существует локально, но сознательно held вне git (`.gitignore:88`,
паттерн `scripts/_ssh-*.mjs` — деплой-скрипты с чувствительными адресами). Закрытый
словарь `PENDING_REASONS` (`scripts/lib/dead-wire.mjs`) такое состояние не выражает:
локальный `yarn dead-wire:check` видит носитель и требует снять pending-запись
(`pending_orphan`), CI без файла требует её держать (`dead_wire`). Утром 13.08 снятие
записи уронило CI PR #1904; откат `9132907c`. Пока класс не выражен, каждое утро с
локальным носителем спотыкается о честный красный на шаге dead-wire ритуала.

**Связанные документы:**

| Документ | Зачем |
|----------|--------|
| [`scripts/lib/dead-wire.mjs`](../../scripts/lib/dead-wire.mjs) | Чистое ядро предиката, словарь причин |
| [`scripts/dead-wire-check.mjs`](../../scripts/dead-wire-check.mjs) | Обвязка: fs, package.json, каталоги |
| [`docs/tasks/dead-wire-pending.json`](../tasks/dead-wire-pending.json) | Реестр pending (ратифицирован владельцем) |
| [`docs/tasks/SYNC_INVARIANTS.md`](../tasks/SYNC_INVARIANTS.md) | Стиль инвариантов реестров |

**GitHub Issue:** — (не заведён; чеканить при взятии в работу)

---

## Промпт целиком (для вставки агенту)

> Всё ниже до раздела **«Заметки для человека-постановщика»** — текст задания для агента.

---

### Кто ты

Ты — **координатор виртуальной команды Membrana** под руководством **Vesnin** (Teamlead). Перед кодом — краткий план (1–2 абзаца + список файлов). Соблюдай [`VIRTUAL_TEAM_PROMPT.md`](../VIRTUAL_TEAM_PROMPT.md) и [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).

---

### Что построить (продуктовое описание)

1. Новая причина словаря `PENDING_REASONS`: `local-only-carrier` — носитель сознательно
   вне git (gitignored), провод жив локально и легально отсутствует в CI.
2. Семантика: запись с этой причиной НЕ даёт `pending_orphan` при живом носителе и НЕ
   даёт `dead_wire`/`pending_expired` при отсутствующем; протухание — не по `until`,
   а по выпадению паттерна из `.gitignore` (тогда запись обязана уйти).
3. Предикат честности: `local-only-carrier` легален только если путь носителя реально
   покрыт паттерном `.gitignore` — иначе `pending_invalid` (причина названа ложно).
4. Перевести запись `cabinet:mp7:prod` на новую причину — оба прогона (локальный и CI)
   зелёные одной и той же записью.

---

### Архитектура / контракт

| Слой | Путь | Ответственность |
|------|------|-----------------|
| Чистое ядро | `scripts/lib/dead-wire.mjs` | Словарь, `checkWire` — знание «gitignored?» приходит инъекцией, ядро без fs |
| Обвязка | `scripts/dead-wire-check.mjs` | Чтение `.gitignore` / `git check-ignore`, инъекция в ядро |
| Реестр | `docs/tasks/dead-wire-pending.json` | Запись переводится на новую причину |

**Запрещено:**

- Коммитить `_ssh-*`-носители в git «чтобы CI видел».
- Ослаблять существующие роды находок (закрытые списки остаются закрытыми).
- fs/process в чистом ядре.

---

### Тесты

| Область | Минимум |
|---------|---------|
| Ядро | local-only + носитель есть → тихо; носитель отсутствует → тихо; путь не gitignored → `pending_invalid` |
| Обвязка | инъекция gitignore-предиката из живого `.gitignore` |
| Регресс | существующие 31 тест dead-wire не тронуты |

---

### Definition of Done

- [ ] Локальный `yarn dead-wire:check` и CI-прогон зелёные одной записью `cabinet:mp7:prod`.
- [ ] `node --test scripts/dead-wire.test.mjs` — зелёный, новые случаи покрыты.
- [ ] `yarn turbo run lint typecheck test build --continue` — зелёный (или указать scope).
- [ ] LGTM Teamlead.

---

### Out of scope

- Ротация/содержимое самих `_ssh-*`-скриптов.
- Пересмотр недельного такта ратификации pending-реестра.

---

### Порядок работы ролей

1. **Teamlead** — план, границы ядро/обвязка.
2. **Структурщик** — формулировки словаря и норм (причина = закрытый перечень, не проза).
3. **Математик** — предикат честности local-only (инъекция, без fs в ядре).
4. **Музыкант** — не задействован (нет DSP).
5. **Верстальщик** — не задействован (нет UI).

---

### Формат ответа координатора (планирование)

```text
[Teamlead]: …
[Структурщик]: …
[Математик]: …

Итоговый артефакт: …
Definition of Done: …
```

---

## Заметки для человека-постановщика

1. GitHub Issue (`imperfection`) + ссылка на этот файл — при взятии в работу.
2. Запись в `docs/tasks/registry.json` уже есть (`status: active`, 13.08).
3. После merge: отчёт в Issue → `yarn task:archive dead-wire-local-only-carrier --notes "…"`.

### Проверка после PR

```bash
yarn dead-wire:check
node --test scripts/dead-wire.test.mjs
```

---

## Связь с дорожной картой

- Контур `weekly-dead-wire-audit` (#1447) — недельная процедура «мёртвые провода».
- Утренний ритуал: шаг sync-check перестаёт спотыкаться о локальные деплой-носители.
