# Промпт: RAG archive — второй embeddings-провайдер по существующему контракту

> **Task-промпт для агента-разработчика** (Cursor IDE / Claude / другой LLM).
> Процесс постановки: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).
> Скопируй блок **«Промпт целиком»** в начало диалога. Размер задачи: **M**.
> Ожидаемый артефакт: **1 PR** — voyage-эмбеддер (или задокументированный OPENAI_BASE_URL-путь) + живой archive-индекс.
> Реестр: `id` = `rag-archive-embeddings-unblock` в [`docs/tasks/registry.json`](../tasks/registry.json).

---

## Контекст

RAG archive-контур **deferred с эпохи Mintlify-спринта** единственно из-за
отсутствия `OPENAI_API_KEY`. При этом инфраструктура готова: пакет
`packages/services/rag` (индекс LanceDB, CLI `rag:index`), потребители уже в
ритуалах (`consilium` подмешивает archive по умолчанию `useLongTerm`, `ask`
имеет `--rag`). Контракт **уже предусматривает второго провайдера**:
`RagEmbeddingProvider = 'openai' | 'voyage'` (`config.ts`), но
`embed/voyage-embedder` не реализован — есть только `openai-embedder.ts`.
Дополнительно `OPENAI_BASE_URL` конфигурируем — OpenAI-совместимые embeddings
API (Jina; Cohere в compat-режиме) могут завестись вообще без кода.

Решение обсуждено с владельцем 2026-07-13 (разбор списка инференс-провайдеров):
семантический recall — реальный пробел контура, эмбеддинги важнее генерации.

**Связанные документы:**

| Документ | Зачем |
|----------|--------|
| [`VIRTUAL_TEAM_PROMPT.md`](../VIRTUAL_TEAM_PROMPT.md) | Роли, порядок работы |
| `packages/services/rag/src/config.ts` | Контракт провайдера (НЕ менять тип) |
| `packages/services/rag/src/embed/openai-embedder.ts` | Образец эмбеддера |
| `packages/services/rag/src/index/pipeline.ts` | Точка подключения (батчи) |
| `scripts/lib/rag-ritual.mjs` | Потребители: consilium/ask |

**GitHub Issue:** #425.

---

## Промпт целиком (для вставки агенту)

> Всё ниже до раздела **«Заметки для человека-постановщика»** — текст задания для агента.

---

### Кто ты

Ты — **координатор виртуальной команды Membrana** под руководством **Vesnin** (Teamlead).
Перед кодом — краткий план (1–2 абзаца + список файлов). Соблюдай
[`VIRTUAL_TEAM_PROMPT.md`](../VIRTUAL_TEAM_PROMPT.md) и
[`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).

---

### Что построить (продуктовое описание)

1. **Развилка реализации (решить на планировании, зафиксировать в PR-описании):**
   - **A (предпочтительно, если ключ Voyage):** `embed/voyage-embedder.ts` по
     образцу openai-эмбеддера (`https://api.voyageai.com/v1/embeddings`,
     `VOYAGE_API_KEY`, модель `voyage-3-lite` по умолчанию), выбор по
     `RAG_EMBEDDING_PROVIDER=voyage`. Контракт `RagEmbeddingProvider` НЕ меняется.
   - **B (если owner даёт ключ Jina/Cohere-compat):** без нового кода —
     проверить путь `OPENAI_BASE_URL=<compat-endpoint>` + `RAG_EMBEDDING_MODEL`,
     починить мелкие несовместимости, если вылезут, задокументировать рецепт в
     README пакета rag. Geo-доступность endpoint'а с office проверить ДО выбора.
2. **Живой archive-индекс:** `yarn rag:index --full` на реальном архиве
   (docs/seanses, docs/insights, docs/tasks/archive) — индекс собирается, ошибок нет.
3. **E2E потребителя:** `yarn consilium --dry-run` показывает непустой RAG-блок;
   `yarn ask <persona> --rag "<вопрос>"` подмешивает archive-контекст.
4. **Единица правды по размерности:** размерность эмбеддинга фиксируется в
   индексе; смена провайдера/модели → пересборка индекса (задокументировать).

---

### Архитектура / контракт

| Слой | Путь | Ответственность |
|------|------|-----------------|
| Эмбеддер | `packages/services/rag/src/embed/` | HTTP-вызов провайдера, батчи; НЕ знает про сторы |
| Конфиг | `config.ts` | provider/model/ключи из env; тип провайдера НЕ расширять без нужды |
| Потребители | `scripts/lib/rag-ritual.mjs` | НЕ трогать (контракт retrieveRagContext стабилен) |

**Запрещено:**

- Менять тип `RagEmbeddingProvider` и публичные контракты пакета rag (если вариант B потребует нового значения типа — это СТОП и возврат к постановщику).
- Трогать operative-контур (работает без ключа) и потребителей в scripts.
- Новые векторные сторы (LanceDB остаётся; pgvector — отдельная фаза 3 persona-memory).
- Коммитить ключи/индексы (проверить .gitignore на артефакты LanceDB).

---

### Тесты

| Область | Минимум |
|---------|---------|
| Эмбеддер (вариант A) | unit: парсинг ответа, батчирование, ошибка HTTP/пустой ключ → понятная ошибка (mock fetch) |
| Конфиг | RAG_EMBEDDING_PROVIDER=voyage выбирает voyage; default остаётся openai |
| Регресс | существующие тесты пакета rag зелёные |

---

### Definition of Done

- [ ] Вариант A или B реализован/задокументирован; выбор объяснён в PR.
- [ ] `yarn turbo run lint typecheck test build --continue` — зелёный (scope: services/rag).
- [ ] Живой `rag:index --full` + непустой archive-блок в consilium/ask (owner-гейт: ключ; без ключа — DoD по mock-тестам, живой прогон хвостом).
- [ ] README пакета rag: рецепт настройки провайдера + правило пересборки индекса.
- [ ] LGTM Teamlead (closure review).

---

### Out of scope

- pgvector / альтернативные сторы (фаза 3 persona-memory, отдельное ревью).
- Реранкинг (Cohere rerank) — следующая итерация после живого recall.
- Изменение chunking/источников индекса.
- Автообновление индекса по cron (отдельная карточка после живого прогона).

---

### Порядок работы ролей

1. **Teamlead (Vesnin)** — выбор A/B по доступности ключа и geo-проверке, финальный LGTM.
2. **Структурщик (Ozhegov)** — граница пакета rag (эмбеддер не знает сторов, потребители не тронуты), README-рецепт.
3. **Математик (Dynin)** — инвариант размерности индекса, батчирование, качество recall на 2–3 контрольных запросах (сравнить топ-5 до/после — глазами).
4. **Музыкант (Kuryokhin)** — не участвует.
5. **Верстальщик (Rodchenko)** — не участвует.

---

## Заметки для человека-постановщика

1. GitHub Issue **#425** (enhancement, package:infra).
2. Запись в `docs/tasks/registry.json` — сделана (`rag-archive-embeddings-unblock`, active).
3. **Owner-гейт:** ключ провайдера — Voyage (вариант A) ЛИБО Jina/Cohere (вариант B). Решение по варианту — после того, как владелец скажет, какой аккаунт готов завести.
4. После merge: `yarn task:archive rag-archive-embeddings-unblock --notes "…"`.

### Проверка после PR

```bash
yarn workspace @membrana/rag-service test   # имя workspace уточнить по package.json пакета
yarn rag:index --full
yarn consilium --dry-run --no-save "контрольный вопрос по архиву"
```

---

## Связь с дорожной картой

- Разблокирует deferred-хвост Mintlify-спринта (RAG archive) и усиливает consilium/ask.
- Готовит recall-фундамент для фазы 3 persona-memory (когда журналы перерастут токен-бюджет).
- Соседняя карточка спринта: `night-narrative-deepseek-fallback` (#424).
