# Промпт: S3 — kits align с pl-r3

> Размер **M**. Реестр: `sbc-s3-kits-align` · Issue #795 · Lead: **ozhegov** · Parent: `scripts-boundary-container`.

## Цель

Выровнять kits / Releases с **контрактом kit-manifest из Р3** (`pl-r3-boundary` #784 /
PR #808) — потребить, не изобретать параллельный формат. Код движков остаётся в
плоском `scripts/`; слой `kits/` спит до #761. Ядро раздачи пина — GitHub Releases;
версия единицы — `PINNED_SUBGRAPH_VERSIONING`.

## Gate

R3 в main (архив карточки + `docs/procedures/README` § киты + `layer-rules.json`).
Имплементация кода китов — **не** этот DoD (#761).

## DoD

- [x] Ссылка на канон Р3 в `scripts/README` (§ Киты).
- [x] Нет второго JSON-схемного острова под `scripts/`.
- [x] Analysis-снимок `scripts/analysis/kits-align-pl-r3-2026-07-21.md`.
- [x] LGTM ozhegov (+ sync: канон = Р3/dynin, не новый остров).
