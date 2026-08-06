# Membrana Local Sprint OPEN: harness-product-deploy-2026-08-02

| Поле | Значение |
|------|----------|
| Sprint | `harness-product-deploy-2026-08-02` |
| Procedure | `membrana-local-sprint` |
| Registry task | `harness-workflow-pages` |
| Parent epic | `dual-mintlify-product-harness` · Issue #1622 |
| Branch | `codex/harness-product-deploy` |
| Lead | vesnin |
| Support | dynin · rodchenko · tarasov |
| Status | CLOSED · PR #1650 merged · production domains verified |

## Предмет

Собрать Harness как отдельный Mintlify-контейнер с самостоятельной страницей
каждой живой мастерской и процедуры, честно показать портфолио/примеры и
опубликовать Product и Harness на `product.mmbrn.tech` и `harness.mmbrn.tech`.

## Корпус и граница

- Живой baseline: 13 мастерских и 23 процедуры.
- Генератор выпускает 36 предметных страниц, два индекса и Harness navigation.
- Product остаётся в `apps/docs`; Harness остаётся в `apps/docs-harness`.
- PR #1620 не принимается целиком: из него выборочно перенесена только основа генератора.
- Недостающие примеры не сочиняются; их копит `workflow-examples-marathon`.

## Accountable blocks

| Блок | Держатель | Проверяемый выход |
|------|-----------|-------------------|
| `harness-generator` | dynin | generator, check-mode, corpus tests |
| `harness-workshop-pages` | dynin | 13 страниц + индекс мастерских |
| `harness-procedure-pages-a` | dynin | 12 страниц процедур |
| `harness-procedure-pages-b` | dynin | 11 страниц + индекс процедур |
| `harness-editorial` | rodchenko | входная страница, карта двух docs, marathon task |
| `production-deploy` | vesnin | два Mintlify roots, DNS/TLS и visual smoke |
| `execution-and-gates` | vesnin | trails, journal, gate, exact-SHA closure |

Машинная нарезка: [`harness-product-deploy-2026-08-02.json`](../../sprint/cut/harness-product-deploy-2026-08-02.json).

## Проверки на текущем дереве

- `mintlify-workflow-docs.test.mjs`: 7/7 pass.
- `task-register.test.mjs`: 10/10 pass.
- Product tariff check: pass.
- Mintlify corpus/link check: Product 54, Harness 50 pages.
- Full scripts: 3320 tests, 3316 pass, 0 fail, 4 skip.

## Внешнее состояние до деплоя

- `harness.mmbrn.tech` резолвится CNAME на `cname.mintlify.builders`.
- `product.mmbrn.tech` резолвится A на `176.124.218.4` (background-office),
  поэтому Product ещё не подключён к Mintlify.
- Mintlify Dashboard требует авторизованную пользовательскую сессию.
