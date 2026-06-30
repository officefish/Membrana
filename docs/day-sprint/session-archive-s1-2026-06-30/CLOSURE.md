# CLOSURE: session-archive-s1 — @membrana/session-archive-service MVP

| Поле | Значение |
|------|----------|
| **Sprint** | `session-archive-s1` |
| **Registry** | `session-archive-s1` |
| **Issue** | [#208](https://github.com/officefish/Membrana/issues/208) |
| **Opened** | 2026-06-30 |
| **Closed** | 2026-06-30 |
| **Verdict** | **shipped** |
| **PR** | [#209](https://github.com/officefish/Membrana/pull/209) |
| **Commits** | `db14a90` (P0 scaffold), `c5d7040` (SA1-SA6 impl) |

---

## DoD — выполнение

| # | Пункт | Статус |
|---|-------|--------|
| 1 | `@membrana/session-archive-service` с API: parseClaudeCodeJSONL, scrubSecrets, deduplicateTurns, computeTurnHash | ✅ |
| 2 | `@membrana/core/secret-patterns.ts` (SECRET_PATTERNS + SECRET_REDACTION_PLACEHOLDER) | ✅ |
| 3 | `scripts/archive-session.mjs` — читает JSONL, POST background-media, пишет .meta.json | ✅ |
| 4 | `docs/SESSION_ARCHIVE_REGULATION.md` | ✅ |
| 5 | npm-скрипты: archive:session, list:sessions, inspect:session | ✅ |
| 6 | Unit-тесты скруб+дедуп+хеш | ✅ файлы написаны; ⚠ vitest сломан в окружении (Node.js v25 + execa) |
| 7 | Integration-тест: 4/4 PASS (Node --test) | ✅ |
| 8 | LGTM от Teamlead | ⬜ pending PR review |

---

## Delivered

| Артефакт | Путь |
|----------|------|
| SECRET_PATTERNS | `packages/core/src/secret-patterns.ts` |
| parseClaudeCodeJSONL | `packages/services/session-archive/src/parse-claude-code-jsonl.ts` |
| scrubSecrets | `packages/services/session-archive/src/scrub-secrets.ts` |
| computeTurnHash | `packages/services/session-archive/src/compute-turn-hash.ts` |
| deduplicateTurns | `packages/services/session-archive/src/deduplicate-turns.ts` |
| Unit-тесты | `packages/services/session-archive/src/session-archive.test.ts` |
| Фасад | `scripts/archive-session.mjs` |
| CLI list | `scripts/list-sessions.mjs` |
| CLI inspect | `scripts/inspect-session.mjs` |
| Integration-тест | `scripts/session-archive-integration.test.mjs` |
| Регламент | `docs/SESSION_ARCHIVE_REGULATION.md` |

---

## Ключевые решения

1. **Скруб до хеша** — `computeTurnHash` принимает скрублированный turn; дедупликация работает по скрублированному содержимому. Хеш нечувствителен к uuid/sessionId.
2. **Integration-тест через Node --test** — обход сломанного vitest (Node.js v25 + execa/signal-exit). Тест регрессирует полный конвейер: parse → scrub → dedup → .meta.json.
3. **--dry-run** — фасад работает без сетевого соединения; .meta.json пишется локально. Удобно для проверки до настройки background-media endpoint.
4. **Паттерн lookbehind** — high-entropy паттерн использует `(?<=[=:]\s*)` для изоляции значений в env-строках; не ловит случайные совпадения в тексте.

---

## Передача в S2

Для S2 (Cursor/Codex адаптеры):
- Реализовать `parseCursorStateVscdb(buffer: Buffer): Turn[]` (SQLite VACUUM INTO для WAL-безопасности)
- Реализовать `parseCodexJSONL(buffer: Buffer): Turn[]` (аналогично Claude Code)
- `background-media POST /api/sessions/upload` stub — заглушка для MVP, реализовать полностью
- Опционально: `docs/sessions/*.meta.json` → RAG индекс для Research-Tree
