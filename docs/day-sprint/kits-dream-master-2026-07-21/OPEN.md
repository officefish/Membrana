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
| **Branch** | `feature/kdm-d2-kit` (фаза D2) |

**Prompt эпика:** [`KITS_DREAM_MASTER_PROMPT.md`](../../prompts/KITS_DREAM_MASTER_PROMPT.md)  
**Жилец:** [`kits/dream-master/`](../../../kits/dream-master/)

---

## Phases

| Phase | Registry id | Issue | Lead | Status |
|-------|-------------|------:|------|--------|
| **D0** | `kdm-d0-brief` | [#856](https://github.com/officefish/Membrana/issues/856) | vesnin | ✅ [#863](https://github.com/officefish/Membrana/pull/863) |
| **D1** | `kdm-d1-roots` | [#857](https://github.com/officefish/Membrana/issues/857) | ozhegov | ✅ [#865](https://github.com/officefish/Membrana/pull/865) |
| **D2** | `kdm-d2-kit` | [#858](https://github.com/officefish/Membrana/issues/858) | dynin | ✅ LGTM — ship |
| **D3** | `kdm-d3-procedure` | [#859](https://github.com/officefish/Membrana/issues/859) | ozhegov | ⬜ |
| **D4** | `kdm-d4-closure` | [#860](https://github.com/officefish/Membrana/issues/860) | vesnin | ⬜ |

---

## Gate checklist (D2)

- [x] `kits/dream-master/` README + MANIFEST (`leadPersona: dynin`)
- [x] root `scripts/dreams.mjs`; pins = замыкание; `yarn kits:audit --id dream-master` → 0 blocking
- [x] latest/pinned + PINNED_SUBGRAPH в README
- [x] LGTM dynin (owner ok 2026-07-21)

---

## Первые команды

```bash
yarn kits:audit --id dream-master
yarn kits:audit --id dream-master --mode latest
```
