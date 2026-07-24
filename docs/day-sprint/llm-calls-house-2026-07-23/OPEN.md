# OPEN: llm-calls-house — дом доказательств LLM-вызовов

| Поле | Значение |
|------|----------|
| **Sprint** | `llm-calls-house-2026-07-23` |
| **Registry epic** | `llm-calls-house` · [#1033](https://github.com/officefish/Membrana/issues/1033) |
| **Status** | **closed** |
| **Kind** | day-sprint (эпик L + фазы M) |
| **Size** | L |
| **Lead epic** | vesnin |
| **Craft** | ozhegov (W1–W4) |
| **Started** | 2026-07-23 |
| **Ратификация** | владелец «ратифицирую» 2026-07-23 · план LPC evidence house |
| **Дом** | [`docs/audit/llm-calls/`](../../audit/llm-calls/) |
| **Паттерны** | [`GROUP_CONTAINERIZATION`](../../patterns/GROUP_CONTAINERIZATION.md) · [`HOME_WORKSHOP`](../../patterns/HOME_WORKSHOP.md) · [`PINNED_SUBGRAPH_VERSIONING`](../../patterns/PINNED_SUBGRAPH_VERSIONING.md) |
| **Прецедент зеркала** | `bestiary-workshop` W3 · `branch-mintlify-engine` (#823) |
| **Стык LPC** | T1 evidence minimum (расширение M3b) |

**Промпт эпика:** [`LLM_CALLS_HOUSE_PROMPT.md`](../../prompts/LLM_CALLS_HOUSE_PROMPT.md)

---

## Цель

Официальный git-дом для **доказательного минимума** вызовов LLM-процедур
(подлинность + параметры), с мастерской и публичным thin Mintlify-зеркалом.
Сырые тела prompt/response не хранятся.

## Инварианты (E1–E8)

1. Сырой prompt / rawResponse / ключи — никогда в доме, usage, Mintlify.
2. Подлинность — sha256 тел (+ bytes), hash в памяти при emit.
3. Git = истина · Mintlify = монитор · дом не переезжает.
4. Office = live SoT суток; git-дом = снимки/реестр.
5. Overlay каналов не в этом доме.
6. Гранула = один attempt (шаг chain).
7. Массовые мутации — слово владельца (HARD GATE).
8. Specimens курируемые; не автодамп прода в Mintlify.

## Phases

| Phase | Registry id | Issue | Lead | Prompt | DoD | Status |
|-------|-------------|------:|------|--------|-----|--------|
| **W0** | `lch-w0-brief` | [#1034](https://github.com/officefish/Membrana/issues/1034) | vesnin | [`LCH_W0_BRIEF_PROMPT.md`](../../prompts/LCH_W0_BRIEF_PROMPT.md) | OPEN + Issues + ACTIVE | **done** |
| **W1** | `lch-w1-house` | [#1035](https://github.com/officefish/Membrana/issues/1035) | ozhegov | [`LCH_W1_HOUSE_PROMPT.md`](../../prompts/LCH_W1_HOUSE_PROMPT.md) | Пять органов + провода | **done** |
| **W2** | `lch-w2-workshop` | [#1036](https://github.com/officefish/Membrana/issues/1036) | ozhegov | [`LCH_W2_WORKSHOP_PROMPT.md`](../../prompts/LCH_W2_WORKSHOP_PROMPT.md) | workshop + audit/decompose | **done** |
| **W3** | `lch-w3-emit` | [#1037](https://github.com/officefish/Membrana/issues/1037) | ozhegov | [`LCH_W3_EMIT_PROMPT.md`](../../prompts/LCH_W3_EMIT_PROMPT.md) | schema/emit/snapshot/ADR | **done** |
| **W4** | `lch-w4-mintlify` | [#1038](https://github.com/officefish/Membrana/issues/1038) | ozhegov | [`LCH_W4_MINTLIFY_PROMPT.md`](../../prompts/LCH_W4_MINTLIFY_PROMPT.md) | thin Mintlify + specimens | **done** |
| **W5** | `lch-w5-closure` | [#1039](https://github.com/officefish/Membrana/issues/1039) | vesnin | [`LCH_W5_CLOSURE_PROMPT.md`](../../prompts/LCH_W5_CLOSURE_PROMPT.md) | CLOSURE + archive | **done** |

## Вне scope v1

- Полные тела в git/office.
- Overlay SoT в доме.
- Pin F4; community Mintlify sync без ok владельца.
- Автопубликация каждой prod-гранулы.

## Gate checklist (W0)

- [x] Эпик + 6 фаз в registry
- [x] Issues #1033–#1039; номера в OPEN
- [x] DAY_SPRINT_ACTIVE Focus
- [x] Owner ратификация в шапке
