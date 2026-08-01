---
name: membrana-local-sprint
description: >-
  Runs Membrana local sprint, the single canonical local sprint procedure for agent tasks:
  register epic/phases as sprintKind=membrana-local-sprint, cut work into accountable blocks,
  ratify the cut, gate real context execution, write procedure-run-journal evidence/gaps, and
  record prediction ↔ outcome. Use when the user says membrana-local-sprint, локальный спринт,
  честный спринт, honest-sprint, спринт с честными исполнителями, нарезка задачи, план нарезки,
  ратифицируй нарезку, гейт исполнения, yarn sprint:cut / sprint:gate / sprint:experience.
---

# Membrana Local Sprint

This skill is an operator doorway, not a second copy of the procedure.

1. Before work, verify that the generated
   [`development-matrix`](../../../docs/containers/strategic-docs/releases/development-matrix/README.md)
   exists in this worktree, then choose the route from it. If the release is
   absent, stop and deliver the matrix first.
2. If the route is `membrana-local-sprint`, run the canonical procedure from
   [`docs/procedures/membrana-local-sprint`](../../../docs/procedures/membrana-local-sprint/README.md).
3. Normalize old `honest-sprint` wording to `membrana-local-sprint`.
4. New local sprint tasks use `sprintKind: "membrana-local-sprint"` and instances in
   `docs/local-sprint/<id>/`.

Do not duplicate roles, lifecycle, findings, gates, or commands here. Edit the
procedure canon and generated matrix sources instead.
