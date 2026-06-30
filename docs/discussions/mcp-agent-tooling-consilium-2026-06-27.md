# Консилиум-материал: 4 агентных MCP-инструмента — оценка и спринт

> **Дата:** 2026-06-27
> **Тип:** материал для консилиума (вход для виртуальной команды + product)
> **Участники (ожидаемые):** Teamlead (Vesnin), Структурщик (Ozhegov), Математик (Dynin), Музыкант (Kuryokhin), Верстальщик (Rodchenko), product (пользователь)
> **Связь:** [`MCP_INTEGRATION_STRATEGY.md`](../MCP_INTEGRATION_STRATEGY.md) (тиры, §5), [`MCP_USAGE.md`](../MCP_USAGE.md) (fallback), [`VIRTUAL_TEAM_PROMPT.md`](../VIRTUAL_TEAM_PROMPT.md), [`TASK_PROMPT_WORKFLOW.md`](../prompts/TASK_PROMPT_WORKFLOW.md)
> **Цель консилиума:** решить, какие из 4 инструментов брать, в каком тире, в каком порядке; оформить day-sprint.

---

## Контекст

Оцениваем 4 внешних MCP/агентных инструмента на прямую пользу Membrana. Репозиторий — большой TS-монорепо (`@membrana/core` ↔ device-board ↔ client ↔ cabinet, gateway `board.*`/`runtime.*`, REST lease API), агентный стек (Cursor / Claude Code / opencode + LLM-прокси + freemodel), своя doc-RAG (`scripts/rag-evening-index.mjs`), реестр на 487 задач (`registry.json` ~9000 строк) и ритуалы дня.

Два недавних сигнала, релевантных оценке:

- **Стоимость/контекст:** агенты грепают весь репо; артефакты раздуты (`registry.json` 9000+ строк, `.sync-readme-out.txt` 96 КБ, `turbo-build.log`, `yarn logs:parse`, chain-logs, smoke-матрицы). На freemodel/прокси это бьёт по лимитам и качеству.
- **Память между сессиями:** инцидент `repo-leveling` Phase F-fix (оборванный ритуал поверх sealed-состояния; риск повтора ошибки агентом) и ручные `*_LESSONS.md` показывают спрос на «обучающуюся» память.

**Решения, которые консилиум должен зафиксировать,** — в таблице «Открытые вопросы» внизу.

---

## Досье инструментов (факты + фит)

### 1. codebase-memory-mcp — граф кода

| Поле | Значение |
|------|----------|
| Что | MCP-сервер: индексирует репо в персистентный граф (функции, классы, call-chains, **HTTP-routes, cross-service links**); tree-sitter AST + LSP-типизация |
| Языки | 158; TS/JS/TSX/Go/Rust/C++/… first-class через LSP |
| Профиль | Single static binary, zero-deps, offline; структурные запросы <1мс; ~120× меньше токенов |
| Лицензия | MIT · [репо](https://github.com/DeusData/codebase-memory-mcp) |
| Прямой фит | **Очень высокий.** Cross-service links + HTTP-routes ложатся на gateway/lease/node-realtime; «запрещённые импорты» из task-промптов можно верифицировать по графу; offline-binary совпадает с «git/yarn/LLM только локально». Комплементарен doc-RAG (та про доки, эта про структуру кода). |
| Тир (предлагаемый) | **Tier 0–1** (ежедневный код-агент, навигация без ключей) |
| §5 конфиденциальность | OK — локальный бинарь, код не уходит наружу |

### 2. headroom — компрессия контекста

| Поле | Значение |
|------|----------|
| Что | Слой перед LLM: сжимает tool-output / логи / RAG-чанки / код; SmartCrusher (schema-preserving JSON), CodeCompressor (AST), Kompress-base (проза) |
| Профиль | −60–95% токенов; library / proxy / **MCP-server** / wrapper; `pip install "headroom-ai[mcp]"` |
| Лицензия / репо | [репо](https://github.com/chopratejas/headroom) · [MCP-доки](https://chopratejas.github.io/headroom/mcp/) |
| Прямой фит | **Высокий по деньгам.** Прямо на ваши раздутые артефакты (`registry.json`, `logs:parse`, `turbo-build.log`, smoke-матрицы). На freemodel/прокси экономия токенов = и стоимость, и помещаемость в контекст. |
| Риск | Ещё один слой перед LLM (а прокси уже есть) → интеграция; сжатие кода контрактов должно быть достаточно lossless для DSP/типов. **Пилот — только на логах/RAG-чанках, не на коде контрактов.** |
| Тир (предлагаемый) | Инфраструктурный слой (вне 0–5; перед прокси или как MCP-tool для тяжёлых выводов) |
| §5 конфиденциальность | ⚠️ Зависит от режима. Самохост/локально — OK; убедиться, что не шлёт сырьё (WAV, `.env`) во внешний эндпоинт компрессии |

### 3. hindsight — обучающаяся память агента

| Поле | Значение |
|------|----------|
| Что | Память World / Experiences / Mental Models; вариант, предупреждающий о повторе прошлой ошибки. Несколько разных проектов под именем «Hindsight» |
| Варианты | [vectorize-io/hindsight](https://github.com/vectorize-io/hindsight) (хостед-сервис), [Shazil10/hindsight](https://github.com/Shazil10/hindsight) (JetBrains-плагин + MCP) |
| Прямой фит | **Средне-высокий концептуально.** Бьёт в Phase F-fix-класс ошибок и автоматизирует ручные `*_LESSONS.md`. |
| Риск | Сильное перекрытие с вашей doc-RAG + consilium + DEVELOPER_RHYTHM; Vectorize — **хостед** (данные уходят); JetBrains-вариант не под Cursor/Claude. Нужен self-hostable вариант, иначе §5-конфликт. |
| Тир (предлагаемый) | **Опциональный**, только после решения «автоматизировать ли lessons» |
| §5 конфиденциальность | 🔴 Vectorize-хостед — потенциальный конфликт (память может содержать фрагменты кода/решений). Self-hosted — переоценить |

### 4. searXNG — приватный веб-поиск

| Поле | Значение |
|------|----------|
| Что | MCP к self-hosted метапоисковику SearXNG; без API-ключей, приватно |
| Репо | [ihor-sokoliuk/mcp-searxng](https://github.com/ihor-sokoliuk/mcp-searxng) |
| Прямой фит | **Средний, нишевый.** Membrana — закрытый домен; веб-поиск не на критическом пути. Польза: ресёрч DSP (cepstral, spectral-flux, YAMNet), инфра (Fly.io, Docker, TLS), `night-hunt`-крон. |
| Риск | Надо поднимать/обслуживать инстанс ради не-критичной функции; качество vs платных (Tavily/Exa). Частично перекрывает Perplexity (Tier 1). |
| Тир (предлагаемый) | **Tier 1** альтернатива/дополнение к Perplexity (keyless, self-hosted) |
| §5 конфиденциальность | OK — self-hosted, запросы не уходят к OpenAI/Anthropic. Не отправлять приватные строки в поиск |

---

## Позиции ролей (затравка для консилиума)

> Черновые тезисы, чтобы каждая роль зашла с позицией. Финал — на консилиуме.

```text
[Teamlead — Vesnin]:
Приоритет инфраструктурного трека — НЕ выше продуктовых эпиков (#47 и live-detection).
Брать по принципу «отсутствие ключа не блокирует». Сильнее всего тянет codebase-memory-mcp:
прямая отдача, Tier 0–1, низкий риск, ложится в вечерний ритуал. headroom — пилот на токенах.
hindsight и searXNG — опционально, не в этот спринт, если нет явного запроса product.

[Структурщик — Ozhegov]:
codebase-memory-mcp — мой инструмент: cross-service links верифицируют «запрещённые импорты»
и слабую связанность между плагинами/пакетами. Прошу gate: граф не должен показывать прямых
рёбер plugin→plugin. headroom не должен сжимать контракты @membrana/core с потерей типов.

[Математик — Dynin]:
Я веду инфраструктуру/скрипты/Docker. Возьму на себя: установку бинаря codebase-memory-mcp,
интеграцию индексации в rag-evening-index, smoke headroom на логах, поднятие SearXNG (если решим).
Требую: детерминированный re-index, измеримая экономия токенов (before/after на 3 типовых выводах).

[Музыкант — Kuryokhin]:
Прямой пользы для аудио-контура нет. Косвенно: searXNG — ресёрч DSP-алгоритмов. Возражений нет,
если не трогает Web Audio / захват.

[Верстальщик — Rodchenko]:
UI-поверхности нет. Нейтрально. Если hindsight-дашборд — отдельная задача, не в этот спринт.

Итоговый артефакт: day-sprint OPEN.md + записи в registry + (опц.) фрагменты в MCP_INTEGRATION_STRATEGY
Definition of Done: см. проект спринта ниже
```

---

## §5 Конфиденциальность — сводка (критичный фильтр)

| Инструмент | Данные наружу? | Вердикт §5 |
|------------|----------------|------------|
| codebase-memory-mcp | Нет (локальный бинарь) | ✅ Безопасен |
| searXNG | Только поисковые запросы → свой инстанс | ✅ Безопасен (не слать приватные строки) |
| headroom | Зависит от режима компрессии | ⚠️ Только self-host/локально; не слать WAV/`.env` |
| hindsight (Vectorize) | Да (хостед-память) | 🔴 Конфликт без self-hosted-варианта |

Правило §5 остаётся: не отправлять `.env`, ключи, приватные WAV и сырые записи микрофона.

---

## Проект спринта (strawman для консилиума)

**Sprint id:** `mcp-agent-tooling-2026-06-27` · **Kind:** day-sprint · **Lead:** Dynin (инфра) + Ozhegov (граф-gate) · **Teamlead LGTM:** Vesnin
**Приоритет:** инфраструктурный, не выше продуктовых эпиков.

| Фаза | id реестра (кандидат) | Deliverable | DoD / Gate |
|------|----------------------|-------------|------------|
| **M0** | `mcp-tooling-m0-consilium` | Этот документ + решения консилиума зафиксированы | Таблица «Открытые вопросы» закрыта; тиры утверждены |
| **M1** | `mcp-tooling-m1-codebase-memory` | codebase-memory-mcp: установка бинаря, индекс репо, fragment-config (keyless), 3 примера структурных запросов | Граф строится; **нет рёбер plugin→plugin** (Ozhegov); индексация добавлена в вечерний ритуал; fallback в MCP_USAGE |
| **M2** | `mcp-tooling-m2-headroom-pilot` | headroom MCP/wrapper пилот на `logs:parse` + RAG-чанках; замер before/after | Экономия токенов измерена на 3 выводах; контракты `@membrana/core` НЕ сжимаются; §5 OK |
| **M3** | `mcp-tooling-m3-searxng-optional` | (Опц.) SearXNG self-host + MCP fragment как Tier 1 рядом с Perplexity | Smoke-поиск; keyless; §5 OK · **или** осознанный skip с fallback |
| **M4** | `mcp-tooling-m4-hindsight-spike` | (Опц.) Спайк: self-hostable hindsight vs текущая doc-RAG — нужен ли отдельный слой памяти | Решение go/no-go в Issue; без внедрения хостед-варианта |
| **M5** | `mcp-tooling-m5-strategy-sync` | Обновить `MCP_INTEGRATION_STRATEGY.md` (тиры) + `mcp:verify-bootstrap` на новые fragment-конфиги | CI bootstrap зелёный; тиры отражают реальность |

**Acceptance (по образцу §7):**
- Tier 0–1 активен ≥1 рабочей станции (codebase-memory-mcp smoke).
- Для M2–M4: либо smoke пройден, либо в Issue зафиксирован осознанный skip + fallback.
- Ни один сервер не обязателен для сборки/CI; `git add .`-безопасность и §5 соблюдены.

**Принцип fallback:** каждый сервер опционален; не стартует → отключить в Cursor/Claude или убрать блок из **локального** конфига; работа над продуктом не зависит.

---

## Открытые вопросы (решить на консилиуме)

| # | Вопрос | Кто решает | Strawman |
|---|--------|-----------|----------|
| 1 | Берём ли codebase-memory-mcp в этот спринт? | Teamlead + product | **Да**, M1, Tier 0–1 |
| 2 | headroom — пилот сейчас или позже? | Teamlead | Пилот M2, только логи/RAG |
| 3 | searXNG — в спринт или skip? Перекрывает Perplexity? | product | Опц. M3 или skip с fallback |
| 4 | hindsight — нужен ли отдельный слой памяти поверх doc-RAG? Есть self-hostable вариант? | Teamlead + Dynin | Спайк M4, без хостед-внедрения |
| 5 | Куда писать тиры — в `MCP_INTEGRATION_STRATEGY.md` или новый раздел? | Ozhegov | В существующую таблицу тиров |
| 6 | Приоритет спринта относительно live-detection эпиков | Teamlead | Ниже продуктовых, фоном |

---

## Следующий шаг

После консилиума: оформить выбранные фазы как day-sprint по [`TASK_PROMPT_WORKFLOW.md`](../prompts/TASK_PROMPT_WORKFLOW.md) — GitHub Issue (`imperfection`/`wish`), записи в `registry.json` (`status: active`), `OPEN.md`, при необходимости task-промпт. Закрытые из strawman вопросы переносятся в шапку OPEN.md как зафиксированные решения.

---

## Источники

- codebase-memory-mcp — <https://github.com/DeusData/codebase-memory-mcp>
- headroom — <https://github.com/chopratejas/headroom> · MCP: <https://chopratejas.github.io/headroom/mcp/>
- hindsight (Vectorize) — <https://github.com/vectorize-io/hindsight> · coding-вариант: <https://github.com/Shazil10/hindsight>
- mcp-searxng — <https://github.com/ihor-sokoliuk/mcp-searxng>
