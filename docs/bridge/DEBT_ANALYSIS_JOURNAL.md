# Журнал: ручной анализ долгов мостика по сути зубов мастерской

> Заведён 2026-07-25 по слову капитана. **Append-only** — каждый прогон дописывает раздел с датой.
> Долги попугая (`docs/bridge/DEBTS.md`) — плоский append-only ledger; у мастерской задач
> зубов на него **нет** (разные хранилища: `registry.json` vs `bridge/DEBTS.md`). Прогоняем
> пять линз мастерской РУКАМИ по долгам мостика; журнал → **спецификация недостающего
> инструмента** (`bridge`-ledger toolset). «Завод перед продукцией»: сначала руками, потом код.

## Метод — перенос сути зубов на ledger долгов

| Зуб мастерской | На реестре задач | Перенос на долги мостика |
|---|---|---|
| `tasks:decompose --by` | раскладка по осям | долги по теме / возрасту / статусу |
| `task:inspect` | карточка детально | долг детально |
| `task:validate` | уровни валидности | claim и вещдок ещё верны? file/line-ref жив? |
| `task:invariants` | целостность реестра | дубли / противоречия / перекрытия / id-гигиена |
| `tasks:audit` | сверка с main по свидетельствам | долг уже погашен по факту кода на main? |

---

## Прогон 2026-07-25 (14 долгов: 13 open + 1 settled)

### 1. Decompose — по теме (ось, которой у ledger нет)

| Тема | id долгов |
|---|---|
| **Каналы / LLM** | anthropic-limit-aug1 · codereview-single-provider · ritual-llm-channel-bypass |
| **Секрет-скан** | gitleaks-absent (settled) · gitleaks-allowlist |
| **Гигиена / ветки** | align-wip-snapshots |
| **Реестр-синк / cowork** | cowork-phase5-no-autoclose |
| **Инфра / office** | office-unstable-933 |
| **Сны / ночь** | dreams-tail-746 |
| **Формат ласточки** | swallow-format-918 |
| **Генератор стратегии** | plan-wire-592 |
| **Ship-guard** | ship-guard-924-925 |
| **Research / insight** | research-jargon |
| **Цикл мостика** | bridge-open-two-days |

### 1b. Decompose — по возрасту / статусу

- **22.07 (3 дня, «застарелые»):** dreams-tail-746, office-unstable-933, plan-wire-592, swallow-format-918, ship-guard-924-925, research-jargon, anthropic-limit-aug1, codereview-single-provider, gitleaks-allowlist.
- **24.07 (1 день):** ritual-llm-channel-bypass, align-wip-snapshots, bridge-open-two-days, cowork-phase5-no-autoclose.
- **settled:** gitleaks-absent (22.07).

### 2. Inspect + Validate + Audit — по-долгово (вердикт)

| id | validate | audit (сверка с main) | вердикт |
|---|---|---|---|
| **codereview-single-provider** | ✗ **file-ref мёртв** — `anthropicPost` в code-review.mjs 0 совпадений | **РЕШЁН**: ходит через `invokeProcedureLlm` (цепочка), ночь налила фолбэк deepseek/xai в defaults | **SETTLE** |
| **ritual-llm-channel-bypass** | частично верен | стадии ритуала (preflight/strategy-day/standup/main-day-issue) **зарегистрированы** процедурами с фолбэком; но overlay `code-review` и канал `ritual-main-day-issue` **пусты** (утро 25.07) | **ПЕРЕФОРМУЛИРОВАТЬ** → «overlay вечерних процедур + канал main-day-issue без рабочего звена» |
| **swallow-format-918** | claim сузился | **ручная** ласточка 25.07 ушла 5-блочным зеркалом (по слову владельца); авто-дайджест всё ещё телеграфный | **ПЕРЕФОРМУЛИРОВАТЬ** → сузить до авто-дайджеста |
| **bridge-open-two-days** | верен | корень найден: вечерний `close` 24.07 лёг на ADR-ветку и **откатился при reset на origin/main** — на main мостик не закрывался | **SETTLE после чистого цикла** (+ корень в профилактику) |
| **gitleaks-allowlist** | верен | `.gitleaks.toml` **не существует** (Glob 0) | **HOLD** (жив) |
| **anthropic-limit-aug1** | верен | внешний лимит до 01.08 | **HOLD** (time-bound) |
| dreams-tail-746 | не сверено | audit по коду не проведён | **HOLD** · audit-открыт |
| office-unstable-933 | не сверено | требует health-пробы office | **HOLD** · audit-открыт |
| plan-wire-592 | не сверено | strategy-day сегодня писал файл — сверить, замкнут ли провод | **HOLD** · audit-открыт |
| ship-guard-924-925 | не сверено | — | **HOLD** · audit-открыт |
| research-jargon | не сверено | — | **HOLD** · audit-открыт |
| align-wip-snapshots | верен | 6 WIP-снимков ждут T11-раскладки | **HOLD** (жив) |
| cowork-phase5-no-autoclose | верен | ретайр 24.07 был ручной — автозакрытия нет | **HOLD** (жив) |

### 3. Invariants — целостность ledger (что нашла линза)

- **Кластер, а не три независимых:** `anthropic-limit-aug1` ⊂ `codereview-single-provider` ⊂ `ritual-llm-channel-bypass` — три долга об одном канальном узле разной гранулярности. Ledger не видит перекрытий → счётчик «13» завышает независимость.
- **Стейл-claim без проверки:** `codereview-single-provider` цитирует `code-review.mjs:160 anthropicPost` — строки нет; **file/line-ref никто не валидирует**, долг тихо протух.
- **Нет полей `theme`/`severity`** → decompose пришлось делать глазами.
- **Только `add | settle`** — нет глагола «переформулировать/superseded». Стейл-долг (ritual-llm-channel-bypass, swallow-format-918) приходится гасить И заводить заново, **теряя нить** между старой и новой формулировкой.

### 4. Tooling-needs — спецификация (ради чего журнал)

| Инструмент | Зеркало зуба | Что делает |
|---|---|---|
| `bridge debt decompose --by theme\|age\|status` | tasks:decompose | раскладка долгов по оси (нужен конфиг тем, как prefix→category) |
| `bridge debt validate` | task:validate | file/line-refs живы; claim не старше N дней без касания → флаг «протух» |
| `bridge debt invariants` | task:invariants | дубли / кластеры / перекрытия по теме; id-гигиена |
| `bridge debt audit` | tasks:audit | сверка вещдока каждого долга с main (7 сегодня — `audit-открыт`) |
| поля `theme`, `severity`, `supersededBy` | — | структура вместо вольного текста |
| глагол `bridge debt amend`/`supersede --id --to` | — | переформулировать с сохранением нити (не settle+add) |

### 5. Итог прогона (к ledger — по слову капитана)

- **SETTLE (решён по факту):** `codereview-single-provider`.
- **ПЕРЕФОРМУЛИРОВАТЬ:** `ritual-llm-channel-bypass`, `swallow-format-918`.
- **SETTLE после чистого цикла + корень:** `bridge-open-two-days`.
- **HOLD (жив):** anthropic-limit-aug1, gitleaks-allowlist, align-wip-snapshots, cowork-phase5-no-autoclose.
- **HOLD · audit-открыт (нужна сверка по коду — это и есть заказ на `bridge debt audit`):** dreams-tail-746, office-unstable-933, plan-wire-592, ship-guard-924-925, research-jargon.

> Итог метода: из 13 «живых» долгов **1 мёртв по факту, 2 устарели формулировкой, 1 кластер из 3** —
> то есть честное число активных ближе к **8–9**, а не 13. Ровно это и должен считать
> `bridge debt invariants`/`audit`, чтобы попугай не завышал завал.
