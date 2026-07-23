# Метаданные сеанса

| Поле | Значение |
|------|----------|
| Дата (UTC) | 2026-07-23T05:55:00.000Z |
| Канал | secretary |
| Повестка | `docs/meeting/llm-procedure-channels/AGENDA_M3A.md` |
| Заседание | `llm-procedure-channels` · M3a |

**Вопрос:**

X1 — Как стыкуется experimental llm-proxy с ритуальным контуром каналов?

---

# Консилиум: X1 — шов llm-proxy

**Повестка:** Поглотить experimental в ритуал, thin-registry рядом, deprecated `.env.llm-proxy`, или только OpenRouter в v1. Список посылок обязателен.

**Участники:** Teamlead, Структурщик, Математик, Музыкант, Верстальщик.

---

[Структурщик]: C1 уже сказал: `.env` = секреты, не канал. `.env.llm-proxy` сегодня — файл секретов OpenRouter/FreeModel. Вопрос X1 — **код и канон файла**, не overlay. Кандидат 1 (ритуал импортит experimental) тащит песочницу в hot path ритуала — плохая граница пакетов scripts.

[Teamlead]: Скилл opencode-proxy сознательно отрезал experimental от ритуала. Ломать это поглощением (1) = смешать эксперимент и вечерний гейт. Кандидат 2: ритуал — свой thin provider map в `scripts/lib/`; ключи могут читаться из того же `.env.llm-proxy` (или корневого с теми же именами); experimental живёт для ask/smoke. Беру 2.

[Математик]: Разделяю `Secrets` и `ProviderCatalog`. Secrets ∈ env files. Catalog ритуала ⊆ lib, стабильный subset (anthropic, openrouter; freemodel — optional flag). Experimental catalog может быть ⊇; ритуал не import path `scripts/experimental/**`.

[Музыкант]: Флаг кандидата 3 (всё в один `.env`): снова смешаем ритуальные и proxy ключи в одном файле worktree — уже жгло office token. Два файла ок, если имена ключей совпадают (`OPENROUTER_API_KEY`). Не deprecated.

[Верстальщик]: Для панели провайдеры — enum из ritual catalog, не весь experimental JSON. Иначе тумблер покажет FreeModel, которого v1 resolve не обещает.

[Структурщик]: Кандидат 4 (только OpenRouter): сужает без нужды — anthropic остаётся default в git defaults. FreeModel не обязан в v1 routing enum; ключ может лежать unused.

[Teamlead]: v1 provider enum ритуала: `anthropic | openrouter` (+ later). FreeModel не в overlay UI v1. Experimental skill текст обновить: «ключи можно шарить; code-review/consilium не зовут experimental entrypoints».

[Математик]: Инвариант CI: `code-review.mjs` / `consilium.mjs` не содержат `scripts/experimental` в import graph.

[Музыкант]: Принимаю 2. Песочница остаётся для ручных ask — не глушим.

[Верстальщик]: Принимаю 2. Документ `.env.llm-proxy.example` — канон имён ключей для обоих контуров.

[Структурщик]: Сводка: вердикт кандидат 2 + enum anthropic|openrouter в v1.

[Teamlead]: Голосуем?

[Структурщик]: Принимаю.

[Математик]: Принимаю.

[Музыкант]: Принимаю.

[Верстальщик]: Принимаю.

[Teamlead]: Зафиксировано.

[Структурщик]: Отложено: перенос experimental в packages/, удаление FreeModel.

[Математик]: Предикат later: yarn script test на запрет import experimental из ritual entry.

[Музыкант]: Флаг: не логировать ключи при resolve.

[Верстальщик]: В панели список провайдеров = ritual enum.

---

## Итоговое решение консилиума

| Вопрос | Решение |
|--------|---------|
| Шов | **Кандидат 2**: thin provider catalog в `scripts/lib/` для ритуала; experimental не импортируется из code-review/consilium. |
| Секреты | `.env.llm-proxy` (и/или те же имена в корневом `.env`) — канон ключей OpenRouter; не deprecated. |
| Enum v1 | `anthropic \| openrouter` в overlay/defaults; FreeModel не в UI/routing v1. |
| Experimental | Остаётся для ask/smoke; скилл уточнить «не entrypoint ритуала». |
| Отвергнуто | Поглощение experimental (1); слияние всего в один `.env` как единственный канон (3); только OpenRouter без anthropic (4). |

**Definition of Done (только X1):** шов кода/секретов/enum назван; не телеметрия/UI/fallback chain.

## Список посылок

- **факт** — C1: `.env` не выбирает канал; секреты отдельно от overlay.
- **факт** — Существуют `scripts/experimental/llm-providers.json` и `.env.llm-proxy`.
- **факт** — Скилл opencode-proxy запрещает use для code-review/ritual.
- **факт** — S1: v1 routing = code-review, consilium.
- **норма** — Ритуал не зависит от experimental import graph.
- **норма** — M3a не проектирует телеметрию и fallback chain.

---

*Реплик в диалоге: 21; каждый участник высказался не менее одного раза.*
