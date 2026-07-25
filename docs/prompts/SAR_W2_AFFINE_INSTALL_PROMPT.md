# Промпт: W2 — Affine Docker install behind Caddy

> **L** · `sar-w2-affine-install` · [#1159](https://github.com/officefish/Membrana/issues/1159) · parent `strategy-affine-routing` · lead **ozhegov**  
> Эпик: [`STRATEGY_AFFINE_ROUTING_SPRINT_PROMPT.md`](./STRATEGY_AFFINE_ROUTING_SPRINT_PROMPT.md) ·
> OPEN: [`strategy-affine-routing-2026-07-25/OPEN.md`](../day-sprint/strategy-affine-routing-2026-07-25/OPEN.md).

## Промпт целиком

**Только после** отдельного слова владельца (W0/W1 не включают install):

1. Повторить capacity gate (`free`/`df`); при FAIL — STOP, не давить `up`.
2. Официальный AFFiNE docker self-host compose (stable) под `/opt/membrana-affine` (или `deploy/affine/` в репо как шаблон без секретов).
3. Bind только `127.0.0.1:<port>`; наружу только Caddy `:443`.
4. Отдельный Caddy site-block для `strategy.mmbrn.tech` — **не** ломать office/panel.
5. Env: `AFFINE_SERVER_EXTERNAL_URL=https://strategy.mmbrn.tech`; секреты только на VDS.
6. Volumes на диске VDS; путь бэкапа — в runbook.
7. После up: `docker stats` + `MemAvailable` → заметка в OPEN.

## DoD

- [ ] Affine up за Caddy; LE на `strategy.mmbrn.tech` (или явный блокер DNS владельца)
- [ ] Порты не торчат наружу без Caddy
- [ ] Секреты не в git; capacity notes в OPEN
- [ ] PR / deploy evidence; без AI-фич Affine в v1
