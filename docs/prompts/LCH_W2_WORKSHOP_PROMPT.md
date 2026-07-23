# Промпт: W2 — мастерская llm-calls

> **M** · `lch-w2-workshop` · [#1036](https://github.com/officefish/Membrana/issues/1036) · lead **ozhegov** · parent `llm-calls-house`

## Промпт целиком

1. `docs/audit/llm-calls/workshop.manifest.json` — `worksOn` = дом; `kit: null`; verbs audit/decompose; inspectElement ✅ или ⚠.
2. `yarn llm-calls:audit` / `yarn llm-calls:decompose` — пишут `--report` в дом.
3. Строка в таблице [`HOME_WORKSHOP.md`](../patterns/HOME_WORKSHOP.md).
4. Чеклист HOME_WORKSHOP в README дома.

## Acceptance criteria

- [ ] Манифест валиден; ownership check зелёный
- [ ] audit + decompose MUST работают
- [ ] Паттерн HOME_WORKSHOP обновлён

## Out of scope

Emit hashes (W3), Mintlify (W4).
