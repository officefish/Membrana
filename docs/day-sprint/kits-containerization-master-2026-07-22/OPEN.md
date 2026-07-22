# OPEN: kits-containerization-master — кит Мастера контейнеризации

| Поле | Значение |
|------|----------|
| **Sprint** | `kits-containerization-master-2026-07-22` |
| **Registry epic** | `kits-containerization-master` · [#904](https://github.com/officefish/Membrana/issues/904) |
| **Kind** | epic (фазы day-sprint) |
| **Status** | **open** |
| **Started** | 2026-07-22 |
| **Size** | L |
| **Lead epic** | vesnin |
| **Pin owner** | ozhegov |
| **Branch** | `docs/ozhegov-kits-containerization-master` |

**Жилец (черновик на ветке):** [`kits/containerization-master/`](../../../kits/containerization-master/)  
**Процедура:** [`docs/procedures/containerization/`](../../procedures/containerization/)  
**Промпт Мастера:** [`CONTAINERIZATION_MASTER_PROMPT.md`](../../prompts/CONTAINERIZATION_MASTER_PROMPT.md)  
**Семя:** [#761](https://github.com/officefish/Membrana/issues/761) · паттерны GROUP_* + PINNED_*

**Сосед:** `procedure-frames` [#900](https://github.com/officefish/Membrana/issues/900) — ортогонально (`frames[]`); не глотать.

---

## Phases

| Phase | Registry id | Issue | Lead | Status |
|-------|-------------|------:|------|--------|
| **C0** | `kcm-c0-brief` | [#905](https://github.com/officefish/Membrana/issues/905) | vesnin | open |
| **C1** | `kcm-c1-prompt` | [#906](https://github.com/officefish/Membrana/issues/906) | ozhegov | open (draft on branch) |
| **C2** | `kcm-c2-kit` | [#907](https://github.com/officefish/Membrana/issues/907) | ozhegov | open (draft on branch) |
| **C3** | `kcm-c3-wire` | [#908](https://github.com/officefish/Membrana/issues/908) | ozhegov | open (draft on branch) |
| **C4** | `kcm-c4-closure` | [#909](https://github.com/officefish/Membrana/issues/909) | vesnin | open |

## Gate checklist (к C4)

- [ ] CLOSURE.md
- [ ] PINNED_SUBGRAPH ✅ в README кита
- [ ] Комментарий в #761 (третий жилец)
- [ ] LGTM vesnin → archive фаз + эпика после merge
