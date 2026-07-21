# CLOSURE — kits-angelina-morning

| Field | Value |
|-------|-------|
| Epic | `kits-angelina-morning` · [#814](https://github.com/officefish/Membrana/issues/814) |
| Date | 2026-07-21 |
| Sprint OPEN | [`OPEN.md`](./OPEN.md) |
| Status | **CLOSED** |
| Seed | [#761](https://github.com/officefish/Membrana/issues/761) · [`PINNED_SUBGRAPH_VERSIONING`](../../patterns/PINNED_SUBGRAPH_VERSIONING.md) |

## Server-first (зафиксировано)

| Слой | Путь |
|------|------|
| Код движков | плоский `scripts/` |
| Дом китов | [`kits/`](../../../kits/README.md) · схема [`MANIFEST.schema.json`](../../../kits/MANIFEST.schema.json) |
| Первый жилец | [`kits/angelina-morning/`](../../../kits/angelina-morning/) |
| Процедура утра | [`docs/procedures/ritual-day/`](../../procedures/ritual-day/) · `kitVersion: kits/angelina-morning` |
| Зуб аудита | `yarn kits:audit` · `scripts/lib/kit-subgraph-audit.mjs` |

Не путать с `docs/audit/git/` pins (BME) и не плодить schema в `scripts/`.

## Сделано

| Фаза | Issue | PR | Артефакт |
|------|------:|----:|----------|
| K0 | #815 | [#833](https://github.com/officefish/Membrana/pull/833) | границы эпика + OPEN |
| K1 | #816 | [#836](https://github.com/officefish/Membrana/pull/836) | дом `kits/` + схема манифеста |
| K2 | #817 | [#838](https://github.com/officefish/Membrana/pull/838) | `yarn kits:audit` (missing_pin / sha_drift) |
| K3 | #818 | [#841](https://github.com/officefish/Membrana/pull/841) | жилец angelina-morning · 13 roots / 42 pins |
| K4 | #819 | [#843](https://github.com/officefish/Membrana/pull/843) | `ritual-day` → kitVersion |
| K5 | #820 | *(этот PR)* | CLOSURE + archive + #761 |

## PINNED_SUBGRAPH

Чеклист ✅ в [`kits/README.md`](../../../kits/README.md) и
[`kits/angelina-morning/README.md`](../../../kits/angelina-morning/README.md).

## Handoff

- Обновление пина после правки корня/lib: пересобрать `pins` + отдельный коммит
  `kits/angelina-morning/MANIFEST.json`; проверить `yarn kits:audit --id angelina-morning`.
- Interactive → `--mode latest`; autonomous → pinned (default audit).
- Ценностный доклад утра (#788) — сосед; кит его не подменяет.
- GitHub Releases как раздача пина — позже (ядро core карты); сейчас пины = git blob SHA.
- Вечер (`ritual-evening`) остаётся с `kitVersion: null` до своего кита.
- Семя #761 — комментарий со ссылкой на первый жилец (K5).

## Archive

`yarn task:archive` для `kam-k5-closure` + эпика `kits-angelina-morning` · notes: PR фазы + этот CLOSURE.
K0–K4 уже archived (#834, #837, #839, #842, #844).
