<!-- precedent-meta
{
  "id": "2026-07-23-oneshot-issue-closed-without-procedure",
  "date": "2026-07-23",
  "class": "ritual-mechanics-vs-value",
  "symptom": "Спросили рабочий oneshot — пути docs/procedures/one-shot нет, в FORMATS.md строки нет, yarn-скрипта формата нет",
  "rootCause": "PR #1024 влил только task-промпт и закрыл #1022 через Closes; DoD процедуры и предиката не выполнен, Issue уже CLOSED",
  "fix": "Зарегистрирован прецедент; владелец предъявляет leadPersona vesnin за недоведённый usable state",
  "canonicalCause": "Issue закрыт мерджем промпта или карточки, DoD продукта не выполнен",
  "prevention": "Closes на Issue с DoD продукта ставить только PR с артефактом DoD; транскрипция инсайта в промпт — отдельный шаг без авто-закрытия",
  "actionItems": [
    {"text": "Довести one-shot-first-frame до DoD: docs/procedures/one-shot/ + предикат с тестом; Issue #1022 reopen или новое Issue на остаток", "owner": "vesnin", "status": "open"},
    {"text": "Не ставить Closes на Issue реализации из PR одной транскрипции промпта", "owner": "vesnin", "status": "open"}
  ],
  "related": ["2026-07-23-night-merged-not-deployed", "2026-07-21-morning-ritual-live-run-mechanics-pass-value-fail"]
}
-->

# Прецедент 2026-07-23: Issue #1022 закрыт промптом, процедуры one-shot нет

<!-- Автор: Cursor Grok, сессия по запросу владельца 23.07 (tip main ~00a34bb3). -->
<!-- Повод: владелец спросил формат oneshot после one-shot #1002; рабочего пути нет — регистрирует прецедент, чтобы предъявить держателю. -->

## Что случилось

Владелец спросил, как запускать формат oneshot. Находка агента: канон **как обсуждение** есть — шторм `storm-one-shot-format-2026-07-23`, инсайт `insight-one-shot-format` (adopted 7.2), промпт `docs/prompts/ONE_SHOT_FIRST_FRAME_PROMPT.md`, карточка `one-shot-first-frame` в реестре, Issue **#1022**.

Рабочего дома **нет**:

- каталога `docs/procedures/one-shot/` нет;
- в `docs/FORMATS.md` строки про oneshot нет (и сам промпт это запрещает до процедуры);
- yarn-скрипта формата нет.

Вывод агента владельцу: пока #1022 не собран — формат как рабочий путь не включать. Владелец регистрирует прецедент, чтобы пожаловаться тому, кто должен был довести oneshot до usable state.

## Разбор (вещдоки)

| Артефакт | Состояние на tip main (~00a34bb3) |
|----------|-----------------------------------|
| Issue [#1022](https://github.com/officefish/Membrana/issues/1022) | **CLOSED** (2026-07-23), assignees пусты, author `officefish`; чекбоксы DoD в теле **все незакрыты** |
| PR [#1024](https://github.com/officefish/Membrana/pull/1024) | **MERGED**, title «транскрипция инсайта в спринт», body `Closes #1022`, author `officefish` |
| Файлы #1024 | только `ONE_SHOT_FIRST_FRAME_PROMPT.md` + строки в `docs/tasks/registry.json` / `README.md` |
| Карточка `one-shot-first-frame` | `status: active`, `leadPersona: vesnin`, `supportPersonas: [dynin]`, `githubIssue: 1022` |
| DoD #1022 | процедура `docs/procedures/one-shot/` + предикат в `scripts/lib/` + тест + запись в реестре процедур — **в main отсутствует** |

Промпт сам говорит: ожидаемый артефакт — **1 PR с процедурой и предикатом**. PR #1024 этим артефактом не был: он зарегистрировал задачу и закрыл Issue.

## Корень

**Закрытие Issue прочитано как сдача продукта.** Мердж промпта/карточки включил `Closes #1022`, гейты зелёные, Issue CLOSED — а ценность (рабочий путь oneshot) не построена. Тот же класс, что «механика сдана, ценность провалена» и соседний прецедент «merged ≠ задеплоено»: зелёный статус слияния/закрытия оборвал внимание до DoD.

Усугубление: карточка в реестре ещё `active` (честно), GitHub Issue уже CLOSED (врёт). Агент и владелец при вопросе «есть ли oneshot?» видят закрытый тикет и промпт — и только проверка дерева показывает пустоту.

## Фикс

- Прецедент зарегистрирован в контейнере.
- Владелец предъявляет **vesnin** (`leadPersona` карточки `one-shot-first-frame`) за недоведённый usable state / за то, что #1022 ушёл в CLOSED без процедуры.
- Остаток DoD: reopen #1022 или новое Issue на процедуру+предикат; не объявлять формат в `FORMATS.md` до дома процедуры.

## Профилактика

- `Closes #<issue>` на Issue с DoD **продукта** — только из PR, который несёт артефакты DoD.
- Транскрипция инсайта в task-промпт — отдельный шаг; авто-закрытие Issue реализации из такого PR запрещено.
- Перед ответом «формат готов» проверять наличие дома процедуры, а не статус Issue и наличие промпта.

## Ссылки

- Родственные прецеденты: `2026-07-23-night-merged-not-deployed` (merged ≠ живое); `2026-07-21-morning-ritual-live-run-mechanics-pass-value-fail` (механика vs ценность).
- Инсайт: `docs/insights/insight-one-shot-format/`.
- Шторм: `docs/storm/storm-one-shot-format-2026-07-23/`.
- Промпт / карточка: `docs/prompts/ONE_SHOT_FIRST_FRAME_PROMPT.md`, `one-shot-first-frame` → #1022.
- PR-обманщик закрытия: #1024.
