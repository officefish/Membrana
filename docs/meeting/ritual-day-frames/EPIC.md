# ЭПИК заседания `ritual-day-frames` — утренний ритуал → очередь фреймов

> Собран 2026-07-22 из шести вердиктов (порядок M0 ратифицирован владельцем 22.07).
> Основание: слово владельца («переложить утренний ритуал на фреймы») после
> открытия спринта [`procedure-frames`](../procedure-frames/EPIC.md) (#900).
> **Статус: РАТИФИЦИРОВАН владельцем 2026-07-22.**
> M5 прогнан **вручную** (Anthropic usage limit; слово владельца «проведи руками»).

---

## Цепь вердиктов (порядок = ратифицированный M0)

| # | Комната | Протокол | Суть |
|---|---------|----------|------|
| 0 | M0 порядок | [`m0-order`](../../seanses/ritual-day-frames-m0-order-2026-07-22.md) | DAG `1 → {2,3,4} → 5`; фундамент — инвентарь; 5 за блокирован фактурой #900 |
| 1 | M1 инвентарь | [`m1-inventory`](../../seanses/ritual-day-frames-m1-inventory-2026-07-22.md) | 9 кадров + слот wiring; 5 roots → пины; post вне yarn |
| 2 | M2 ранг wiring | [`m2-wiring-rank`](../../seanses/ritual-day-frames-m2-wiring-rank-2026-07-22.md) | `morning-wiring` ∈ **preflight** (ранг −1), ∉ frames; post ручной |
| 3 | M3 holders | [`m3-holders`](../../seanses/ritual-day-frames-m3-holders-2026-07-22.md) | ozhegov / vesnin / angelina; lead ≠ holder по умолчанию |
| 4 | M4 граница | [`m4-kit-boundary`](../../seanses/ritual-day-frames-m4-kit-boundary-2026-07-22.md) | кит=файл · кадр=segment\|command; whole-file в кадре запрещён |
| 5 | M5 приёмка | [`m5-acceptance`](../../seanses/ritual-day-frames-m5-acceptance-2026-07-22.md) | `D_meeting` ≠ `D_live`; живой MANIFEST до #927–#929 не трогать |

## Сводная очередь утра

| Носитель | id | holder | Класс pin (M4) | Примечание |
|----------|-----|--------|----------------|------------|
| preflight | `morning-wiring` | ozhegov | C doc-ref | три двери m3; гейт до frames[0] |
| frames | `morning-hygiene` | ozhegov | A `pin=∅` | 4 root-пина в ките |
| frames | `weekly-plan-gate` | vesnin | B segment | условный (понедельник) |
| frames | `strategy-day` | vesnin | B segment | |
| frames | `daily-standup` | angelina | B segment | форма — angelina; приоритеты — vesnin |
| frames | `main-day-probe` | vesnin | B segment | |
| frames | `main-day-issue` | vesnin | B segment | |
| frames | `angelina-greeting` | angelina | B segment | |
| post | `swallow-send` | angelina | D ∅\|command | ручной, после артефакта |
| post | `hermes-brief` | angelina | D ∅\|command | ручной |

Имена frames/post кроме `morning-wiring` — **provisional** (M1).

`leadPersona` процедуры: **angelina** (не менялась).  
`kitVersion`: `kits/angelina-morning` · `engines[]`: `{ morning-care }` (M4).

## Приёмка

| Предикат | Смысл | Сейчас (22.07) |
|----------|-------|----------------|
| `D_meeting` | решение в контейнере + EPIC + LGTM владельца | **true** (ратификация 22.07) |
| `D_live` | зубы #927–#929 в main + гейт на прогоне | **false** (Issues OPEN) |

**Запрет до `D_live`:** писать `preflight` / `frames` / `post` в живой
`docs/procedures/ritual-day/MANIFEST.json`.

## Follow-up (исполнение #900, не это заседание)

1. **#927** — схема ключей очереди; сохранить инвариант `preflight ≺ frames`, post manual (синтаксис — выбор реализации).
2. **#928** — `auditPins` / `segmentHash`; кит на том же ядре.
3. **#929** — wiring на прогоне; **шов:** Ф3 говорил `frames[0]`, M2 — `preflight` (двери и holder ozhegov не трогать).
4. Опционально: seed-комментарий на #900/#929 со ссылкой на этот EPIC после ратификации.

## Ратификация

Порядок M0 ратифицирован владельцем 22.07. Эпик (шесть вердиктов целиком)
**ратифицирован владельцем 22.07**. Дальше — исполнение через спринт #900
(#927 схема · #928 auditPins · #929 wiring+гейт с швом preflight); живой
MANIFEST `ritual-day` до зубьев не трогать (`D_live` ещё false).
