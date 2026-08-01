# H2 stage-completion-checklist — мастерские

**Держатель:** Ozhegov
**Принимает:** Ozhegov (H3) + Rodchenko (доступность)
**Статус:** accepted

## Changed artifacts

- `workflow/workshops/overview.mdx` — понятие и два подтверждённых примера;
- `workflow/workshops/using.mdx` — маршрут audit → decompose → inspect;
- `workflow/workshops/catalog.mdx` — 14 мастерских из генератора;
- `apps/docs/docs.json` — группа «Мастерские»;
- `tests/workshop.manifest.json` — проверенный пример `selectSetup`;
- renderer различает исполнимую дверь и `planned:` и показывает warnings.

## Verification command / result

```powershell
node scripts/mintlify-workflow-docs.mjs --render
node --test scripts/mintlify-workflow-docs.test.mjs scripts/atlas-discovery.test.mjs scripts/rootpolicy.test.mjs scripts/tooling-atlas.test.mjs scripts/validate-workshop.test.mjs scripts/usage-schema.test.mjs scripts/atlas-usage.test.mjs
node scripts/verify-mintlify-docs.mjs --root apps/docs --links
```

Результат: 85/85 тестов passed; Mintlify static verify OK, 55 страниц и ссылки.
Тестовый пример механически прогнан: `run=32/319, not run=287, skipped=0`.

## Known gaps

- фактический browser render desktop/mobile выполняется в H4;
- у 11 из 14 мастерских пока нет usage-примера;
- некоторые мастерские честно имеют null/planned двери; H2 их не достраивает;
- source links указывают на main и станут живыми после merge stacked-цепочки.

## Next-stage input

H3 получает читательский словарь различий: дом ≠ мастерская ≠ кит ≠ процедура,
правило доказательства примера и готовый раздел Workflow в навигации.

## Handoff review v1

**BLOCK.** Веточный fixture был назван реальным примером; проекция скрывала
`kit: null` и доменные намерения без `tool`. В модель добавлены
`evidenceKind: run|fixture` + `source`; null, planned и intent теперь различимы.

## Handoff review v2

**LGTM.** Rodchenko подтвердил evidence-различение, полноту проекции и 85/85
тестов. Вещдок: [`reviews/H2_RODCHENKO_HANDOFF_REVIEW.md`](./reviews/H2_RODCHENKO_HANDOFF_REVIEW.md).
