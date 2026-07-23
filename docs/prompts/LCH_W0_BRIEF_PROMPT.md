# Промпт: W0 — бриф llm-calls-house

> **M** · `lch-w0-brief` · [#1034](https://github.com/officefish/Membrana/issues/1034) · lead **vesnin** · parent `llm-calls-house`

## Контекст

Ратификация плана LPC evidence house владельцем 2026-07-23 («ратифицирую»).
W0 — открытие спринта: реестр, Issues, ACTIVE; без кода дома/emit/Mintlify.

## Промпт целиком

1. Зафиксировать slug эпика `llm-calls-house`, фазы W0–W5, lead’ов (vesnin epic/W0/W5; ozhegov W1–W4).
2. Зарегистрировать эпик + фазы (`yarn task:start`); проставить Issue-номера в OPEN и шапках.
3. OPEN [`docs/day-sprint/llm-calls-house-2026-07-23/OPEN.md`](../day-sprint/llm-calls-house-2026-07-23/OPEN.md): Status **open**; инварианты E1–E8.
4. Запись в [`docs/DAY_SPRINT_ACTIVE.md`](../DAY_SPRINT_ACTIVE.md) + строка в [`DAY_SPRINT_LOG.md`](../DAY_SPRINT_LOG.md).
5. Эпик-промпт [`LLM_CALLS_HOUSE_PROMPT.md`](./LLM_CALLS_HOUSE_PROMPT.md) связан с OPEN.

## Acceptance criteria

- [ ] Эпик + 6 фаз в `docs/tasks/registry.json` (`status: active`, `parentEpic` у фаз)
- [ ] OPEN Status **open**; Issue-номера проставлены
- [ ] `DAY_SPRINT_ACTIVE` указывает на этот инстанс
- [ ] Owner ратификация зафиксирована (дата + слово)

## Out of scope

Дом (W1), мастерская (W2), emit (W3), Mintlify (W4), CLOSURE (W5).
