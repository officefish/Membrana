# CLOSURE — kits-dream-master

| Field | Value |
|-------|-------|
| Epic | `kits-dream-master` · [#855](https://github.com/officefish/Membrana/issues/855) |
| Date | 2026-07-21 |
| Sprint OPEN | [`OPEN.md`](./OPEN.md) |
| Status | **CLOSED** |
| Seed | [#761](https://github.com/officefish/Membrana/issues/761) · [`PINNED_SUBGRAPH_VERSIONING`](../../patterns/PINNED_SUBGRAPH_VERSIONING.md) |
| Precedent | `kits-angelina-morning` (#814) |

## Server-first (зафиксировано)

| Слой | Путь |
|------|------|
| Код движков | плоский `scripts/` (`dreams.mjs` + lib) |
| Дом китов | [`kits/`](../../../kits/README.md) · схема уже в main |
| Второй жилец | [`kits/dream-master/`](../../../kits/dream-master/) |
| Процедура снов | [`docs/procedures/ritual-dreams/`](../../procedures/ritual-dreams/) · `kitVersion: kits/dream-master` |
| Зуб аудита | `yarn kits:audit` (не дублировали) |

Не путать с Night Build и CLI `yarn night:research*` (вне кита, D1).

## Сделано

| Фаза | Issue | PR | Артефакт |
|------|------:|----:|----------|
| D0 | #856 | [#863](https://github.com/officefish/Membrana/pull/863) | границы эпика + OPEN |
| D1 | #857 | [#865](https://github.com/officefish/Membrana/pull/865) | root = `scripts/dreams.mjs`; out-of-kit |
| D2 | #858 | [#867](https://github.com/officefish/Membrana/pull/867) | жилец dream-master · 1 root / 10 pins |
| D3 | #859 | [#869](https://github.com/officefish/Membrana/pull/869) | `ritual-dreams` → kitVersion |
| D4 | #860 | *этот PR* | CLOSURE + archive + #761 |

## PINNED_SUBGRAPH

Чеклист ✅ в [`kits/dream-master/README.md`](../../../kits/dream-master/README.md).

## Handoff

- Обновление пина: пересобрать `pins` + отдельный коммит `kits/dream-master/MANIFEST.json`;
  `yarn kits:audit --id dream-master`.
- Interactive → `--mode latest`; autonomous / office cron → pinned.
- `dreams-providers.mjs` — вне статического замыкания CLI; при подключении к runtime —
  обновить манифест.
- Nest office dreams — runtime доставки, не pins.
- `DREAM_MASTER_PROMPT.md` — precedents процедуры; версия = `DREAM_MASTER_VERSION`.
- Сосед `night:research` / Night Build — отдельные киты или ok владельца, не этот жилец.
- Семя #761 — комментарий «второй жилец» (D4).

## Archive

`yarn task:archive` для `kdm-d4-closure` + эпика `kits-dream-master` · notes: PR фазы + этот CLOSURE.
D0–D3 уже archived (#864, #866, #868, #871).
