---
name: membrana-env-secrets-guard
description: "Guards Membrana environment and secrets: which keys live where (.env, .env.llm-proxy), the localhost HTTPS_PROXY model, which scripts need which key (RAG → OPENAI_API_KEY, background-office → ANTHROPIC_API_KEY/LINEAR_API_KEY), and the rule that secrets never enter the repo. Use when a script fails for a missing key, configuring .env or the proxy, deciding why RAG/index/agent calls fail, or when the user mentions .env, OPENAI_API_KEY, proxy, secrets, or ключи. Do NOT use for running deploys (membrana-deploy-operator) or git hygiene (membrana-git-pr)."
---
# Membrana env & secrets guard

Канон: `.env.example`, `.env.llm-proxy.example`, [`docs/RAG.md`](../../../docs/RAG.md), [`AGENTS.md` § env](../../../AGENTS.md).

**Владелец:** **Математик (Dynin)** — Linux/security/ops.

## When to use

- Скрипт падает из-за отсутствующего ключа; настройка `.env`/прокси.
- Разобраться, почему RAG/index/agent-вызовы не идут.
- Пользователь: «.env», «OPENAI_API_KEY», «proxy», «секреты», «ключи».

## When NOT to use

- Запуск деплоя → `membrana-deploy-operator`.
- Git/PR гигиена → `membrana-git-pr`.

## Какой ключ где нужен

| Потребитель | Ключ | Без ключа |
|-------------|------|-----------|
| RAG archive (`yarn rag:index --full` / `:incremental`) | `OPENAI_API_KEY` | index пропускается (evening hook — non-blocking) |
| RAG operative (`standup:dry`, `code-review`, `ask`) | — | работает без ключа |
| `background-office` | `ANTHROPIC_API_KEY`, `LINEAR_API_KEY`, `OFFICE_API_TOKEN` / `API_INTERNAL_TOKEN` | office-функции / ласточки недоступны |
| `background-media` / media smoke | `MEDIA_API_URL`, `MEDIA_API_TOKEN` (или `MEDIA_INTERNAL_TOKEN`) | smoke 401; **не путать** с office `API_INTERNAL_TOKEN` (#723) |
| Client dev (`yarn workspace @membrana/client dev`) | — | работает без `.env` |

**Media vs office (#723):** `yarn media:env:check` печатает наличие URL и *источник* токена без значения секрета. Резолвер — `scripts/lib/media-token.mjs` (класс `resolveOfficeToken`). Голый `API_INTERNAL_TOKEN` без `MEDIA_API_*` media-токеном не считается (часто office-плейсхолдер в sibling-worktree).

## Ловушка: `.env` не загружается автоматически

В проекте **нет `dotenv`** и нет глобального preload — `node scripts/*.mjs` файл `.env` сам не читает. Скрипты берут ключи из `process.env`. Поэтому ключ, лежащий **только** в `.env` (не экспортированный в шелл), невидим для `rag:index`, и embedder падает `OPENAI_API_KEY is required` несмотря на наличие ключа в файле.

| Запуск | Как получить ключ из `.env` |
|--------|------------------------------|
| Перед любым `yarn …` | `set -a; . ./.env; set +a` (экспорт в шелл) |
| Разовый node-скрипт | `node --env-file=.env scripts/<x>.mjs` (Node ≥ 20.6) |
| Вечерний RAG-хук | `scripts/rag-evening-index.mjs` сам делает `process.loadEnvFile('.env')` |
| Ручной `yarn rag:index` | идёт прямо в CLI — нужен экспорт (`set -a; . ./.env; set +a`) |

> Канон CLI: «.env loaded by caller if configured» — загрузка env это ответственность **вызывающего**, не скрипта.

## Прокси-модель

- LLM-трафик идёт через **локальный** `HTTPS_PROXY=http://127.0.0.x` (`.env.llm-proxy`). Прокси живёт на машине разработчика — из CI/sandbox недоступен.
- Прямой выход на `api.openai.com` из изолированных окружений закрыт → RAG-индекс гоняй **локально** (урок спринта #182, A5).
- Launcher: `yarn claude:code` (proxy-aware), `scripts/claude-code-with-proxy.mjs`.

## Инварианты (secrets hygiene)

- **Секреты не в репозиторий:** не коммить `.env`, `.env.llm-proxy`, ключи, токены (см. `membrana-git-pr`, `.claude/CLAUDE.md`).
- Шаблоны — только `*.example` файлы (без значений).
- Не печатать значения ключей в логах/выводе/PR; маскировать (`sk-…****`).
- `.env` и deploy-логи — в `%TEMP%`/`$TMPDIR`, не в корень репо.

## Quick checks

```bash
grep -iE 'OPENAI|ANTHROPIC|LINEAR' .env | sed -E 's/=(.{4}).*/=\1****/'   # маскированная проверка наличия
```
