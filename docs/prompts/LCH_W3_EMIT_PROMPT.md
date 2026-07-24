# Промпт: W3 — emit evidence minimum + snapshot

> **M** · `lch-w3-emit` · [#1037](https://github.com/officefish/Membrana/issues/1037) · lead **ozhegov** · parent `llm-calls-house`

## Промпт целиком

1. Расширить `llm-procedure-schema.json` + office DTO: опциональные `promptSha256`, `responseSha256`, `promptBytes`, `responseBytes`, `params`, `attemptIndex`, `providerRequestId` (и аналоги).
2. Transport/chain: hash в памяти при emit; `FORBIDDEN_USAGE_KEYS` без изменений по raw.
3. Unit-тесты LPC + office dto.
4. `yarn llm-calls:snapshot --date` — office day → dated `analysis/` + registry (без секретов).
5. Короткий ADR «T1 evidence minimum» (`docs/adr/`) — ниже консилиум-гейта.

## Acceptance criteria

- [ ] Emit несёт hashes+params; raw prompt отвергается
- [ ] Тесты зелёные
- [ ] Snapshot пишет в дом без тел
- [ ] ADR записан

## Out of scope

Mintlify pages (W4); полный prompt store.
