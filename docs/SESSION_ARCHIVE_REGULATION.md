# Session Archive Regulation

> Принято: 2026-06-30  
> Консилиум: [`docs/seanses/sessions-archive-rescue-2026-06-30-2026-06-30.md`](./seanses/sessions-archive-rescue-2026-06-30-2026-06-30.md)  
> Инсайт: [`docs/insights/insight-sessions-archive-rescue/RESEARCH.md`](./insights/insight-sessions-archive-rescue/RESEARCH.md)

## Когда архивировать

- **Автоматически:** `yarn ritual:evening` вызывает `yarn archive:session` без аргументов — архивирует все непроиндексированные сессии текущего дня
- **Вручную:** `yarn archive:session --uuid <uuid>` — конкретная сессия
- **Dry-run:** `yarn archive:session --dry-run` — создаёт `.meta.json` локально, не отправляет POST

## Формат .meta.json

Файл `docs/sessions/<uuid>.meta.json` создаётся в репо:

```json
{
  "sessionId": "<uuid>",
  "tool": "claude-code",
  "projectPath": "<абсолютный путь или кодированное имя>",
  "branch": "<git branch при архивации>",
  "openedAt": "<ISO 8601>",
  "closedAt": "<ISO 8601 | null>",
  "turnCount": 42,
  "secretsRedacted": 3,
  "deduplicatedTurns": 1,
  "isIncomplete": false,
  "archiveRef": "<uuid на стороне background-media | null>",
  "correlatedAudioSegment": null
}
```

Поле `correlatedAudioSegment` зарезервировано для консилиума C2 (корреляция с аудиозаписями).

## Как связать с веткой / commit / Issue

- `branch` берётся из `git rev-parse --abbrev-ref HEAD` в момент архивации
- `archiveRef` — UUID, возвращённый `POST /api/sessions/upload` в background-media
- Связь сессия→коммит — вероятностная (временная корреляция), не детерминированная

## Lifecycle incomplete сессий

Если IDE упала или сессия не завершилась штатно (нет `closedAt`):

- Сессия всё равно архивируется с `isIncomplete: true`
- Она **не попадает в основной журнал** `yarn list:sessions` (только с флагом `--all`)
- Используется только для отладки

## Скруб секретов

Все секреты скрубятся **до** дедупликации и **до** отправки на VDS.  
Паттерны в `@membrana/core/SECRET_PATTERNS.ts`: `sk-ant-`, `ghp_`, `github_pat_`, `lin_api_`, Bearer-токены, high-entropy значения (≥20 символов base64/hex после `=`).  
Замена: `[REDACTED]`. Хеш turn'а вычисляется по скрублированному тексту.

## Что НЕ архивируется

- Сырые байты Claude Code JSONL с секретами на VDS (только скрублированный нормализованный слой)
- Cursor/Codex сессии до S2
- Аудиозаписи (хранятся в background-media отдельным маршрутом)

## CLI-команды

```bash
yarn archive:session             # архивировать все сессии текущего дня
yarn archive:session --uuid X    # конкретная сессия
yarn archive:session --dry-run   # только .meta.json, без POST
yarn list:sessions               # таблица архивированных сессий
yarn list:sessions --all         # включая incomplete
yarn inspect:session <uuid>      # JSONL preview (скрублированный)
```
