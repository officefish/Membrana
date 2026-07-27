# Handoff liveness

Generated: 2026-07-27T11:50:25.350Z
Source: docs/HANDOFF.md
Issue query: ok (single GraphQL batch)

| # | liveness | carriers | occupied | evidence |
|---|----------|----------|----------|----------|
| 1 | dead | #1310 | **агент А, дерево `Membrana-delivery`** (`feat/branch-protection-policy`); скоуп сверен: `chore/main-protection-followup` пуст против main | #1310 CLOSED/COMPLETED |
| 2 | unknown | — | **агент А, дерево `Membrana-delivery`** | no GitHub issue carrier |
| 3 | dead | #1263 | агент Б · `Membrana-agent-b-tests` (`codex/tests-container-1291`) | #1263 CLOSED/COMPLETED |
| 4 | unknown | `kits-pins-prepush-strict` | **агент А, дерево `Membrana-delivery`** | no GitHub issue carrier for task kits-pins-prepush-strict |
| 5 | dead | #1291 | агент Б · `Membrana-agent-b-tests` (`codex/tests-container-1291`) | #1291 CLOSED/COMPLETED |
| 6 | dead | #1292 | агент Б · `Membrana-agent-b-tests` (`codex/tests-container-1291`) | #1292 CLOSED/COMPLETED |
| 7 | alive | #1306 | свободно | #1306 OPEN |
| 8 | alive | #1304 | агент Б · `Membrana-agent-b-tests` (`codex/tests-block2-1293`) | #1304 OPEN |
| 9 | alive | #1303 | свободно | #1303 OPEN |
| 10 | alive | #1319 | агент Б · `Membrana-agent-b-tests` (`codex/tests-block2-1293`) | #1319 OPEN |

Summary: alive=4, dead=4, unknown=2.
