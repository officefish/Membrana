# OPEN: strategy-affine-routing — strategy.mmbrn.tech + Affine on office VDS

| Поле | Значение |
|------|----------|
| **Sprint** | `strategy-affine-routing-2026-07-25` |
| **Registry epic** | `strategy-affine-routing` · [#1156](https://github.com/officefish/Membrana/issues/1156) |
| **Status** | **closed** → [`CLOSURE.md`](./CLOSURE.md) |
| **Kind** | day-sprint (эпик L + фазы S/M/L) |
| **Size** | L |
| **Lead epic** | vesnin |
| **Craft** | ozhegov (W1–W3) |
| **Started** | 2026-07-25 |
| **Ратификация** | владелец «Ратифицирую» 2026-07-25 · lock: **`strategy.mmbrn.tech`** · scope **B** · host office VDS `176.124.218.4` |
| **Host** | office VDS (Docker + Caddy) — тот же, что office/panel |
| **Стык** | Focus [`tasks-workshop`](../tasks-workshop-2026-07/OPEN.md) **не затирать** — только Also open |

**Промпт эпика:** [`STRATEGY_AFFINE_ROUTING_SPRINT_PROMPT.md`](../../prompts/STRATEGY_AFFINE_ROUTING_SPRINT_PROMPT.md)

**Also open pointer:** [`DAY_SPRINT_ACTIVE.md`](../../DAY_SPRINT_ACTIVE.md) → Also open (Focus `tasks-workshop` цел).

---

## Цель

1. Зафиксировать в каноне DNS слот `strategy.mmbrn.tech` → Affine self-host на office VDS.
2. Поднять Affine (Docker Compose: app + Postgres + Redis) за Caddy TLS.
3. Owner DNS: A/CNAME `strategy` → `176.124.218.4`.
4. Smoke: `https://strategy.mmbrn.tech` → Affine UI; admin bootstrap владельцем.
5. Тонкая ссылка из panel / docs cowork notes (без полного git↔Affine sync в v1).

## Замок решений (не переоткрывать без слова)

| Решение | Значение |
|---------|----------|
| Поддомен | **`strategy.mmbrn.tech`** |
| Назначение | Affine self-host — поверхность контейнера стратегических документов |
| Host | office VDS **`176.124.218.4`** |
| Scope | **B** — только strategy + Affine |
| Не трогать | `harness.mmbrn.tech`, `docs.mmbrn.tech` (product Mintlify residual), `office.`, `panel.`, path `apps/docs` |

Карта имён:

```text
docs.mmbrn.tech      → Mintlify product (apps/docs)     — later / residual dual-mintlify
harness.mmbrn.tech   → Mintlify harness                 — already live
strategy.mmbrn.tech  → Affine self-host                 — THIS sprint
```

## Capacity (замер 2026-07-25)

| Метрика | Факт |
|---------|------|
| RAM total | 3.8 GiB · MemAvailable ~2.8 GiB |
| Disk `/` | avail **16G** (ниже комфортных 20G) |
| Контейнеры | `membrana-office-office-api-1` (~45 MiB) |

**Гейт перед W2 `compose up`:** `yarn affine:capacity-gate` (или `yarn office:ssh 'free -b; echo ---; df -B1 /'`). Если `MemAvailable < 1.5 GiB` или `Avail < 12G` → STOP, эскалация владельцу. Канон: [`STRATEGY_AFFINE_DEPLOY.md`](../../deploy/STRATEGY_AFFINE_DEPLOY.md).

## Phases

| Phase | Registry id | Issue | Lead | Prompt | DoD | Status |
|-------|-------------|------:|------|--------|-----|--------|
| **W0** | `sar-w0-brief` | [#1157](https://github.com/officefish/Membrana/issues/1157) | vesnin | [`SAR_W0_BRIEF_PROMPT.md`](../../prompts/SAR_W0_BRIEF_PROMPT.md) | OPEN + Issues + ACTIVE Also open; Focus цел; lock strategy + scope B | **done** (PR [#1163](https://github.com/officefish/Membrana/pull/1163)) |
| **W1** | `sar-w1-canon-dns` | [#1158](https://github.com/officefish/Membrana/issues/1158) | ozhegov | [`SAR_W1_CANON_DNS_PROMPT.md`](../../prompts/SAR_W1_CANON_DNS_PROMPT.md) | DNS_DOMAIN_POLICY + STRATEGY_AFFINE_DEPLOY; capacity gate; owner DNS checklist | **done** (PR [#1173](https://github.com/officefish/Membrana/pull/1173)) |
| **W2** | `sar-w2-affine-install` | [#1159](https://github.com/officefish/Membrana/issues/1159) | ozhegov | [`SAR_W2_AFFINE_INSTALL_PROMPT.md`](../../prompts/SAR_W2_AFFINE_INSTALL_PROMPT.md) | Compose + Caddy site-block; secrets off-git; up after gate; LE | **done** (PR [#1179](https://github.com/officefish/Membrana/pull/1179)) |
| **W3** | `sar-w3-smoke-surface` | [#1160](https://github.com/officefish/Membrana/issues/1160) | ozhegov | [`SAR_W3_SMOKE_SURFACE_PROMPT.md`](../../prompts/SAR_W3_SMOKE_SURFACE_PROMPT.md) | HTTPS UI; owner admin; panel/docs note; backup path | **done** (PR [#1181](https://github.com/officefish/Membrana/pull/1181)) |
| **W4** | `sar-w4-closure` | [#1161](https://github.com/officefish/Membrana/issues/1161) | vesnin | [`SAR_W4_CLOSURE_PROMPT.md`](../../prompts/SAR_W4_CLOSURE_PROMPT.md) | CLOSURE + archive; ACTIVE/LOG; VDS upgrade note if needed | **done** → [`CLOSURE.md`](./CLOSURE.md) |

## Инварианты (R1–R5)

1. **R1** Focus `tasks-workshop` в `DAY_SPRINT_ACTIVE` не затирать — только **Also open**.
2. **R2** `docs.` / `harness.` / `office.` / `panel.` не переназначать.
3. **R3** Affine не публикует порты наружу без Caddy (bind `127.0.0.1`).
4. **R4** Capacity gate перед first `compose up`.
5. **R5** Секреты Affine только на VDS / `.env` вне коммита.

## Вне scope v1

- Product `docs.mmbrn.tech` Mintlify DNS/Publish.
- Notion/Coda; полный двусторонний sync git↔Affine.
- Вынос Affine на отдельный VDS (follow-up при OOM/диске).
- Переименование harness / перенос tooling.

## Owner checklist (не агент)

- [x] DNS: `strategy` → IP office VDS (Timeweb DNS tab) — gate `[go]` 2026-07-25.
- [x] Первый admin Affine в UI: https://strategy.mmbrn.tech/ — владелец «Готово» 2026-07-25 (druid / feedback@mmbrn.ru; email verify не требуется в v1).
- [ ] При OOM/диске — апгрейд тарифа (не «ещё контейнер»).

## Gate checklist (W0)

- [x] Слово владельца («Ратифицирую») + lock `strategy.mmbrn.tech` + scope B
- [x] Эпик + 5 фаз в registry + GitHub Issues #1156–#1161
- [x] `DAY_SPRINT_ACTIVE` → **Also open** (Focus `tasks-workshop` цел)
- [x] Номера Issue в таблице Phases
- [x] PR W0 brief merged (#1163)

## Gate checklist (W1)

- [x] `DNS_DOMAIN_POLICY.md` — слот `strategy.mmbrn.tech` → Affine; docs/harness/office/panel не трогать
- [x] `STRATEGY_AFFINE_DEPLOY.md` — layout, Caddy notes, secrets, backup path, owner DNS
- [x] `yarn affine:capacity-gate` — пороги MemAvailable / disk
- [x] PR W1 merges (Closes #1158)

## Gate checklist (W2)

- [x] `yarn affine:capacity-gate` → `[go]` перед `compose up` (2.78 GiB / 15.87 GiB)
- [x] `/opt/membrana-affine` up (app + postgres + redis); bind `127.0.0.1:3010`
- [x] Caddy `strategy.caddy` + LE на `strategy.mmbrn.tech` (HTTPS 302 → Affine)
- [x] Секреты только в `/opt/membrana-affine/.env` (вне git); `yarn affine:install`
- [x] Post-install: `docker stats` + MemAvailable → заметка ниже
- [x] Owner: первый admin в UI (не агент) — «Готово» 2026-07-25
- [x] PR W2 merges (Closes #1159) — [#1179](https://github.com/officefish/Membrana/pull/1179)

## Gate checklist (W3)

- [x] HTTPS smoke: `https://strategy.mmbrn.tech/` → **HTTP 200** `text/html` AFFiNE UI (не `/admin/setup`)
- [x] Admin bootstrap — чеклист владельца отмечен («Готово» 2026-07-25)
- [x] Surface: panel раздел «Стратегия» → `https://strategy.mmbrn.tech` + [`SURFACE.md`](../../containers/strategic-docs/SURFACE.md)
- [x] Backup volumes path + процедура в [`STRATEGY_AFFINE_DEPLOY.md`](../../deploy/STRATEGY_AFFINE_DEPLOY.md) (post-W2 размеры)
- [x] PR W3 merges (Closes #1160) — [#1181](https://github.com/officefish/Membrana/pull/1181)

## Gate checklist (W4)

- [x] CLOSURE написан
- [x] Карточки W0–W4 + эпик archived
- [x] ACTIVE Also open снят; Focus `tasks-workshop` цел
- [x] CLOSED строка в `DAY_SPRINT_LOG.md`

## Post-install capacity (W2)

| Метрика | Факт |
|---------|------|
| Дата | 2026-07-25 (после `yarn affine:install`) |
| MemAvailable | **2.32 GiB** (2486005760 B; было 2.78 GiB pre-up; total 3.8 GiB) |
| Disk `/` avail | **14.24 GiB** (15292116992 B; 48G · used 34G · 70%) |
| `docker stats` | `affine_server` ~165 MiB / 1.5 GiB · `affine_postgres` ~57 MiB / 512 MiB · `affine_redis` ~6 MiB / 256 MiB · office-api ~49 MiB |
| HTTPS smoke (W2) | `https://strategy.mmbrn.tech/` → **HTTP 302** `Location: /admin/setup` (до admin) |
| Bind | `127.0.0.1:3010` only (R3) |

## W3 smoke + volumes (post-admin)

| Метрика | Факт |
|---------|------|
| Дата | 2026-07-25 (после admin bootstrap владельцем) |
| HTTPS | `https://strategy.mmbrn.tech/` → **HTTP 200** · `Content-Type: text/html` · `<title>AFFiNE</title>` · **не** `/admin/setup` |
| Containers | `affine_server` / `affine_postgres` / `affine_redis` Up (healthy) |
| Volumes | postgres ~68 MiB · storage ~4 KiB · config ~8 KiB · backups/ готов, пуст до первого dump |
| Surface | panel `strategic-docs` → https://strategy.mmbrn.tech · docs [`SURFACE.md`](../../containers/strategic-docs/SURFACE.md) |
