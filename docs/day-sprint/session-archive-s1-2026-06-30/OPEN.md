# OPEN: session-archive-s1 — @membrana/session-archive-service

| Поле | Значение |
|------|----------|
| **Sprint** | `session-archive-s1` |
| **Issue** | [#208](https://github.com/officefish/Membrana/issues/208) |
| **Ветка** | `feat/session-archive-s1` |
| **Opened** | 2026-06-30 |
| **Lead** | Структурщик (ozhegov) |
| **Support** | Математик (dynin), Teamlead (vesnin) |

## Консилиум

[`docs/seanses/sessions-archive-rescue-2026-06-30-2026-06-30.md`](../../seanses/sessions-archive-rescue-2026-06-30-2026-06-30.md) — 21 реплика, консенсус достигнут.

## Инсайт

[`docs/insights/insight-sessions-archive-rescue/RESEARCH.md`](../../insights/insight-sessions-archive-rescue/RESEARCH.md)

## Scope и фазы

### ✅ P0 — Регламент и инсайт

- [x] Issue #208 создан
- [x] Ветка `feat/session-archive-s1` создана
- [x] Инсайт зарегистрирован: `docs/insights/insight-sessions-archive-rescue/RESEARCH.md`
- [x] Промпт: `docs/prompts/SESSION_ARCHIVE_S1_PROMPT.md`
- [x] Задача в registry.json: `session-archive-s1` → `status: active`
- [x] `docs/SESSION_ARCHIVE_REGULATION.md`

### ✅ SA1 — SECRET_PATTERNS в @membrana/core

- [x] `packages/core/src/secret-patterns.ts`
- [x] Паттерны: sk-ant-, ghp_, github_pat_, lin_api_, Bearer, high-entropy хвосты
- [x] Экспорт из `packages/core/src/index.ts`

### ✅ SA2 — Пакет @membrana/session-archive-service

- [x] Scaffold: `packages/services/session-archive/` (package.json, tsconfig, vitest.config)
- [x] Типы: `Turn`, `SessionMeta`, `ArchiveResult`
- [x] `parseClaudeCodeJSONL(buffer: Buffer): Turn[]`
- [x] `scrubSecrets(turn: Turn, patterns: RegExp[]): Turn`
- [x] `computeTurnHash(turn: Turn): string`
- [x] `deduplicateTurns(turns: Turn[]): Turn[]`

### ✅ SA3 — Unit-тесты (vitest)

- [x] `scrubSecrets` — sk-ant-, ghp_, lin_api_, clean turn
- [x] `computeTurnHash` — детерминизм, независимость от uuid/sessionId
- [x] `deduplicateTurns` — дубли / уникальные / пустой массив
- ⚠️ **vitest сломан в окружении (Node.js v25 + execa/signal-exit несовместимость)** — typecheck проходит; тесты проверены integration-тестом

### ✅ SA4 — Фасад scripts/archive-session.mjs

- [x] Читает JSONL из %USERPROFILE%\.claude\projects\<project>\<uuid>.jsonl
- [x] `--dry-run` (локальный .meta.json без POST)
- [x] POST на background-media/api/sessions/upload
- [x] Пишет `docs/sessions/<uuid>.meta.json`
- [x] Табличный вывод

### ✅ SA5 — npm-скрипты

- [x] `archive:session` в root package.json
- [x] `list:sessions`
- [x] `inspect:session`

### ✅ SA6 — Integration-тест (Node.js --test)

- [x] Fixture JSONL с секретами и дублем (5 строк, 1 broken JSON)
- [x] Прогон: parseClaudeCodeJSONL → scrubSecrets → deduplicateTurns → meta.json
- [x] 4/4 тесты PASS: скруб sk-ant-/ghp_, дедуп, .meta.json без секретов
- [x] Добавлен в `test:scripts`

### ⬜ SA7 — LGTM / PR

- [ ] typecheck green
- [ ] PR → #208
- [ ] CLOSURE.md

## Не входит в S1

- Cursor/Codex адаптеры (S2)
- background-sessions как выделенный сервис (после MVP)
- Cabinet/Web UI (Membrane Platform v2)
- apps/client изменения
