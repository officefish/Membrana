# Review: AI-агент построения UserCase

> Virtual team · 2026-06-25

[Teamlead]: Стратегически — **ключевой self-service** для device-board после competition MVP. Три режима (Concept / Structure / Usability) закрывают разные персоны без трёх продуктов. Feasibility gate до токенов — честный контракт с пользователем. **Adopted**; эпик L после catalog runbook + smoke gate. Зависимость: cabinet credit SKU (расширение MP2 tariff).

[Структурщик]: Архитектура: `PaletteManifest` (JSON из palette + capabilities) → `FeasibilityService` (pure TS в device-board или office) → `ScenarioBuilderSession` (chat + patch ops на UserCase document). Не генерировать произвольный JSON — только validated patches. GitHub issue через `gh` API или deep-link с prefill; блок-схема mermaid в body. Оценка **8**.

[Математик]: Feasibility = set cover / graph homomorphism lite: required capabilities ⊆ palette. Token ledger — atomic debit, idempotent requestId. Бесплатный короткий feasibility снижает abuse. Оценка **6** (billing — cabinet, не ядро).

[Музыкант]: Audio-сценарии (mic, recorder, FFT) — высокий риск false `sufficient`; feasibility должен знать Web Audio constraints (engine-only nodes). Concept first для оператора «дрон + запись» — правильный default. Оценка **7**.

[Верстальщик]: UX: режим как radio на входе; verdict card (зелёный/жёлтый/красный); баланс токенов в header; co-builder — split chat + canvas highlight. Usability first = comment frames preview. Оценка **9**.

## Голосование приоритета (1–10)

| Роль | Внедрять | Этап | /10 |
|------|----------|------|-----|
| Teamlead | да | квартал (после adopted G/I) | 9 |
| Структурщик | да | месяц–квартал | 8 |
| Математик | частично (ledger) | квартал | 6 |
| Музыкант | да | месяц–квартал | 7 |
| Верстальщик | да | месяц | 9 |

**Средний балл:** 7.8

## Резюме Teamlead

- Рекомендуемый статус: **adopted**
- Влияние на plan:week: weight **7.8** — эпик «Scenario Builder Agent v0» (feasibility + один режим Structure first)
- Следующий шаг: PRD v0 — `PaletteManifest`, feasibility API, cabinet credit SKU draft; пилот на MVP microphone UserCase
