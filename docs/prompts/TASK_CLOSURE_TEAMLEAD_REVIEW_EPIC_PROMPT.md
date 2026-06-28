# Epic: automatic Teamlead review for Issue and sprint closure

> Registry: `task-closure-teamlead-review-v1` · Size: **L** · Tier: **T2**
> Consilium: [`closure-review-process-consilium-2026-06-28.md`](../seanses/closure-review-process-consilium-2026-06-28.md)

## Context

После commit/push пользователь вынужден отдельно просить «Team Lead review».
`code-review`, `task:archive` и `task:close-github` пока не образуют единый fail-closed
closure gate. Новый процесс должен сам инициировать review конкретной task/Issue/спринта.

## Canonical corrections to the consilium

1. `task:archive` остаётся последним шагом: архив запрещён до LGTM и merge либо явно
   принятого branch-only результата.
2. Manifest хранится по задаче: `docs/reviews/<task-id>/manifest.json`, не в одном
   глобальном файле.
3. T0 может быть кратким, но auto-skip не отменяет явный `LGTM | BLOCK` Teamlead.
4. Новый commit после LGTM инвалидирует verdict и возвращает `review_pending`.

## Промпт целиком

### Role and goal

Ты — Vesnin (Teamlead), координатор закрытия задач Membrana. Реализуй workflow, при
котором skills после публикации результата автоматически запускают review, связывают
verdict с task id и commit SHA и только после LGTM разрешают финализацию.

### State machine

```text
active → implementation_ready → published → review_pending
                                      ↑          │
                                      └── blocked/needs_fix
                                                 │
                                                 ▼
                                               lgtm
                                                 │
                              merged | accepted_branch_only
                                                 │
                                              archived
```

Инварианты:

- `lgtm.commitSha` обязан совпадать с reviewed SHA.
- BLOCK не закрывает Issue и не архивирует registry entry.
- Offline GitHub допускает local review, но external finalize остаётся pending.
- Все команды идемпотентны и имеют `--dry-run`.

### Artifacts and commands

- `docs/prompts/TASK_CLOSURE_REVIEW_REGULATION.md` — state machine и policy.
- `docs/prompts/TASK_CLOSURE_REVIEW_PROMPT.md` — Teamlead review prompt.
- `docs/schemas/task-closure-review.schema.json` — manifest schema.
- `docs/reviews/<task-id>/<sha>-review.md` — immutable verdict.
- `scripts/lib/task-closure-review.mjs` — pure transitions and validation.
- `scripts/task-closure-review.mjs` — CLI.

```bash
yarn task:review:prepare --id <id> [--ref HEAD] [--pr N] [--dry-run]
yarn task:review:run --id <id> [--dry-run]
yarn task:review:status --id <id>
yarn task:review:finalize --id <id> [--accepted-branch-only "reason"] [--dry-run]
```

`prepare` собирает registry, prompt, diff, CI evidence и GitHub metadata. `run` выполняет
T0/T1/T2 review и пишет LGTM/BLOCK. `finalize` проверяет gate и вызывает существующие
archive/close этапы; merge остаётся отдельным GitHub-процессом.

### Implementation waves

| Wave | Registry id | Result |
|------|-------------|--------|
| R0 | `tcr-r0-regulation-schema` | regulation, prompt, schema |
| R1 | `tcr-r1-manifest-core` | pure state library, prepare/status, SHA invalidation |
| R2 | `tcr-r2-teamlead-runner` | T0/T1/T2 runner and immutable verdict |
| R3 | `tcr-r3-finalize-gate` | guarded finalize and archive/GitHub queue integration |
| R4 | `tcr-r4-three-env-skills` | Cursor, Claude Code, Codex skills + drift verifier |
| R5 | `tcr-r5-github-pilot` | optional checks/labels, real-task pilot, migration report |

### Three environment skills

Create thin wrappers with equal semantics:

- `.cursor/skills/membrana-task-closure-review/SKILL.md`;
- `.claude/skills/membrana-task-closure-review/SKILL.md`;
- `.agents/skills/membrana-task-closure-review/SKILL.md` for Codex.

После commit/push skill обязан перейти к `prepare` и `run`, если пользователь явно не
попросил остановиться. Канон живёт в regulation; verifier запрещает semantic drift.

### Definition of Done

- [ ] Review привязан к task id, Issue/PR (если есть) и точному commit SHA.
- [ ] Новый SHA инвалидирует LGTM; BLOCK запрещает close/archive.
- [ ] Prepare/run/status/finalize идемпотентны и поддерживают dry-run.
- [ ] Finalize fail-closed; branch-only требует явного флага.
- [ ] Legacy `code-review`, `task:archive`, `task:close-github` продолжают работать.
- [ ] Happy path, BLOCK→fix, stale SHA, offline GitHub и parallel tasks покрыты тестами.
- [ ] Три skills валидируются и дают одинаковый workflow.
- [ ] Реальный pilot выполнен на одной M-task и имеет migration decision.

### Out of scope v1

- Automatic merge и изменение branch protection без отдельного разрешения владельца.
- `/lgtm` из произвольного комментария как единственный источник истины.
- Автоматическая миграция/архивация legacy tasks.
