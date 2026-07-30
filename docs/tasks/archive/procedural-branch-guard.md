# Архив: Грамматика веток: процедурная ветка — не транспорт; только артефакты процедуры по разрешению (провод Р4 + профиль сессии)

| Поле | Значение |
|------|----------|
| **ID** | `procedural-branch-guard` |
| **Статус** | archived |
| **Размер** | M |
| **Создана** | 2026-07-22 |
| **Архивирована** | 2026-07-29 |
| **GitHub Issue** | #925 |
| **Linear** | DRU-322 |
| **Промпт** | [`docs/prompts/PROCEDURAL_BRANCH_GUARD_PROMPT.md`](../../prompts/PROCEDURAL_BRANCH_GUARD_PROMPT.md) |

## Заметки при закрытии

код в ветке/workspace, PR по запросу; Linear DRU-322 найден живым media snapshot 2026-07-29T14:28:34Z (pullOk=true, githubIssueRefs=[925], state=Backlog); evidence: procedural branch guard в branch:check блокирует transport diff для meeting/storm/truth/research, --allow-transport оставляет явный след; tests node --test scripts\branch-grammar.test.mjs = 9/9; smoke: branch:check chore/codex-idle pass, storm/procedural-layer fails without --allow-transport and passes with it

## Отчёт о выполнении

**Что сделано.** `branch:check` получил процедурный guard: ветки `meeting/*`,
`storm/*`, `truth/*`, `research/*` больше не могут молча везти транспортный
дифф. Разрешённые артефакты процедуры заданы в `docs/procedures/layer-rules.json`;
исключение возможно только явно через `--allow-transport` или
`MEMBRANA_ALLOW_PROCEDURAL_TRANSPORT=1`.

**Затронутые пути.** `scripts/lib/branch-grammar.mjs`,
`scripts/branch-check.mjs`, `scripts/branch-grammar.test.mjs`,
`docs/procedures/layer-rules.json`.

**Доказательства.**

- `node --test scripts\branch-grammar.test.mjs` — 9/9 pass.
- `node scripts\branch-check.mjs chore/codex-idle --holder ozhegov` — pass.
- `node scripts\branch-check.mjs storm/procedural-layer --holder ozhegov` —
  fail с текстом про transport diff и `--allow-transport`.
- `node scripts\branch-check.mjs storm/procedural-layer --holder ozhegov --allow-transport` —
  pass и печатает разрешённый транспорт.
- Linear проверен живым media snapshot: `pullOk=true`, capturedAt
  `2026-07-29T14:28:34Z`, `recordCount=297`, точное совпадение
  `githubIssueRefs=[925]` = `DRU-322` (`Backlog`). Реестр был исправлен:
  `linearId: "DRU-322"`.

**Реестр.** `task:invariants:repair procedural-branch-guard --manual-linear DRU-322 --execute`
и `task:archive procedural-branch-guard` выполнены 2026-07-29.

**Известные нюансы / отложено.** Код пока в этом workspace, PR по запросу.
GitHub #925 и Linear DRU-322 остаются для штатного закрытия после PR/вечернего
батча; `githubIssueClosedAt` оставлен `null`.

---

*Карточка сгенерирована `yarn task:archive`. Спецификация остаётся в `docs/prompts/`.*
