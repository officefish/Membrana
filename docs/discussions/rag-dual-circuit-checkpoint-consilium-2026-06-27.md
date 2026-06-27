# Консилиум-материал: RAG dual-circuit — checkpoint + сверка (на основе CRITICAL_RAG_AUDIT)

> **Дата:** 2026-06-27 (через 6 дней после аудита 2026-06-21)
> **Тип:** материал для консилиума (вход для виртуальной команды + product)
> **Участники (ожидаемые):** Teamlead (Vesnin), Структурщик (Ozhegov), Математик (Dynin), Музыкант (Kuryokhin), Верстальщик (Rodchenko), product
> **Повестка-основа:** [`CRITICAL_RAG_AUDIT.md`](../CRITICAL_RAG_AUDIT.md) (принято), [`RAG_STRATEGY_CONCEPT.md`](../RAG_STRATEGY_CONCEPT.md), [`ADDITIONAL_RAG_STRATEGY_BRIEF.md`](../ADDITIONAL_RAG_STRATEGY_BRIEF.md), план [`rag-strategy-implementation-plan-2026-06-21-consilium.md`](./rag-strategy-implementation-plan-2026-06-21-consilium.md), эпик [`RAG_DUAL_CIRCUIT_V1_EPIC_PROMPT.md`](../prompts/RAG_DUAL_CIRCUIT_V1_EPIC_PROMPT.md)
> **Цель консилиума:** снять условный LGTM Vesnin (был «после R3 acceptance-демо»), решить судьбу R4–R7, закрыть ledger-пробелы и сверить принятый стек с 4 новыми агентными инструментами.

---

## 1. Зачем этот консилиум

`CRITICAL_RAG_AUDIT.md` принят 2026-06-21 с пересмотренным стеком (LanceDB embedded + `text-embedding-3-small` + repo-native Circuit A) и **условным LGTM Vesnin: implementation LGTM после R3 acceptance-демо** (§ финал аудита; §10 — 5 acceptance-вопросов).

С тех пор код заметно продвинулся, но появились **расхождения между принятым каноном и фактом**, которые нужно зафиксировать решением, а не оставлять дрейфовать. Плюс за неделю мы оценили 4 агентных MCP-инструмента ([`mcp-agent-tooling-consilium-2026-06-27.md`](./mcp-agent-tooling-consilium-2026-06-27.md)), два из которых пересекаются с RAG-стеком — нужна сверка границ.

---

## 2. Состояние внедрения (проверено на 2026-06-27)

| Область | Факт | Вывод |
|---------|------|-------|
| `@membrana/rag-service` | Есть пакет: `chunk/ embed/ operative/ retriever/ store/ cli/ config.ts service.test.ts` | R0–R3 по коду **похоже реализованы** |
| LanceDB | `.membrana/rag/` существует (gitignored) | Circuit B на месте |
| Скрипты | `scripts/rag-evening-index.mjs`, `scripts/rag-query.mjs`, `scripts/rag-ritual.test.mjs` | R1/R5 индексация + ритуал есть |
| Env-канон | `.env.example` содержит RAG-переменные (≈10) | §9 аудита приземлён |
| Acceptance source-доки (§10) | `BACKGROUND_SERVERS.md` ✅, `ARCHITECTURE.md` ✅, `NIGHT_SPRINT_REGULATION.md` ✅, `INTEGRATIONS_STRATEGY.md` ✅, **`TASK_CLOSURE_REGULATION.md` — ОТСУТСТВУЕТ** | 🔴 acceptance-вопрос №3 указывает на несуществующий source |

---

## 3. 🔴 Открытые расхождения (вход консилиума)

1. **Acceptance-вопрос №3 битый.** §10 ждёт ответ из `TASK_CLOSURE_REGULATION.md` — файла нет (переименован/перенесён в `actions/`-миграции?). До R3-демо нужно либо восстановить путь, либо обновить эталон. Иначе gate непроходим формально.
2. **Эпик не в реестре.** `rag-dual-circuit-v1` упомянут как epic id в плане и аудите, но в `registry.json` (HEAD) записи **нет** (0 совпадений). Нарушение `TASK_PROMPT_WORKFLOW`: эпик без записи в реестре. Фазы R0–R7 не отслеживаются ledger'ом.
3. **`registry.json` битый в рабочем дереве** (обрыв на строке 9119 — наследие незавершённого ритуала, Phase F-fix локально не применён). `yarn task:*` упадут → **регистрацию любого нового RAG-спринта блокирует**. Чинить до сприн-планирования (`git checkout -- docs/tasks/registry.json`).
4. **Условный LGTM не снят.** Демо на 5 вопросах с метриками (P@5, p95) формально не зафиксировано в Issue/доке.

---

## 4. Сверка с 4 новыми MCP-инструментами (граница со стеком аудита)

Аудит явно вынес в Deferred (§12): Mem0/Zep/Letta, GBrain, LangChain, Pinecone-as-default, ada-002. Новые инструменты нужно расположить относительно этой границы — **не размывая принятый стек**.

| Инструмент | Пересечение с RAG-стеком | Предлагаемая позиция |
|------------|--------------------------|----------------------|
| **codebase-memory-mcp** | Перекрывает Circuit B **code-signature** путь (§5 аудита: exports + JSDoc). Граф кода ≠ эмбеддинги сигнатур — потенциально **сильнее** для структурных запросов | Кандидат на **замену/дополнение** code-части Circuit B; оставить doc-эмбеддинги в LanceDB. Решить: дублируем или делим домены (граф = код, LanceDB = доки) |
| **headroom** | Сжатие **retrieved chunks** перед подачей в LLM | Совместим: слой **после** retriever, перед LLM. Пилот на выводе `rag-query.mjs`. Не трогает индекс |
| **hindsight** | Прямой конфликт с Deferred §12 (Mem0/Zep/Letta — «agent memory SaaS, out of scope v1») | По умолчанию **держать в Deferred**, если только не self-hostable и не перекрывает Circuit A/B |
| **searXNG** | Вне RAG (внешний веб, не doc-память) | Ортогонально; решается в MCP-консилиуме отдельно |

**Ключевой вопрос команде:** меняет ли `codebase-memory-mcp` решение R-плана по code-signature эмбеддингам, или они сосуществуют (граф для структуры, вектор для семантики)?

---

## 5. Позиции ролей (затравка)

```text
[Teamlead — Vesnin]:
Снимаю условный LGTM только после демо на 5 вопросах с цифрами (P@5, p95<3s mock / <5s real).
Сначала закрыть 3 расхождения (§3): восстановить acceptance-source №3, внести эпик в реестр,
починить registry.json. codebase-memory-mcp рассматриваю как усиление Circuit B по коду —
но без размывания принятого стека: doc-RAG остаётся на LanceDB. hindsight — в Deferred (§12).

[Структурщик — Ozhegov]:
rag-service слои на месте (store/retriever/operative/embed) — проверю чистоту: office не импортирует
@membrana/* кроме rag-service (R4 exception). Граница codebase-memory-mcp vs Circuit-B-code должна быть
явной: либо граф заменяет code-signature extractor, либо делим домены. Дублирования индексов не допускаю.

[Математик — Dynin]:
Веду метрики и инфраструктуру. Подготовлю acceptance-демо: 5 вопросов → P@5, p95-латентность,
LanceDB + 3-small. Замерю headroom before/after на retrieved chunks. Поправлю acceptance-source №3.
Требую детерминированный re-index и hash-manifest (§11 risk: LanceDB corruption).

[Музыкант — Kuryokhin]:
Аудио-контур не затрагивается. Нейтрально. Слежу лишь, чтобы doc-RAG не лез в background-media Postgres
(§2 аудита: data-plane аудио ≠ doc RAG).

[Верстальщик — Rodchenko]:
UI «RAG status» — post-v1 (Deferred §12). В этот спринт не беру. Если решим read-only панель — отдельная задача.

Итоговый артефакт: снятие условного LGTM + day-sprint остатка R4–R7 + закрытие 3 расхождений
Definition of Done: см. §7
```

---

## 6. Acceptance-гейт для демо (запустить на консилиуме)

Из §10 аудита, с поправкой на расхождение №3:

| # | Вопрос | Ожидаемый source | Статус source |
|---|--------|------------------|---------------|
| 1 | Порты background-office и background-media? | `BACKGROUND_SERVERS.md` | ✅ |
| 2 | Где Web Audio запрещён напрямую? | `ARCHITECTURE.md` / `.cursorrules` | ✅ |
| 3 | Как закрыть task M/L? | `TASK_CLOSURE_REGULATION.md` | 🔴 нет файла — **поправить эталон или восстановить** |
| 4 | Night Build stop rule? | `NIGHT_SPRINT_REGULATION.md` | ✅ |
| 5 | Граница audio-engine для plugins? | `INTEGRATIONS_STRATEGY.md` | ✅ |

**Gate (из аудита):** top-5 содержит верный `source`-путь на LanceDB + 3-small; p95 query < 3s local (mock) / < 5s с реальными эмбеддингами.

```bash
# демо локально
yarn rag:index            # или эквивалент полного индекса
node scripts/rag-query.mjs "Порты background-office и background-media?"
# повторить для 5 вопросов; зафиксировать P@5 и p95 в Issue
```

---

## 7. Проект спринта (strawman)

**Sprint id:** `rag-dual-circuit-checkpoint-2026-06-27` · **Kind:** day-sprint · **Lead:** Dynin (метрики/инфра) + Ozhegov (границы) · **LGTM:** Vesnin
**Предусловие:** починить `registry.json` (Phase F-fix) — иначе регистрация задач не пройдёт.

| Фаза | id реестра (кандидат) | Deliverable | Gate |
|------|----------------------|-------------|------|
| **C0** | `ragx-c0-ledger-fix` | Починить `registry.json`; внести **`rag-dual-circuit-v1`** и фазы R0–R7 в реестр пост-фактум со статусами | `yarn task:list` проходит; эпик и фазы в ledger |
| **C1** | `ragx-c1-acceptance-source` | Восстановить/переназначить source acceptance-вопроса №3 (`TASK_CLOSURE_REGULATION.md` или актуальный путь) | 5 вопросов имеют существующие source-доки |
| **C2** | `ragx-c2-acceptance-demo` | R3 acceptance-демо на 5 вопросах: P@5, p95; отчёт в Issue | Gate §6 выполнен → **условный LGTM снят** |
| **C3** | `ragx-c3-codebase-memory-boundary` | Решение: граф codebase-memory-mcp заменяет/дополняет code-signature Circuit B; зафиксировать в CONCEPT | Нет дублирования индексов; домены разведены |
| **C4** | `ragx-c4-headroom-pilot` | (Опц.) headroom на выводе `rag-query.mjs`; замер экономии токенов | before/after на 5 вопросах; retrieval-качество не падает |
| **C5** | `ragx-c5-r4-r7-scope` | Подтвердить/перенести R4 (office `/api/rag/query`), R5 (rituals), R6 (closure), R7 (optional overlays) | Каждая фаза: go / defer с причиной в ledger |

**Acceptance спринта:**
- Условный LGTM Vesnin снят (демо зафиксировано).
- 3 расхождения §3 закрыты.
- Граница RAG ↔ codebase-memory-mcp решена и записана.
- Принятый стек аудита не размыт; Deferred §12 уважён (hindsight/Mem0/Zep — вне v1).

---

## 8. Открытые вопросы (решить на консилиуме)

| # | Вопрос | Кто решает | Strawman |
|---|--------|-----------|----------|
| 1 | Снимаем условный LGTM сейчас или после C2-демо? | Vesnin | После C2 |
| 2 | Чем заменить битый acceptance-source №3? | Dynin + Teamlead | Найти актуальный путь TASK_CLOSURE |
| 3 | codebase-memory-mcp: заменяет code-signature Circuit B или дополняет? | Ozhegov + Dynin | Дополняет: граф=код, LanceDB=доки |
| 4 | headroom на retrieved chunks — в этот спринт? | Teamlead | Опц. C4, не блокирует |
| 5 | hindsight — подтверждаем Deferred §12? | Vesnin | Да, вне v1 |
| 6 | R4 office-эндпоинт — go или defer? | Teamlead + product | Решить по приоритету vs live-detection |
| 7 | Регистрируем R0–R7 пост-фактум или новой нумерацией C0–C5? | Ozhegov | Эпик + R0–R7 в ledger, остаток как C-фазы |

---

## 9. Следующий шаг

После консилиума: починить `registry.json`, оформить выбранные C-фазы как day-sprint по [`TASK_PROMPT_WORKFLOW.md`](../prompts/TASK_PROMPT_WORKFLOW.md) (Issue `imperfection`, записи в реестр `active`, OPEN.md), перенести закрытые strawman-вопросы в шапку OPEN.md как зафиксированные решения. Обновить `CRITICAL_RAG_AUDIT.md` статус (снятие условного LGTM) и `Document map` при необходимости.

---

## 10. Источники

- Основа: [`CRITICAL_RAG_AUDIT.md`](../CRITICAL_RAG_AUDIT.md) (внутренний, принят 2026-06-21)
- Сверка инструментов: [`mcp-agent-tooling-consilium-2026-06-27.md`](./mcp-agent-tooling-consilium-2026-06-27.md)
- codebase-memory-mcp — <https://github.com/DeusData/codebase-memory-mcp>
- headroom — <https://github.com/chopratejas/headroom>
- hindsight — <https://github.com/vectorize-io/hindsight>
