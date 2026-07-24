# Промпт: W3 — panel surface + CUSTOM_DOMAIN notes

> **M** · `dmd-w3-surface` · [#1125](https://github.com/officefish/Membrana/issues/1125) · parent `dual-mintlify-docs` · lead **ozhegov**  
> Эпик: [`DUAL_MINTLIFY_DOCS_PROMPT.md`](./DUAL_MINTLIFY_DOCS_PROMPT.md).

## Промпт целиком

1. `apps/panel` → `ToolingAtlasBoard` / константы URL:
   - primary: harness custom domain (`https://harness.mmbrn.tech/tooling/containers`
     или `ops.…` — как выбрал владелец);
   - fallback: harness `*.mintlify.app` (новый project slug), **не**
     `membrana.mintlify.app/tooling/containers`.
2. Обновить тесты (`ToolingAtlasBoard.test.ts`) и UX-копирайт (старый community-fork
   product больше не упоминать как цель atlas).
3. Документация доменов:
   - Product: оставить / уточнить `apps/docs/CUSTOM_DOMAIN_SETUP.md` → `docs.mmbrn.tech`
     (убрать ожидание, что `/tooling/containers` живёт на product).
   - Harness: добавить `apps/docs-harness/CUSTOM_DOMAIN_SETUP.md` (или общий note)
     с placeholder subdomain + шаги Mintlify dashboard / DNS — зеркало product-чеклиста.
4. Коротко поправить README workspace'ов и при необходимости
   `docs/DOCUMENTATION_WORKFLOW.md` (два публичных URL).

## DoD

- [ ] Panel atlas → harness URL (R4)
- [ ] Тесты panel зелёные
- [ ] CUSTOM_DOMAIN notes для обоих сайтов; product не обещает `/tooling` у себя
