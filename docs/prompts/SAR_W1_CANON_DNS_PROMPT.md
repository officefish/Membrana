# Промпт: W1 — DNS canon + Affine deploy runbook

> **M** · `sar-w1-canon-dns` · [#1158](https://github.com/officefish/Membrana/issues/1158) · parent `strategy-affine-routing` · lead **ozhegov**  
> Эпик: [`STRATEGY_AFFINE_ROUTING_SPRINT_PROMPT.md`](./STRATEGY_AFFINE_ROUTING_SPRINT_PROMPT.md) ·
> OPEN: [`strategy-affine-routing-2026-07-25/OPEN.md`](../day-sprint/strategy-affine-routing-2026-07-25/OPEN.md).

## Промпт целиком

Канон и runbook **без** `compose up` Affine:

1. Обновить [`DNS_DOMAIN_POLICY.md`](../deploy/DNS_DOMAIN_POLICY.md): слот `strategy.mmbrn.tech` → Affine на office VDS; явно что `docs.` / `harness.` / `office.` / `panel.` не трогаем.
2. Runbook [`docs/deploy/STRATEGY_AFFINE_DEPLOY.md`](../deploy/STRATEGY_AFFINE_DEPLOY.md): compose layout (`/opt/membrana-affine` или `deploy/affine/`), Caddy site-block pattern, env `AFFINE_SERVER_EXTERNAL_URL`, volumes/backup path, secrets вне git.
3. Capacity gate: пороги из OPEN (`MemAvailable < 1.5 GiB` или disk avail `< 12G` → STOP); как мерить (`free`/`df` / readonly probe).
4. Owner checklist DNS (Timeweb A/CNAME `strategy` → `176.124.218.4`) — в runbook или OPEN, шаги владельца не агент.
5. Не трогать harness/docs DNS и live Caddy office/panel кроме документирования отдельного site-block.

## DoD

- [ ] `DNS_DOMAIN_POLICY.md` отражает strategy → Affine
- [ ] `STRATEGY_AFFINE_DEPLOY.md` с gate + owner DNS checklist
- [ ] PR; LGTM смысла; W2 install **не** стартовать без слова владельца
