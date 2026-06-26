# INSIGHT: Sunrise flashes — утренний тематический flash

| Поле | Значение |
|------|----------|
| **ID** | `insight-sunrise-flash` |
| **Статус** | adopted |
| **Источник** | user |
| **Создан** | 2026-06-25 |

---

## Проблема / наблюдение

Утренний ритм (`plan:day`, `standup`, `main-day-issue`) опирается на **внутренний** контекст: git, вчерашнее code-review, RAG operative. Внешний горизонт (рынок, конкуренты, ML/audio тренды, регуляторика) подключается эпизодически. Нет **ежедневного**, дешёвого механизма «одна свежая тема → один flash» с накоплением **дерева знаний** проекта.

## Гипотеза

**Sunrise flash** — фоновый (и/или scheduled) ритуал **~06:00** (до начала рабочего дня):

### Pipeline

```text
06:00 trigger
  → RAG (operative + archive): уточнить облако ≥30 тематик, релевантных проекту
  → scoring: вес каждой тематики (актуальность, gap в corpus, связь с open epics/insights)
  → weighted pick: одна тема на сегодня
  → single news/research query → Perplexity | Grok | Gemini (каскад / round-robin)
  → SUNRISE_FLASH.md (+ meta в knowledge tree)
  → merge в утренние артефакты (standup / STRATEGIC_PLAN_DAY input)
```

### Два эффекта

| Эффект | Минимум | Опционально |
|--------|---------|-------------|
| **Knowledge tree** | Каждый flash добавляет узел/ребро в общее дерево знаний (теги, ссылки, weight decay) | `yarn rag:index:incremental` на flash corpus |
| **Дневной спринт** | — | С вероятностью P (настраиваемо) flash **инициирует тематический day-sprint** (кандидат в `MAIN_DAY_ISSUE` / buffer) |

Вероятность спринта зависит от веса темы и порога Teamlead (не автоматический merge без LGTM).

### Провайдеры (каскад)

1. `PERPLEXITY_API_KEY` / MCP Perplexity  
2. Grok API (если ключ в `.env`)  
3. Gemini API  
4. Dry-run: только тема + placeholder

Аналог insight research cascade.

## Scope (черновик)

**In scope:**

- Regulation: `SUNRISE_FLASH_REGULATION.md`
- Script: `yarn sunrise:flash` (+ cron / morning-care hook опционально)
- Topic cloud from RAG + registry (tasks, insights, epics)
- Output: `docs/SUNRISE_FLASH.md`, `docs/sunrise-flash/<YYYY-MM-DD>.md`
- Knowledge tree JSON/YAML append-only log
- Probabilistic sprint proposal → `docs/CURRENT_TASK.md` или flag для `main-day-issue`

**Out of scope (v0):**

- Автоматический `MAIN_DAY_ISSUE` без human/Teamlead
- Client UI
- Замена `analyzers:research:week`

## Связи

- `docs/RAG.md` — operative/archive circuits
- `docs/DEVELOPER_RHYTHM.md` — **расширение утра**, не замена standup
- `membrana-developer-rhythm` skill
- `membrana-rag-operator` skill
- `membrana-opencode-proxy` — Grok/Gemini cascade
- `insight-*` registry — темы из adopted insights повышают weight

## Оператор видит

- Утром: блок «Sunrise flash» в standup input или отдельный файл
- Дерево знаний: навигатор тем (30+ cloud, история flashes)
- Редко: «Предложен тематический спринт: …» в плане дня

## Вопросы для research (Q1–Q3)

1. **Landscape:** automated dev team morning briefings, topic radar, news-to-docs 2024–2026
2. **Fit:** Membrana RAG dual-circuit, ritual:day chain, weighted topic selection
3. **Risk:** noise, API cost, distraction from MAIN_DAY_ISSUE, duplicate with weekly research
