# Промпт: insight review принимает готовый REVIEW.md из чата (как консилиум — протокол)

> **Task-промпт для агента-разработчика** (Cursor IDE / Claude / другой LLM).
> Процесс постановки: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).
> Размер задачи: **S**. Ожидаемый артефакт: **1 PR — insight review принимает готовый REVIEW.md и переставляет статусы сам**.
> Реестр: `id` = `insight-review-from-file` в [`docs/tasks/registry.json`](../tasks/registry.json).

---

## Контекст

`yarn insight review` жёстко ходит в панельную LLM-цепочку; при исчерпанном лимите канон
сам объявляет фолбэк «ревью в чате по INSIGHT_REVIEW_PROMPT, REVIEW.md руками»
(CREDIT_FALLBACKS), но принять готовый файл нечем. У консилиума есть `--secretary-file`,
у `task:review:run` — `--review-file`, у insight review — ничего: статусы meta.json и
registry переставлялись однострочником (вещдок 26.07, insight-cast-carrier-contract).

Попутно: детектор исчерпания ищет «credit balance is too low», а месячный лимит пришёл
строкой «specified API usage limits» — подсказка фолбэка не напечаталась ровно там,
где написана.

Не трогаем: состав ролей ревью и формат REVIEW.md.

**GitHub Issue:** заведён при отгрузке PR (см. карточку реестра).

---

## Что построено

1. **`yarn insight review <id> --review-file <md>`** — принимает готовый REVIEW.md:
   кладёт его в дом инсайта и переставляет статусы (meta.status=reviewed, reviewedAt,
   weight из «**Средний балл:**», запись в insights/registry) — **той же дорогой**, что
   и панельный путь: общий хелпер `applyReviewText` в `scripts/lib/insight-ritual.mjs`,
   однострочники больше не нужны. `--dry-run` показывает, что было бы принято.
   Пустой файл — отказ, не тихий сдвиг статусов; без «Средний балл» — статусы двигаются,
   weight нет, предупреждение словом.
2. **Детектор исчерпания** (`isCreditExhausted`) распознаёт и «specified API usage
   limits»; строка фолбэка insight review называет новый флаг.

**Запрещено:** менять состав ролей и формат REVIEW.md; сочинять weight при отсутствии
балла.

### Тесты

| Область | Минимум |
|---------|---------|
| парсер | `--review-file` читается; без флага — пустая строка |
| applyReviewText | статусы+weight по файлу; без балла weight не трогается; пустой файл — throw |
| детектор | «specified API usage limits» распознаётся |

### Definition of Done

- [x] `yarn insight review <id> --review-file <md>` работает; dry-run показывает приём.
- [x] Обе дороги (LLM и файл) применяют ревью одной функцией.
- [x] Детектор лимита узнаёт месячную строку; подсказка называет флаг.
- [x] Тесты зелёные (insight-ritual 15, credit-hint 3).

### Out of scope

- Валидация структуры REVIEW.md по ролям (формат не трогаем).
- Оффлайн-каналы research/create.

---

## Заметки для человека-постановщика

1. После merge: `yarn task:archive insight-review-from-file --notes "…"`.

### Проверка после PR

```bash
node --test scripts/insight-ritual.test.mjs scripts/anthropic-credit-hint.test.mjs
yarn insight review <id> --review-file <md> --dry-run
```
