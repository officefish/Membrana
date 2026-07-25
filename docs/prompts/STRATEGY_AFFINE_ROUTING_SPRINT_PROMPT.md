# Промпт эпика: strategy subdomain + Affine self-host (routing)

> **L** · `strategy-affine-routing` · day-sprint · lead **vesnin** · craft **ozhegov**  
> Also open (Focus `tasks-workshop` **не затирать**).  
> Ратификация: слово владельца 2026-07-25 · host = office VDS · scope **B**.

## Замок решений (не переоткрывать без слова)

| Решение | Значение |
|---------|----------|
| Поддомен | **`strategy.mmbrn.tech`** |
| Назначение | Affine self-host — поверхность контейнера стратегических документов |
| Host | тот же office VDS **`176.124.218.4`** (Docker + Caddy) |
| Scope | **B** — только strategy + Affine; **не** трогать `docs.mmbrn.tech` (product Mintlify — отдельный хвост) |
| Не трогать | `harness.mmbrn.tech` (live), `office.`, `panel.`, product Mintlify path `apps/docs` |

Карта имён (контекст, вне DoD этого эпика):

```text
docs.mmbrn.tech      → Mintlify product (apps/docs)     — later / residual dual-mintlify
harness.mmbrn.tech   → Mintlify harness                 — already live
strategy.mmbrn.tech  → Affine self-host                 — THIS sprint
```

Связь с cowork `engine-renderer`: их стабы/адаптеры остаются в коде; этот спринт даёт **реальный** URL и TLS под Affine. Полный git↔Affine sync — не обязателен в v1 (достаточно HTTPS UI + admin).

---

## Запас VDS (замер 2026-07-25, readonly probe)

Профиль канона ([`BACKGROUND_OFFICE_DEPLOY.md`](../deploy/BACKGROUND_OFFICE_DEPLOY.md)): **2 vCPU / ~4 GB RAM / 40–60 GB**.

| Метрика | Факт |
|---------|------|
| RAM total | 3.8 GiB |
| MemAvailable | **~2.8 GiB** |
| Swap | 2.0 GiB (used ~255 Mi) |
| Disk `/` | 48G · used 32G · **avail 16G** (67%) |
| CPU | 2 |
| Контейнеры | только `membrana-office-office-api-1` (~45 MiB) |
| Caddy / panel | статика на хосте (не в docker stats выше) |

**Affine (docs upstream):** baseline ~2–4 GB RAM + Postgres + Redis; диск install ~1.5 GB + data; часто рекомендуют **≥20 GB free** и **≥4 GB host RAM**.

### Вердикт запаса

- **Поставить можно** при лёгкой нагрузке (1–2 оператора, мало blobs): ~2.8 GiB available хватает на cold start с риском.
- **Запас тонкий:** office+panel+Caddy+Affine+Postgres+Redis на 3.8 GiB → риск OOM (уже был OOM на `yarn install`, runbook). Диск 16G free — **ниже** комфортных 20G.
- **Гейт W1 (обязателен перед `compose up`):** повторный `free`/`df`; если `MemAvailable < 1.5 GiB` или `Avail < 12G` → **STOP**, эскалация владельцу (апгрейд VDS / отдельный хост), не давить install.
- **Рекомендация в CLOSURE:** после стабилизации — апгрейд до **8 GB RAM / ≥80 GB disk** или вынос Affine; в v1 — swap оставить, memory limits в compose, без AI-фич Affine.

---

## Цель

1. Зафиксировать в каноне DNS слот `strategy.mmbrn.tech` → Affine на office VDS.
2. Поднять Affine (Docker Compose: app + Postgres + Redis) за Caddy TLS.
3. Owner DNS: A/CNAME `strategy` → `176.124.218.4` (или как скажет LE/Caddy pattern для panel).
4. Smoke: `https://strategy.mmbrn.tech` → Affine UI; admin bootstrap.
5. Тонкая ссылка из panel / docs cowork notes (без полного sync-движка).

## Вне scope v1

- Product `docs.mmbrn.tech` Mintlify DNS/Publish.
- Notion/Coda провайдеры; полный двусторонний sync git↔Affine.
- Вынос Affine на отдельный VDS (follow-up при OOM/диске).
- Переименование harness / перенос tooling.

---

## Фазы

| Phase | id | size | lead | DoD |
|-------|-----|------|------|-----|
| **W0** | `sar-w0-brief` | S | vesnin | OPEN + Issues + ACTIVE Also open; Focus tasks-workshop цел; замок `strategy` + scope B |
| **W1** | `sar-w1-canon-dns` | M | ozhegov | Обновить [`DNS_DOMAIN_POLICY.md`](../deploy/DNS_DOMAIN_POLICY.md); runbook `docs/deploy/STRATEGY_AFFINE_DEPLOY.md`; capacity gate script/notes; owner checklist DNS |
| **W2** | `sar-w2-affine-install` | L | ozhegov | Compose под `/opt/membrana-affine` (или `deploy/affine/`); Caddy site-block; секреты вне git; `compose up` только после gate; LE на `strategy.mmbrn.tech` |
| **W3** | `sar-w3-smoke-surface` | M | ozhegov | HTTPS 200 UI; admin создан владельцем; ссылка panel/section или docs note; backup volumes path documented |
| **W4** | `sar-w4-closure` | S | vesnin | CLOSURE + archive; ACTIVE/LOG; рекомендация апгрейда VDS если measured RSS высокий |

### W2 детали (install)

- Официальный AFFiNE docker self-host compose (stable).
- Bind только `127.0.0.1:<port>`; наружу только Caddy `:443`.
- Volumes на диске VDS (не в git); бэкап path в runbook.
- Env: `AFFINE_SERVER_EXTERNAL_URL=https://strategy.mmbrn.tech`.
- Не ломать `Caddyfile` office/panel (отдельный site-block, без ambiguous import).
- После up: `docker stats` + `MemAvailable` → записать в OPEN notes.

### Owner checklist (не агент)

- [ ] DNS: `strategy` → IP office VDS (Timeweb DNS tab).
- [ ] Первый admin Affine в UI.
- [ ] При OOM/диске — апгрейд тарифа (не «ещё контейнер»).

## Инварианты

1. **R1** Focus `tasks-workshop` не затирать — только Also open.
2. **R2** `docs.` / `harness.` / `office.` / `panel.` не переназначать.
3. **R3** Affine не публикует порты наружу без Caddy.
4. **R4** Capacity gate перед first `up`.
5. **R5** Секреты Affine только на VDS / `.env` вне коммита.

## Старт (после «ратифицирую»)

```bash
yarn task:start --id strategy-affine-routing --title "Epic: strategy.mmbrn.tech + Affine on office VDS" --size L
# фазы sar-w0 … sar-w4
```

Инстанс: `docs/day-sprint/strategy-affine-routing-2026-07-25/OPEN.md`.

Issues: эпик [#1156](https://github.com/officefish/Membrana/issues/1156) · фазы [#1157](https://github.com/officefish/Membrana/issues/1157)–[#1161](https://github.com/officefish/Membrana/issues/1161).

---

## Acceptance criteria

- [ ] W0: OPEN + Issues + ACTIVE Also open; Focus `tasks-workshop` цел
- [ ] W1: DNS canon + deploy runbook + capacity gate (без install)
- [ ] W2: Affine behind Caddy на `strategy.mmbrn.tech` после gate + слова владельца
- [ ] W3: HTTPS smoke + surface link + backup path
- [ ] W4: CLOSURE + archive + ACTIVE/LOG
