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

### ✅ P0 — Регламент и инсайт (сейчас)

- [x] Issue #208 создан
- [x] Ветка `feat/session-archive-s1` создана
- [x] Инсайт зарегистрирован: `docs/insights/insight-sessions-archive-rescue/RESEARCH.md`
- [x] Промпт: `docs/prompts/SESSION_ARCHIVE_S1_PROMPT.md`
- [x] Задача в registry.json: `session-archive-s1` → `status: active`
- [ ] `docs/SESSION_ARCHIVE_REGULATION.md`

### ⬜ SA1 — SECRET_PATTERNS в @membrana/core

- [ ] `packages/core/src/SECRET_PATTERNS.ts`
- [ ] Паттерны: sk-ant-, ghp_, lin_api_, high-entropy хвосты (≥20 символов base64/hex)
- [ ] Экспорт из `packages/core/src/index.ts`

### ⬜ SA2 — Пакет @membrana/session-archive-service

- [ ] Scaffold: `packages/services/session-archive/` (package.json, tsconfig, vitest.config)
- [ ] Типы: `Turn`, `SessionMeta`, `ArchiveResult`
- [ ] `parseClaudeCodeJSONL(buffer: Buffer): Turn[]`
- [ ] `scrubSecrets(turn: Turn, patterns: RegExp[]): Turn`
- [ ] `computeTurnHash(turn: Turn): string`
- [ ] `deduplicateTurns(turns: Turn[]): Turn[]`

### ⬜ SA3 — Unit-тесты

- [ ] `scrubSecrets` — каждый паттерн
- [ ] `computeTurnHash` — детерминизм
- [ ] `deduplicateTurns` — дубли / уникальные

### ⬜ SA4 — Фасад scripts/archive-session.mjs

- [ ] Читает JSONL из %USERPROFILE%\.claude\projects\<project>\<uuid>.jsonl
- [ ] `--dry-run` (локальный .meta.json без POST)
- [ ] POST на background-media/api/sessions/upload
- [ ] Пишет `docs/sessions/<uuid>.meta.json`
- [ ] Табличный вывод

### ⬜ SA5 — npm-скрипты

- [ ] `archive:session` в root package.json
- [ ] `list:sessions`
- [ ] `inspect:session`

### ⬜ SA6 — Integration-тест

- [ ] Fixture JSONL с тестовыми секретами
- [ ] Прогон: parseClaudeCodeJSONL → scrubSecrets → deduplicateTurns → meta.json
- [ ] Проверка: ни одного sk-ant-/ghp_ в выходном JSON

### ⬜ SA7 — LGTM / PR

- [ ] `yarn turbo run lint typecheck test` — green
- [ ] PR → #208
- [ ] CLOSURE.md

## Не входит в S1

- Cursor/Codex адаптеры (S2)
- background-sessions как выделенный сервис (после MVP)
- Cabinet/Web UI (Membrane Platform v2)
- apps/client изменения
