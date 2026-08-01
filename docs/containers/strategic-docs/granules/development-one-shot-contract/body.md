## One Shot Contract

`one shot` is a complete small block, not an excuse to skip quality.

- One subject and one owner.
- One review boundary: the reviewer owns the complete assessment in one session
  without hand-off. This is not `zone[]` from `membrana-local-sprint`; sprint
  blocks may be multi-zone by explicit cut.
- A reviewer `BLOCK` with a same-executor fix can still remain inside the same
  one-shot boundary only if the reviewer can re-check the result without
  external consultation or a new context entry.
- Reading repository docs, ADRs, code or tests already inside the original task
  boundary is not external consultation.
- Modifying the public contract or internal structure of another role's zone is
  a new seam and leaves `one shot` unless the route is re-cut.
- Diff size is a diagnostic, not the definition. The working measure is
  `OVERSIZED_CHANGED_LINES` (currently 400 changed lines).
- The final answer names tests/checks and says plainly that no team
  responsibility was claimed.
- If a reviewer would need another role's memory to judge it, it is no longer a
  one shot.
