# SESSION_CONTEXT — git audit container followup

Краткий рабочий контекст для продолжения. При старте сессии читать **перед** Scenario A/B.

| | |
|---|---|
| **Worktree** | `C:\Users\user190825\practice\Membrana-codex` |
| **Ветка** | `docs/audit-git-container-followup` (от `origin/main` @ ~`974a6a16`) |
| **Цель** | Доделывать контейнер `docs/audit/git/` (git hygiene audit) |
| **Не путать с** | `Membrana-grok` — другое дерево/сессия (`feature/scripts-boundary-container`) |

## Gotcha

`cursor` `move_agent_to_root` → Membrana-codex **падает** (ветка уже занята в другом дереве / коллизия с grok). Продолжать по пути Membrana-codex явно (`cd` / `working_directory`), не ждать re-root.

## Недавний GC (2026-07-21)

- cat6 — почищена
- cat5 A4 + cowork — discarded
- likely-discard wave — shipped **#779**
- Осталось на ревью: **codex / comp-alarm / night / cat7**

## Следующие шаги (кандидаты)

1. **Scenario A** — refresh `registry/BRANCHES_DECOMPOSE_LIST.md` (`yarn repo:branches:decompose`)
2. Опционально: helper attention-тиров **A1–A4** (пороги живут в AGENT_PROMPT / analysis; отдельный skill не легализовать)
3. Deep / GC по leftover: codex, comp-alarm, night, cat7 — только после явной категории в сообщении (HARD GATE Scenario B)

## Опоры

- Entry: [`AGENT_PROMPT.md`](./AGENT_PROMPT.md)
- Layout: [`README.md`](./README.md)
- Skills: `membrana-branch-audit` · `membrana-branch-decompose`
