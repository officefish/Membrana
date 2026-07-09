---
name: membrana-insight-to-sprint
description: >-
  Bridge an adopted Membrana insight into a running sprint: gate check, transcribe the
  review's "Следующий шаг" into a task-prompt, register in docs/tasks/registry.json with
  an insightId back-link, and set a cold-session entry point. Use when user says перейти
  из инсайта в спринт, довести инсайт до спринта, adopted insight → task, оформить
  task-промпт по инсайту, or start building an adopted insight. Do NOT use for creating
  the insight itself (membrana-insight) or archiving a finished task (membrana-task-lifecycle).
---

# Membrana insight → sprint

Мост между [`membrana-insight`](../membrana-insight/SKILL.md) (кончается на `adopted`) и
[`membrana-task-lifecycle`](../membrana-task-lifecycle/SKILL.md) (стартует с task-промпта).
Канон: [`INSIGHT_REGULATION.md`](../../../docs/prompts/INSIGHT_REGULATION.md),
[`TASK_PROMPT_WORKFLOW.md`](../../../docs/prompts/TASK_PROMPT_WORKFLOW.md).

## When to use

- Инсайт стал `adopted` и пора **начинать разработку сейчас**.
- Нужно превратить решение команды (research + review) в исполнимый спринт.

## When NOT to use

- Инсайт ещё не пройден (create/research/review) → `membrana-insight`.
- Задача уже поставлена, идёт работа/закрытие → `membrana-task-lifecycle`.
- Архитектурный спор без готового инсайта → `membrana-consilium`.

## Gate (не переходить, если не выполнено)

1. `meta.json.status == adopted` (не draft/researched/reviewed/deferred/rejected).
2. `weight ≥ 6.0` (порог `plan:week`) — слабый инсайт спринт **не** получает.
3. В `REVIEW.md` есть конкретный **«Следующий шаг»** от Teamlead.
4. LGTM человека/Teamlead начать спринт **сейчас**. `adopted` **не** создаёт task автоматически — это осознанный барьер.

## Ключевой принцип

**Review — это и есть спецификация.** «Резюме Teamlead → Следующий шаг» + голоса пяти ролей
уже содержат владельца, scope, размер и запреты. Переход = **транскрипция** решения в
task-промпт, а не новое обсуждение. Спор не переоткрываем.

## Шаги

1. **Извлечь мандат.** Из `REVIEW.md` (Следующий шаг, владелец, роль-контракты) + `INSIGHT.md`
   (Scope In/Out, риски). Запреты берём **дословно**.
2. **Форма спринта.** In-scope — один связный набор артефактов → **одна задача (M)**; тянет на
   несколько пакетов/PR → **эпик** с child-карточками (`parentEpic`).
3. **Task-промпт.** `docs/prompts/<SLUG>_PROMPT.md` из [`TASK_PROMPT_TEMPLATE.md`](../../../docs/prompts/TASK_PROMPT_TEMPLATE.md).
   «Промпт целиком», DoD, Out-of-scope — из scope инсайта; «Запрещено» — из review. Каждый
   голос роли → строка в «Порядке работы ролей». Шапка ссылается на инсайт.
4. **Регистрация.** Запись в [`docs/tasks/registry.json`](../../../docs/tasks/registry.json):
   `status: active`, `promptPath`, `size`, `leadPersona` (владелец из review) + **`insightId`
   обратной ссылкой**. Затем `yarn task:sync-readme`.
5. **Точка входа для холодной сессии.** [`CURRENT_TASK.md`](../../../docs/CURRENT_TASK.md) —
   буфер со стартовой строкой (copy-paste в новую сессию). `MAIN_DAY_ISSUE` — только через
   `yarn main-day-issue` после standup, не фабриковать.
6. **Замкнуть трассировку.** В `INSIGHT.md` строка «Спринт → <id>». Теперь связь
   инсайт → спринт → PR → архив прослеживается в обе стороны.

## Anti-patterns

- Переоткрывать scope/приоритет, уже решённые в review.
- Терять запреты команды при переносе в промпт (они — проголосованные ограничения).
- Оставить спринт без обратной ссылки на инсайт (`insightId`) → «висящая» задача.
- Забыть точку входа: новая сессия стартует «с холода» — нужна одна copy-paste строка.
- Спринт из `deferred`/слабого (вес < 6) инсайта.

## Handoff

Промпт написан + задача в реестре → дальше работа и закрытие ведёт
[`membrana-task-lifecycle`](../membrana-task-lifecycle/SKILL.md) (`yarn task:archive <id>`).

## Пример (эталон)

`insight-hermes-liaison-agent` (adopted, 7.4) → спринт `hermes-brief` (2026-07-09):
[`HERMES_BRIEF_PROMPT.md`](../../../docs/prompts/HERMES_BRIEF_PROMPT.md), реестр `insightId`,
`CURRENT_TASK.md` со стартовой строкой.
