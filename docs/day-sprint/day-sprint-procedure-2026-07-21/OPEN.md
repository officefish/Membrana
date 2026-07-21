# OPEN: day-sprint-procedure — жилец procedures/day-sprint

| Поле | Значение |
|------|----------|
| **Sprint** | `day-sprint-procedure-2026-07-21` |
| **Registry epic** | `day-sprint-procedure` · [#848](https://github.com/officefish/Membrana/issues/848) |
| **Kind** | epic (фазы day-sprint) |
| **Status** | **CLOSED** · see [`CLOSURE.md`](./CLOSURE.md) |
| **Started** | 2026-07-21 |
| **Size** | L |
| **Lead epic** | vesnin |
| **Branch** | `docs/day-sprint-procedure` |

**Prompt эпика:** [`DAY_SPRINT_PROCEDURE_PROMPT.md`](../../prompts/DAY_SPRINT_PROCEDURE_PROMPT.md)  
**Дом процедур:** [`docs/procedures/`](../../procedures/README.md) · образец `ritual-evening`  
**Мягкий стык:** `pl-r5-migration` (#786) — registry migrated в F4, не блокер F2

---

## Инварианты

1. Определение = `docs/procedures/day-sprint/`; инстансы = `docs/day-sprint/<id>/` — не мигрируют.
2. Код движков — плоский `scripts/`; `kitVersion: null` (не колонизировать kits #814).
3. Только формат **day-sprint** (не night/cowork/competition/meeting).
4. Фаза = своя карточка + `leadPersona`.

---

## Phases

| Phase | Registry id | Issue | Lead | Status |
|-------|-------------|------:|------|--------|
| **F0** | `dsp-f0-brief` | [#849](https://github.com/officefish/Membrana/issues/849) | vesnin | ✅ register #862 |
| **F1** | `dsp-f1-inventory` | [#850](https://github.com/officefish/Membrana/issues/850) | ozhegov | ✅ `INVENTORY.md` |
| **F2** | `dsp-f2-home` | [#851](https://github.com/officefish/Membrana/issues/851) | ozhegov | ✅ `docs/procedures/day-sprint/` |
| **F3** | `dsp-f3-regulation` | [#852](https://github.com/officefish/Membrana/issues/852) | ozhegov | ✅ `DAY_SPRINT_REGULATION.md` |
| **F4** | `dsp-f4-wire` | [#853](https://github.com/officefish/Membrana/issues/853) | ozhegov | ✅ skill/CONTRIBUTING/FORMATS/registry |
| **F5** | `dsp-f5-closure` | [#854](https://github.com/officefish/Membrana/issues/854) | vesnin | ⬜ next after ship |

---

## Gate checklist (F0)

- [x] Эпик-промпт полон (секция «Границы»)
- [x] OPEN + `DAY_SPRINT_ACTIVE`
- [x] LGTM vesnin / ok владельца на каркас (2026-07-21)
- [ ] Ship регистрации
