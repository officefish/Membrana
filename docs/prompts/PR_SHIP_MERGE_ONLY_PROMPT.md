# Промпт: pr:ship --merge-only — безопасный мердж уже открытого PR + норма против raw gh pr merge --delete-branch

> **Task-промпт для агента-разработчика** (Cursor IDE / Claude / другой LLM).
> Процесс постановки: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).
> Размер задачи: **S**. Ожидаемый артефакт: **1 PR** — режим `--merge-only` у `pr:ship` + норма в skill/CLAUDE.md.
> Реестр: `id` = `pr-ship-merge-only` в [`docs/tasks/registry.json`](../tasks/registry.json).

---

## Контекст

`yarn pr:ship` (#653) уже кодирует безопасный мердж из worktree: `gh pr merge --squash`
**без** `--delete-branch` (чекаут base падает, когда base держит соседний worktree),
remote-ветка удаляется отдельным optional-шагом, ff-sync пропускается, если base занят
другим деревом. Но `pr:ship` предполагает, что PR он **создаёт сам** (шаги
branch→commit→push→pr-create→merge). Когда PR **уже открыт** (типовой случай: ревью
прошло отдельно), этот путь недостижим — агент тянется к `gh pr merge --delete-branch`
руками и получает `fatal: 'main' is already used by worktree at …` **после уже
успешного мерджа** (ложный красный, #700; живой инцидент — закрытие #696 / PR #697).

Не трогаем: логику создания PR, гейт closes-keyword, pr-wait, sync-стратегию — они уже
верны и покрыты тестом.

**GitHub Issue:** [#700](https://github.com/officefish/Membrana/issues/700)

---

## Что построить

1. Режим `pr:ship --merge-only`: пропускает branch/commit/push/pr-create, оставляет
   только merge-хвост (`ci-wait` → `gh pr merge --squash` без `--delete-branch` →
   `branch-cleanup` remote → worktree-aware `sync`). Мёржит PR текущей ветки.
2. Норма в skill `membrana-ship` и `.claude/CLAUDE.md`: мердж — только через `yarn
   pr:ship`; raw `gh pr merge --delete-branch` из feature-worktree запрещён; если raw
   `gh` неизбежен — факт мерджа проверять `gh pr view <N> --json state`, а НЕ по exit code.

---

## Архитектура / контракт

| Слой | Путь | Ответственность |
|------|------|-----------------|
| планировщик | `scripts/pr-ship.mjs` (`planPrShip`) | флаг `mergeOnly` → шаги = только merge-хвост; чистая функция |
| CLI | `scripts/pr-ship.mjs` (`parseArgs`/`main`) | `--merge-only`; гуард на несовместимость с `--branch`/`--no-commit`/`--type` |
| тест | `scripts/pr-ship.test.mjs` | merge-only даёт merge-хвост без branch/commit/push/pr-create |
| норма | `.cursor/skills/membrana-ship/SKILL.md`, `.claude/CLAUDE.md` | запрет raw merge, verify-by-state |

**Запрещено:**

- Оставлять `--delete-branch` в merge-шаге (корень падения).
- Ронять флоу по неуспеху remote branch-cleanup (шаг optional).
- Требовать `--type/--message` в merge-only (PR уже есть — сообщение не нужно).

---

## Тесты

| Область | Минимум |
|---------|---------|
| planPrShip | `--merge-only` → steps без branch/commit/push/pr-create; merge присутствует, без `--delete-branch` |
| planPrShip | merge-only + branch-cleanup remote-ветки текущей ветки (optional) |
| guard | merge-only несовместим с `--branch` (или `--type`) → внятная ошибка |

---

## Definition of Done

- [ ] `pr:ship --merge-only` печатает только merge-хвост; dry-run по умолчанию.
- [ ] Merge-шаг без `--delete-branch`; sync worktree-aware (как в основном флоу).
- [ ] Юнит-тесты на merge-only зелены.
- [ ] Норма зафиксирована в `membrana-ship` SKILL и `.claude/CLAUDE.md`.
- [ ] `node --test scripts/pr-ship.test.mjs` — зелёный.
- [ ] LGTM Teamlead.

---

## Out of scope

- Мердж по номеру чужого PR (merge-only мёржит PR **текущей** ветки — как и весь pr:ship).
- Изменение sync-стратегии и pr-wait.
- Автоматический guard внутри `gh` (невозможно — gh внешний).

---

## Порядок работы ролей

1. **Teamlead** — размер S, консилиум не нужен (механика по готовому канону pr:ship/#653).
2. **Структурщик** — merge-хвост не дублировать: вынести общий для обоих режимов.
3. **Математик** — набор шагов детерминирован флагами; покрыть таблицей режимов.
4. **Музыкант** — н/п.
5. **Верстальщик** — н/п.

---

## Формат ответа координатора (планирование)

```text
[Teamlead]: S, без консилиума — механика по канону pr:ship (#653).
[Структурщик]: merge-хвост общий для full/merge-only, дублей нет.
[Математик]: режимы full | no-merge | merge-only — таблица шагов в тесте.

Итоговый артефакт: 1 PR — --merge-only + норма.
Definition of Done: тесты зелены, норма в skill+CLAUDE.md, LGTM.
```

---

## Связь с дорожной картой

- Закрывает класс «ложный красный из worktree» (#653 → #700): безопасный мердж достижим
  и для уже открытого PR, а норма уводит агента от raw `gh pr merge --delete-branch`.
