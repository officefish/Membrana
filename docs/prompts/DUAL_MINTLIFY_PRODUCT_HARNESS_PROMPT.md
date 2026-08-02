# Промпт: Product и Harness Mintlify в двух спринтах

> Task-промпт эпика `dual-mintlify-product-harness`. Размер: **L**.
> Ожидаемый артефакт: два последовательных PR, каждый через
> `membrana-local-sprint`. Реестр: [`docs/tasks/registry.json`](../tasks/registry.json).
> GitHub Issue: [#1622](https://github.com/officefish/Membrana/issues/1622).

## Контекст

В репозитории уже есть две Mintlify-поверхности: `apps/docs` содержит продуктовую
документацию Device Board, а `apps/docs-harness` — документацию рабочего контура.
Задача не создаёт третью витрину. Она доводит это разделение до честного контракта,
навигации, генерации и доменов.

Работа состоит из двух отдельных спринтов. Первый формализует Product и добавляет
публичную проекцию тарифов. Второй собирает Harness: отдельная страница каждой
мастерской и каждой процедуры. Детальная нарезка Harness выполняется после закрытия
Product и повторно ратифицируется владельцем.

## Связанные документы

| Документ | Зачем |
|----------|-------|
| [`PRODUCT_MINTLIFY_CONTAINER_PROMPT.md`](./PRODUCT_MINTLIFY_CONTAINER_PROMPT.md) | Sprint 1: Product |
| [`HARNESS_WORKFLOW_PAGES_PROMPT.md`](./HARNESS_WORKFLOW_PAGES_PROMPT.md) | Sprint 2: Harness |
| [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md) | Жизненный цикл задач |
| [`../procedures/membrana-local-sprint/README.md`](../procedures/membrana-local-sprint/README.md) | Каноническая процедура обоих спринтов |
| [`../tariffs/tariff-grid.json`](../tariffs/tariff-grid.json) | Канон продуктовых тарифов |
| [`../tariffs/tariff-scalars.json`](../tariffs/tariff-scalars.json) | Канон числовых параметров тарифов |

## Промпт целиком

Ты координируешь эпик `dual-mintlify-product-harness` под руководством Vesnin.
Выполни два независимых `membrana-local-sprint` в указанном порядке:

1. `product-mintlify-container` — `apps/docs` становится формальным Product-контейнером
   для `product.mmbrn.tech`: Device Board, узлы и тарифы.
2. `harness-workflow-pages` — `apps/docs-harness` становится Harness-контейнером
   для `harness.mmbrn.tech`: мастерские и процедуры, по одной странице на предмет.

Общие инварианты:

- не создавать третье Mintlify-приложение и не дублировать канонические документы;
- Product не публикует мастерские и процедуры;
- Harness не публикует Device Board, узлы и тарифы;
- производные страницы строятся из живых реестров, манифестов и гранул;
- отсутствующие примеры и портфолио называются отсутствующими, а не сочиняются;
- DNS и Mintlify dashboard являются отдельными owner-steps: PR может подготовить
  контракт и проверку, но не объявляет домен живым без внешнего evidence;
- каждый спринт получает отдельные cut, ratification, trail, gate, журнал и LGTM.

## Definition of Done эпика

- [ ] Product PR смёржен и задача `product-mintlify-container` архивирована.
- [ ] Harness заново нарезан после Product, ратифицирован и смёржен отдельным PR.
- [ ] `product.mmbrn.tech` документирован как Product-домен, `harness.mmbrn.tech` как Harness-домен.
- [ ] Device Board, узлы и тарифы доступны только в Product-навигации.
- [ ] У каждой известной мастерской и процедуры есть отдельная Harness-страница.
- [ ] Генераторы имеют check-mode и тесты против расхождения с источниками.
- [ ] Оба PR прошли назначенное командное ревью и формальный closure review.

## Запреты

- Не использовать устаревший [`../TARIFF_MATRIX.md`](../TARIFF_MATRIX.md) как источник тарифов.
- Не вливать смешанную Product/Harness документацию из PR #1620 как есть: изменения
  должны быть разведены и при необходимости пересобраны на свежих ветках.
- Не включать в Sprint 1 перестройку Harness и не проектировать второй интерфейс процедур.
- Не считать публикацией изменение строки домена в репозитории.

## Порядок ролей

1. **Vesnin** держит границы контейнеров, PR и этапные гейты.
2. **Tarasov** нарезает каждый спринт и проверяет непересечение зон.
3. **Dynin** проверяет генераторы, канонические источники и машинные зубы.
4. **Rodchenko** проверяет навигацию, читаемость, mobile/desktop и a11y.
5. **Ozhegov** проверяет названия предметов, доступность текста и честность пробелов.

## Проверка после PR

Команды и визуальные evidence задаются в дочерних промптах. Полный monorepo-прогон
требуется только если изменён общий контракт; docs-only спринты обязаны дать узкий
проверяемый набор и честно перечислить непройденные внешние шаги.
