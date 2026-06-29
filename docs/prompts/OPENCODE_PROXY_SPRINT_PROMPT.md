# Промпт (day sprint · active): OpenCode + LLM proxy providers (freemodel.dev)

> **Task-промпт** · [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md)  
> **Реестр:** day-sprint **`opencode-proxy-sprint-2026-06-25`**  
> **Статус:** **active**  
> **Пакет:** `scripts/experimental/`, `docs/experiments/` — **изолированный** от ритуалов Membrana

---

## Контекст

Membrana уже использует **прямой Anthropic API** для ритуалов (`yarn anthropic:smoke`, `code-review`, `standup`, `ritual:day`). Это prod-контур — **не трогать**.

Нужен **экспериментальный** контур:

- периодические запросы к Claude и другим моделям через **proxy-провайдеры** (freemodel.dev, OpenRouter, …);
- ротация по лимитам разных ключей;
- опциональная интеграция с **OpenCode CLI** для интерактивной работы;
- CLI-скрипт с флагами провайдера и модели: `--freemodel-dev --opus-4-7 "промпт"`.

**Исследование (Perplexity, 2026-06):** для OpenCode чаще всего используют:

| Провайдер | Формат API | Роль |
|-----------|------------|------|
| **OpenCode Zen** | OpenAI-compatible (встроенный) | curated gateway OpenCode |
| **OpenRouter** | OpenAI `/v1/chat/completions` | мульти-вендор, `anthropic/claude-*` |
| **302.AI** | OpenAI-compatible | альтернатива OpenRouter |
| **freemodel.dev / feemodel** | OpenAI-compatible → Anthropic под капотом | экспериментальный Claude-proxy |
| **Прямой Anthropic** | `/v1/messages` | baseline (уже в Membrana rituals) |

Для нашего mjs-скрипта стартуем с **OpenAI-compatible** провайдеров — проще единый транспорт.

---

## Product decisions

| ID | Решение |
|----|---------|
| **D-OC-1** | Ключи proxy — только в **`.env.llm-proxy`** (gitignored), не в корневом `.env` |
| **D-OC-2** | Скрипт `llm-proxy-ask.mjs` **не** импортирует `getAnthropicKey()` и не трогает `ANTHROPIC_API_KEY` ритуалов |
| **D-OC-3** | Провайдеры и алиасы моделей — в `scripts/experimental/llm-providers.json` |
| **D-OC-4** | CLI: два флага-идентификатора `--<provider>` + `--<model-alias>` + текст запроса |
| **D-OC-5** | OpenCode — опциональный шаг S4; основной DoD — работающий `yarn llm-proxy:ask` |
| **D-OC-6** | Новые провайдеры добавляются в JSON + `.env.llm-proxy.example`, без правок ритуалов |

---

## Phases

| Phase | Registry id | Size | DoD |
|-------|-------------|------|-----|
| **OC0** | `oc-proxy-s0-research-isolation` | S | Perplexity-обзор; `.env.llm-proxy.example`; `.gitignore`; этот промпт |
| **OC1** | `oc-proxy-s1-opencode-install` | S | `opencode --version`; заметка в `docs/experiments/OPENCODE_PROXY_SETUP.md` |
| **OC2** | `oc-proxy-s2-freemodel-keys` | S | Ключи в `.env.llm-proxy`; `yarn llm-proxy:smoke --freemodel-dev --haiku-4-5` → HTTP 200 |
| **OC3** | `oc-proxy-s3-llm-proxy-script` | M | `llm-proxy-ask.mjs`, parse-тесты, `yarn llm-proxy:ask` |
| **OC4** | `oc-proxy-s4-opencode-config` | S | `docs/experiments/opencode.json.example`; smoke в OpenCode TUI |

**Порядок:** OC0 → OC3 (скрипт можно до ключей) → OC2 (ключи от вас) → OC1/OC4 (OpenCode по желанию).

---

## Архитектура

| Слой | Путь | Назначение |
|------|------|------------|
| Env (experimental) | `.env.llm-proxy` | `FREEMODEL_DEV_API_KEY`, `OPENROUTER_API_KEY`, … |
| Provider registry | `scripts/experimental/llm-providers.json` | id провайдеров, алиасы моделей, apiFormat |
| Env loader | `scripts/_llm-proxy-env.mjs` | загрузка `.env.llm-proxy`, HTTP POST |
| CLI | `scripts/experimental/llm-proxy-ask.mjs` | `--provider --model "prompt"` |
| Setup guide | `docs/experiments/OPENCODE_PROXY_SETUP.md` | установка OpenCode, ключи, smoke |
| OpenCode template | `docs/experiments/opencode.json.example` | optional TUI config |

**Запрещено:**

- Подменять `ANTHROPIC_API_KEY` в корневом `.env`
- Встраивать proxy в `ritual:day` / `code-review` / `background-office`
- Коммитить `.env.llm-proxy` или реальные ключи

---

## CLI (целевой интерфейс)

```bash
# Smoke (короткий ping)
yarn llm-proxy:smoke --freemodel-dev --haiku-4-5

# Запрос
yarn llm-proxy:ask --freemodel-dev --opus-4-7 "Объясни разницу FFT и Cepstrum в двух предложениях"

# Другой провайдер (после добавления ключа)
yarn llm-proxy:ask --openrouter --sonnet-4 "ping"

# Справка
yarn llm-proxy:ask --help
```

Флаги `--freemodel-dev`, `--openrouter` — **провайдеры** из registry.  
Флаги `--opus-4-7`, `--sonnet-4`, `--haiku-4-5` — **алиасы моделей**.

---

## Шаги для вас (ключи)

### OC2 — freemodel.dev

1. Скопировать `.env.llm-proxy.example` → `.env.llm-proxy`
2. Зарегистрироваться на freemodel.dev, получить API key
3. Заполнить:
   ```env
   FREEMODEL_DEV_API_KEY=sk-...
   FREEMODEL_DEV_BASE_URL=https://api.freemodel.dev/v1
   ```
   (точный base URL — из документации провайдера; при отличии поправить)
4. Запустить: `yarn llm-proxy:smoke --freemodel-dev --haiku-4-5`

### OC4 — OpenRouter (опционально)

```env
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
```

### OC1 — OpenCode CLI

```powershell
choco install opencode
# или: npm install -g opencode-ai
opencode --version
```

См. `docs/experiments/OPENCODE_PROXY_SETUP.md`.

---

## Definition of Done (спринт)

- [ ] OC0: промпт, registry, `.env.llm-proxy.example`, gitignore
- [ ] OC3: `yarn llm-proxy:ask` + unit-тесты parse
- [ ] OC2: smoke с реальным ключом freemodel.dev (выполняет пользователь)
- [ ] OC1/OC4: OpenCode установлен, example config (опционально)
- [ ] Ритуалы Membrana без изменений (`yarn anthropic:smoke` → прямой API)
- [ ] LGTM Teamlead

---

## Out of scope

- Автоматическая ротация по квотам (следующий эпик)
- Интеграция proxy в `background-office`
- Meridian / Claude Max subscription proxy
- Изменения `@membrana/core` / ветка `vesnin`

---

## Порядок ролей

1. **Vesnin** — изоляция от prod-ритуалов, LGTM
2. **Ozhegov** — скрипты, registry, тесты
3. **Dynin** — n/a (нет DSP)
