# Промпт: W1 — дом llm-calls (пять органов)

> **M** · `lch-w1-house` · [#1035](https://github.com/officefish/Membrana/issues/1035) · lead **ozhegov** · parent `llm-calls-house`

## Промпт целиком

Создать [`docs/audit/llm-calls/`](../audit/llm-calls/) по [`GROUP_CONTAINERIZATION`](../patterns/GROUP_CONTAINERIZATION.md):

1. `README.md` — контракт разрешено/запрещено; лемма git/Mintlify; связь LPC; чеклист GROUP.
2. `registry/LLM_CALLS_LIST.md` — stub overwrite + Meta.
3. `cache/.gitkeep` + gitignore правила для сырого кеша.
4. `AGENT_PROMPT.md` — сценарии + HARD GATE массовых мутаций.
5. Провода: `docs/audit/README.md`, таблица реализаций GROUP_CONTAINERIZATION, при необходимости одна строка AGENTS.

## Acceptance criteria

- [ ] Пять органов на месте; запрет raw prompt/response/ключей в README
- [ ] Чеклист GROUP в README (пункты ✅/⚠)
- [ ] Провода из audit README + patterns

## Out of scope

workshop.manifest (W2), emit schema (W3), Mintlify pages (W4).
