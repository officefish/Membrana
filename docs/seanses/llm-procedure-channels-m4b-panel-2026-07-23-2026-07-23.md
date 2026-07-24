<!-- канал: secretary (offline, #469 ti-2) — протокол написан в IDE-чате, LLM не вызывался -->
<!-- валидация канона: реплик 21, роли Teamlead:4 Структурщик:5 Математик:4 Музыкант:4 Верстальщик:4 -->
# Метаданные сеанса

| Поле | Значение |
|------|----------|
| Дата (UTC) | 2026-07-23T06:06:00.000Z |
| Канал | secretary |
| Повестка | `docs/meeting/llm-procedure-channels/AGENDA_M4B.md` |
| Заседание | `llm-procedure-channels` · M4b |

**Вопрос:**

V1 — Какой минимальный UI/API поверхности панели v1 для каналов и учёта?

---

# Консилиум: V1 — панель mmbrn.tech

**Повестка:** Host, grant, минимальные экраны vs read-only. Список посылок обязателен.

**Участники:** Teamlead, Структурщик, Математик, Музыкант, Верстальщик.

---

[Структурщик]: BRIEF: админ **управляет** каналом — кандидат 3 (read-only v1) прямо противоречит. Кандидат 2 (новый SPA) — лишний host. Кандидат 1: раздел в `apps/panel` на panel.mmbrn.tech.

[Teamlead]: Owner grant (существующий panel auth) для write overlay + просмотр полной экономики. Operator может read summary — optional; ally — только грубые агрегаты без chain editor (кандидат 4 частично). v1 must: owner write. Не блокируем v1 на ally-политике — минимально owner-only страница.

[Математик]: API поверхности (office): уже C1 putOverlay/getEffective + T1 day aggregate + events. Панель — тонкий клиент. Страница: (1) day summary cards; (2) table procedures in routing scope; (3) chain editor; (4) badge source на effective.

[Музыкант]: Флаг read-only: тумблер-муляж хуже отсутствия UI. Лучше owner-only write сразу. Мёртвая дверь = read-only «управление».

[Верстальщик]: Визуал v1: одна страница, не дашборд из десяти виджетов. Список из двух процедур (S1). Цепочка — упорядоченный multi-select provider enum (X1). Сводка: count, tokensΣ, by provider, errors rate_limit.

[Структурщик]: Не отдельный subdomain. Не cabinet. apps/panel + office `/v1/llm-*`.

[Teamlead]: Ally/operator матрица: v1 = **owner-only** route `@Owner()`. Расширение ролей — follow-up, не блокер.

[Математик]: Инвариант: UI не хранит секреты ключей; только channel chain.

[Музыкант]: Принимаю 1 + owner-only. Отвергаю 3.

[Верстальщик]: Принимаю. Пустой день — честный empty state, не демо-цифры.

[Структурщик]: Сводка: раздел panel, owner write, summary+chain.

[Teamlead]: Голосуем?

[Структурщик]: Принимаю.

[Математик]: Принимаю.

[Музыкант]: Принимаю.

[Верстальщик]: Принимаю.

[Teamlead]: Зафиксировано.

[Структурщик]: Отложено: ally view, realtime websocket.

[Математик]: Deep links на event id — backlog.

[Музыкант]: Не показывать raw error bodies.

[Верстальщик]: Навигация: пункт shell «LLM» рядом с существующими бордами.

---

## Итоговое решение консилиума

| Вопрос | Решение |
|--------|---------|
| Host | **panel.mmbrn.tech** / раздел в существующем `apps/panel` (не новый SPA, не cabinet). |
| Auth v1 | **Owner-only** write+full read; расширение ролей later. |
| UI v1 | Одна страница: сводка дня + таблица процедур (routing scope) + редактор `chain` + badge `source`. |
| API | Тонкий клиент к office (overlay + usage) из C1/T1/F1. |
| Отвергнуто | Read-only v1; отдельный subdomain SPA. |
| Отложено | Ally/operator матрица; realtime. |

**Definition of Done (только V1):** host/auth/min UI названы; не пересмотр SoT/полей.

## Список посылок

- **факт** — BRIEF: панель mmbrn.tech + админ переключает канал + учёт.
- **факт** — office-panel-contour закрыт; panel.mmbrn.tech жив с owner auth.
- **факт** — C1 write overlay; T1 aggregates; F1 chain; S1 две процедуры.
- **норма** — Read-only не выполняет BRIEF «управлять».
- **норма** — M4b не меняет SoT и поля телеметрии.

---

*Реплик в диалоге: 21; каждый участник высказался не менее одного раза.*
