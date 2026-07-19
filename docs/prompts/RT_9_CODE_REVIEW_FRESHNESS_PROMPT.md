# Промпт: RT-9 — гвард свежести code-review (критичный сбой не молчит)

> **Task-промпт для агента-разработчика.**
> Процесс постановки: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).
> Размер задачи: **S**. Ожидаемый артефакт: **1 PR** — `isFresh`/`dateOf` + `NON_CRITICAL_STEPS` + гвард в downstream.
> Реестр: `id` = `rt-9-code-review-freshness` в [`docs/tasks/registry.json`](../tasks/registry.json).
> Эпик: `ritual-trust-contour` (#539). Консилиум: `rt8-loose-ends-2026-07-16` вердикт A1.

---

## Контекст

`(node scripts/code-review.mjs || true)` в `ritual:evening` глотает сбой критичного шага
(15.07 фолбэк без кредита → 127, незамечено). Downstream (standup / main-day-issue) читает
`DAILY_CODE_REVIEW.md` без проверки даты. Вердикт консилиума: чистая функция свежести +
явный список некритичных шагов; `|| true` только для них.

**Связанные документы:**

| Документ | Зачем |
|----------|--------|
| `docs/seanses/rt8-loose-ends-2026-07-16.md` | Вердикт A1, DoD |
| `scripts/lib/code-review-ritual.mjs` | Фронтматтер `<!-- Сгенерировано: … -->` |
| Эпик #539 | Родитель |

**GitHub Issue:** — (не заведён; parent #539).

---

## Промпт целиком (для вставки агенту)

### Что построить

1. `scripts/lib/artifact-freshness.mjs`:
   - `dateOf(text)` — дата из HTML-комментария `Сгенерировано:` (ISO), не mtime;
   - `isFresh(text, today)` — `dateOf === today` (today инъекцией);
   - `assertFreshOrThrow(text, { today, label, exitCode })` — читаемое
     «устарел на N дн.» + ненулевой exit.
2. `NON_CRITICAL_STEPS` — явный массив id шагов вечера, которым позволен soft-fail;
   `code-review` и `archive-daily-code-review` **не** в списке (или archive — по норме
   консилиума: критичный = code-review; archive может остаться рядом — зафиксировать
   в PR: минимум снять `|| true` с `code-review.mjs`).
3. Downstream: `_daily-standup.mjs` и `_main-day-issue.mjs` на входе проверяют
   свежесть `DAILY_CODE_REVIEW.md` (если файл есть); при протухании — явный отказ.
4. Рефактор `package.json` `ritual:evening`: убрать `|| true` у критичных шагов.

### Тесты

| Область | Минимум |
|---------|---------|
| dateOf / isFresh | сегодня → true; вчера → false; нет штампа → не fresh |
| assertFreshOrThrow | сообщение содержит «устарел на N» |
| ritual chain | code-review не под `\|\| true` (как в main-day-probe.test) |

### Definition of Done

- [ ] Чистые функции + инъекция `today`; оба пути покрыты тестом.
- [ ] `ritual:evening` не глотает сбой `code-review`.
- [ ] standup / main-day-issue падают явно на вчерашнем ревью.
- [ ] `yarn test:scripts` (затронутые) зелёные. LGTM Teamlead.

### Out of scope

- RT-10 precision mode; правка LLM code-review; telegram digest attachment date (#586).

---

## Заметки для человека-постановщика

1. Закрытие: `yarn task:archive rt-9-code-review-freshness --notes "PR #…"`.
2. Комментарий в #539 при желании.
