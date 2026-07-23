# docs/audit/llm-calls — дом доказательств LLM-вызовов

Дом группы **гранул evidence** вызовов LLM-процедур (LPC): подлинность + параметры,
без сырых тел prompt/response. Реализация
[`GROUP_CONTAINERIZATION`](../../patterns/GROUP_CONTAINERIZATION.md).
Эпик: `llm-calls-house` ([#1033](https://github.com/officefish/Membrana/issues/1033)) ·
инстанс [`llm-calls-house-2026-07-23`](../../day-sprint/llm-calls-house-2026-07-23/OPEN.md).

Канонический операторский промпт: [`AGENT_PROMPT.md`](./AGENT_PROMPT.md).

### Монитор → Mintlify (thin mirror, W4)

| | |
|---|---|
| **Истина** | **git** — этот дом (`docs/audit/llm-calls/`) |
| **Монитор** | Mintlify · [`apps/docs/llm-calls/`](../../../apps/docs/llm-calls/) · группа `LLM calls — evidence` в [`docs.json`](../../../apps/docs/docs.json) |
| **Глубина** | **thin mirror** — overview + зеркала specimens; **не** pin F4 |
| **Лемма** | Mintlify может отставать; сверка по git. Дом не переезжает. |

Страницы монитора:

| Страница | Путь |
|----------|------|
| Overview | [`apps/docs/llm-calls/overview.mdx`](../../../apps/docs/llm-calls/overview.mdx) |
| Specimen openrouter | [`apps/docs/llm-calls/specimen-cr-openrouter-001.mdx`](../../../apps/docs/llm-calls/specimen-cr-openrouter-001.mdx) |

**Мастерская** ([`HOME_WORKSHOP`](../../patterns/HOME_WORKSHOP.md)):
[`workshop.manifest.json`](./workshop.manifest.json) — `yarn llm-calls:audit` /
`yarn llm-calls:decompose`; `inspectElement` — ⚠ (агентный Scenario Inspect); `kit: null`.

## Разрешено / Запрещено

| | |
|---|---|
| **Разрешено писать** | `registry/LLM_CALLS_LIST.md` (overwrite), dated `analysis/`, курируемые `specimens/`, отчёты audit |
| **Разрешено коммитить** | markdown реестра/анализа/specimens, README, AGENT_PROMPT, workshop.manifest |
| **Запрещено** | сырой `prompt` / `rawResponse` / API keys / `.env` / полные тела в registry |
| **Кеш** | `cache/` — gitignore; сырые дампы агента, не истина |

## Источник истины

| Слой | Где |
|------|-----|
| Live сутки | office `llm-usage` (LPC) |
| Канон снимков / реестр доказательств | **этот дом** (git) |
| Канал процедуры (overlay) | office LPC — **не** здесь |

## Чеклист GROUP_CONTAINERIZATION

1. ✅ Выделенный каталог `docs/audit/llm-calls/`.
2. ✅ README-контракт с таблицей разрешено/запрещено.
3. ✅ `registry/LLM_CALLS_LIST.md` overwrite + Meta (dated analysis опциональны).
4. ✅ `cache/` под gitignore (+ `.gitkeep`).
5. ✅ Инструменты `yarn llm-calls:audit|decompose|snapshot`.
6. ✅ `AGENT_PROMPT.md` + HARD GATE.
7. ✅ Массовые мутации — слово владельца.
8. ✅ Провода: `docs/audit/README.md`, паттерн GROUP, этот README.

## Чеклист HOME_WORKSHOP

1. ✅ `workshop.manifest.json` с полями `pattern`/`name`/`worksOn`(1)/`verbs`/`kit`.
2. ✅ `worksOn` = `docs/audit/llm-calls`.
3. ✅ `audit` и `decompose` присутствуют; `inspectElement` — ⚠ (агентный Scenario Inspect).
4. ✅ Доменная раскладка по procedure/provider/ok/day не через стек-примитивы.
5. ✅ `kit: null`.
6. ✅ Доменных лишних tools нет (пока).
7. ✅ Отказы видимы (HARD GATE decompose без `--by`).
8. ✅ Провода: HOME_WORKSHOP таблица, этот README.

## Гранула (элемент)

Поля доказательного минимума: см. эпик-промпт и OPEN E1–E8
(`eventId`, provider/model, hashes, bytes, params, …). Сырые тела — никогда.
