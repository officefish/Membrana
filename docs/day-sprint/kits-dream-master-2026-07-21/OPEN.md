# OPEN: kits-dream-master — второй кит (Мастер снов)

| Поле | Значение |
|------|----------|
| **Sprint** | `kits-dream-master-2026-07-21` |
| **Registry epic** | `kits-dream-master` · [#855](https://github.com/officefish/Membrana/issues/855) |
| **Kind** | epic (фазы day-sprint) |
| **Status** | **open** |
| **Started** | 2026-07-21 |
| **Size** | L |
| **Lead epic** | vesnin |
| **Branch** | — (D3 в main; next D4) |

**Жилец:** [`kits/dream-master/`](../../../kits/dream-master/)  
**Процедура:** [`docs/procedures/ritual-dreams/`](../../procedures/ritual-dreams/)

---

## Phases

| Phase | Registry id | Issue | Lead | Status |
|-------|-------------|------:|------|--------|
| **D0** | `kdm-d0-brief` | [#856](https://github.com/officefish/Membrana/issues/856) | vesnin | ✅ [#863](https://github.com/officefish/Membrana/pull/863) |
| **D1** | `kdm-d1-roots` | [#857](https://github.com/officefish/Membrana/issues/857) | ozhegov | ✅ [#865](https://github.com/officefish/Membrana/pull/865) |
| **D2** | `kdm-d2-kit` | [#858](https://github.com/officefish/Membrana/issues/858) | dynin | ✅ [#867](https://github.com/officefish/Membrana/pull/867) |
| **D3** | `kdm-d3-procedure` | [#859](https://github.com/officefish/Membrana/issues/859) | ozhegov | ✅ done · [PR #869](https://github.com/officefish/Membrana/pull/869) |
| **D4** | `kdm-d4-closure` | [#860](https://github.com/officefish/Membrana/issues/860) | vesnin | ⬜ next |

---

## Gate checklist (D3)

- [x] `docs/procedures/ritual-dreams/` + `kitVersion: kits/dream-master`
- [x] `engines[]` = якорь `scripts/dreams.mjs` (не весь subgraph)
- [x] precedents: DREAM_MASTER_PROMPT + M5; procedures/README обновлён
- [x] `validateProcedure` зелёный
- [x] LGTM ozhegov (owner ok 2026-07-21)

---

## Первые команды

```bash
node --test scripts/validate-procedure.test.mjs
yarn kits:audit --id dream-master
yarn check:layer-direction
```
