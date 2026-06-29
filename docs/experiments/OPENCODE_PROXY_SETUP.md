# OpenCode + LLM proxy — экспериментальная установка

> **Не влияет** на `yarn ritual:day`, `code-review`, `anthropic:smoke`.  
> Ключи — только в `.env.llm-proxy`.  
> Спринт: [`docs/prompts/OPENCODE_PROXY_SPRINT_PROMPT.md`](../prompts/OPENCODE_PROXY_SPRINT_PROMPT.md)

---

## 1. Ключи proxy (шаг OC2)

```powershell
copy .env.llm-proxy.example .env.llm-proxy
```

**FreeModel.dev — один ключ, два base URL:**

| Назначение | Base URL | Путь API | Модели |
|------------|----------|----------|--------|
| Claude через **наш скрипт** `llm-proxy:ask` | `https://api.freemodel.dev/v1` | `/v1/chat/completions` | OpenAI-формат (proxy переводит в Claude) |
| Claude через **Claude Code / Cline** | `https://cc.freemodel.dev` | `/v1/messages` | Только официальные клиенты (иначе HTTP 403) |
| OpenAI-формат | `https://api.freemodel.dev/v1` | `/v1/chat/completions` | GPT, совместимые SDK |
| Codex / Responses | `https://api.freemodel.dev/v1` | `/v1/responses` | GPT-5.x Codex (`wire_api=responses`) |

В `.env.llm-proxy`:

```env
FREEMODEL_DEV_API_KEY=sk-...
FREEMODEL_DEV_ANTHROPIC_BASE_URL=https://cc.freemodel.dev/v1
FREEMODEL_DEV_OPENAI_BASE_URL=https://api.freemodel.dev/v1
```

Dashboard также показывает VIP-маршруты (Singapore, Hong Kong, …) — отдельные хосты, тот же формат API.

Проверка:

```powershell
yarn llm-proxy:smoke --freemodel-dev --haiku-4-5
```

Ожидается короткий ответ на русском без HTTP-ошибки.

---

## 2. CLI-скрипт (шаг OC3)

```powershell
yarn llm-proxy:ask --freemodel-dev --opus-4-7 "Объясни разницу FFT и cepstrum"

yarn llm-proxy:ask --help
```

| Флаг | Значение |
|------|----------|
| `--freemodel-dev` | провайдер FeeModel.dev |
| `--openrouter` | провайдер OpenRouter (нужен ключ) |
| `--opus-4-7` | Claude Opus |
| `--sonnet-4` | Claude Sonnet 4 |
| `--haiku-4-5` | Claude Haiku 4.5 |

Реестр провайдеров и mapping моделей: `scripts/experimental/llm-providers.json`.

---

## 3. OpenCode CLI (шаг OC1, опционально)

Пакет называется **`opencode-ai`**, не `openai` и не `opencode`.

```powershell
choco install opencode
# или
npm install -g opencode-ai

opencode --version
```

На Windows при проблемах с TUI — WSL2 + `curl -fsSL https://opencode.ai/install | bash`.

---

## 4. OpenCode — полный контур Membrana (рекомендуется)

### Установка CLI

```powershell
choco install opencode
# или: npm install -g opencode-ai
opencode --version
```

### Запуск с ключами из `.env.llm-proxy`

```powershell
yarn opencode:membrana
```

Скрипт `scripts/opencode-with-llm-proxy.mjs`:
- грузит `.env.llm-proxy`;
- ставит `OPENCODE_CONFIG` → `docs/experiments/opencode.membrana.example.json`;
- ставит `OPENCODE_CONFIG_DIR` → `.opencode/` (агенты проекта).

### В TUI после старта

```
/models              # freemodel/* или openrouter/* при fallback
/agent membrana-review   # read-only границы пакетов
/agent membrana-service  # packages/services/*
Tab                  # переключение plan ↔ build
```

### Провайдеры в конфиге

| Provider ID | Когда | Ключ |
|-------------|-------|------|
| `freemodel` | основной (api.freemodel.dev) | `FREEMODEL_DEV_API_KEY` |
| `openrouter` | fallback при 502/лимитах | `OPENROUTER_API_KEY` |
| `ollama` | локально, без квот | `OLLAMA_HOST` (default 11434) |

**FreeModel особенность:** `cc.freemodel.dev` — только Claude Code. OpenCode использует `api.freemodel.dev` (OpenAI-формат).

### Агенты (`.opencode/agents/`)

| Агент | Режим | Назначение |
|-------|-------|------------|
| `plan` | primary, read-only | обзор, Haiku (OpenRouter) |
| `build` | primary, edits | реализация, Sonnet (OpenRouter) |
| `membrana-review` | subagent | границы пакетов |
| `membrana-service` | subagent | `packages/services/*` |
| `membrana-device-board` | subagent | device-board graph |
| `membrana-audio-guard` | subagent | audio-engine guard |
| `membrana-docs` | subagent | catalog/docs sync |

### Fallback plugins (`.opencode/`)

| Файл | Plugin |
|------|--------|
| `fallback.json` | `opencode-fallback` — 502/503 → OpenRouter |
| `rate-limit-fallback.json` | `@azumag/opencode-rate-limit-fallback` — 429 → цепочка OR → Ollama |

### MCP (в конфиге)

| Сервер | Назначение |
|--------|------------|
| `filesystem` | чтение репозитория |
| `git` | git-операции |
| `perplexity` | web-grounded research (`PERPLEXITY_API_KEY`) |

### Preflight

```powershell
yarn llm-proxy:preflight
yarn opencode:membrana
```

### Минимальный конфиг (без Membrana-агентов)

Шаблон: [`opencode.json.example`](./opencode.json.example) → `%USERPROFILE%\.config\opencode\opencode.json`

---

## 5. Что ещё можно донастроить (опционально)

| Улучшение | Зачем |
|-----------|-------|
| **OpenRouter ключ** в `.env.llm-proxy` | fallback когда FreeModel 502/лимит |
| **Ollama** `yarn ensure-ollama` | локальные задачи без расхода квоты |
| **MCP** (Perplexity, filesystem) | исследование docs/ в сессии OpenCode |
| **plugin `opencode-rate-limit-fallback`** | автосмена провайдера при 429 |
| **VIP-маршруты** FreeModel | другой base URL после top-up в dashboard |
| **Глобальный** `~/.config/opencode/opencode.json` | настройки вне репозитория |

---

## 6. Что чаще используют с OpenCode (Perplexity, 2026)

| Провайдер | Формат | Заметка |
|-----------|--------|---------|
| OpenCode Zen | OpenAI-compatible | встроенный curated gateway |
| OpenRouter | OpenAI-compatible | `anthropic/claude-*` model IDs |
| 302.AI | OpenAI-compatible | альтернатива OpenRouter |
| freemodel.dev | OpenAI-compatible | экспериментальный Claude-proxy |
| Прямой Anthropic | `/v1/messages` | baseline (Membrana rituals) |

Наш `llm-proxy-ask.mjs` использует **OpenAI-compatible** транспорт для proxy-провайдеров.

---

## 7. Добавление нового провайдера

1. Добавить запись в `scripts/experimental/llm-providers.json` (`providers` + `providerModels` у моделей).
2. Добавить переменные в `.env.llm-proxy.example`.
3. Заполнить ключ в `.env.llm-proxy`.
4. `yarn llm-proxy:smoke --<new-provider> --haiku-4-5`.

---

## Troubleshooting

| Симптом | Действие |
|---------|----------|
| `.env.llm-proxy не найден` | `copy .env.llm-proxy.example .env.llm-proxy` |
| HTTP 401/403 | проверить ключ и base URL провайдера |
| 403 в `yarn anthropic:smoke` | это **другой** контур; см. `.env.example` |
| Неизвестный флаг | `yarn llm-proxy:ask --help` |
| Модель не для провайдера | дописать mapping в `llm-providers.json` |
