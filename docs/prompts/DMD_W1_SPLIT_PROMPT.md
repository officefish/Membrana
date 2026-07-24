# Промпт: W1 — split trees + два docs.json

> **M** · `dmd-w1-split` · [#1123](https://github.com/officefish/Membrana/issues/1123) · parent `dual-mintlify-docs` · lead **ozhegov**  
> Эпик: [`DUAL_MINTLIFY_DOCS_PROMPT.md`](./DUAL_MINTLIFY_DOCS_PROMPT.md).

## Промпт целиком

Layout **A**:

1. Создать workspace `apps/docs-harness` (`@membrana/docs-harness`) по образцу `@membrana/docs`
   (package.json, mintlify dep, scripts dev/build/lint → verify).
2. Перенести (git mv) harness MDX из `apps/docs`:
   - `tooling/`
   - `bestiary/`
   - `llm-calls/`
   - `git/`
3. **Product** `apps/docs/docs.json`: только Device Board / concepts / cookbooks / nodes;
   `navigation` = object с `groups` (и при необходимости `pages`). **Без** tab «Харнес».
4. **Harness** `apps/docs-harness/docs.json`: группы Tooling / Bestiary / LLM / Git;
   тот же object schema.
5. Прописать workspace в корневом `package.json` / turbo при необходимости;
   yarn scripts-алиасы (`docs-harness:dev` и т.п.) — минимально.
6. Локально: `yarn workspace @membrana/docs build` и `@membrana/docs-harness build`
   (или эквивалент verify) зелёные.
7. Не оставлять tabs-as-final как целевую модель; не реанимировать #1120.

Справка Mintlify: `navigation` — **object**; для односайтового раздела достаточно
`navigation.groups` + `pages` внутри групп
([Navigation](https://www.mintlify.com/docs/organize/navigation)).

## DoD

- [ ] `apps/docs-harness` существует; harness MDX там
- [ ] Product site nav не содержит harness paths
- [ ] Оба `docs.json` — валидный object navigation
- [ ] verify/build зелёный на обоих workspace
