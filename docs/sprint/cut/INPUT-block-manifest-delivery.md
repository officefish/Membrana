# Блок `ritual-evening-manifest-and-delivery` — вход исполнителю

Спринт `ritual-tails-sprint`, план ратифицирован владельцем 31.07 (вердикт `contract`). Ты исполнитель, назначен тимлидом: предмет — контракт между кадром и манифестом, это работа архитектора. Прогноз тимлида — **120 изменённых строк**. Порог прохода ревью — 400.

## Твоя зона (закрыта)

```
docs/procedures/ritual-evening/MANIFEST.json      86 строк
docs/tasks/evening-ritual-steps.json             222 строки
scripts/lib/ritual-evening-artifacts.mjs         НЕ СУЩЕСТВУЕТ — завести
```

Соседний блок (`ozhegov`) уже закрыт и правил `scripts/day-memo.mjs`. Его зона тебе не принадлежит.

## Что закрываем

### Ф2 — у вечера нет кадра доставки в ствол

У утра он есть и **работает**: сегодня, 31.07, кадр `deliver-to-main` остановил утреннюю цепочку словами «утро не завершено для соседей, пока документы не в main» и сам назвал план действий. Движок:

- `scripts/ritual-deliver-to-main.mjs` — 101 строка, CLI
- `scripts/lib/ritual-deliver-to-main.mjs` — 153 строки, ядро: статусы `missing-on-main` / `stale` / `drift-from-main`; читает `docs/procedures/ritual-day/MANIFEST.json`, кадр `deliver-to-main`
- `scripts/lib/ritual-morning-artifacts.mjs` — 20 строк, список артефактов утра

**Оба файла движка — ВНЕ твоей зоны.** В зоне только вечерний список артефактов, которого нет, и манифест вечера, куда встаёт кадр.

Цена отсутствия названа фактом: архив дня 29.07 лежал на локальной ветке **двое суток** и доехал до main только 31.07 руками, после того как ревью нашло его повторно.

Вечерние артефакты, которые кадр должен проверять на присутствие в стволе (из шагов цепочки, `produces[]`):
`docs/DAILY_CODE_REVIEW.md` · `docs/archive/daily-day/<date>/` · `docs/archive/daily-code-review/` · `docs/seanses/team-evening-feedback-<date>.md` · `docs/seanses/workspace-level-<date>.md` · `docs/seanses/team-memory-report-<date>.md` · `docs/memos/<date>.md` · `docs/tasks/truth-registry.json` · `docs/bridge/<date>/CONSPECTUS.md`

### Ф5 — манифест шагов описывает мир 17.07

`docs/tasks/evening-ritual-steps.json`, строки **42** (шаг `archive-daily-day`) и **213** (шаг `evening-tail`): в `consumes[]` стоит `docs/STRATEGIC_PLAN_DAY.md`. Это легаси — утро его больше не производит (слово владельца 31.07). Живые документы горизонта: `docs/STRATEGY_DAY.md` и `docs/DAY_PLAN.md`, оба рождаются шагом `generate-horizon` утренней цепочки.

Скрипт-архиватор правду знает: `scripts/archive-daily-day-artifacts.mjs` снимает `STRATEGY_DAY.md` и `DAY_PLAN.md`, а легаси помечено в коде «вещдок, устар.». Расходится именно манифест, объявленный исполняемым источником истины.

### Шаг аудита дня — передан тебе соседним блоком

Контракт шва от `ozhegov` (вещдок: `docs/discussions/block-archive-evidence-ozhegov.md`): аудит дня в цепочку ставит **твой** блок, потому что файл шагов твой.

`yarn audit:evening` (`scripts/audit-evening.mjs` 158 строк + `scripts/lib/audit-evening.mjs` 375) построен, покрыт тестами, **ADR-0013 ACCEPTED 18.07**. Шага в цепочке нет; причина в карточке реестра — «включение в `ritual:evening` за владельцем». Инструмент не работал 12 дней. Проверен живьём 31.07, отрабатывает корректно.

Порядок, названный `ozhegov` с основанием: `day-memo` → аудит → `archive-daily-day`. Аудит пишет `docs/archive/daily-day/<date>/audit.md` — тот же каталог, куда пишет `archive-daily-day`; сначала вычисления, потом архивирование.

**Чего делать НЕ нужно:** шаг пересборки индекса вещдоков. Он не потребовался — соседний блок починил причину, а не следствие: `day-memo.mjs` теперь пересобирает опись сам, сразу после записи в реестр (коммит `844f9aa9`). Подпорка шагом отменяется.

## Форма шагов — брать из файла, не из головы

Шаг в `evening-ritual-steps.json` имеет поля: `id`, `script`, `kind` (`mechanic`|`gate`), `criticality` (`critical`|`noncritical`, по умолчанию critical, некритичность объявляется явно и с причиной в `whyNoncritical`), `label`, `consumes[]`, `produces[]`, при наличии — `findingExitCodes[]`.

Кадры в `MANIFEST.json` имеют поля: `id`, `holder`, `tag`; живут в секциях `preflight` / `frames` / `post`.

Это две разные популяции: кадр — единица процедуры, шаг — единица цепочки. Не путать.

## Что от тебя требуется

1. Куда именно встаёт кадр доставки у вечера — секция, соседи, `holder`, и почему.
2. Что содержит вечерний список артефактов и как он соотносится с `produces[]` шагов: дублирование или проекция.
3. Форма шага аудита: `id`, `criticality` с обоснованием, `consumes`/`produces`, место в порядке.
4. Правка легаси в двух строках — на что заменяется и не тянет ли за собой гейт свежести.
5. Твоя оценка объёма против прогноза тимлида (120). Если не сходится — от чего считаешь.
6. Легальное «нет с причиной», если что-то в блоке невыполнимо в его зоне.

Не выдумывай путей: если файла нет в списках выше, его в работе нет.
