# OPEN: kits-angelina-morning — слой kits/ + angelina-morning

| Поле | Значение |
|------|----------|
| **Sprint** | `kits-angelina-morning-2026-07-21` |
| **Registry epic** | `kits-angelina-morning` · [#814](https://github.com/officefish/Membrana/issues/814) |
| **Kind** | epic (фазы day-sprint) |
| **Status** | **open** |
| **Started** | 2026-07-21 |
| **Size** | L |
| **Lead epic** | vesnin |
| **Branch** | `feature/kam-k4-wire` (фаза K4) |

**Prompt эпика:** [`KITS_ANGELINA_MORNING_PROMPT.md`](../../prompts/KITS_ANGELINA_MORNING_PROMPT.md)  
**Семя:** [#761](https://github.com/officefish/Membrana/issues/761) · [`PINNED_SUBGRAPH_VERSIONING`](../../patterns/PINNED_SUBGRAPH_VERSIONING.md)  
**Код:** `scripts/` · **киты:** `kits/angelina-morning/` · **процедура:** `docs/procedures/ritual-day/`

---

## Инварианты

1. Код движков — плоский `scripts/`; киты — дом `kits/` (не `docs/audit/*`).
2. Манифест кита — канон pl-r3 / sbc-s3; **нет** второго schema-острова.
3. Версия = подграф `path → SHA`; interactive=latest, autonomous=pinned.
4. Фаза = своя карточка + `leadPersona` (принятие выхода).

---

## Phases

| Phase | Registry id | Issue | Lead | Status |
|-------|-------------|------:|------|--------|
| **K0** | `kam-k0-brief` | [#815](https://github.com/officefish/Membrana/issues/815) | vesnin | ✅ done · [PR #833](https://github.com/officefish/Membrana/pull/833) |
| **K1** | `kam-k1-home` | [#816](https://github.com/officefish/Membrana/issues/816) | ozhegov | ✅ done · [PR #836](https://github.com/officefish/Membrana/pull/836) |
| **K2** | `kam-k2-audit` | [#817](https://github.com/officefish/Membrana/issues/817) | dynin | ✅ done · [PR #838](https://github.com/officefish/Membrana/pull/838) |
| **K3** | `kam-k3-first-kit` | [#818](https://github.com/officefish/Membrana/issues/818) | angelina | ✅ done · [PR #841](https://github.com/officefish/Membrana/pull/841) |
| **K4** | `kam-k4-wire` | [#819](https://github.com/officefish/Membrana/issues/819) | ozhegov | ✅ done · [PR #843](https://github.com/officefish/Membrana/pull/843) |
| **K5** | `kam-k5-closure` | [#820](https://github.com/officefish/Membrana/issues/820) | vesnin | ⬜ next |

---

## Gate checklist (K0–K3)

- [x] K0–K3 done (см. PR выше)

## Gate checklist (K4)

- [x] `docs/procedures/ritual-day/` + `kitVersion: kits/angelina-morning`
- [x] `engines[]` = якорь (morning-care), не весь кит
- [x] procedures/README § kitVersion; `validateProcedure` резолвит кит
- [x] `check:layer-direction` + `kits:audit` зелёные
- [x] LGTM ozhegov (owner ok 2026-07-21)

---

## Первые команды

```bash
node --test scripts/validate-procedure.test.mjs
yarn check:layer-direction
yarn kits:audit --id angelina-morning
```
