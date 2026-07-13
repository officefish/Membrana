# Промпт: DeepSeek direct API — fallback нарратива ночных агентов

> **Task-промпт для агента-разработчика** (Cursor IDE / Claude / другой LLM).
> Процесс постановки: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).
> Скопируй блок **«Промпт целиком»** в начало диалога. Размер задачи: **M**.
> Ожидаемый артефакт: **1 PR** — DeepSeek-модуль в background-office + провайдер-цепочка нарратива night-triage/night-hunt.
> Реестр: `id` = `night-narrative-deepseek-fallback` в [`docs/tasks/registry.json`](../tasks/registry.json).

---

## Контекст

Нарратив ночного триажа **пропускается третий день+**: OpenRouter отвечает 403
«security policy» (настройки аккаунта владельца), а `OpenRouterService` на голом
`fetch` не видит прокси. Ядро триажа детерминировано и живёт (draft PR
автономно, cron 02:30 МСК), страдает только LLM-раздел «Обзор». Прямой API
DeepSeek (OpenAI-совместимый chat-completions) доступен с office (Москва,
176.124.218.4) **без прокси** и дёшев — это обход обеих проблем без ожидания
починки аккаунта OpenRouter.

Решение обсуждено с владельцем 2026-07-13 (разбор списка инференс-провайдеров).
Канон готов: модуль строится по образцу существующего
[`openrouter.service.ts`](../../packages/background-office/src/modules/openrouter/openrouter.service.ts);
нарратив уже graceful (нет ключа/ошибка → отчёт без раздела).

**Связанные документы:**

| Документ | Зачем |
|----------|--------|
| [`VIRTUAL_TEAM_PROMPT.md`](../VIRTUAL_TEAM_PROMPT.md) | Роли, порядок работы |
| `packages/background-office/src/modules/openrouter/` | Образец LLM-модуля (service + module + config) |
| `packages/background-office/src/modules/night-triage/night-triage.service.ts` | Точка вызова нарратива NT4 (graceful-ветка) |
| `packages/background-office/src/modules/night-hunt/night-hunt.service.ts` | Второй потребитель LLM-канала |
| [`NIGHT_TRIAGE_OFFICE_PROMPT.md`](./NIGHT_TRIAGE_OFFICE_PROMPT.md) | История контура, границы NT1–NT5 |
| скилл `membrana-office-vds-deploy` + `packages/background-office/DEPLOY.md` | Деплой на office |
| скилл `membrana-adr` | Шаг 0 — фиксация решения |

**GitHub Issue:** #424.

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

### Шаг 0 — ADR (до кода)

`membrana-adr`: зафиксировать «нарратив ночных агентов: цепочка провайдеров
OpenRouter → DeepSeek(direct) → graceful-пропуск». Ключевые пункты решения:
прямой провайдер как обход сетевых/аккаунт-блоков (уроки: ТСПУ IP-specific,
OpenRouter 403); детерминированное ядро НЕ зависит от LLM-канала; новых
core-контрактов не вводить (исполнение по готовому канону — консилиум не
требуется, решение владельца 2026-07-13).

---

### Что построить (продуктовое описание)

1. **Модуль `deepseek`** в `packages/background-office/src/modules/deepseek/`
   по образцу `openrouter`: `DeepSeekService.chat(prompt, maxTokens)` на прямой
   `https://api.deepseek.com/chat/completions` (OpenAI-совместимый формат),
   `isConfigured()`, `defaultModel()` (default `deepseek-chat`), таймаут,
   логирование как у соседа. Конфиг: `DEEPSEEK_API_KEY`, `DEEPSEEK_MODEL` в
   `env.schema` + `.env.example`.
2. **Цепочка провайдеров нарратива**: night-triage (NT4) и night-hunt пробуют
   OpenRouter → при ошибке/неконфигурированности DeepSeek → при ошибке
   graceful-пропуск (как сейчас). В отчёте/логах видно, **какой провайдер**
   сгенерировал нарратив (строка «сгенерировано: openrouter|deepseek» в
   подписи раздела) — оператор не должен гадать.
3. Порядок цепочки — фиксированный в коде (не конфиг): OpenRouter первым
   (когда 403 починят — вернётся сам), DeepSeek вторым.

---

### Архитектура / контракт

| Слой | Путь | Ответственность |
|------|------|-----------------|
| DeepSeek-модуль | `packages/background-office/src/modules/deepseek/` | HTTP-вызов, конфиг, ошибки; НЕ знает про триаж |
| Цепочка | night-triage.service / night-hunt.service | try-порядок провайдеров, метка источника; НЕ знает деталей HTTP |
| Конфиг | `config/env.schema` | DEEPSEEK_API_KEY/DEEPSEEK_MODEL опциональны |

**Запрещено:**

- Менять детерминированные таблицы/рекомендации триажа (LLM — только раздел «Обзор»).
- Новые core-контракты, общий «LLM-роутер»-пакет (это фаза, если провайдеров станет >2 — сейчас YAGNI).
- Прокси-логика в DeepSeek-модуле (канал ценен именно прямым доступом; прокси-фикс OpenRouterService — отдельная тема).
- Трогать cron/деплой-конфигурацию сверх добавления env-переменных.

---

### Тесты

| Область | Минимум |
|---------|---------|
| DeepSeekService | unit: isConfigured, парсинг ответа, ошибка HTTP → throw (mock fetch) |
| Цепочка | openrouter ok → deepseek не вызывается; openrouter throw + deepseek ok → нарратив с меткой deepseek; оба throw → отчёт без раздела (graceful, как сейчас) |
| Регресс | существующие тесты night-triage-narrative зелёные без изменений |

---

### Definition of Done

- [ ] ADR зафиксирован (шаг 0).
- [ ] Модуль deepseek + env.schema + `.env.example`; unit-тесты цепочки и сервиса зелёные.
- [ ] `yarn turbo run lint typecheck test build --continue` — зелёный (scope: background-office).
- [ ] Метка провайдера видна в разделе нарратива.
- [ ] Деплой на office + один ручной ран триажа с DEEPSEEK_API_KEY → нарратив в отчёте (owner-гейт: ключ; без ключа — DoD закрывается по mock-тестам, живой ран выносится хвостом).
- [ ] LGTM Teamlead (closure review).

---

### Out of scope

- Прокси-фикс OpenRouterService (undici dispatcher) — отдельная карточка при необходимости.
- Починка 403 на аккаунте OpenRouter (действие владельца).
- Универсальный мульти-провайдер-роутер, конфигурируемые цепочки.
- Использование DeepSeek где-либо кроме нарратива ночных агентов.

---

### Порядок работы ролей

1. **Teamlead (Vesnin)** — ADR шага 0, граница «LLM только аннотирует», финальный LGTM.
2. **Структурщик (Ozhegov)** — зеркальность модуля образцу openrouter, развязка цепочка↔HTTP, env.schema.
3. **Математик (Dynin)** — тест-матрица цепочки (3 исхода), инвариант «таблицы не меняются».
4. **Музыкант (Kuryokhin)** — не участвует (аудио не затронуто).
5. **Верстальщик (Rodchenko)** — не участвует (UI нет; метка провайдера — текст в markdown-отчёте).

---

## Заметки для человека-постановщика

1. GitHub Issue **#424** (enhancement, night-triage).
2. Запись в `docs/tasks/registry.json` — сделана (`night-narrative-deepseek-fallback`, active).
3. **Owner-гейт:** аккаунт + `DEEPSEEK_API_KEY` (platform.deepseek.com) — до живого рана; код и тесты от ключа не зависят.
4. После merge: `yarn task:archive night-narrative-deepseek-fallback --notes "…"`.

### Проверка после PR

```bash
yarn workspace @membrana/background-office test
# на office после деплоя (с ключом):
curl -s -X POST localhost:3001/v1/night-triage/run   # или ручной триггер по DEPLOY.md
```

---

## Связь с дорожной картой

- Закрывает хвост спринта #380 (night-triage): «нарратив пропускается (OpenRouter 403)».
- Прецедент выбора: разбор списка инференс-провайдеров 2026-07-13 (worktree Membrana-openrouter); server-first стратегия владельца.
- Соседняя карточка спринта: `rag-archive-embeddings-unblock` (#425).
