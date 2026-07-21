# Промпт: Ф2: карта покрытия жанров

> **M** · `ba-f2-coverage` · [#804](https://github.com/officefish/Membrana/issues/804) · leadPersona: **dynin**

## Промпт целиком

Математик (**Dynin**). По `registry/BRANCHES_DECOMPOSE_LIST.md` (+ история Ф1) построить
`analysis/branch-assortment-coverage-YYYY-MM-DD.md`:

Жанры-обязательства: kind (`feat|fix|docs|chore|tooling`); формат (`storm|meeting|cowork|comp|night|truth|sprint|research`); держатель (persona-prefix / карточка / long-lived); доставка (open PR / salvage / leftover / persona / baseline); деревья (canon / sprint-*).

Для каждого: представитель(и) из живого реестра **или** явная дыра.
Предикат покрытия: жанр закрыт iff есть живая ветка с осмысленным представителем.

**DoD:** таблица покрытие/дыра; counts; без Scenario B без категории.
