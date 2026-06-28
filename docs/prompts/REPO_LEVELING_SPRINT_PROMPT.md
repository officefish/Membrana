# Промпт: Repo Leveling — выравнивание рабочего дерева main

> **Task-промпт для агента-разработчика** (Cursor IDE / Claude / другой LLM).
> Процесс постановки: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).
> Скопируй блок **«Промпт целиком»** в начало диалога. Размер задачи: **M**.
> Ожидаемый артефакт: **1–6 коммитов** в `main` — чистое рабочее дерево без потери готовой работы и без утечки секретов.
> Реестр: `id` = `repo-leveling` в [`docs/tasks/registry.json`](../tasks/registry.json).

---

## Контекст

В рабочем дереве `main` накопилось **131 изменение** (`git status --short`): 80 modified, 48 untracked, 2 deleted; суммарный дифф **83 файла, +1387 / −2743**. Значительная часть — это **уже завершённая работа, которая не закоммичена**: миграция `docs-actions-phase-a` помечена `closed` в своём `OPEN.md`, но все её правки висят в дереве; архивы задач `da-*/oc-*/wc-*` лежат untracked; sprint-промпты и code-review/consilium новых спринтов не зафиксированы.

Дополнительно есть **риск утечки секрета**: `.env.llm-proxy` лежит untracked и **не покрыт `.gitignore`** — один `git add .` отправит его в историю.

Не трогаем продуктовый код и архитектуру: задача чисто гигиеническая. Полный разбор подвисших файлов и план по фазам — в [`day-sprint/repo-leveling-2026-06-27/OPEN.md`](../day-sprint/repo-leveling-2026-06-27/OPEN.md).

**Связанные документы:**

| Документ | Зачем |
|----------|--------|
| [`day-sprint/repo-leveling-2026-06-27/OPEN.md`](../day-sprint/repo-leveling-2026-06-27/OPEN.md) | Инвентарь + фазы A–F с командами |
| [`VIRTUAL_TEAM_PROMPT.md`](../VIRTUAL_TEAM_PROMPT.md) | Роли, порядок работы |
| [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md) | Регламент постановки/закрытия |
| [`CONTRIBUTING.md`](../CONTRIBUTING.md) | Логи deploy/recover не в корень репо |
| [`MAIN_DAY_ISSUE.md`](../MAIN_DAY_ISSUE.md) | Канон дня |

**GitHub Issue:** #<номер> (после создания — вписать сюда и в `registry.json`).

---

## Промпт целиком (для вставки агенту)

> Всё ниже до раздела **«Заметки для человека-постановщика»** — текст задания для агента.

---

### Кто ты

Ты — **координатор виртуальной команды Membrana** под руководством **Vesnin** (Teamlead). Перед действиями — краткий план (1–2 абзаца + список групп коммитов). Соблюдай [`VIRTUAL_TEAM_PROMPT.md`](../VIRTUAL_TEAM_PROMPT.md) и [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md). Все git/yarn-команды — локально, не в песочнице.

---

### Что построить (продуктовое описание)

Привести рабочее дерево `main` к чистому состоянию за 6 фаз (детали и команды — в `OPEN.md` спринта):

1. **Risk-gate (первой):** добавить `.env.llm-proxy` в `.gitignore`; убедиться, что секрета нет в индексе/истории; закрыть артефакты `apps/client/playwright-report/`, `apps/client/test-results/`, `.sync-readme-out.txt`.
2. **Чистка мусора:** root-логи (`*.log`, `turbo-build.log`) → `%TEMP%`; удалить дубликаты `device-scenario-microphone-main (6/7/8).json`.
3. **Коммит миграции docs-actions** одной атомарной единицей (rewrite ссылок + `docs/actions/` + скрипт + 2 удаления `DB_*_TEAMLEAD_REVIEW.md`).
4. **Коммит готовой работы группами:** архивы задач + `registry.json`, sprint-промпты, discussions, MCP-фрагменты, тулинг (`.agents/`, `.opencode/`, `opencode.json`).
5. **Сверка sprint-ledger:** разметить day-sprint без `CLOSURE.md`; сверить статусы `registry.json` с реальностью.
6. **Verify & seal:** `lint typecheck test build` зелёные; чистый `git status`; `rag:evening-index`.

---

### Архитектура / контракт

| Слой | Путь | Ответственность |
|------|------|-----------------|
| Git hygiene | `.gitignore`, рабочее дерево | секрет закрыт, артефакты игнорируются, мусор убран |
| Docs migration | `docs/`, `docs/actions/`, `scripts/migrate-docs-actions-phase-a.mjs` | атомарный коммит закрытой миграции |
| Task ledger | `docs/tasks/registry.json`, `docs/tasks/archive/`, day-sprint `OPEN/CLOSURE.md` | статусы соответствуют факту |

**Запрещено:**

- `git add .` / `git add -A` до завершения Фазы A (риск утечки `.env.llm-proxy`).
- Коммит реального `.env.llm-proxy` (шаблон `.env.llm-proxy.example` — остаётся).
- Удаление tracked-файлов без сверки (особенно `device-scenario-*` каноны).
- Расширение scope на продуктовый код без нового Issue/промпта.

---

### Тесты

| Область | Минимум |
|---------|---------|
| Сборка | `yarn turbo run lint typecheck test build --continue` — зелёный |
| Ссылки | `grep -rIl 'device-board-scripts/' docs/` — остаются только намеренные ссылки |
| Git | `git status --short` пуст после Фазы D (кроме сознательно игнорируемого) |

---

### Definition of Done

- [ ] `.env.llm-proxy` в `.gitignore`; `git check-ignore` подтверждает; секрета нет в индексе/истории.
- [ ] Артефакты client + root-логи + дубликаты убраны/игнорируются.
- [ ] Миграция docs-actions закоммичена одной атомарной единицей; внутренние ссылки не битые.
- [ ] Готовая работа (архивы+registry, промпты, discussions, тулинг) закоммичена логичными группами.
- [ ] Day-sprint без CLOSURE размечены; `registry.json` сверён.
- [ ] `yarn turbo run lint typecheck test build --continue` — зелёный.
- [ ] `git status` чистый; `yarn rag:evening-index` выполнен.
- [ ] LGTM Teamlead.

---

### Out of scope

- Триаж 166 active-задач в `registry.json` (отдельный backlog-спринт).
- Зачистка tracked-дубликатов `device-scenario-microphone-main (1/3/4/5).json` (накопленный долг — отдельным проходом, по желанию).
- Деплой cabinet/Studio; нейро-контракт; `yarn rag:index --full`.
- Любые правки продуктового кода.

---

### Порядок работы ролей

1. **Teamlead (Vesnin)** — порядок фаз, A первой; LGTM в конце.
2. **Структурщик** — группировка коммитов по смыслу; решение track/ignore для `.opencode/`, `.agents/`.
3. **Математик (Dynin)** — не задействован (нет формул).
4. **Музыкант** — не задействован (нет аудио).
5. **Верстальщик** — не задействован (нет UI).

---

### Формат ответа координатора (планирование)

```text
[Teamlead]: порядок фаз, gate-критерии
[Структурщик]: карта групп коммитов, track/ignore решения
[Математик]: —
[Музыкант]: —
[Верстальщик]: —

Итоговый артефакт: чистое рабочее дерево main, 1–6 атомарных коммитов
Definition of Done: см. чеклист выше + LGTM
```

---

## Заметки для человека-постановщика

1. GitHub Issue (`imperfection`) + ссылка на этот файл и на `OPEN.md` спринта.
2. Запись в `docs/tasks/registry.json` (`id: repo-leveling`, `status: active`) — **уже добавлена** 2026-06-27.
3. После создания Issue — вписать номер в `githubIssue` (registry) и в шапку этого файла + `OPEN.md`.
4. После merge: отчёт в Issue → `yarn task:archive repo-leveling --notes "…"`.

### Проверка после PR

```bash
yarn turbo run lint typecheck test build --continue
git status --short        # пусто
git check-ignore .env.llm-proxy
yarn task:list
```

---

## Связь с дорожной картой

- Готовит почву под `dpr-dr0-git-hygiene-gate` (DR0 — gate чистого рабочего дерева в деплое): без выровненного `main` gate будет постоянно красным.
