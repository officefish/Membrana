# Review pass: tariff-projection

**Reviewer:** Dynin
**Verdict:** LGTM
**Captured:** 2026-08-02T14:08:00+03:00

The previous blockers are closed: deny-by-default is enforced, provisional IDs
are validated against the registry, cold storage distinguishes current access
from a numeric scalar declaration, and public capabilities are registry-driven.

Checks:

- 18/18 focused tariff tests pass.
- `node scripts/product-docs-tariffs.mjs --check` passes.
- Repeated generation produces the committed MDX without drift.
