# Промпт: K2 — аудит полноты подграфа

> **M** · `kam-k2-audit` · [#817](https://github.com/officefish/Membrana/issues/817) · lead **dynin** · parent `kits-angelina-morning`

## Контекст

После K1 дом `kits/` и схема манифеста есть. K2 — зуб: фактическое замыкание
импортов от `roots` совпадает с `pins` (path→SHA).

## Промпт целиком

1. Библиотека `scripts/lib/kit-subgraph-audit.mjs`: `collectSubgraph`, `gitBlobSha`,
   `auditKit`, режимы `pinned` / `latest`.
2. CLI `yarn kits:audit` (exit 0/1/2); честный «0 жильцов».
3. Тесты: недостающий узел (`missing_pin`), уехавший SHA (`sha_drift` blocking vs warn).
4. Чеклист PINNED_SUBGRAPH в `kits/README.md` → ✅ на пунктах 3 и 7.

## DoD

- [x] `yarn kits:audit` + lib
- [x] Тесты missing_pin + sha_drift
- [x] Чеклист в README китов
- [x] LGTM dynin (owner ok 2026-07-21)

## Out of scope

Первый жилец (K3), `kitVersion` на процедуре (K4).
