# CATCH_LIST — доп. реестр улова (зверёк / гранула)

> **≠** [`BESTIARY_LIST.md`](./BESTIARY_LIST.md). Тот — справочник **классов** линзы.
> Этот — журнал **пойманных примеров** (T1/T8/T16/T17). Связь класс ↔ улов — только
> ссылками (`class` / `template`), не переписыванием строк классов.

## Meta

| Field | Value |
|-------|-------|
| Date | 2026-07-22 |
| Source | W2 `bw-w2-registries` (#948) · hand-maintained |
| Path decision | `docs/audit/bestiary/registry/CATCH_LIST.md` (индекс; не `catch/` — см. OPEN) |

## Формат строки (T17)

| Поле | Обязательно | Смысл |
|------|:-----------:|-------|
| `id` | да | стабильный id гранулы (`catch-<class>-<slug>` или dated) |
| `class` | да | `defectClass` из `BESTIARY` / строка `BESTIARY_LIST` |
| `template` | да | путь к шаблону антипаттерна (`antipatterns/<id>.md`) |
| `evidence` | да | path в репо **или** PR/Issue (где поймано); specimen допустим как stub-доказательство |
| `date` | да | `YYYY-MM-DD` |
| `status` | да | `stub` \| `noted` \| `triaged` \| `deferred` |
| `notes` | нет | одна строка; без автофикса (#533) |

**Не путать:** `evidence` на `specimens/` — это ссылка на **фикстуру** (T2), не «specimen = улов».
Улов — запись о находке; specimen — forcing function для детектора.

## Улов

| id | class | template | evidence | date | status | notes |
|----|-------|----------|----------|------|--------|-------|
| `catch-silent-swallow-specimen` | `silent` | [`antipatterns/silent.md`](../antipatterns/silent.md) | [`specimens/silent/swallow.mjs`](../specimens/silent/swallow.mjs) | 2026-07-22 | `stub` | W2 stub: класс+specimen без нового детектора; ловушка [`traps/silent-empty-catch.md`](../traps/silent-empty-catch.md) |
