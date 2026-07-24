# Промпт: W0 — brief dual-mintlify-docs

> **S** · `dmd-w0-brief` · [#1122](https://github.com/officefish/Membrana/issues/1122) · parent `dual-mintlify-docs` · lead **vesnin**  
> Эпик: [`DUAL_MINTLIFY_DOCS_PROMPT.md`](./DUAL_MINTLIFY_DOCS_PROMPT.md) ·
> OPEN: [`dual-mintlify-docs-2026-07-24/OPEN.md`](../day-sprint/dual-mintlify-docs-2026-07-24/OPEN.md).

## Промпт целиком

**Только после** слова владельца «ратифицирую» (и желательно выбора harness subdomain):

1. `yarn task:start` эпик `dual-mintlify-docs` (L) + фазы `dmd-w0`…`dmd-w4` с `--parent-epic`.
2. Проставить Issue в OPEN; status OPEN → open; Started = дата; ратификация в шапке.
3. `DAY_SPRINT_ACTIVE.md`: добавить блок **Also open** на этот спринт; **не** менять Focus `tasks-workshop`.
4. Убедиться, что PR [#1120](https://github.com/officefish/Membrana/pull/1120) закрыт
   (abandoned); если ещё open — close с ссылкой на OPEN.
5. Зафиксировать layout **A** и subdomain placeholders в шапке OPEN.

## DoD

- [x] Issues + registry active для эпика и фаз (#1121–#1126)
- [x] OPEN без `draft`; ратификация в шапке
- [x] Also open обновлён; Focus чужой цел
- [x] #1120 closed / abandoned отмечен
