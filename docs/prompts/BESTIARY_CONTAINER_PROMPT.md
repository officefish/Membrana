# Промпт: Эпик — бестиарий антипаттернов как контейнер

> **L** · `bestiary-container` · [#878](https://github.com/officefish/Membrana/issues/878) · lead **vesnin**  
> Цепь: B0→B5 (#879–#884). Инсайт: [`insight-weekly-antipattern-audit-bestiary`](../insights/insight-weekly-antipattern-audit-bestiary/INSIGHT.md) (трек B).  
> Паттерн: [`GROUP_CONTAINERIZATION`](../patterns/GROUP_CONTAINERIZATION.md).  
> Уже в main: `scripts/lib/lens-bestiary.mjs` (4 зверя) + `scripts/lens-run.mjs`.

---

## Контекст

Инсайт 17.07: недельный охотник на антипаттерны (молчун, эхо, половина без провода,
украшение, смещение цели, жаргон наружу). В коде — только **линза** (4/6 классов),
без дома группы, без тестов, без недельного провода.

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
| B4 | `bc-b4-weekly` | angelina | недельный report + тренд; анти-молчун аудитора |
| B5 | `bc-b5-closure` | vesnin | CLOSURE: навести на контейнер; archive |

## Acceptance criteria (эпик)

- [ ] Контейнер + чеклист GROUP_CONTAINERIZATION
- [ ] Каждый class в `BESTIARY` имеет ≥1 specimen, детектор ловит
- [ ] Самопроверка: aim на `specimens/` не silent-green при живых бетиях
- [ ] CLOSURE; ACTIVE cleared

## Out of scope

Полный insight research/review lifecycle (хвост); Night Build; замена night-hunt целиком.
