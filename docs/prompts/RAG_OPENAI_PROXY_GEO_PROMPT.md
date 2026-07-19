# Промпт: RAG OpenAI-эмбеддер через прокси (гео-403)

> **Task-промпт для агента-разработчика.**
> Процесс постановки: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).
> Размер задачи: **S**. Ожидаемый артефакт: **1 PR** — openai-эмбеддер ходит через `HTTPS_PROXY` как voyage.
> Реестр: `id` = `rag-openai-proxy-geo` в [`docs/tasks/registry.json`](../tasks/registry.json).

---

## Контекст

`yarn rag:index` падает с `Country, region, or territory not supported`: OpenAI-эмбеддер
в `packages/services/rag/src/embed/openai-embedder.ts` использует глобальный `fetch` без
`ProxyAgent`. Соседний `voyage-embedder.ts` уже умеет прокси. Ключ валиден (живой прогон
через туннель 17.07: `/models` → 200). Починка **не требует новых кредитов**.

**Связанные документы:**

| Документ | Зачем |
|----------|--------|
| GitHub Issue #593 | Эпизод, диагноз |
| `voyage-embedder.ts` | Паттерн undici + ProxyAgent + `resolveProxyUrl` |
| [`docs/RAG.md`](../RAG.md) | Операторский гайд |

**GitHub Issue:** #593.

---

## Промпт целиком (для вставки агенту)

### Что построить

1. `createOpenAiEmbedder` — при наличии `HTTPS_PROXY`/`HTTP_PROXY` ходит через
   `undici` + `ProxyAgent`; без прокси — прежний прямой `fetch`.
2. Вынести/переиспользовать `resolveProxyUrl` (не дублировать логику с voyage).
3. Unit-тесты: с прокси вызывается undici-путь (или dispatcher передаётся); без
   прокси — global fetch; пустой ключ → понятная ошибка; парсинг ответа без регресса.

### Definition of Done

- [ ] OpenAI-эмбеддер уважает `HTTPS_PROXY` / `HTTP_PROXY` тем же паттерном, что voyage.
- [ ] Тесты пакета `@membrana/rag-service` зелёные.
- [ ] LGTM Teamlead. `Closes #593`.

### Out of scope

- Смена провайдера по умолчанию; Voyage WAF; новые кредиты; operative-контур без ключа.

---

## Заметки для человека-постановщика

1. После merge: отчёт в #593 → `yarn task:archive rag-openai-proxy-geo --notes "PR #…"`.
