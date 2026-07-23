# Промпт: W4 — Mintlify thin mirror llm-calls

> **M** · `lch-w4-mintlify` · [#1038](https://github.com/officefish/Membrana/issues/1038) · lead **ozhegov** · parent `llm-calls-house`

## Промпт целиком

Прецедент: [`apps/docs/bestiary/`](../../apps/docs/bestiary/).

1. Specimens в `docs/audit/llm-calls/specimens/` (курируемые фикстуры гранул).
2. `apps/docs/llm-calls/overview.mdx` + ≥1 зеркало specimen.
3. Группа в `apps/docs/docs.json`: «LLM calls — evidence».
4. Ссылка монитора из README дома (как bestiary).

## Acceptance criteria

- [ ] overview + ≥1 specimen page
- [ ] docs.json группа
- [ ] Лемма «может отставать» на overview
- [ ] `yarn docs:lint` (или эквивалент пакета) зелёный

## Out of scope

Pin-манифест F4; community sync без ok владельца.
