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
| **Branch** | `feature/kdm-d0-brief` (фаза D0) |

**Prompt эпика:** [`KITS_DREAM_MASTER_PROMPT.md`](../../prompts/KITS_DREAM_MASTER_PROMPT.md)  
**Семя:** [#761](https://github.com/officefish/Membrana/issues/761) · прецедент: `kits-angelina-morning` (#814)  
**Дом/аудит:** уже в main (`kits/`, `yarn kits:audit`)

---

## Инварианты (D0)

1. Кит = сны v2 (`dreams:*` + lib), не Night Build и не `night:research` без ok владельца.
2. Owner пина MANIFEST = **dynin**; текст снов = «Мастер снов» / `DREAM_MASTER_VERSION`.
3. Схема и аудит — существующие; второго schema-острова нет.
4. До D2 — гейт готовности infra (tick/digest осмысленны, статус провайдеров ясен).

---

## Phases

| Phase | Registry id | Issue | Lead | Status |
|-------|-------------|------:|------|--------|
| **D0** | `kdm-d0-brief` | [#856](https://github.com/officefish/Membrana/issues/856) | vesnin | ✅ done · [PR #863](https://github.com/officefish/Membrana/pull/863) |
| **D1** | `kdm-d1-roots` | [#857](https://github.com/officefish/Membrana/issues/857) | ozhegov | ⬜ next |
| **D2** | `kdm-d2-kit` | [#858](https://github.com/officefish/Membrana/issues/858) | dynin | ⬜ |
| **D3** | `kdm-d3-procedure` | [#859](https://github.com/officefish/Membrana/issues/859) | ozhegov | ⬜ |
| **D4** | `kdm-d4-closure` | [#860](https://github.com/officefish/Membrana/issues/860) | vesnin | ⬜ |

---

## Gate checklist (D0)

- [x] Эпик-промпт: границы зафиксированы (секция «Границы»)
- [x] OPEN + `DAY_SPRINT_ACTIVE`
- [x] Гейт готовности до D2 назван в эпик-промпте
- [x] LGTM vesnin (owner ok 2026-07-21)

---

## Первые команды

```bash
# читать:
# docs/prompts/KITS_DREAM_MASTER_PROMPT.md
# docs/prompts/DREAM_MASTER_PROMPT.md
# kits/README.md
yarn kits:audit
```
