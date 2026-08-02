# Context run: product-surface

**Persona:** Rodchenko
**Block:** `product-surface`
**Captured:** 2026-08-02T13:20:00+03:00

Rodchenko checked the public Product surface as a reader: first navigation entry,
Product/Harness boundary, product custom domain, preservation of the existing
Board and node pages, and consistency with the current domain-policy documents.

Evidence inspected:

- `apps/docs/docs.json`
- `apps/docs/product/overview.mdx`
- `apps/docs/CUSTOM_DOMAIN_SETUP.md`
- `docs/DOCUMENTATION_WORKFLOW.md`
- `docs/deploy/DNS_DOMAIN_POLICY.md`
- `docs/deploy/STRATEGY_AFFINE_DEPLOY.md`

The first pass found three blocking contradictions: cold-storage wording,
internal tariff identifiers on a public page, and the old documentation route
still presented as active. It also found a non-blocking stale root README.
