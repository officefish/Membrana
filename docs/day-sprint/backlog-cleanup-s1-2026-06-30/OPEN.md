# OPEN: backlog-cleanup-s1 — аудит и закрытие Queue A

| Поле | Значение |
|------|----------|
| **Sprint** | `backlog-cleanup-s1` |
| **Issue** | [#214](https://github.com/officefish/Membrana/issues/214) |
| **Ветка** | `chore/backlog-cleanup-s1` |
| **Opened** | 2026-06-30 |
| **Источник** | `docs/discussions/github-issues-status-report-2026-06-30.md` |

## Выбранные issues

| # | Issue | Тип | Ожидаемые усилия |
|---|-------|-----|-----------------|
| #146 | W0-H1 палитра в function editor | verify & close | ~10 мин |
| #151 | Epic W0 hotfixes | verify & close | ~10 мин |
| #54 | MCP rollout acceptance | verify & close | ~15 мин |
| #7 | agenda store/registry tests | audit | ~15 мин |
| #8 | client registration smoke tests | audit | ~15 мин |
| #34 | FFT edge-case docs | audit/close | ~10 мин |
| #11 | viz config tests | S-PR или close | ~30 мин |
| #9 | microphoneStreamHub tests | S-PR | ~45 мин |
| #157 | dissolve comment group | P0 impl | ~90 мин |

## Фазы

### ✅ BC0 — Регламент

- [x] Issue #214 создан
- [x] Ветка `chore/backlog-cleanup-s1`
- [x] Промпт: `docs/prompts/BACKLOG_CLEANUP_S1_PROMPT.md`
- [x] registry.json: `backlog-cleanup-s1` → active
- [x] OPEN.md
- [x] DAY_SPRINT_ACTIVE.md

### ✅ BC1 — Verify & close: #146, #151, #54

- [x] #146: PR #162 покрывает все acceptance criteria → CLOSED
- [x] #151: все дочерние #146/#152/#153 закрыты → CLOSED
- [x] #54: все MCP sub-tasks заархивированы → CLOSED

### ✅ BC2 — Аудит: #7, #8, #34

- [x] #7: store/registry тесты НЕ существуют → RESIDUAL (прокомментировано)
- [x] #8: client registration smoke тесты НЕ существуют → RESIDUAL (прокомментировано)
- [x] #34: edge-case docs зависят от #10 → RESIDUAL (прокомментировано)

### ✅ BC3 — S-PR: #11 resolveMicStreamVizConfig tests

- [x] `apps/client/src/plugins/microphone-stream-viz/types.test.ts` — 6 тестов, 6/6 PASS
- [x] `apps/client/package.json` + `test:node` script
- [x] #11 CLOSED

### ✅ BC4 — S-PR: #9 microphoneStreamHub tests

- [x] `apps/client/src/modules/microphone/microphoneStreamHub.test.ts` — 4 теста, 4/4 PASS
- [x] #9 CLOSED

### ✅ BC5 — #157 dissolve comment group

- [x] Аудит: реализация уже существует в `comment-group.ts` (dissolveCommentGroups, applyBoardNodeChangesWithCommentGroupDissolve, applyBranchNodeRemovals)
- [x] Подключено в graph-context.tsx в 9 точках
- [x] Тесты в `comment-group.test.ts` уже покрывают dissolve
- [x] #157 CLOSED

### ⬜ BC6 — PR + CLOSURE
