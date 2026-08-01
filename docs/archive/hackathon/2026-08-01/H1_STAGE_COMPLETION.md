# H1 stage-completion-checklist — foundation

**Держатель:** Vesnin
**Принимает:** Ozhegov
**Статус:** accepted after v3 review

## Changed artifacts

- `scripts/lib/mintlify-workflow-docs.mjs` — единая модель и два renderer;
- `scripts/mintlify-workflow-docs.mjs` — `--render|--check`;
- `scripts/mintlify-workflow-docs.test.mjs` — полнота текущего корпуса и дрейф;
- `scripts/lib/atlas-discovery.mjs` — служебный `.cache` исключён из обхода;
- `docs/containers/strategic-docs/README.md` — дверь дома с видимым frozen-статусом;
- `scripts/lib/validate-workshop.mjs` и `CONTRACT.md` — `tests` принят вторым
  корневым домом; устранено расхождение 14 манифестов / 13 мастерских;
- `apps/docs/workflow/{workshops,procedures}/catalog.mdx` — производные каталоги;
- `apps/docs/package.json`, `package.json` — check до Mintlify build;
- `docs/archive/hackathon/2026-08-01/H1_ARCHITECTURE.md` — карта источников.

## Verification command / result

```powershell
node scripts/mintlify-workflow-docs.mjs --render
node scripts/mintlify-workflow-docs.mjs --check
node --test scripts/mintlify-workflow-docs.test.mjs scripts/atlas-discovery.test.mjs scripts/rootpolicy.test.mjs scripts/tooling-atlas.test.mjs
```

Результат после исправлений v2: render 2 страниц; check OK; 39 тестов passed. После
README-двери `strategic-docs` и поимённого принятия корня `tests` модель видит
14 мастерских и 24 процедуры.

## Known gaps

- редакционные страницы ещё не написаны — предмет H2/H3;
- Mintlify navigation пока не содержит новых страниц — H2/H3;
- у большинства объектов нет подтверждённых примеров — H4 заводит marathon;
- внешний GitHub source-link заработает после попадания stacked-цепочки в main.

## Next-stage input

H2 получает `loadWorkflowDocsModel`, готовый workshop catalog и правило:
редакционная страница объясняет путь читателя, но не копирует закрытый список.

## Handoff review v1

**BLOCK.** Ozhegov подтвердил механическую полноту 14/24, но нашёл три дефекта:
невидимый frozen-статус strategic-docs, смешение портфолио с прожитым примером и
обрыв digest на первой физической строке. Исправления отправлены на v2 review.

## Handoff review v2

**BLOCK.** Frozen-статус и пример≠портфолио исправлены. Digest процедур стал
абзацным, но мастерские продолжали читать старый helper атласа. Чтение README
вынесено в общий `readme-digest.mjs`; workshop integration закреплена тестом.

## Handoff review v3

**LGTM.** Все три исходных finding сняты; H2 разрешён. Полный след:
[`reviews/H1_OZHEGOV_HANDOFF_REVIEW.md`](./reviews/H1_OZHEGOV_HANDOFF_REVIEW.md).
