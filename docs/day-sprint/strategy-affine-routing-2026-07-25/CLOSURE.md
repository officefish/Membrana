# CLOSURE: strategy-affine-routing — strategy.mmbrn.tech + Affine on office VDS

| Поле | Значение |
|------|----------|
| **Sprint** | `strategy-affine-routing-2026-07-25` |
| **Epic** | `strategy-affine-routing` · [#1156](https://github.com/officefish/Membrana/issues/1156) |
| **Status** | **closed** |
| **Closed** | 2026-07-25 |
| **PRs** | W0 [#1163](https://github.com/officefish/Membrana/pull/1163) `810108ba` · W1 [#1173](https://github.com/officefish/Membrana/pull/1173) `4cd760fd` · W2 [#1179](https://github.com/officefish/Membrana/pull/1179) `bc955fb6` · W3 [#1181](https://github.com/officefish/Membrana/pull/1181) `abc5fb21` |
| **Live** | https://strategy.mmbrn.tech |
| **Ратификация** | владелец «Ратифицирую» 2026-07-25 · lock `strategy.mmbrn.tech` · scope **B** · host office VDS `176.124.218.4` |
| **Abandoned** | N/A — нет аналога [#1120](https://github.com/officefish/Membrana/pull/1120) (tabs-as-final STOP); все фазы W0–W3 влиты |

## Delivered

1. **W0 brief:** Issues #1156–#1161, OPEN, Also open (Focus `tasks-workshop` цел); lock `strategy` + scope B.
2. **W1 canon:** `DNS_DOMAIN_POLICY.md` слот `strategy.mmbrn.tech` → Affine; runbook [`STRATEGY_AFFINE_DEPLOY.md`](../../deploy/STRATEGY_AFFINE_DEPLOY.md); `yarn affine:capacity-gate`.
3. **W2 install:** Compose `/opt/membrana-affine` (app + Postgres + Redis); Caddy site-block + LE; bind `127.0.0.1:3010`; секреты вне git; `yarn affine:install` после gate `[go]`.
4. **W3 surface:** HTTPS 200 AFFiNE UI; owner admin bootstrap; panel раздел «Стратегия» → `https://strategy.mmbrn.tech`; [`SURFACE.md`](../../containers/strategic-docs/SURFACE.md); backup volumes path в runbook.
5. **Owner DNS + admin:** A `strategy` → office VDS; первый admin в UI (druid / feedback@mmbrn.ru) — «Готово» 2026-07-25.

## Owner checklist

- [x] DNS: `strategy` → IP office VDS (Timeweb) — gate `[go]` 2026-07-25
- [x] Первый admin Affine в UI: https://strategy.mmbrn.tech/
- [ ] При OOM/диске — апгрейд тарифа (не «ещё контейнер») — **residual / рекомендация ниже**

## Capacity post-install (W2 facts)

| Метрика | Факт |
|---------|------|
| Дата | 2026-07-25 (после `yarn affine:install`) |
| MemAvailable | **2.32 GiB** (было 2.78 GiB pre-up; total 3.8 GiB) |
| Disk `/` avail | **14.24 GiB** (48G · used 34G · 70%) — ниже комфортных 20G |
| `docker stats` | `affine_server` ~165 MiB / 1.5 GiB · `affine_postgres` ~57 MiB / 512 MiB · `affine_redis` ~6 MiB / 256 MiB · office-api ~49 MiB |
| Bind | `127.0.0.1:3010` only (R3) |

**Рекомендация:** апгрейд VDS до **8 GB RAM / ≥80 GB disk** или вынос Affine на отдельный хост; в v1 — swap оставить, memory limits в compose, без AI-фич Affine. Запас тонкий: office+panel+Caddy+Affine+Postgres+Redis на 3.8 GiB.

## Инварианты R1–R5

| ID | Статус |
|----|--------|
| R1 Focus `tasks-workshop` не затёрт | ✅ |
| R2 `docs.` / `harness.` / `office.` / `panel.` не переназначены | ✅ |
| R3 Affine bind только `127.0.0.1` за Caddy | ✅ |
| R4 Capacity gate перед first `compose up` | ✅ (`[go]` 2.78 GiB / 15.87 GiB) |
| R5 Секреты Affine вне git (VDS `.env`) | ✅ |

## Phases

| Phase | Issue | PR / evidence | Archive |
|-------|------:|---------------|---------|
| W0 | #1157 | [#1163](https://github.com/officefish/Membrana/pull/1163) | archived с этим CLOSURE |
| W1 | #1158 | [#1173](https://github.com/officefish/Membrana/pull/1173) | archived с этим CLOSURE |
| W2 | #1159 | [#1179](https://github.com/officefish/Membrana/pull/1179) | archived с этим CLOSURE |
| W3 | #1160 | [#1181](https://github.com/officefish/Membrana/pull/1181) · live HTTPS + panel «Стратегия» | archived с этим CLOSURE |
| W4 | #1161 | этот CLOSURE | archived |

## Out of scope / residual

- Полный двусторонний sync git↔Affine (v1: HTTPS UI + admin достаточно).
- Апгрейд VDS / вынос Affine при OOM или давлении диска (см. capacity выше).
- Product `docs.mmbrn.tech` Mintlify DNS/Publish (dual-mintlify residual; вне scope B).
- Notion/Coda провайдеры.
