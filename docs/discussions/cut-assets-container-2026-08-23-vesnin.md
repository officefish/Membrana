# Cut Context: assets-container recut, 2026-08-23

Lead: Vesnin. Subject: re-cut epic `assets-container` before implementation.

## Sources

- `docs/meeting/assets-container/VERDICT.md` (ratified 2026-07-22), especially M0-M4.
- `docs/meeting/static-mmbrn-container/EPIC.md` (ratified 2026-08-08), especially R1-R7.
- Carrier checks for R2/R3/R4:
  - `docs/seanses/static-mmbrn-container-m2-identity-2026-08-03.md`
  - `docs/seanses/static-mmbrn-container-m3-access-2026-08-04.md`
  - `docs/seanses/static-mmbrn-container-m4-storage-2026-08-04.md`

The owner supplied reconnaissance as already verified; this cut does not
reopen the ratified verdicts.

## Three Answers

1. I1-I5 overlap:
   - I1 is partly covered by R2/R4 for identity/history/storage, but assets
     keeps asset/receipt/set/holder/photo/status schema.
   - I2 is covered only mechanically by R3/R4/R6; `assets add/confirm/audit/sync`
     are domain adapters.
   - I3 reuses immutable history but keeps "set pin = receipt" and fact-to-receipt
     drift audit.
   - I4 access mechanics are covered by R3/R4; only provision/integration readiness
     remains for assets.
   - I5 is not covered: Scarlett Solo + receipt + today photo is field acceptance.

2. Sensitive in server DB behind API is compatible with R3/R4 if the API is
   Panel-authorized and append-only. It diverges only if assets creates an
   independent authorizer or overwrites sensitive records.

3. Essential assets-only semantics:
   - holder by nature;
   - confirmation by today's photo;
   - grouping by receipt as the set pin.

## Ratified Cut

Remove from assets-container as independently scoped work:

- immutable index/bytes/history;
- standalone sensitive access;
- standalone storage classes, backup, restore, overwrite ban and retention;
- cutover before static originals readiness.

Keep as assets-container work:

- domain schema and projection to the originals contract;
- domain commands `add`, `confirm`, `audit`, `sync`;
- domain teeth around receipt, holder, today confirmation and set drift;
- Scarlett Solo field acceptance after owner readiness decision.

Owner ratification in chat: "ратифицирую" on 2026-08-23, followed by "Идем дальше".
