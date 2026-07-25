# Промпт: W3 — HTTPS smoke + surface link

> **M** · `sar-w3-smoke-surface` · [#1160](https://github.com/officefish/Membrana/issues/1160) · parent `strategy-affine-routing` · lead **ozhegov**  
> Эпик: [`STRATEGY_AFFINE_ROUTING_SPRINT_PROMPT.md`](./STRATEGY_AFFINE_ROUTING_SPRINT_PROMPT.md) ·
> OPEN: [`strategy-affine-routing-2026-07-25/OPEN.md`](../day-sprint/strategy-affine-routing-2026-07-25/OPEN.md).

## Промпт целиком

1. Smoke: `https://strategy.mmbrn.tech` → Affine UI (HTTPS 200 / осмысленный UI response).
2. Owner создаёт первого admin в UI (агент не хранит пароль в репо).
3. Тонкая ссылка: panel section и/или docs cowork note на strategy URL — **без** полного sync-движка.
4. Backup volumes path задокументирован в runbook / OPEN.
5. Не трогать harness/docs DNS; не расширять scope до Notion/Coda.

## DoD

- [ ] HTTPS UI подтверждён (evidence в Issue/OPEN)
- [ ] Admin bootstrap — чеклист владельца отмечен или явный blocker
- [ ] Surface link + backup path documented
- [ ] PR
