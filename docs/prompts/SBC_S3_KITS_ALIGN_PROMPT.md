# Промпт: S3 — kits align с pl-r3

> Размер **M**. Реестр: `sbc-s3-kits-align` · Issue #795 · Lead: **ozhegov** · Parent: `scripts-boundary-container`.

## Цель

Выровнять kits / Releases с **контрактом kit-manifest из `pl-r3-boundary` (#784)** —
потребить, не изобретать параллельный формат. Код китов остаётся в `scripts/`;
ядро версий — GitHub Releases (+ Actions), как в карте ядер контейнеров.

## Gate

Не стартовать имплементацию манифеста, пока R3 не дал адрес/схему (или явный stub-контракт в R3).
До gate — только design note в `scripts/analysis/` по Scenario C.

## DoD

- [ ] Ссылка на канон R3 в `scripts/README`.
- [ ] Нет второго JSON-схемного острова.
- [ ] LGTM ozhegov (+ sync с dynin как lead R3).
