# CURRENT_TASK — Membrane Platform MP4

> **Эпик:** [#67](https://github.com/officefish/Membrana/issues/67) · **PR:** [#68](https://github.com/officefish/Membrana/pull/68) (`feat/background-media-swagger` → `vesnin`).

## Закрыто (merge)

| Блок | Статус |
|------|--------|
| Vesnin: `MembranaRegistry`, lifecycle `plugin.install()` / teardown | ✅ |
| MP1–MP3 + quota refactor (`userStorage` / `buffer` / `datasetCatalogId`) | ✅ prod smoke 2026-06-14 |

## Активная задача

`membrane-platform-mp4-media-membrane` — media scope по мембране, enforcement квот из tariff, provisioning tariff dataset.

## Известный долг

- Harmonic benchmark v0.1: precision 50%, recall 100% (3 FP на synthetic).
- `micStreamTelemetry.ts` → прямой `@membrana/telemetry-service` (#30).
