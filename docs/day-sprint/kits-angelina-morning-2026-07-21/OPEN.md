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
| **Branch** | `feature/kam-k2-audit` (фаза K2) |

**Prompt эпика:** [`KITS_ANGELINA_MORNING_PROMPT.md`](../../prompts/KITS_ANGELINA_MORNING_PROMPT.md)  
**Семя:** [#761](https://github.com/officefish/Membrana/issues/761) · [`PINNED_SUBGRAPH_VERSIONING`](../../patterns/PINNED_SUBGRAPH_VERSIONING.md)  
**Код:** `scripts/` · **киты:** `kits/` (K1+)

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
| **K2** | `kam-k2-audit` | [#817](https://github.com/officefish/Membrana/issues/817) | dynin | ✅ LGTM — ship |
| **K3** | `kam-k3-first-kit` | [#818](https://github.com/officefish/Membrana/issues/818) | angelina | ⬜ |
| **K4** | `kam-k4-wire` | [#819](https://github.com/officefish/Membrana/issues/819) | ozhegov | ⬜ |
| **K5** | `kam-k5-closure` | [#820](https://github.com/officefish/Membrana/issues/820) | vesnin | ⬜ |

---

## Gate checklist (K0)

- [x] Эпик-промпт полон (границы, соседи, фазы, DoD)
- [x] OPEN спринта создан
- [x] LGTM vesnin на границы (owner ok 2026-07-21)

## Gate checklist (K1)

- [x] `kits/README.md` + `MANIFEST.schema.json` (поля id/leadPersona/roots/pins)
- [x] Провода procedures + scripts README → дом слоя; нет schema в `scripts/`
- [x] LGTM ozhegov (owner ok 2026-07-21)

## Gate checklist (K2)

- [x] `yarn kits:audit` + `scripts/lib/kit-subgraph-audit.mjs`
- [x] Тесты missing_pin + sha_drift (pinned/latest)
- [x] Чеклист PINNED_SUBGRAPH в `kits/README` (п.3, п.7)
- [x] LGTM dynin (owner ok 2026-07-21)

---

## Первые команды

```bash
yarn kits:audit
yarn kits:audit --mode latest
node --test scripts/kit-subgraph-audit.test.mjs
```
