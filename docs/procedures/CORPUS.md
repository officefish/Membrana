# Ревизия корпуса процедур (Ф5 / #1220)

Снимок 2026-07-26. Канон ядра — [`CORE.md`](./CORE.md); домов — [`HOME.md`](./HOME.md).
Issue фазы: [#1284](https://github.com/officefish/Membrana/issues/1284). Эпик: [#1220](https://github.com/officefish/Membrana/issues/1220).

## Инвентарь (19)

### Построенные (11) — полное ядро + home + mode

| id | trigger | steps | gates (ответственность / пауза) | home | mode |
|----|---------|-------|----------------------------------|------|------|
| `ritual-evening` | captain-word | ref evening | `partner-swallow` (owner) | none | local |
| `ritual-day` | captain-word | ref morning | magistral · swallow · anchors (owner) | none | local |
| `ritual-dreams` | schedule | inline | none (автономный office) | none | orchestrated |
| `bridge` | captain-word | inline | none (паузы в диалоге) | `docs/bridge` | mirrored |
| `day-sprint` | captain-word | inline | `closure-accept` (owner) | none | local |
| `meeting` | captain-word | inline | `ratification` (owner) | none | local |
| `code-review` | captain-word | inline | none (вердикт в артефакте) | none | local |
| `one-shot` | captain-word | inline | `owner-ratify` (owner) | none | local |
| `attribution` | captain-word | inline | none (детерминированный отчёт) | none | local |
| `containerization` | captain-word | inline | none (крафт в сессии) | none | local |
| `membrana-leveling` | captain-word | inline | `leveling-gate` (owner) | none | local |

Живой git-дом с формой — только мостик (`KNOWN_LIVING_HOMES`). Остальные
«дома» (`docs/day-sprint/<id>/`, `docs/meeting/<id>/`, `docs/seanses/`) —
**инстансы прогонов**, не пространство имён с формой → честное `home.none`.

### Объявлены, не построены (8) — вердикт Ф5

Достроить контейнер в этом PR **не** раздуваем. Каждая остаётся
`declared-not-built` с причиной (легальный бэклог, не заглушка — #1219).

| id | Вердикт | Почему оставить / что дальше |
|----|---------|------------------------------|
| `storm` | **keep** | Живые прогоны в `docs/storm/`; скилл `membrana-storm`. Контейнер — follow-up. |
| `cowork` | **keep** | Регламент night/cowork; скилл `membrana-cowork`. |
| `competition` | **keep** | Упаковка соревнований; скилл `membrana-competition-packaging`. |
| `night-sprint` | **keep** | `docs/NIGHT_SPRINT_REGULATION.md`; скилл `membrana-night-sprint`. |
| `ship-gate` | **keep** | Связан с attribution / branch grammar; механизм не в контейнере. |
| `tasks-audit` | **keep** | Дом аудита `docs/audit/tasks/`; скиллы tasks-*. |
| `git-audit` | **keep** | Дом аудита `docs/audit/git/`; скиллы branch-*. |
| `consilium` | **keep → next** | Движки + скилл `membrana-consilium` уже есть; первый кандидат на достройку контейнера (см. #1212). |

Снятие с реестра ни одной — все восемь имеют носитель вне контейнера
(скилл / регламент / audit-дом). «Remove» было бы ложью.

## Гейт ответственности (проход #1219 → ядро)

Обязательное поле `gates` у каждой построенной процедуры несёт либо реальную
паузу на человека (`waitsFor: owner|human` + `resume`), либо легальное
`{ kind: "none", why }` с честной причиной (`isHonestWhy` отклоняет TODO/n/a).

Отдельный зуб `checkLeadPersona` в реестре задач (вещдок #1219) — **не** поле
процедурного ядра; бестиарий «Заглушка» закрыт PR #1270. Здесь — только ядро
`gates` корпуса процедур.

## Скиллы ↔ процедуры (срез; полная сверка — #1212)

| Процедура (built) | Вход (скилл / команда) |
|-------------------|------------------------|
| ritual-day | `membrana-morning-ritual` · `yarn ritual:day` |
| ritual-evening | `membrana-developer-rhythm` · `yarn ritual:evening` |
| ritual-dreams | office DreamsScheduler · `yarn dreams` |
| bridge | `membrana-bridge` · `yarn bridge` |
| day-sprint | `membrana-task-lifecycle` |
| meeting | `membrana-meeting` · `yarn consilium` (частично) |
| code-review | `membrana-code-review` · `yarn code-review` |
| one-shot | промпт ONE_SHOT · предикат S |
| attribution | `yarn check:layer-direction` |
| containerization | `membrana-containerization-master` |
| membrana-leveling | `membrana-leveling` |

Полный предикат «каждый скилл → процедура → построена?» и ревизия зеркал —
открытый [#1212](https://github.com/officefish/Membrana/issues/1212). Ф5 даёт
инвентарь built-стороны, не машинную сверку.

## Зуб

После Ф5 все контейнеры с `MANIFEST.json` обязаны нести полное валидное ядро и
`home`+`mode` (пилот расширен на весь built-корпус). Отсутствие ядра у built —
дефект теста, не «находка миграции».

Свидетельство 2026-07-26: `node --test scripts/validate-procedure.test.mjs` —
36 pass, в т.ч. `CORPUS Ф5` / `auditProcedureCorpus` findings=0;
`yarn procedures:workshop --audit` — 11 built-valid · 8 declared-not-built · 0 дефектов.
