# 2026-09-01 — `background-media#test` false red is an unprepared local contour

## Symptom

Evening reports carried `@membrana/background-media#test` / `background-media#test` as a red risk for three days. The trunk itself was green; the red reproduced only in local runs that skipped the preparation expected by the media contour.

## Diagnosis

This is not a product defect in `@membrana/background-media`.

The App DI smoke added for #2009 judges the built `dist` artifact, not `src`, because Vitest/esbuild does not emit the metadata NestJS DI needs. In CI, `.github/workflows/unit-tests.yml` explicitly builds first:

```bash
yarn turbo run build --filter=@membrana/background-media --filter=@membrana/background-office
yarn workspace @membrana/background-media test src/app.module.smoke.test.ts
```

With `SMOKE_REQUIRE_DIST=1`, missing `dist/app.module.js` is a hard failure with the cure in the error text. Outside that gate the same test skips loudly instead of pretending green.

For local media server/API work, the documented contour is still:

```bash
yarn media:db:up
yarn media:migrate
yarn media:dev
```

The DI smoke itself does not connect to a live DB: `DATABASE_URL` is a stub for Prisma-generated imports and `compile()` does not call `app.init()`.

## Norm

Do not list `background-media#test` as an unknown red risk when the only evidence is a local run without the expected build/preparation. First classify the run:

- App DI smoke: build `@membrana/background-media` before running the smoke, or treat missing `dist` as an environment/preparation failure.
- Local media server/API smoke: prepare PostgreSQL and migrations before judging the service.
- Trunk/CI status: if the CI branch is green, record this as a false local red, not a blocker to fix media code.

## Evidence

- `packages/background-media/src/app.module.smoke.test.ts` explains the `dist` requirement and the loud skip/fail behavior.
- `.github/workflows/unit-tests.yml` lines 77-90 build `background-media` before the smoke.
- `packages/background-media/README.md` documents the local DB/migration contour.
- `docs/local-sprint/contour-sanity-2026-08-19/OPEN.md` already noted that `background-media#test` was not a defect; this precedent adds the missing operational diagnosis.
- GitHub issue: https://github.com/officefish/Membrana/issues/2256
