# Промпт: D2 — жилец kits/dream-master + пины

> **M** · `kdm-d2-kit` · [#858](https://github.com/officefish/Membrana/issues/858) · lead **dynin** · parent `kits-dream-master`

## Контекст

D0/D1: границы и roots утверждены. D2 — жилец с пинами.

## Промпт целиком

1. `kits/dream-master/README.md` + `MANIFEST.json` (`leadPersona: dynin`).
2. `roots: ["scripts/dreams.mjs"]`; `pins` = полное статическое замыкание.
3. `yarn kits:audit --id dream-master` → 0 blocking (pinned).
4. latest/pinned + PINNED_SUBGRAPH чеклист в README жильца.

## Acceptance criteria

- [x] Жилец + audit green
- [x] LGTM dynin (owner ok 2026-07-21)

## Out of scope

Процедура `ritual-dreams` (D3).
