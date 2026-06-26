# INSIGHT: AI-агент построения UserCase по описанию пользователя

| Поле | Значение |
|------|----------|
| **ID** | `insight-agent-scenario-builder` |
| **Статус** | adopted |
| **Источник** | user |
| **Создан** | 2026-06-25 |

---

## Проблема / наблюдение

Создание UserCase на device-board требует знания палитры узлов, веток (onConnect, main, …), collapsed functions и runtime-ограничений. Пользователь формулирует **намерение** («записывать 5 с при дроне и слать отчёт»), но не видит моста от текста к графу. Сегодня сценарии собирают инженеры или через competition/programmatic collapse — не self-service.

## Гипотеза

**Scenario Builder Agent** — ИИ-агент, который по описанию пользователя:

1. Выбирает **режим сборки** (три подхода).
2. Даёт **честную оценку** покрытия текущей палитрой (`palette-node.ts`, bundled catalog, device kind).
3. При достаточном покрытии — **ко-конструирование** в чате: итеративная сборка/отладка графа.
4. При нехватке узлов — **gap report** + предложение GitHub issue с блок-схемами от агента.
5. Потребление LLM — **за токены**, купленные в **кабинете** (расширение tariff/platform).

### Три режима (подхода)

| Режим | Фокус | Когда |
|-------|--------|--------|
| **Concept first** | Намерение, акты, продуктовая история (как async narrative) | Новичок, «что должно происходить» |
| **Structure first** | Ветки, узлы, wiring, collapsed functions | Опытный оператор, рефакторинг |
| **Usability first** | Operator journey, comment frames, подписи, C7 clarity | Демо, обучение, competition fork |

Режим влияет на порядок вопросов агента и формат промежуточных артефактов (storyboard vs node list vs journey map).

### Вердикт палитры (feasibility gate)

Перед платным чатом агент выполняет **Palette Feasibility Check**:

- Сопоставление intent → `nodeKinds` / `functionIds` / branch handlers.
- Выход: `sufficient` | `partial` | `insufficient` + список gaps (какой узел/контракт отсутствует).
- При `sufficient` — открывается **ко-конструктор** (чат + apply-to-canvas).
- При `partial` — чат с явными workaround + предупреждение.
- При `insufficient` — **не** тратить токены на полную сборку; только gap report + опция issue.

### Монетизация (токены)

| Операция | Токены |
|----------|--------|
| Feasibility check (короткий) | малый фикс / включено в free tier |
| Ко-конструирование + отладка сценария | по consumption (input+output) |
| Генерация блок-схем для GitHub issue | отдельный тарифный шаг |

Покупка токенов — **кабинет** (`background-cabinet`, tariff dataset); client/agent дергает office или cabinet API с quota enforcement (аналог media quota).

### GitHub issue при gap

Если узлов не хватает:

1. Агент формирует **предварительную оценку** gap (node kind, branch, why).
2. Пользователю предлагается создать **issue** на GitHub (шаблон `node-request`).
3. В issue включается **блок-схема** (mermaid / exported graph), сгенерированная агентом — **за токены**.
4. Связь с `docs/catalog` и lessons — опционально для maintainers.

## Scope (черновик)

**In scope (v0 insight):**

- Контракт feasibility check (palette manifest machine-readable)
- UX flow: describe → mode → verdict → chat | issue
- Token SKU в cabinet (продуктовое решение, не реализация billing)
- Три режима как prompt profiles агента

**Out of scope (v0):**

- Автоматический merge новых node kinds без human LGTM
- Замена `usercase.mjs` programmatic collapse
- Remote MP7 runtime без device-board в client

## Связи

- `packages/device-board` — palette, `BUNDLED_USER_CASE_ENTRIES`, comment profiles
- `insight-async-v2-product-narrative` — Concept first / operator journey
- `insight-competition-catalog-pipeline` — эталонные UserCase как few-shot
- `docs/MEMBRANE_PLATFORM.md`, `MEMBRANE_PLATFORM_V1_EPIC` — cabinet, tariff
- `background-office` — Claude/LLM proxy (не смешать с media)
- `scripts/usercase.mjs` — verify-pack как oracle после сборки агентом

## Оператор видит

1. Поле «опишите сценарий» + выбор режима (Concept / Structure / Usability).
2. Карточка вердикта: «Палитры хватает / не хватает: …».
3. Баланс токенов в кабинете; estimate перед сессией.
4. Чат-ко-конструктор или кнопка «Создать issue на GitHub» с preview схемы.

## Вопросы для research (Q1–Q3)

1. **Landscape:** AI agents building visual workflows (n8n AI, Retool AI, Figma Make, LangFlow) + feasibility / tool-use patterns 2024–2026
2. **Fit:** Membrana device-board palette, UserCase document schema, cabinet tariff extension for LLM credits
3. **Risk:** hallucinated graphs, unsafe runtime, token abuse, support burden from auto-issues
