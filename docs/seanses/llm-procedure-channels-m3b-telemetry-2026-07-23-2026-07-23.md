<!-- канал: secretary (offline, #469 ti-2) — протокол написан в IDE-чате, LLM не вызывался -->
<!-- валидация канона: реплик 21, роли Teamlead:4 Структурщик:5 Математик:4 Музыкант:4 Верстальщик:4 -->
# Метаданные сеанса

| Поле | Значение |
|------|----------|
| Дата (UTC) | 2026-07-23T05:56:00.000Z |
| Канал | secretary |
| Повестка | `docs/meeting/llm-procedure-channels/AGENDA_M3B.md` |
| Заседание | `llm-procedure-channels` · M3b |

**Вопрос:**

T1 — Какова модель события учёта LLM-вызова и где она хранится?

---

# Консилиум: T1 — телеметрия вызова

**Повестка:** Поля события, store, retention, запрет тела промпта. Список посылок обязателен.

**Участники:** Teamlead, Структурщик, Математик, Музыкант, Верстальщик.

---

[Структурщик]: BRIEF хочет «сколько запросов, какие API, токен-экономика» — это **per-call или суточные агрегаты**. Кандидат 3 (только агрегаты) убивает разбор «какой вызов сжёг лимит». Кандидат 4 (git JSONL) — секреты/шум в репо, нет. База: событие на office.

[Teamlead]: Беру поля кандидата 1 + `promptHash` опционально из 2 без хранения тела. Retention: 30 дней для v1 (кандидат 1); 90 — later. Сырой промпт/ключ — никогда в store.

[Математик]: Событие v1: `{id, ts, procedureId, provider, model, source, tokensIn, tokensOut, latencyMs, ok, errorClass?}`. `promptHash` — optional later, не блокер v1. Агрегат дня = GROUP BY procedureId, provider на store. Emit: после HTTP ответа transport (success или fail).

[Музыкант]: Флаг: без `source` (overlay|default) снова тихая ложь канала — C1 уже требует. tokens неизвестны (некоторые API) → null, не ноль. Ноль врёт об экономике.

[Верстальщик]: Панель читает агрегаты + last N events; контракт GET `/v1/llm-usage/day?date=`. Не рисуем UX здесь — только что данные существуют на office.

[Структурщик]: Агент POST event best-effort: fail emit не валит code-review (warn + local skip). Иначе учёт сломает ship. Инвариант: процедура > meters.

[Teamlead]: Git не store. Office persist. Auth: тот же office token / agent credential что overlay read — детали реализации спринта, принцип: не публичный ingest.

[Математик]: errorClass enum грубый: `auth|rate_limit|timeout|protocol|unknown` — без тела ответа провайдера.

[Музыкант]: Принимаю 1 с null-токенами и source. Не 3.

[Верстальщик]: Принимаю. Сводка дня = Σ tokens, count, by provider.

[Структурщик]: Отвергаем git JSONL и aggregate-only.

[Teamlead]: Голосуем пакет: поля∪office∪30d∪no prompt∪best-effort emit?

[Структурщик]: Принимаю.

[Математик]: Принимаю.

[Музыкант]: Принимаю.

[Верстальщик]: Принимаю.

[Teamlead]: Зафиксировано.

[Структурщик]: promptHash — backlog, не v1 must.

[Математик]: Предикат: ни один stored field не содержит raw key/prompt.

[Музыкант]: Флаг rate_limit class обязателен — наш эпизод 22.07.

[Верстальщик]: Бейдж экономики на панели из агрегатов, не из git.

---

## Итоговое решение консилиума

| Вопрос | Решение |
|--------|---------|
| Модель | Per-call событие на **office**; не git; не aggregate-only. |
| Поля v1 | `ts, procedureId, provider, model, source, tokensIn?, tokensOut?, latencyMs, ok, errorClass?` (`tokens*` nullable). |
| Запрет | Сырой промпт, ключи, полные тела ответов — не хранить. |
| Retention | **30 дней** v1. |
| Emit | Best-effort после вызова; сбой emit ≠ fail процедуры. |
| Агрегаты | Считаются из событий (день × procedure × provider). |
| Отложено | promptHash; 90d retention; realtime stream. |

**Definition of Done (только T1):** модель/store/retention/запреты названы; не UI.

## Список посылок

- **факт** — BRIEF: учёт запросов, API, токен-экономика за день.
- **факт** — C1: `source` overlay|default на resolve.
- **факт** — 22.07 usage limits / rate — нужен errorClass.
- **факт** — S1: meters на code-review и consilium.
- **норма** — Учёт не должен валить ship (best-effort emit).
- **норма** — M3b не проектирует UI и fallback policy.

---

*Реплик в диалоге: 21; каждый участник высказался не менее одного раза.*
