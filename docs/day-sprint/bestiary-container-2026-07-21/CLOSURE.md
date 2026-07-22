# CLOSURE — bestiary-container

| Field | Value |
|-------|-------|
| Epic | `bestiary-container` · [#878](https://github.com/officefish/Membrana/issues/878) |
| Date | 2026-07-21 → 2026-07-22 |
| Sprint OPEN | [`OPEN.md`](./OPEN.md) |
| Status | **CLOSED** |
| Insight | [`insight-weekly-antipattern-audit-bestiary`](../../insights/insight-weekly-antipattern-audit-bestiary/INSIGHT.md) (трек B) |
| Pattern | [`GROUP_CONTAINERIZATION`](../../patterns/GROUP_CONTAINERIZATION.md) |
| Precedent | `kits-angelina-morning` (#814) · `kits-dream-master` (#855) |

## Container + engines (зафиксировано)

| Слой | Путь |
|------|------|
| Дом группы | [`docs/audit/bestiary/`](../../audit/bestiary/) |
| Specimens | `docs/audit/bestiary/specimens/<class>/` |
| Реестр (производный) | [`registry/BESTIARY_LIST.md`](../../audit/bestiary/registry/BESTIARY_LIST.md) |
| Weekly analysis | [`analysis/`](../../audit/bestiary/analysis/) |
| Engines | плоский `scripts/lib/lens-bestiary.mjs` · `scripts/lens-run.mjs` · `scripts/lib/bestiary-audit.mjs` · `scripts/lib/bestiary-weekly.mjs` |
| Зубы | `yarn bestiary:audit` · `yarn bestiary:weekly` |

Не копировать код линзы в audit; не путать с `kits/` (пины) и `docs/audit/scripts/` (запрещённый второй дом).

## Сделано

| Фаза | Issue | PR | Артефакт | Archive |
|------|------:|----:|----------|---------|
| B0 | #879 | [#885](https://github.com/officefish/Membrana/pull/885) | границы эпика + OPEN + лемма | [#887](https://github.com/officefish/Membrana/pull/887) / [#888](https://github.com/officefish/Membrana/pull/888) |
| B1 | #880 | [#889](https://github.com/officefish/Membrana/pull/889) | дом `docs/audit/bestiary/` + органы | [#891](https://github.com/officefish/Membrana/pull/891) |
| B2 | #881 | [#895](https://github.com/officefish/Membrana/pull/895) | specimens×4 + `yarn bestiary:audit` | [#896](https://github.com/officefish/Membrana/pull/896) |
| B3 | #882 | [#898](https://github.com/officefish/Membrana/pull/898) | echo + specimen; goal-displacement defer | [#899](https://github.com/officefish/Membrana/pull/899) |
| B4 | #883 | [#919](https://github.com/officefish/Membrana/pull/919) | `yarn bestiary:weekly` + anti-молчун | [#923](https://github.com/officefish/Membrana/pull/923) |
| B5 | #884 | [#937](https://github.com/officefish/Membrana/pull/937) | CLOSURE + ACTIVE cleared | _(this archive PR)_ |

## Aim: container + engines matrix (B5)

Прогон на HEAD `cedfefa3` (2026-07-22): `yarn bestiary:audit` + `yarn bestiary:weekly`.

| defectClass | Label | Specimen | Engine detector | Audit hits | Weekly hits | Self-check |
|-------------|-------|----------|-----------------|:----------:|:-----------:|:----------:|
| `silent` | Молчун | `specimens/silent/swallow.mjs` | `detectSilent` | 1 | 1 | ✅ |
| `unwired` | Половина без провода | `specimens/unwired/orphan-export.mjs` | `detectUnwired` | 1 | 1 | ✅ |
| `ornament` | Украшение | `specimens/ornament/unread-write.mjs` | `detectOrnament` | 1 | 1 | ✅ |
| `jargon-out` | Жаргон наружу | `specimens/jargon-out/external-jargon.mjs` | `detectJargonOut` | 1 | 1 | ✅ |
| `echo` | Эхо-камера | `specimens/echo/triple-reflection.mjs` | `detectEchoChamber` | 1 | 1 | ✅ |
| `goal-displacement` | Смещение цели | — | — | — | — | ⏸ defer → `bc-followup-goal-displacement` |

**Покрытие в коде BESTIARY:** 5/5.  
**Weekly:** `analysis/bestiary-run-2026-07-22.md` · lens `ran` · findings=5 · Summary ✅ · silent-hunter нет.  
**Aim:** `aimBestiary` на объекты `docs/audit/bestiary/specimens/**` через engines в `scripts/` — контейнер хранит бетий и снимки, не детекторы.

## GROUP_CONTAINERIZATION

Чеклист ✅ в [`docs/audit/bestiary/README.md`](../../audit/bestiary/README.md).

## Handoff

- Реестр: только через `yarn bestiary:audit` (overwrite `registry/BESTIARY_LIST.md`).
- Недельный ритм: `yarn bestiary:weekly` → `analysis/bestiary-run-YYYY-MM-DD.md`; анти-молчун (`not-run` ≠ `clean`).
- Новый класс в `BESTIARY` без specimen = украшение; сначала specimen + hit.
- Follow-up: `bc-followup-goal-displacement` — корпусный детектор (не file-lens «слово self»), отдельно от этого эпика.
- Линза находит, не чинит (#533); правки прод-кода — отдельные задачи.
- Не путать с night-hunt / kits pins.

## Archive

**Done 2026-07-22:** `yarn task:archive bc-b5-closure` + `yarn task:archive bestiary-container` · notes: PR #937 + этот CLOSURE.  
B0–B4 уже archived (#887/#888, #891, #896, #899, #923).  
Карточки: [`bc-b5-closure.md`](../../tasks/archive/bc-b5-closure.md) · [`bestiary-container.md`](../../tasks/archive/bestiary-container.md).
