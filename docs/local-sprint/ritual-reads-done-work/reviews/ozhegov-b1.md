# Ozhegov Review: b1 `assertions-projection`

Subject: `scripts/lib/main-day-assertions-view.mjs`, `scripts/lib/main-day-assertions-view.test.mjs`,
`scripts/_main-day-issue.mjs` (коммит b9418242).

Verdict: **LGTM**.

Reviewed:

- `assertionsDocBlock` / `projectAssertions` / `renderAssertionsView` — чистые, без ФС и часов;
  `today` и `gate` приходят параметрами.
- Предикат свежести — импорт `magistralFreshness` из `main-day-magistral-freshness.mjs`, второй
  копии нет (условие резчика исполнено; зуб «один предикат» сверяет `deepEqual` с прямым вызовом).
- Провод в `collectDocBlocks`: ветка `rel === ASSERTIONS_REL` читает файл целиком, минуя
  `readBounded`, и подаёт проекцию; испорченный вход даёт отказ с причиной, не сырой текст.

Findings:

1. День для предиката в генераторе — UTC (`toISOString().slice(0, 10)`), как у probe; остальные
   входы генератора судятся `localDayKey()`. Расхождение возможно между 21:00Z и полуночью MSK;
   утро в это окно не попадает. Принято сознательно ради буквального совпадения вердиктов с probe,
   записано в комментарии провода. Не блокирует.
2. Инструкция модели в задании генератора («расхождение назвать … assertions не перечеканены»)
   не тронута — она условная и теперь получает факт строкой. Правка задания — вне зоны блока.

Checks seen: `node --test scripts/lib/main-day-assertions-view.test.mjs` 9/9; живой
`yarn main-day-issue:dry` на файлах 29.09 при застрявшем `//date`: строка `aligned` — 1,
«Перечеканено 24.09» — 0, `retired/recut` — 0 (см. CLOSURE).
