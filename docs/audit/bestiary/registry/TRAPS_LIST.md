# TRAPS_LIST — индекс документации ловушек

> Доп. реестр **ловушек-исходников** (промпты + pure scripts), не классов (T3/T7/T8/T15/T17).
> Карточки живут в [`../traps/`](../traps/). Kit пинит **ловушку**, не шаблон антипаттерна (T18).

## Meta

| Field | Value |
|-------|-------|
| Date | 2026-07-22 |
| Source | W2 `bw-w2-registries` (#948) · hand-maintained |
| Path decision | карточки `docs/audit/bestiary/traps/<id>.md` · индекс этот файл |

## Формат карточки / строки индекса (T17)

| Поле | Обязательно | Смысл |
|------|:-----------:|-------|
| `id` | да | id ловушки (= имя файла без `.md`) |
| `targets` | да | какие `defectClass` / шаблоны целит (ссылки) |
| `prompts` | да | path(и) промптов / AGENT сценариев (или `—` + причина stub) |
| `scripts` | да | path(и) pure-скриптов / детекторов (`scripts/lib/…`) |
| `kitPin` | да | ссылка на pin/kit жильца · `null` только stub до wiring |
| `card` | да | относительный путь к карточке в `traps/` |
| `status` | да | `stub` \| `documented` \| `wired` \| `kit-ready` |

## Ловушки

| id | targets | prompts | scripts | kitPin | card | status |
|----|---------|---------|---------|--------|------|--------|
| `silent-empty-catch` | `silent` · [`antipatterns/silent.md`](../antipatterns/silent.md) | Scenario Trap-Doc / AGENT_PROMPT | [`scripts/lib/lens-bestiary.mjs`](../../../../scripts/lib/lens-bestiary.mjs) → `detectSilent` · root [`bestiary-audit.mjs`](../../../../scripts/bestiary-audit.mjs) | [`kits/witcher`](../../../../kits/witcher/) | [`traps/silent-empty-catch.md`](../traps/silent-empty-catch.md) | `kit-ready` |
