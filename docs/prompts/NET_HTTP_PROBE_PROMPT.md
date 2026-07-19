# Промпт: net:http — HTTP-проба произвольного URL через прокси

> **Task-промпт для агента-разработчика.**
> Процесс постановки: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).
> Размер задачи: **S**. Ожидаемый артефакт: **1 PR** — `yarn net:http <url>` с
> классификацией ответа (ok / geo-403 / waf-html / timeout / proxy-dead).
> Реестр: `id` = `net-http-probe` в [`docs/tasks/registry.json`](../tasks/registry.json).

---

## Контекст

#595 п.2: диагностика RAG (#593) потребовала ТРИ ручных прогона `undici + ProxyAgent`
за сессию (жив ли прокси, какой exit пускает Voyage, баланс OpenAI через туннель).
`curl` в Git Bash нет (mojibake), `llm:probe` знает только 4 фиксированных провайдера,
`net:diag` — про IP/SSH, не HTTP-через-прокси. Грабля-норма «сетевую пробу писать
на node/undici» записана в #595 как временная — до постройки этого инструмента.

**Связанные документы:**

| Документ | Зачем |
|----------|--------|
| GitHub Issue #595 (п.2) | Эпизоды, эскиз |
| [`scripts/_anthropic-env.mjs`](../../scripts/_anthropic-env.mjs) | Паттерн undici+ProxyAgent+connectTimeout, `loadDotEnv` (теперь слоёный, #567) |
| `scripts/llm-probe.mjs` | Прецедент классов ответа; НЕ дублировать — net:http обобщает на любой URL |

**GitHub Issue:** #595.

---

## Промпт целиком (для вставки агенту)

### Что построить

1. `scripts/net-http.mjs` + скрипт `net:http`:
   `yarn net:http <url> [--proxy env|none|<url>] [--key ENV_NAME] [--method GET|HEAD|POST] [--timeout-ms 15000] [--json]`.
2. Прокси: по умолчанию `env` (HTTPS_PROXY/HTTP_PROXY после `loadDotEnv`);
   `none` — напрямую; явный URL — использовать его. В выводе прокси печатается
   С МАСКИРОВКОЙ кредов (`http://user:***@host`).
3. `--key ENV_NAME` — `Authorization: Bearer <значение из env>`; значение НЕ логируется.
4. Классификация — чистая функция `classifyHttpProbe({status, bodyText, headers, error})`:
   - `ok` — 2xx/3xx;
   - `geo-403` — 403 (в т.ч. маркеры region/not allowed/unsupported country);
   - `waf-html` — не-2xx с HTML-телом (челлендж Cloudflare и родня);
   - `timeout` — connect/headers timeout;
   - `proxy-dead` — ECONNREFUSED/сокет до прокси;
   - `http-<status>` / `net-error` — остальное, с honest-именем.
5. Вывод: код, класс, время, прокси (маскированный), сниппет тела ≤200 симв.
   Exit: 0 ok · 2 timeout · 3 proxy-dead · 4 geo-403 · 5 waf-html · 1 остальное.

### Тесты

| Область | Минимум |
|---------|---------|
| classifyHttpProbe | все шесть классов по синтетическим входам; 403 c HTML-телом → geo-403 (статус сильнее тела) |
| maskProxy | креды маскируются, без кредов URL не искажается |

### Definition of Done

- [ ] Живой смоук: `yarn net:http https://api.anthropic.com/v1/models --proxy env` печатает код+класс; `--proxy none` показывает разницу маршрута.
- [ ] Тесты зелёные, файл в `test:scripts`. LGTM Teamlead.

### Out of scope

- Правка `llm:probe`/`net:diag`; ретраи; POST-тела (метод есть, тело — follow-up).

---

## Заметки для человека-постановщика

1. После merge — отчёт в #595 (пп.1–2 закрыты; остаются п.3-развилка и часть п.4).
2. Закрытие: `yarn task:archive net-http-probe --notes "PR #…"`.
