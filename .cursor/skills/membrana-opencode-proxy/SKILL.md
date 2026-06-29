---
name: membrana-opencode-proxy
description: >-
  Экспериментальные запросы к LLM через proxy (OpenRouter, FreeModel) — те же mjs-паттерны,
  что anthropic:smoke/task, но ключи в .env.llm-proxy. Use when user asks opencode:ask,
  opencode:task, llm-proxy, OpenRouter proxy. Do NOT use for ritual:day, code-review, anthropic:smoke.
---

# Membrana + OpenCode proxy (mjs, не TUI)

## Что это

**Не путать** с приложением OpenCode TUI (`yarn opencode:tui`).

Контур **opencode** в Membrana = те же **mjs-скрипты + Cursor skill**, что `yarn anthropic:*`, но:

- ключи в **`.env.llm-proxy`** (`OPENROUTER_API_KEY`, `FREEMODEL_DEV_API_KEY`);
- провайдер/модель флагами `--openrouter --haiku-4-5`;
- **не** трогает `ANTHROPIC_API_KEY` ритуалов.

## Когда применять

- Пользователь просит `opencode:ask`, `opencode:task`, proxy-запрос, OpenRouter.
- Нужен запрос к Claude/GPT **вне** `yarn code-review` / `ritual:day`.
- Эксперимент с лимитами FreeModel / OpenRouter.

## Когда НЕ применять

- `yarn anthropic:smoke`, `code-review`, `standup`, `ritual:*` — другой контур.
- `yarn opencode:tui` — только если нужен интерактивный терминальный агент OpenCode.

## Команды

| Задача | Команда |
|--------|---------|
| Проверка ключей + smoke | `yarn opencode:preflight` |
| Короткий ping | `yarn opencode:smoke` |
| Произвольный промпт | `yarn opencode:ask --openrouter --haiku-4-5 "вопрос"` |
| Файл + вопрос (как anthropic:task) | `yarn opencode:task docs/ARCHITECTURE.md "вопрос"` |
| Справка по флагам | `yarn opencode:ask --help` |
| Интерактивный TUI (опционально) | `yarn opencode:tui` |

Провайдеры: `--openrouter`, `--freemodel-dev`. Модели: `--haiku-4-5`, `--sonnet-4`, `--opus-4-7`.

Реестр: `scripts/experimental/llm-providers.json`. Env: `.env.llm-proxy.example`.

## После запуска

- Перескажи суть ответа модели.
- Не логируй ключи. При HTTP-ошибке — код и подсказка без секретов.
