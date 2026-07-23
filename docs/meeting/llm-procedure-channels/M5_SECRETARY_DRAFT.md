# Метаданные сеанса

| Поле | Значение |
|------|----------|
| Дата (UTC) | 2026-07-23T06:12:00.000Z |
| Канал | secretary |
| Повестка | `docs/meeting/llm-procedure-channels/AGENDA_M5.md` |
| Заседание | `llm-procedure-channels` · M5 |

**Вопрос:**

R1 — Что обязательно до первой строки кода спринта и что есть DoD эпика v1?

---

# Консилиум: R1 — готовность к спринту исполнения

**Повестка:** Нарезка фаз, must-before-code, DoD v1, out-of-scope. Не пересматривать P1…V1. Список посылок обязателен.

**Участники:** Teamlead, Структурщик, Математик, Музыкант, Верстальщик.

---

[Структурщик]: Все вердикты на столе. Кандидат 3 (panel-first) ломает C1. Кандидат 4 (cowork) не нужен — один контур. Между 1 и 2: вертикальный срез (1) быстрее доказывает ship, слои (2) яснее для PR. Нужен гибрид: слои как фазы эпика, но первый green = code-review на openrouter end-to-end.

[Teamlead]: Must до кода: (1) карточка эпика+фаз в registry / GitHub; (2) EPIC заседания ратифицирован владельцем; (3) отдельный аудитор хотя бы post-hoc на контейнер — желательно, не блокер старта кода если владелец жмёт. DoD v1 продукта: code-review и consilium читают effective chain, emit usage, owner меняет chain на panel, day summary видна.

[Математик]: Фазы эпика (кандидат 2 уточнённый):
- **A** lib: `llm-procedures.json`, defaults, provider catalog, `resolveChannel`, transport+chain+emit stubs.
- **B** wire: `code-review.mjs` + `consilium.mjs` на resolve/chain/emit.
- **C** office: overlay + usage ingest/aggregate API.
- **D** panel: owner page summary+chain editor.
Критерий старта B: A зелёный unit-тестами. Старт C∥D после контракта OpenAPI/схемы из A. Первый user-visible: B с git defaults (без overlay) допустим; полный BRIEF = A–D.

[Музыкант]: Флаг: не объявлять «панель готова», пока emit пустой — тишина на слух. DoD v1 требует хотя бы один живой day summary после реального code-review.

[Верстальщик]: Для человека: чеклист ратификации EPIC = этот вердикт R1. Out of v1 витриной: ally roles, FreeModel, ollama unless in chain, auto-scan procedures, offline JSONL queue.

[Структурщик]: Перед кодом не обязательно реализовать office — но контракт полей событий и overlay schema зафиксировать в A (типы/JSON schema в lib). Иначе C разъедется.

[Teamlead]: Нарезка спринта day-sprint/epic: четыре фазы A–D; lead по зонам — ozhegov (A/B scripts), dynin (схемы/тесты), rodchenko (D), vesnin (C office+panel auth). Существо назначения — в OPEN спринта, здесь принцип.

[Математик]: Definition of Done эпика v1:
1. Registry+defaults в main.
2. code-review и consilium: resolve+chain+emit (opt-out работает).
3. Office: getEffective/putOverlay + POST events + day aggregate.
4. Panel owner page: summary + edit chain + source badge.
5. Ручной сценарий: сменить chain на openrouter → code-review проходит при мёртвом anthropic → событие на панели.

[Музыкант]: Принимаю A–D + сценарий 5 как несущий. Без 5 — фантом.

[Верстальщик]: Принимаю. EPIC.md таблица вердиктов + фазы.

[Структурщик]: Отвергаем panel-first и cowork.

[Teamlead]: Голосуем пакет R1?

[Структурщик]: Принимаю.

[Математик]: Принимаю.

[Музыкант]: Принимаю.

[Верстальщик]: Принимаю.

[Teamlead]: Зафиксировано. Заседание готово к сборке EPIC.

[Структурщик]: Аудитор контейнера — отдельная сессия после EPIC.

[Математик]: Регистрация task epic — шаг председателя после «ратифицирую» EPIC.

[Музыкант]: Не жечь Anthropic на прогоне приёмки — chain openrouter.

[Верстальщик]: Пустой empty state панели до первого события — ок.

---

## Итоговое решение консилиума

| Вопрос | Решение |
|--------|---------|
| Нарезка | Фазы **A→B→C→D** (lib → wire CR/consilium → office API → panel); первый user-visible возможен после B+defaults. |
| Must до кода | Ратификация EPIC владельцем; карточки эпика/фаз; JSON schema контрактов overlay/events в фазе A. |
| DoD эпика v1 | Пять пунктов Математика (registry, wire+emit, office API, panel page, ручной сценарий openrouter при мёртвом anthropic). |
| Out of v1 | Ally UI; FreeModel в enum; тихий ollama; auto-scan; offline flush queue; cowork. |
| Отвергнуто | Panel-first; обязательный полный office до любого wire. |

**Definition of Done (только R1):** фазы + DoD + must-before-code названы; вердикты P1…V1 не пересмотрены.

## Список посылок

- **факт** — Ратифицированы P1, S1, C1, X1, T1, F1, U1, V1 (слова владельца ок/да/дальше).
- **факт** — BRIEF: учёта + панель + админ-канал + CR/consilium.
- **факт** — Anthropic limits до ~01.08 — приёмочный сценарий на openrouter.
- **норма** — M5 только собирает план исполнения, не меняет существа вердиктов.
- **норма** — DoD без живого сценария 5 = риск фантома панели.

---

*Реплик в диалоге: 21; каждый участник высказался не менее одного раза.*
