# Context run: tariff-projection

**Persona:** Dynin
**Block:** `tariff-projection`
**Captured:** 2026-08-02T13:24:00+03:00

Dynin compared the generated public tariff page with both tariff sources and
the existing cross-source validators. The review focused on deny-by-default
semantics, quota units, provisional values, public vocabulary and deterministic
generation.

Evidence inspected:

- `docs/tariffs/tariff-grid.json` (read-only input)
- `docs/tariffs/tariff-scalars.json` (read-only input)
- `scripts/lib/product-docs-tariffs.mjs`
- `scripts/product-docs-tariffs.test.mjs`
- `apps/docs/product/tariffs.mdx`

The first pass blocked on absent/non-boolean availability, contradictory cold
storage wording and a fallback that could expose an internal provisional ID.
