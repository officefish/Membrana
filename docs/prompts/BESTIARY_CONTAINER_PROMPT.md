# Промпт: Эпик — бестиарий антипаттернов как контейнер

> **L** · `bestiary-container` · [#878](https://github.com/officefish/Membrana/issues/878) · lead **vesnin**  
> Цепь: B0→B5 (#879–#884). Инсайт: [`insight-weekly-antipattern-audit-bestiary`](../insights/insight-weekly-antipattern-audit-bestiary/INSIGHT.md) (трек B).  
> Паттерн: [`GROUP_CONTAINERIZATION`](../patterns/GROUP_CONTAINERIZATION.md).  
> Engines в main: `scripts/lib/lens-bestiary.mjs` (5 классов в `BESTIARY`) + `yarn bestiary:audit` / `weekly`.  
> CLOSURE: [`bestiary-container-2026-07-21/CLOSURE.md`](../day-sprint/bestiary-container-2026-07-21/CLOSURE.md).

---

## Контекст

Инсайт 17.07: недельный охотник на антипаттерны (молчун, эхо, половина без провода,
украшение, смещение цели, жаргон наружу). После B5 — **контейнер закрыт**: линза
(5/6 классов; goal-displacement — явный defer → `bc-followup-goal-displacement`),
дом + specimens + audit + weekly; CLOSURE наводит aim на container+engines.

**Лемма владельца (21.07):** бестиарий — **контейнер**; он обязан ловить **бестий**
(примеры плохого кода) в своём хранилище `specimens/`. Детектор без specimen’а класса —
украшение. Аудитор сам не молчун: `not-run` ≠ `clean`.

## Границы

| Лемма | Адрес | Не путать |
|-------|--------|-----------|
| **Дом группы** | `docs/audit/bestiary/` | `kits/` (пины под задачу) |
| **Engines** | плоский `scripts/lib/lens-bestiary.mjs`, `lens-run.mjs` | копировать код в audit |
| **Specimens** | `docs/audit/bestiary/specimens/<class>/` | сканировать прод без пометки specimen |
| **Реестр** | производный `registry/BESTIARY_LIST.md` | ручной список зверей |
| **Линза** | находит, не чинит (#533) | автофикс |

**Запрещено:** дневной полный греп репо; второй schema-остров; `docs/audit/scripts/`.

## Фазы

| Фаза | id | lead | Суть |
|------|-----|------|------|
| B0 | `bc-b0-brief` | vesnin | бриф + лемма в INSIGHT + OPEN |
| B1 | `bc-b1-home` | ozhegov | дом контейнера + органы + audit/README |
| B2 | `bc-b2-specimens` | dynin | specimens×4 + тест + `yarn bestiary:audit` |
| B3 | `bc-b3-missing-beasts` | dynin | эхо-камера и/или смещение цели + specimen — или явный defer |
| B4 | `bc-b4-weekly` | angelina | `yarn bestiary:weekly` → analysis/ + тренд; анти-молчун (#883) |
| B5 | `bc-b5-closure` | vesnin | CLOSURE: навести на контейнер; archive · см. [`CLOSURE.md`](../day-sprint/bestiary-container-2026-07-21/CLOSURE.md) |

## Acceptance criteria (эпик)

- [x] Контейнер + чеклист GROUP_CONTAINERIZATION (B1)
- [x] Каждый class в `BESTIARY` имеет ≥1 specimen, детектор ловит (B2–B3)
- [x] Самопроверка: aim на `specimens/` не silent-green при живых бетиях (B2–B5)
- [x] Weekly + anti-молчун (B4)
- [x] CLOSURE; ACTIVE cleared (B5) · archive эпика — после merge

## Out of scope

Полный insight research/review lifecycle (хвост); Night Build; замена night-hunt целиком.
