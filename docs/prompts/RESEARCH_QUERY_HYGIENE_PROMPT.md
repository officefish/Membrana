# Промпт: Гигиена research-запроса (insight-ritual)

> **Task-промпт для агента-разработчика.** Реестр: `research-query-hygiene`.
> Процесс: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).

---

## Контекст

Живой прогон 18.07: `scripts/lib/insight-ritual.mjs` склеивает `query = label + ": " + text`,
из‑за чего рубрика таблицы (Fit, Q1…) уезжает в поисковый запрос Perplexity. Технические
вопросы на русском тянут нерелевантную регуляторику.

Insight: `insight-own-field-corpus-single-spec`.

---

## Промпт целиком

### Definition of Done

- [ ] Ярлык рубрики **не** попадает в текст запроса к Perplexity (отдельное поле / метаданные).
- [ ] Язык/локаль запроса явно задаётся для технических тем (EN где уместно).
- [ ] Регресс-тест на сборку query из fixture insight-ritual.
- [ ] `yarn test` / scope scripts — зелёный.

### Out of scope

- Смена провайдера research; полный рефактор insight lifecycle.

---

## Закрытие

`yarn task:archive research-query-hygiene --notes "PR #N, …"` · [`TASK_CLOSURE_REGULATION.md`](./TASK_CLOSURE_REGULATION.md)
