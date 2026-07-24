<!-- канал: secretary (offline, #469 ti-2) — протокол написан в IDE-чате, LLM не вызывался -->
<!-- валидация канона: реплик 21, роли Teamlead:4 Структурщик:5 Математик:4 Музыкант:4 Верстальщик:4 -->
# Метаданные сеанса

| Поле | Значение |
|------|----------|
| Дата (UTC) | 2026-07-23T06:05:00.000Z |
| Канал | secretary |
| Повестка | `docs/meeting/llm-procedure-channels/AGENDA_M4A.md` |
| Заседание | `llm-procedure-channels` · M4a |

**Вопрос:**

U1 — Как локальный агент доставляет события usage на office?

---

# Консилиум: U1 — доклад usage с локального агента

**Повестка:** Sync POST vs batch flush vs только office-proxy LLM vs opt-in. Список посылок обязателен.

**Участники:** Teamlead, Структурщик, Математик, Музыкант, Верстальщик.

---

[Структурщик]: T1 уже: best-effort emit, store на office. U1 — **транспорт клиента**. Кандидат 3 (все LLM через office proxy) — отдельный эпик, не v1. Кандидат 2 (JSONL+flush) добавляет забытый flush — дыра учёта. Кандидат 1 ближе.

[Teamlead]: Sync POST из transport после каждой попытки (F1). Token: тот же контур, что office API для агента (существующий INTERNAL/PANEL pattern — реализация в спринте). Env `LLM_USAGE_EMIT=0` — **opt-out**, по умолчанию **вкл** для meters-процедур; иначе «забыли включить» = пустая панель. Отвергаю candidate 4 как default-off.

[Математик]: Клиент: `emitUsage(event) → POST /v1/llm-usage/events` timeout короткий (например 2s); catch → stderr warn; не throw. Идемпотентность: клиентский `eventId` uuid на попытку — сервер dedupe.

[Музыкант]: Флаг worktree без OFFICE URL: emit no-op warn once — не спамить. Не писать события в git.

[Верстальщик]: Панель не зависит от flush-ритуала человека. Sync = данные появляются сразу после code-review — витрина живая.

[Структурщик]: Batch flush оставить как **опциональный** recovery tool later, не v1 must. v1 = sync only.

[Teamlead]: Auth не изобретаем: переиспользовать office service token / agent credential из уже принятых деплоев panel/office. Не класть long-lived key в клиентский бандл — только server-side scripts env.

[Математик]: Инвариант: emit path не читает и не шлёт prompt/body.

[Музыкант]: Принимаю sync + default on + opt-out + uuid dedupe.

[Верстальщик]: Принимаю. Индикатор «usage unreachable» в stderr достаточно для v1.

[Структурщик]: Отвергаем office-proxy-all-LLM и default-off.

[Teamlead]: Голосуем пакет sync POST?

[Структурщик]: Принимаю.

[Математик]: Принимаю.

[Музыкант]: Принимаю.

[Верстальщик]: Принимаю.

[Teamlead]: Зафиксировано.

[Структурщик]: Отложено: offline queue JSONL.

[Математик]: Retry queue — backlog.

[Музыкант]: Не логировать token в warn.

[Верстальщик]: Счётчик «events dropped» в day summary — комната V1.

---

## Итоговое решение консилиума

| Вопрос | Решение |
|--------|---------|
| Транспорт v1 | **Sync HTTPS POST** каждого события из ritual transport сразу после попытки. |
| Default | Emit **включён** для meters-процедур; `LLM_USAGE_EMIT=0` = opt-out. |
| Failure | Best-effort (T1): timeout/401 → warn, процедура не падает. |
| Dedupe | Клиентский `eventId` (uuid). |
| Отвергнуто | Обязательный batch-flush как единственный путь; все LLM через office proxy; default-off. |
| Отложено | Offline JSONL queue / yarn flush. |

**Definition of Done (только U1):** транспорт/default/failure названы; не UI.

## Список посылок

- **факт** — T1: office store, best-effort emit, поля события.
- **факт** — F1: несколько попыток = несколько событий.
- **факт** — C1: агент уже pull/push к office для overlay.
- **факт** — Агенты на Windows/worktree; office иногда недоступен.
- **норма** — Учёт не валит code-review/consilium.
- **норма** — M4a не проектирует UI панели.

---

*Реплик в диалоге: 21; каждый участник высказался не менее одного раза.*
