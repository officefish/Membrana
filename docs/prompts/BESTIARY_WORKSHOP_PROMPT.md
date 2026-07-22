# Промпт: Эпик — мастерская бестиария (поставщик ловушек)

> **L** · `bestiary-workshop` · [#945](https://github.com/officefish/Membrana/issues/945) · lead **vesnin**  
> Цепь: W0→W5 (`bw-w0-brief` … `bw-w5-closure` · #946–#951).  
> Семя: шторм [`storm-bestiary-workshop-2026-07-22`](../storm/storm-bestiary-workshop-2026-07-22/REPORT.md) · T1–T18.  
> Дом: [`docs/audit/bestiary/`](../audit/bestiary/) (#878 CLOSED — **не** переоткрывать).  
> Паттерны: [`HOME_WORKSHOP`](../patterns/HOME_WORKSHOP.md) ·
> [`PINNED_SUBGRAPH_VERSIONING`](../patterns/PINNED_SUBGRAPH_VERSIONING.md) ·
> [`GROUP_CONTAINERIZATION`](../patterns/GROUP_CONTAINERIZATION.md).  
> Прецедент зеркала: `branch-mintlify-engine` (#823).  
> Инстанс: [`bestiary-workshop-2026-07-22/OPEN.md`](../day-sprint/bestiary-workshop-2026-07-22/OPEN.md) (**open**).

---

## Контекст

Эпик `bestiary-container` (#878) закрыл **дом**: классы в engines, specimens,
производный `BESTIARY_LIST`, audit/weekly. Шторм 22.07 зафиксировал следующий слой:
над домом нужна **мастерская-поставщик ловушек** — не заказчик kit в смысле
канона HOME_WORKSHOP «как у git/tasks», а **supply-side** для охоты (T4/T6).

Слои смысла (не смешивать):

| Слой | Что это | Где живёт |
|------|---------|-----------|
| **Класс / антипаттерн** | абстрактный шаблон (как паттерн) (T13) | док шаблона; **не** kit |
| **Ловушка** | набор промптов + pure-скриптов; ≈ парсер/детектор (T7/T15) | engines/`scripts/` + дока; пин/кит фиксирует **набор** (T3/T18) |
| **Зверёк (улов)** | пойманный пример / гранула находки ≠ справочник классов (T1) | **доп. реестр** улова |
| **Specimen** | фикстура плохого кода для forcing function (#878) (T2) | `specimens/` — уже есть; не путать с уловом |
| **BESTIARY_LIST** | производный реестр **классов** × coverage | `registry/BESTIARY_LIST.md` — **не** заменять доп. реестром (T16) |

Git — шина истины (T10); Mintlify — **зеркало-монитор** над ней (T9/T11/T12).
Дом из `docs/audit/bestiary/` **не** переезжает.

## Границы

| Лемма | Адрес | Не путать |
|-------|--------|-----------|
| **Дом контейнера** | `docs/audit/bestiary/` | перенос в `kits/` или `apps/docs` |
| **Мастерская** | манифест + роль поставщика ловушек поверх дома | customer-only HOME_WORKSHOP без исключения/правки |
| **Доп. реестры** | улов (зверёк/гранула) + доки ловушек (T8/T17) | overwrite `BESTIARY_LIST` |
| **Антипаттерн-шаблон** | абстрактный MD/контракт (T13) | пин в kit (T18 запрещает) |
| **Ловушка** | prompts + pure scripts (T15) | автофикс прод-кода (#533) |
| **Кит** | PINNED набор ловушки; «Ведьмак» — **имя-пример** наведения (T5) | полный охотничий продукт / Night Build |
| **Mintlify** | зеркало гранул + дока/навигация ловушек | источник истины вместо git |
| **Engines** | плоский `scripts/` (+ существующий `lens-bestiary`) | копировать код в audit |

**Запрещено в эпике:**

- Переоткрытие `bestiary-container` (#878) или переезд дома.
- Массовое «лечение» находок / правка прод «заодно» (#533).
- Подмена `BESTIARY_LIST` доп. реестром улова.
- Пинить в kit **шаблон антипаттерна** вместо набора промптов+скриптов ловушки.
- Внешний mintlify-community sync без отдельного ok владельца (как в #823).

## Фазы

| Фаза | id | lead | Суть | Промпт |
|------|-----|------|------|--------|
| W0 | `bw-w0-brief` | vesnin | бриф: OPEN→ready, границы T1–T18, ACTIVE при open | [`BW_W0_BRIEF_PROMPT.md`](./BW_W0_BRIEF_PROMPT.md) |
| W1 | `bw-w1-workshop` | ozhegov | манифест мастерской + роль поставщика; шов HOME_WORKSHOP (K25) | [`BW_W1_WORKSHOP_PROMPT.md`](./BW_W1_WORKSHOP_PROMPT.md) |
| W2 | `bw-w2-registries` | ozhegov | доп. реестры улова + док ловушек; форматы; шаблон антипаттерна | [`BW_W2_REGISTRIES_PROMPT.md`](./BW_W2_REGISTRIES_PROMPT.md) |
| W3 | `bw-w3-mintlify` | ozhegov | Mintlify-зеркало: гранулы + навигация/дока ловушек | [`BW_W3_MINTLIFY_PROMPT.md`](./BW_W3_MINTLIFY_PROMPT.md) |
| W4 | `bw-w4-trap-kit` | dynin | кит ловушек (пин prompts+scripts); «Ведьмак» = пример aim | [`BW_W4_TRAP_KIT_PROMPT.md`](./BW_W4_TRAP_KIT_PROMPT.md) |
| W5 | `bw-w5-closure` | vesnin | CLOSURE + ACTIVE cleared + archive | [`BW_W5_CLOSURE_PROMPT.md`](./BW_W5_CLOSURE_PROMPT.md) |

## Acceptance criteria (эпик)

- [x] Мастерская бестиария описана как **поставщик** ловушек; шов с HOME_WORKSHOP решён явно (исключение **или** правка паттерна — не «тихо оба») — **K25-B**
- [x] Доп. реестры улова и документации ловушек живут в доме; `BESTIARY_LIST` не подменён
- [x] Формат строки улова и строки ловушки/доки зафиксирован (T17); есть ≥1 пример каждой
- [x] Антипаттерн = абстрактный шаблон (отдельный носитель); kit пинит только ловушку — `kits/witcher`
- [x] Mintlify-зеркало над git: страницы/навигация ссылаются на гранулы и доку ловушек; истина — в репо
- [x] Жилец кита (`witcher`) с пинами prompts+scripts; `yarn kits:audit` зелёный; aim-пример («Ведьмак») в README
- [x] CLOSURE; ACTIVE cleared; фазы + эпик archived со свидетельством PR — см. CLOSURE (archive эпика после merge W5)

## Out of scope / deferred

| Что | Куда |
|-----|------|
| Новые классы линзы / `goal-displacement` | follow-up `bc-followup-goal-displacement` / отдельные M |
| Автофикс, массовые правки прод | #533 — запрет |
| Полный каталог ловушек «на все классы» | после W4 — отдельные поставки |
| Night Build / cowork / competition | другие форматы |
| Переезд дома / второй audit-остров | запрет |
| Внешний Mintlify-community | отдельное решение владельца |

## Соседство

| Сосед | Правило |
|------|---------|
| `bestiary-container` (#878) | CLOSED дом; потребляем, не переоткрываем |
| HOME_WORKSHOP | W1 решает шов T6 ↔ «мастерская заказывает kit» |
| `branch-mintlify-engine` (#823) | образец зеркала; не копировать ветки hygiene |
| `kits-dream-master` / `kits-angelina-morning` | образец жильца+audit; другой продукт |
| Engines `lens-bestiary` | ловушки могут **опираться** на линзу; не дублировать в audit |
