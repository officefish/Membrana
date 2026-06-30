# Research: Архивация AI-сессий — операционный слой (Фаза 0 → Фаза 1)

> Источник: INSIGHT_2026-06-30_SESSIONS_ARCHIVE_RESCUE.md · 2026-06-30  
> Статус: **adopted** — принято консилиумом 2026-06-30  
> Уточняет: [`insight-sessions-archive`](../insight-sessions-archive/RESEARCH.md) (архитектура холодного архива, 2026-06-28)

---

## Q1 — Топология системы

**Центральная формализация:**

```
коллектор (Windows, где кэш) → транспорт → приёмник-архив (VDS)
```

Сессии лежат на Windows-машине; background-office на Timeweb VDS (Linux). Ночной процесс «смотрит в кэш каждой среды» физически не может крутиться на VDS. Это контракт, а не деталь.

---

## Q2 — Угрозная модель (калибрована, неравномерна)

| Инструмент | Угроза | Приоритет |
|---|---|---|
| **Claude Code** | `cleanupPeriodDays = 30` (дефолт); сессии реально удаляются | **Критический — сегодня** |
| **Cursor** | Потеря при обновлении; формат менялся трижды; `state.vscdb` открытая SQLite | Средний |
| **Codex** | Сжатие в `.jsonl.zst`; не удаление | Низкий |

**Вывод:** срочность точна именно для Claude Code. `cleanupPeriodDays` в `~/.claude/settings.json` требует немедленного увеличения.

---

## Q3 — Фазы решения

### Фаза 0 — остановить кровотечение (без сервиса)

1. Поднять `cleanupPeriodDays` в `~/.claude/settings.json`
2. Холодный снимок сырых байтов — без парсинга, нормализации, скраба
3. Cursor/Codex закрыть перед копированием (WAL-режим SQLite)

### Фаза 1 — собственный архив

- Приёмник — **отдельный сервис `background-sessions`** (не в background-office: office = stateless интеграции)
- Скруб секретов — блокирующее условие, не фича
- Конвейер: `читатели трёх форматов → нейтральный Session → скруб → холодный лог + индекс`
- Хранилище: append-only cold log + индекс; **триггер PostgreSQL — конкурентная запись, не объём**
- Связка сессия→коммит: вероятностная корреляция с оценкой уверенности

---

## Q4 — Решения консилиума (2026-06-30)

| Вопрос | Решение |
|---|---|
| Где хранить | Метаданные в `docs/sessions/*.meta.json` (репо), JSONL на S3/localdisk в `background-media` |
| Когда архивировать | `yarn ritual:evening` → `yarn archive:session [uuid]` |
| Первый адаптер | Claude Code JSONL; Cursor/Codex — C3 RAG-этап |
| Скруб | `SECRET_PATTERNS` в `@membrana/core`: `sk-ant-`, `ghp_`, `lin_api_`, high-entropy хвосты |
| Дедуп | Per-turn hash после скруба; уже архивированный turn — skip |
| Incomplete | `isIncomplete: true` в `.meta.json`; не в основной журнал |
| Корреляция audio | `correlatedAudioSegment: { startMs, endMs }` — детали в отдельном консилиуме |
| Cabinet UI | Отложена до Membrane Platform v2 |

---

## Q5 — Проверенные пути (Windows; верифицировано 2026-06-30)

| Инструмент | Пути |
|---|---|
| **Claude Code** | `%USERPROFILE%\.claude\projects\<кодированный-путь>\<session-uuid>.jsonl`; история `%USERPROFILE%\.claude\history.jsonl`; ретенция `cleanupPeriodDays` в `settings.json` |
| **Cursor** | `%APPDATA%\Cursor\User\workspaceStorage\*\state.vscdb` (`ItemTable`); `globalStorage\state.vscdb` (`composerData:<id>`); `%USERPROFILE%\.cursor\chats\*\store.db`, `agent-transcripts\*.jsonl` |
| **Codex** | `%USERPROFILE%\.codex\sessions\YYYY\MM\DD\rollout-*.jsonl`; `history.jsonl`; `state_5.sqlite` (≥0.128) |

---

## Не-цели (явно)

- Не строим Research-Tree — только архив, который его позже питает
- Не нормализуем в Фазе 0
- Не пишем «вечный» парсер: читатели изолированы по одному файлу на инструмент
- Не реализуем поиск/UI/экспорт в этой итерации

---

*Консилиум: [`docs/seanses/sessions-archive-rescue-2026-06-30-2026-06-30.md`](../../seanses/sessions-archive-rescue-2026-06-30-2026-06-30.md)*
