<!-- канал: secretary (offline, #469 ti-2) — протокол написан в IDE-чате, LLM не вызывался -->
<!-- валидация канона: реплик 21, роли Teamlead:4 Структурщик:5 Математик:4 Музыкант:4 Верстальщик:4 -->
# Метаданные сеанса

| Поле | Значение |
|------|----------|
| Дата (UTC) | 2026-07-23T05:52:00.000Z |
| Канал | secretary |
| Повестка | `docs/meeting/llm-procedure-channels/AGENDA_M2B.md` |
| Заседание | `llm-procedure-channels` · M2b |

**Вопрос:**

C1 — Где живёт источник истины «процедура → канал» и кто его меняет?

---

# Консилиум: C1 — control plane / SoT маршрутов

**Повестка:** SoT git vs office vs только .env vs гибрид; правило конфликта; read path агента и write path админа v1. Не решать поля телеметрии, детальный fallback, UI-макет. Список посылок обязателен.

**Участники:** Teamlead, Структурщик, Математик, Музыкант, Верстальщик.

---

[Структурщик]: Владелец хочет **переключать канал с панели** — кандидат 1 (только git/PR) делает админа = merge, это не тумблер. Кандидат 3 (только .env) делает панель read-only по маршруту — прямо бьёт BRIEF. Остаются 2 (office SoT) и 4 (гибрид).

[Teamlead]: Cold start worktree без сети / office down — агент всё равно должен иметь default канал. Чистый office SoT (2) без git snapshot = стоп при 401/таймауте office. Гибрид 4: defaults в git, overlay в office, `.env` только ключи. Это бьёт и тумблер, и автономность.

[Математик]: Merge-правило: `effective(p) = overlay[p] ?? default[p] ?? builtinFail`. Overlay отсутствует → default. Локальный `.env` **не** задаёт channel (чтобы три worktree не разъехались молча). Секреты: `ANTHROPIC_API_KEY` / `OPENROUTER_API_KEY` в env; выбор provider/model для p — в overlay/default.

[Музыкант]: Флаг: если overlay в office, а агент не смог pull — играть default и **писать в usage**, что работал offline-default. Иначе тихая ложь «я на openrouter», а ключ anthropic. Честный provenance канала в событии — комната 2, но требование сюда: read path обязан вернуть `source: overlay|default`.

[Верстальщик]: Write path админа: panel → office `PUT/PATCH` маршрута procedure→channel (owner grant). Read path агента: `GET` effective map (или per-procedure) в начале code-review/consilium; кэш на процесс; timeout → default из git. Панель показывает effective + бейдж source.

[Структурщик]: Git defaults файл: рядом с реестром, напр. `scripts/lib/llm-procedure-defaults.json` `{ "code-review": { "provider": "anthropic", "model": "…" }, … }`. Не секреты. Overlay schema та же форма, хранение office DB/файл на VDS — существо реализации, не M2b.

[Teamlead]: Конфликт «человек поменял .env CHANNEL=»: **игнорировать** для выбора канала в v1; документировать. Иначе панель врёт. Исключение не вводим.

[Математик]: Кандидат 2 как чистый SoT отвергаю при office down: P(fail)>0 на MSK/VDS → весь вечерний ритуал красный. Гибрид снижает до fail-open default.

[Музыкант]: Принимаю 4. Ритм: сначала defaults+read git; overlay endpoint — второй вертикальный срез, но контракт C1 уже «overlay > default».

[Верстальщик]: Для v1 ship можно показать панель read-only usage + read effective; write overlay — must для BRIEF «управлять». Без write нет тумблера. DoD C1: write path назван.

[Структурщик]: Минимальный контракт v1: (1) git defaults; (2) office getEffective; (3) office putOverlay (owner); (4) агент resolveChannel(procedureId). Телеметрия отдельно.

[Teamlead]: Пакет гибрида 4 — голосуем?

[Структурщик]: Принимаю.

[Математик]: Принимаю.

[Музыкант]: Принимаю, с source в resolve.

[Верстальщик]: Принимаю.

[Teamlead]: Зафиксировано.

[Структурщик]: Отложено: мульти-tenant overlay, per-worktree overlay, UI-макет.

[Математик]: Инвариант: `.env` не содержит ключей выбора канала в v1.

[Музыкант]: Флаг office 401: не маскировать под «нет ключа модели».

[Верстальщик]: Бейдж на панели: Overlay / Default.

---

## Итоговое решение консилиума

| Вопрос | Решение |
|--------|---------|
| SoT | **Гибрид (кандидат 4)**: defaults в git; overlay процедура→канал в office; `.env` только секреты ключей, не выбор канала. |
| Конфликт | `effective = overlay ?? default ?? builtin-fail`; локальный CHANNEL в `.env` **игнорируется** в v1. |
| Read path агента | resolve в начале процедуры: pull effective (timeout/401 → git default); результат несёт `source: overlay\|default`. |
| Write path админа | panel (owner) → office mutate overlay; без write нет выполнения BRIEF. |
| Git | `llm-procedure-defaults.json` (или эквивалент рядом с реестром) — без секретов. |
| Отвергнуто | Только git/PR как единственный write (1); только office без default snapshot (2); только .env (3). |
| Отложено | per-worktree overlay; мульти-tenant; детальный UX панели. |

**Definition of Done (только C1):**
- Названы SoT, merge-правило, read/write path, роль `.env`.
- Не зафиксированы поля телеметрии, цепочка fallback, макет UI.

## Список посылок

- **факт** — BRIEF: админ на mmbrn.tech переключает канал процедуры; учёт запросов.
- **факт** — P1: git-реестр id; админ UI не порождает id в v1.
- **факт** — panel.mmbrn.tech + office auth owner уже существуют.
- **факт** — Агенты часто в sibling worktree; office иногда 401/таймаут (грабли AGENTS).
- **факт** — Секреты LLM уже разведены: `.env` vs `.env.llm-proxy`.
- **норма** — M2b не решает телеметрию/fallback details/UI (запреты повестки).
- **норма** — Cold start без сети не должен лишать default канала.

---

*Реплик в диалоге: 21; каждый участник высказался не менее одного раза.*
