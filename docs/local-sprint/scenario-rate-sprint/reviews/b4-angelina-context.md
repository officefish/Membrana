# b4 — Angelina Context: gate trail

Sprint: `scenario-rate-sprint`
Block: `b4-gate-trail`

Checks prepared:

- `sprint:cut` contract after owner ratification.
- `tasks:decompose --check`.
- focused helper vitest.
- `execution-gate` over four accountable blocks.

Named gap:

Full `packages/plugin-handlers` executor tests and typecheck cannot run under
plain `npx` in this local environment because workspace dependencies
`@membrana/wav-decode` and `@membrana/plugin-contracts` do not resolve. The new
helper test is dependency-light and passed locally.
