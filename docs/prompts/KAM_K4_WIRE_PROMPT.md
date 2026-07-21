# Промпт: K4 — провод в процедуру утра / kitVersion

> **M** · `kam-k4-wire` · [#819](https://github.com/officefish/Membrana/issues/819) · lead **ozhegov** · parent `kits-angelina-morning`

## Контекст

После K3 кит `angelina-morning` жив. K4 связывает определение утренней процедуры
с `kitVersion`, не размножая roots кита в `engines[]`.

## Промпт целиком

1. Жилец [`docs/procedures/ritual-day/`](../procedures/ritual-day/) — README + MANIFEST.
2. `kitVersion`: `kits/angelina-morning`; `engines[]` — якорь цепочки
   (`scripts/morning-care.mjs`), не весь subgraph.
3. Док в `docs/procedures/README.md` (§ kitVersion + таблица жильцов).
4. `validateProcedure` резолвит непустой `kitVersion` → дом кита с MANIFEST.
5. `yarn check:layer-direction` зелёный; `yarn kits:audit --id angelina-morning` зелёный.

## DoD

- [x] MANIFEST процедуры указывает kitVersion
- [x] checkLayerDirection не краснеет
- [x] дока в procedures/README
- [x] LGTM ozhegov (owner ok 2026-07-21)

## Out of scope

K5 closure; GitHub Releases; ценностный доклад (#788).
