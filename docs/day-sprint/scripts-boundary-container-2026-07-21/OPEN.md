# OPEN: scripts-boundary — GROUP_CONTAINERIZATION в `scripts/`

| Поле | Значение |
|------|----------|
| **Sprint** | `scripts-boundary-container-2026-07-21` |
| **Registry epic** | `scripts-boundary-container` · [#791](https://github.com/officefish/Membrana/issues/791) |
| **Kind** | epic (фазы day-sprint) |
| **Status** | **open** |
| **Started** | 2026-07-21 |
| **Size** | L |
| **Lead epic** | ozhegov (Structurer) — принимает каркас контракта |
| **Branch** | `feature/scripts-boundary-container` |

**Prompt эпика:** [`SCRIPTS_BOUNDARY_CONTAINER_PROMPT.md`](../../prompts/SCRIPTS_BOUNDARY_CONTAINER_PROMPT.md)  
**Контейнер:** [`scripts/README.md`](../../../scripts/README.md)  
**Паттерн:** [`GROUP_CONTAINERIZATION`](../../patterns/GROUP_CONTAINERIZATION.md)

---

## Инварианты владельца

1. **Один дом** — `scripts/`. Не создавать `docs/audit/scripts/` и аналоги.
2. **Фаза = своя карточка + свой `leadPersona`.** Ответственность = кто принял выход.
3. **S3 kits** не изобретает контракт манифеста — ждёт / выравнивается с `pl-r3-boundary` (#784).
4. Research Q эпика про Temporal/Airflow / отказоустойчивость ритуала — **отдельный трек**, не блокирует S0–S2.

---

## Phases

| Phase | Registry id | Issue | Lead | Deliverable | Status |
|-------|-------------|-------|------|-------------|--------|
| **S0** | `sbc-s0-contract` | [#792](https://github.com/officefish/Membrana/issues/792) | ozhegov | `scripts/README` + `AGENT_PROMPT` + `cache/` | ✅ merged #797 |
| **S1** | `sbc-s1-registry` | [#793](https://github.com/officefish/Membrana/issues/793) | dynin | `registry/SCRIPTS_LIST.md` derived | ✅ merged #799 |
| **S2** | `sbc-s2-tools-report` | [#794](https://github.com/officefish/Membrana/issues/794) | vesnin | tooling `--report` пишет в контейнер | ✅ LGTM vesnin 2026-07-21 |
| **S3** | `sbc-s3-kits-align` | [#795](https://github.com/officefish/Membrana/issues/795) | ozhegov | align kits ↔ pl-r3 | ⬜ blocked on R3 |
| **S4** | `sbc-s4-wiring` | [#796](https://github.com/officefish/Membrana/issues/796) | vesnin | AGENTS / skills / DoD wires | ⬜ |

---

## Соседи (скоуп)

| Сосед | Риск | Правило |
|-------|------|---------|
| `pl-r1-home` / PR #790 | `docs/procedures` | Не смешивать дома; scripts вызываются из процедур |
| `pl-r3-boundary` #784 | kit-manifest + layer direction | S3 только после/вместе с контрактом R3 |
| `pl-r2-vocabulary` #783 | словарь категорий | Не плодить вторую таксономию скриптов «на глаз» |

---

## Gate checklist (S0)

- [x] `scripts/README.md` — контракт + чеклист GROUP_CONTAINERIZATION
- [x] `scripts/AGENT_PROMPT.md` — сценарии A–D + HARD GATE
- [x] `scripts/cache/` gitignore + `.gitkeep`
- [x] Зарезервированы `registry/`, `analysis/`
- [x] Issue эпика + фазы зарегистрированы (#791–#796)
- [x] LGTM lead S0 (ozhegov) на контракт (термины дом/SoT/реестр/кит)

---

## Первые команды

```bash
yarn neighbors
# читать: scripts/README.md, scripts/AGENT_PROMPT.md
```
