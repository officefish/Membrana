## Local Sprint Contract

Use `membrana-local-sprint` when accountability is part of the value.

- The cut names `blockId`, `persona`, `context`, `zone[]`, estimate and
  `revisionAt`.
- The owner ratifies the cut before execution; any body change resets the
  digest.
- Assigned people see their code zones and leave review evidence.
- `sprint:gate` must check the trace corpus. Empty corpus is never green.
- `procedure-run:journal` records subject, evidence and gaps.

The lesson from `procedure-run-journal-2026-08-01`: the heavy route was worth it
because it found real defects. That does not make it the default for small
intentions.
