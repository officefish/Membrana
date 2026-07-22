# Промпт: W1 — манифест мастерской-поставщика

> **M** · `bw-w1-workshop` · [#947](https://github.com/officefish/Membrana/issues/947) · lead **ozhegov** · parent `bestiary-workshop`

## Контекст

T4/T6: мастерская **умеет предоставлять** ловушки и есть **поставщик** (не customer).
Канон [`HOME_WORKSHOP`](../patterns/HOME_WORKSHOP.md): мастерская — сторона **спроса**,
`kit` заказывает. Кандидат шторма **K25** — шов: исключение для бестиария **или**
правка паттерна (словарь глаголов / стрелка supply). Тихий «и то и другое» запрещён.

Дом: [`docs/audit/bestiary/`](../audit/bestiary/). Engines не копировать.

## Промпт целиком

1. Решение по шву T6 ↔ HOME_WORKSHOP (**одно** из):
   - **A)** правка/дописка в `HOME_WORKSHOP.md` (supply-side / verb «выдать ловушки»);
   - **B)** явное **исключение** бестиария в манифесте + ссылка из паттерна (таблица реализаций)
     с причиной — без правки MUST-контракта.
2. `workshop.manifest.json` в доме бестиария: `pattern`, `name`, `worksOn` = ровно
   `docs/audit/bestiary/`, `verbs`, `kit` (id будущего жильца или `null` до W4 —
   объявить явно).
3. Словарь глаголов: MUST `audit` / `decompose` (уже есть через bestiary tooling) +
   доменный глагол поставки ловушек (имя зафиксировать: напр. `supplyTrap` /
   `issueTrap` — одно каноническое). `inspectElement` — ✅ или ⚠ с причиной.
4. Провода: README дома + (при варианте A) паттерн; AGENT_PROMPT — сценарий
   «заказать/получить ловушку» на уровне контракта (без реализации кита).
5. Чеклист HOME_WORKSHOP в README мастерской/дома: каждый пункт ✅ или ⚠.

## Acceptance criteria

- [ ] Шов K25 закрыт вариантом A **или** B с текстом в паттерне/манифесте
- [ ] `workshop.manifest.json` валиден по полям паттерна; `worksOn` = 1 дом
- [ ] Доменный глагол поставки ловушек назван; audit/decompose не потеряны
- [ ] README/AGENT_PROMPT обновлены; LGTM ozhegov (owner ok)

## Out of scope

Схемы доп. реестров и шаблоны антипаттернов (W2); Mintlify-страницы (W3);
файлы `kits/<id>/` и пины (W4); новые детекторы в `lens-bestiary`.
