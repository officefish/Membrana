# OPEN: bestiary-workshop — мастерская бестиария

| Поле | Значение |
|------|----------|
| **Sprint** | `bestiary-workshop-2026-07-22` |
| **Registry epic** | `bestiary-workshop` · [#945](https://github.com/officefish/Membrana/issues/945) |
| **Status** | **open** |
| **Kind** | day-sprint (эпик L + фазы M) |
| **Size** | L |
| **Lead epic** | vesnin |
| **Started** | 2026-07-22 |
| **Branch (W0)** | `feat/bw-w0-brief` → merged [#952](https://github.com/officefish/Membrana/pull/952) |
| **Branch (W1)** | `feat/bw-w1-workshop` → merged [#954](https://github.com/officefish/Membrana/pull/954) · `496ecb41` |
| **Branch (W2)** | `feat/bw-w2-registries` → merged [#965](https://github.com/officefish/Membrana/pull/965) · `7887ad73` |
| **Branch (W3)** | `feat/bw-w3-mintlify` → merged [#967](https://github.com/officefish/Membrana/pull/967) · `ed997ce1` |
| **Branch (W4)** | `feat/bw-w4-trap-kit` · [#978](https://github.com/officefish/Membrana/pull/978) · kit id `witcher` · awaiting LGTM |
| **Seed** | шторм [`storm-bestiary-workshop-2026-07-22`](../../storm/storm-bestiary-workshop-2026-07-22/REPORT.md) · T1–T18 |
| **Дом** | [`docs/audit/bestiary/`](../../audit/bestiary/) (#878 CLOSED) |
| **Паттерны** | [`HOME_WORKSHOP`](../../patterns/HOME_WORKSHOP.md) · [`PINNED_SUBGRAPH_VERSIONING`](../../patterns/PINNED_SUBGRAPH_VERSIONING.md) · [`GROUP_CONTAINERIZATION`](../../patterns/GROUP_CONTAINERIZATION.md) |
| **Прецедент зеркала** | `branch-mintlify-engine` (#823) |
| **Прецедент кита** | `kits-dream-master` (#855) |

**Промпт эпика:** [`BESTIARY_WORKSHOP_PROMPT.md`](../../prompts/BESTIARY_WORKSHOP_PROMPT.md)

---

## Цель

Поверх CLOSED-дома бестиария: **мастерская-поставщик ловушек**; **доп. реестры**
пойманных примеров (улов) и документации ловушек (≠ `BESTIARY_LIST`); антипаттерн =
абстрактный шаблон; ловушка = промпты + pure-скрипты, фиксируемые пином/китом;
**Mintlify-монитор как зеркало** над git-шиной; кит с aim-примером («Ведьмак»).

## Инварианты (T1–T18)

1. Улов (зверёк/гранула) ≠ справочник классов; ≠ specimen.
2. Specimen — фикстура forcing function (#878); не смешивать с уловом.
3. Ловушка ≈ парсер/детектор = набор промптов + pure scripts.
4. Мастерская — **поставщик** ловушек (шов с HOME_WORKSHOP закрывается в W1 явно).
5. Доп. реестры ≠ замена `BESTIARY_LIST`.
6. Антипаттерн — абстрактный шаблон; kit пинит ловушку, не шаблон.
7. Git — истина; Mintlify — зеркало; дом не переезжает.
8. Линза находит, не чинит (#533).

---

## Phases

| Phase | Registry id | Issue | Lead | Prompt | DoD (одна строка) | Status |
|-------|-------------|------:|------|--------|-------------------|--------|
| **W0** | `bw-w0-brief` | [#946](https://github.com/officefish/Membrana/issues/946) | vesnin | [`BW_W0_BRIEF_PROMPT.md`](../../prompts/BW_W0_BRIEF_PROMPT.md) | Реестр+Issues+OPEN open+ACTIVE; границы T* | **done** · [#952](https://github.com/officefish/Membrana/pull/952) |
| **W1** | `bw-w1-workshop` | [#947](https://github.com/officefish/Membrana/issues/947) | ozhegov | [`BW_W1_WORKSHOP_PROMPT.md`](../../prompts/BW_W1_WORKSHOP_PROMPT.md) | `workshop.manifest.json` + шов HOME_WORKSHOP (A\|B) | **done** · [#954](https://github.com/officefish/Membrana/pull/954) · `496ecb41` |
| **W2** | `bw-w2-registries` | [#948](https://github.com/officefish/Membrana/issues/948) | ozhegov | [`BW_W2_REGISTRIES_PROMPT.md`](../../prompts/BW_W2_REGISTRIES_PROMPT.md) | Форматы улова/ловушки + stub шаблона антипаттерна | **done** · [#965](https://github.com/officefish/Membrana/pull/965) · `7887ad73` |
| **W3** | `bw-w3-mintlify` | [#949](https://github.com/officefish/Membrana/issues/949) | ozhegov | [`BW_W3_MINTLIFY_PROMPT.md`](../../prompts/BW_W3_MINTLIFY_PROMPT.md) | Thin Mintlify-зеркало + провод из дома | **done** · [#967](https://github.com/officefish/Membrana/pull/967) · `ed997ce1` · archived |
| **W4** | `bw-w4-trap-kit` | [#950](https://github.com/officefish/Membrana/issues/950) | dynin | [`BW_W4_TRAP_KIT_PROMPT.md`](../../prompts/BW_W4_TRAP_KIT_PROMPT.md) | Жилец кита, audit green, aim «Ведьмак» | **in review** · [#978](https://github.com/officefish/Membrana/pull/978) |
| **W5** | `bw-w5-closure` | [#951](https://github.com/officefish/Membrana/issues/951) | vesnin | [`BW_W5_CLOSURE_PROMPT.md`](../../prompts/BW_W5_CLOSURE_PROMPT.md) | CLOSURE + ACTIVE cleared + archive | pending |

---

## Вне scope (весь спринт)

- Реализация новых классов линзы / автофикс прод (#533).
- Переоткрытие `bestiary-container` (#878); переезд дома.
- Полный каталог ловушек на все классы (после W4 — follow-up).
- Night Build / cowork / competition; внешний mintlify-community sync.

## Открытые входы из REPORT (закрываются в фазах, не молчаливый пробел)

| # | Вопрос | Фаза |
|---|--------|------|
| ~~K25~~ | ~~Шов T6 ↔ HOME_WORKSHOP: правка паттерна **или** исключение~~ | **закрыт W1: вариант B** (исключение supply-side + `issueTrap`; MUST kit-demand не тронут) |
| ~~—~~ | ~~Имя жильца кита (`witcher` / иное)~~ | **принято W4:** `witcher` · human-label «Ведьмак» |
| ~~—~~ | ~~Точные пути CATCH/TRAPS под домом~~ | **принято W2** (LGTM): `registry/CATCH_LIST.md` · `traps/` + `registry/TRAPS_LIST.md` · `antipatterns/<id>.md` |
| ~~—~~ | ~~Глубина Mintlify (thin vs pin-манифест инструкций)~~ | **закрыт W3: thin mirror** (overview + ≥1 улов + ≥1 ловушка; pin-манифест как #823 F4 — out of sprint) |

---

## Gate checklist (W0)

- [x] Эпик + 6 фаз в `docs/tasks/registry.json` (`status: active`, `parentEpic` у фаз)
- [x] GitHub Issues #945–#951
- [x] OPEN Status **open**; промпты связаны; Issue-номера проставлены
- [x] `DAY_SPRINT_ACTIVE` → этот инстанс; строка в `DAY_SPRINT_LOG`
- [x] LGTM vesnin → merge W0 [#952](https://github.com/officefish/Membrana/pull/952) → старт W1

## Gate checklist (W1)

- [x] K25 закрыт вариантом **B** (манифест + таблица реализаций паттерна)
- [x] `workshop.manifest.json` валиден; `worksOn` = `docs/audit/bestiary`; `kit: null` до W4
- [x] Доменный глагол **`issueTrap`**; `audit`/`decompose` = `yarn bestiary:audit`
- [x] README + AGENT_PROMPT (Scenario Issue-Trap) + чеклист HOME_WORKSHOP
- [x] LGTM ozhegov (owner ok) → merge W1 [#954](https://github.com/officefish/Membrana/pull/954) · `496ecb41` → указатель W2 #948

## Gate checklist (W2)

- [x] Пути: `registry/CATCH_LIST.md` · `traps/` + `registry/TRAPS_LIST.md` · `antipatterns/<id>.md`
- [x] Форматы строк улова и ловушки/доки задокументированы + ≥1 пример каждой
- [x] `BESTIARY_LIST` не переписан как улов; связь класс↔улов — ссылками
- [x] ≥1 stub шаблона антипаттерна (`antipatterns/silent.md`)
- [x] README + AGENT_PROMPT (Inventory-Catch / Trap-Doc + HARD GATE specimen)
- [x] LGTM ozhegov (owner ok) → merge W2 [#965](https://github.com/officefish/Membrana/pull/965) · `7887ad73` → указатель W3 #949

## Gate checklist (W3)

- [x] ≥2 страницы зеркала в `apps/docs/bestiary/` (overview + улов/ловушка)
- [x] Навигация `docs.json` группа `Bestiary — workshop` + провод из README дома
- [x] Лемма «git = истина / Mintlify = монитор» + depth = **thin mirror** (не pin-манифест)
- [x] LGTM ozhegov (owner ok) → merge W3 [#967](https://github.com/officefish/Membrana/pull/967) · `ed997ce1` → указатель W4 #950

## Gate checklist (W4)

- [ ] Жилец `kits/witcher/` + `yarn kits:audit --id witcher` green
- [ ] Пин = prompts+scripts ловушки; шаблоны антипаттернов вне pins
- [ ] README с aim-примером («Ведьмак»)
- [ ] `workshop.manifest.json` + TRAPS-индекс ссылаются на кит
- [ ] LGTM dynin (owner ok) → merge W4 → указатель W5 #951
