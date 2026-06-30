# SESSION-ARCHIVE-S1: Реализация @membrana/session-archive-service

**Issue:** [#208](https://github.com/officefish/Membrana/issues/208)  
**Эпик:** session-archive  
**Sprint:** S1 (MVP — Claude Code JSONL collector)  
**Дата:** 2026-06-30  

## Задача

Реализовать пакет `@membrana/session-archive-service` для архивации AI-сессий (Claude Code JSONL) с скрубом секретов, дедупликацией, и интеграцией в вечерний ритуал.

## Контекст

Консилиум 2026-06-30 зафиксировал архитектуру:
- **Топология:** коллектор (Windows) → POST → приёмник (background-media VDS)
- **Хранилище:** метаданные в `docs/sessions/*.meta.json` (репо); JSONL на S3/localdisk в background-media
- **Скруб — блокирующее условие** (проект defense-adjacent; ключи в логах)
- **Приёмник MVP:** `background-media POST /api/sessions/upload`

Инсайт: `docs/insights/insight-sessions-archive-rescue/RESEARCH.md`  
Консилиум: `docs/seanses/sessions-archive-rescue-2026-06-30-2026-06-30.md`

## Scope (S1 — Claude Code только)

### SA0 — Регламент
- `docs/SESSION_ARCHIVE_REGULATION.md` (когда, как, lifecycle incomplete)

### SA1 — @membrana/core: SECRET_PATTERNS
- `packages/core/src/SECRET_PATTERNS.ts`
- Паттерны: `sk-ant-`, `ghp_`, `lin_api_`, `lin_`, high-entropy после `=` (≥20 символов base64/hex)

### SA2 — @membrana/session-archive-service
- Пакет в `packages/services/session-archive/`
- Публичный API:
  - `parseClaudeCodeJSONL(buffer: Buffer): Turn[]`
  - `scrubSecrets(turn: Turn, patterns: RegExp[]): Turn`
  - `computeTurnHash(turn: Turn): string`
  - `deduplicateTurns(turns: Turn[]): Turn[]`
- Типы: `Turn`, `SessionMeta`, `ArchiveResult`

### SA3 — Unit-тесты (vitest)
- `scrubSecrets`: sk-ant-, ghp_, lin_api_, high-entropy хвосты
- `computeTurnHash`: детерминизм + стабильность после скруба
- `deduplicateTurns`: дубли удаляются, неповторяющиеся — нет

### SA4 — Фасад scripts/archive-session.mjs
- CLI: `node scripts/archive-session.mjs [--uuid <uuid>] [--dry-run]`
- Читает JSONL из `%USERPROFILE%\.claude\projects\<project>\<uuid>.jsonl`
- POST на `background-media/api/sessions/upload`
- Пишет `docs/sessions/<uuid>.meta.json`
- Вывод: таблица UUID | Branch | Turns | Secrets | Status

### SA5 — npm-скрипты в root package.json
- `archive:session` → `node scripts/archive-session.mjs`
- `list:sessions` → `node scripts/list-sessions.mjs`
- `inspect:session` → `node scripts/inspect-session.mjs`

### SA6 — Integration-тест
- Читает реальный или fixture JSONL
- Прогоняет скруб → дедуп → пишет `.meta.json` во временную папку
- Проверяет: нет паттернов sk-ant-/ghp_ в выходном JSON

### SA7 — background-media: POST /api/sessions/upload (stub)
- Если эндпоинт ещё не существует: добавить stub controller в background-media
- Если нет времени — `--dry-run` в фасаде сохраняет JSONL локально без отправки

## Definition of Done

1. ✅ `@membrana/session-archive-service` с публичным API (4 функции)
2. ✅ `@membrana/core/SECRET_PATTERNS.ts`
3. ✅ `scripts/archive-session.mjs` — пишет `.meta.json` в `docs/sessions/`
4. ✅ `docs/SESSION_ARCHIVE_REGULATION.md`
5. ✅ npm-скрипты: `archive:session`, `list:sessions`, `inspect:session`
6. ✅ Unit-тесты: скруб + дедуп + хеш (>80% coverage)
7. ✅ Integration-тест: .jsonl → .meta.json без ошибок
8. ✅ LGTM от Teamlead

## Ограничения

- Адаптеры Cursor/Codex — в S2, не сейчас
- Cabinet UI — Membrane Platform v2
- background-sessions как выделенный сервис — после MVP; MVP использует background-media
- Не трогать `apps/client`
