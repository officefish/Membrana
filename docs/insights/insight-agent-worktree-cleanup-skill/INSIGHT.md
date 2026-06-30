# INSIGHT: Worktree cleanup skill for all agents

| Поле | Значение |
|------|----------|
| **ID** | `insight-agent-worktree-cleanup-skill` |
| **Статус** | draft |
| **Источник** | user |
| **Создан** | 2026-06-30 |

---

## Проблема / наблюдение

После нескольких спринтов агентам приходится вручную повторять один и тот же ритуал:
разобрать грязное рабочее дерево, отделить изменения текущего sprint/task от чужих
или pre-existing хвостов, сделать scoped commit, сохранить остальное обратимо и
подготовить clean tree для следующей фазы.

Сейчас этот процесс держится в голове оператора/агента. Это повышает риск:

- смешать unrelated daily/ritual артефакты с продуктовым коммитом;
- потерять чужие untracked файлы при "чистке";
- начать опасную миграцию или merge поверх dirty tree;
- забыть stash-name, verification commands или правила staged scope;
- получить разные практики в Cursor, Claude Code и Codex.

## Гипотеза

Если оформить "worktree cleanup" как отдельный project skill и синхронизировать его
для всех агентских сред (Cursor / Claude Code / Codex), то агенты смогут стабильно
доводить спринт до безопасной промежуточной точки:

1. классифицировать изменения;
2. отделять scope текущей задачи;
3. коммитить только проверенный набор файлов;
4. обратимо убирать чужие/несвязанные хвосты;
5. оставлять clean tree для R0 следующего спринта.

Это особенно важно перед миграциями, registry refactor, merge/rebase, CI-fix и
task-closure-review.

## Scope (черновик)

- In scope:
  - playbook `.cursor/skills/membrana-worktree-cleanup/SKILL.md`;
  - mirrors for `.claude/skills/` and `.agents/skills/`;
  - dry-run checklist: `git status --short`, `git diff --stat`, `git diff --check`, staged diff;
  - classification model: current task / generated ritual artifacts / pre-existing user work / unknown;
  - safe stash strategy with explicit name and `-u` only for selected paths;
  - scoped commit strategy with verification before commit;
  - handoff summary format: commit SHA, stash name, remaining status, branch;
  - optional mjs helper for repeatable reports, without destructive cleanup by default.
- Out of scope:
  - automatic deletion of files;
  - `git reset --hard` / force checkout without explicit user approval;
  - automatic push/PR unless the user requested publish flow;
  - resolving semantic conflicts that require product judgement.

## Связи

- Эпики / PR:
  - current task-registry archive migration sprint;
  - future agent tooling / skills sync sprint.
- Документы:
  - `AGENTS.md`;
  - `.cursor/skills/README.md`;
  - `.claude/CLAUDE.md`;
  - `docs/prompts/TASK_CLOSURE_REGULATION.md`;
  - `docs/prompts/CODE_REVIEW_REGULATION.md`;
  - `docs/tasks/TASK_REGISTRY_STORAGE.md`.

## Вопросы для research (Q1–Q3)

1. **Landscape:** какие устойчивые практики multi-agent git hygiene уже применяются
   в агентных IDE/CLI: scoped commits, protected dirty tree, stash naming, handoff notes?
2. **Fit (Membrana):** какие команды и артефакты Membrana должны стать обязательной
   частью cleanup-skill перед sprint R0, task closure review и merge?
3. **Risk:** какие сценарии наиболее опасны: потеря untracked файлов, stash поверх
   чужой работы, partial commit с невалидным registry, скрытые generated docs?

## Черновой DoD будущего skill/sprint

- [ ] Skill создан в `.cursor/skills/membrana-worktree-cleanup/SKILL.md`.
- [ ] Mirrors синхронизированы в `.claude/skills/` и `.agents/skills/`.
- [ ] Есть mjs-report command, который только читает состояние и предлагает план.
- [ ] Skill запрещает destructive cleanup без явного user approval.
- [ ] Skill различает commit-only, stash-only, split commit + stash и "ask user" ветки.
- [ ] Добавлен пример из прецедента `cleanup-before-task-archive-migration-2026-06-30`.
- [ ] Проверка skill входит в общий skills sync/verify контур.
