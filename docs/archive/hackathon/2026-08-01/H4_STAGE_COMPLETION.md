# H4 stage-completion-checklist — render and close

**Держатель:** Vesnin
**Принимает:** Rodchenko (render) + Ozhegov (final diff) + owner (final audit)
**Статус:** team LGTM; awaiting owner final audit and PR

## Changed artifacts

- `SPRINT_KINDS` принимает ратифицированный род `marathon`;
- `workflow-examples-marathon` зарегистрирован как активная L-карточка;
- `WORKFLOW_EXAMPLES_MARATHON_PROMPT.md` задаёт evidence contract для 14+24 объектов;
- Mintlify navigation содержит 3 страницы мастерских, 3 редакционные страницы
  процедур и 2 генерируемых каталога;
- primary color изменён на `#0f766e` для WCAG AA на светлом фоне.

## Mechanical verification

```powershell
node --test scripts/mintlify-workflow-docs.test.mjs scripts/atlas-discovery.test.mjs scripts/rootpolicy.test.mjs scripts/tooling-atlas.test.mjs scripts/validate-workshop.test.mjs scripts/usage-schema.test.mjs scripts/atlas-usage.test.mjs scripts/task-register.test.mjs scripts/procedural-workshop.test.mjs scripts/procedures-registry.test.mjs scripts/validate-procedure.test.mjs scripts/procedure-home-form.test.mjs scripts/procedure-contract-license.test.mjs
node scripts/mintlify-workflow-docs.mjs --check
node scripts/verify-mintlify-docs.mjs --all --links
node scripts/tooling-atlas.mjs --audit
node scripts/procedural-workshop.mjs --audit
mint validate
mint a11y
node scripts/mintlify-workflow-visual.mjs
git diff --check
```

Результат:

- 157/157 focused tests passed;
- 59 product-doc pages + 11 harness pages, links OK;
- 14 мастерских, 7 healthy + 7 warning + 0 broken;
- 24 процедуры, 16 built-valid + 1 external + 7 declared + 0 defects;
- официальный Mintlify validate passed;
- Mintlify a11y: WCAG AA primary 5.47:1; 61 MDX, media alt issues 0;
- 14/14 browser viewport checks passed: 7 страниц × desktop/mobile;
- H1/H2/H3 handoff review после исправлений: LGTM;
- `git diff --check`: clean.

## Visual evidence

- repeatable check: `scripts/mintlify-workflow-visual.mjs`;
- local ignored outputs: `scripts/cache/mintlify-workshops-desktop.png` and
  `scripts/cache/mintlify-procedures-mobile.png`;
- правильные H1, основной текст и отсутствие document-level horizontal overflow
  подтверждены для всех семи страниц на обеих ширинах.

Локальный preview загружает KaTeX/Font Awesome с CDN. Sandbox Chrome ожидаемо
пишет `ERR_NETWORK_ACCESS_DENIED` только для этих внешних ресурсов; иной console
error отсутствует. Preview также запрашивает необязательный `/favicon.ico` (404).

## Environment findings

- `mintlify@4.2.123` не поддерживает системный Node 25; validate/dev выполнены
  через bundled Node 24 LTS;
- вложенный `sharp@0.35.2` у `sharp-ico` не загрузился на Windows; для preview
  использован уже установленный рабочий `sharp@0.33.5` только в ignored node_modules;
- встроенный browser-control Codex не стартовал из-за EPERM на short profile path;
  viewport-проверка выполнена локальным Playwright с чистым headless Chrome.

## Known gaps

- 17 из 24 процедур пока без portfolio;
- 11 из 14 мастерских без usage evidence;
- fixture мастерской веток не засчитывается как lived run;
- marathon procedure не построена и не была предметом этого hackathon;
- production publish не выполнялся: нужен отдельный акт владельца.

## Next-stage input

Финальный рецензент получает полный diff, этот checklist и все три принятые
передачи. После LGTM ветка отправляется в PR; окончательное закрытие hackathon
ждёт owner final-audit ratification и merge.

## Final review

**LGTM after v3.** Все P1/P2 сняты; полный след:
[`reviews/H4_TEAMLEAD_FINAL_REVIEW.md`](./reviews/H4_TEAMLEAD_FINAL_REVIEW.md).
