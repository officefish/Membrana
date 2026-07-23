# Эпик: каналы LLM для процедур + панель учёта

> Канон решения: [`docs/meeting/llm-procedure-channels/EPIC.md`](../meeting/llm-procedure-channels/EPIC.md)  
> (заседание ратифицировано 2026-07-23). Не пересматривать вердикты P1…R1 без BRIEF_AMENDMENT.

## Цель

Агентские процедуры (v1: **code-review**, **consilium**) ходят в выбранный канал LLM;
каждый вызов учитывается; owner на **panel.mmbrn.tech** переключает chain без правки кода.

## Фазы

| Id | Содержание | Lead |
|----|------------|------|
| `lpc-a-lib` | registry, defaults, catalog, resolve, transport/chain/emit + schema | ozhegov |
| `lpc-b-wire` | wire code-review + consilium | ozhegov |
| `lpc-c-office` | overlay + usage API | vesnin |
| `lpc-d-panel` | owner page summary + chain editor | rodchenko |

## DoD эпика (R1)

1. Registry+defaults в main.  
2. code-review и consilium: resolve+chain+emit (`LLM_USAGE_EMIT=0` работает).  
3. Office: getEffective/putOverlay + POST events + day aggregate.  
4. Panel owner: summary + edit chain + source badge.  
5. Сценарий: Anthropic мёртв → chain openrouter → review проходит → событие на панели.

## Запреты v1

Ally UI · FreeModel в enum · тихий ollama · auto-scan · offline JSONL · новый SPA · cabinet.

## Промпт целиком

Исполнять строго по EPIC и фазовым карточкам; transport не хардкодить на Anthropic;
секреты ≠ канал (C1/X1); emit best-effort (T1/U1).

---

## Acceptance criteria

- [ ] `scripts/lib/llm-procedures.json` + resolve/catalog/chain/emit; unit-тесты A зелёные
- [ ] `yarn code-review` и `yarn consilium` идут через resolve+chain+emit; `LLM_USAGE_EMIT=0` глушит emit
- [ ] Office: overlay get/put + POST usage events + day aggregate; secrets не в overlay
- [ ] Panel owner @ panel.mmbrn.tech: day summary + chain editor + source badge
- [ ] Live DoD: Anthropic недоступен → chain с openrouter → review завершается → событие на панели
