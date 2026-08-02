# Промпт: Product Mintlify — Board, узлы и тарифы

> Task-промпт `product-mintlify-container`. Размер: **M**.
> Ожидаемый артефакт: один PR в рамках `membrana-local-sprint`.
> Родитель: `dual-mintlify-product-harness`, Issue
> [#1622](https://github.com/officefish/Membrana/issues/1622).

## Контекст

`apps/docs` уже является продуктовой Mintlify-поверхностью: в ней есть Device Board,
концепции, cookbook и страницы узлов. Спринт закрепляет этот существующий дом как
Product-контейнер, переносит договорённость с `docs.mmbrn.tech` на
`product.mmbrn.tech` и добавляет понятную страницу тарифов.

Канон тарифов — `docs/tariffs/tariff-grid.json` и `tariff-scalars.json`.
`docs/TARIFF_MATRIX.md` содержит прежнюю модель SKU и годится только как исторический
контекст. Публичная страница должна генерироваться из живого канона и явно показывать
provisional-поля.

## Промпт целиком

Следуй `docs/procedures/membrana-local-sprint/README.md` и исполни ратифицированную
нарезку `product-mintlify-container-2026-08-02`.

Построй формальный Product-контейнер на базе `apps/docs`:

1. Назови поверхность и её границу Product; не создавай новое Mintlify-приложение.
2. Сохрани и проверь страницы Device Board и отдельных узлов.
3. Добавь тарифную страницу, генерируемую из `tariff-grid.json` и
   `tariff-scalars.json`; покажи три живых предложения, ограничения и provisional.
4. Добавь generate/check-маршрут и тест, который ловит ручное расхождение страницы.
5. Переведи доменный контракт и setup-инструкцию на `product.mmbrn.tech`.
6. Убери из Product-навигации мастерские и процедуры, если смешанный PR #1620
   пытался разместить их здесь.
7. Проверь Mintlify-конфиг, ссылки, читаемость и отсутствие наложений на desktop/mobile.

## Архитектурный контракт

| Слой | Путь | Ответственность |
|------|------|-----------------|
| Product surface | `apps/docs/**` | Публичные страницы продукта и Mintlify-навигация |
| Tariff canon | `docs/tariffs/tariff-grid.json`, `docs/tariffs/tariff-scalars.json` | Единственный источник продуктовых предложений |
| Projection | `scripts/lib/product-docs-tariffs.mjs` | Чистое чтение, валидация и рендер MDX |
| CLI | `scripts/product-docs-tariffs.mjs` | `generate` и `--check`, без скрытой публикации |
| Procedure evidence | `docs/local-sprint/product-mintlify-container-2026-08-02/**` | OPEN, отчёты ролей и закрытие спринта |

## Тарифная страница

- Читатель должен понять различия предложений без чтения JSON.
- Имена, лимиты и entitlement берутся из живого канона, а не перепечатываются в коде.
- `provisional` и другие незавершённые условия видны человеческим языком.
- Отсутствующая цена не заменяется выдуманной суммой.
- Внизу есть короткая ссылка на Device Board как предмет тарификации.

## Definition of Done

- [ ] `apps/docs` явно описан как Product-контейнер и не смешан с Harness.
- [ ] В навигации доступны обзор Product, Device Board, узлы и тарифы.
- [ ] Тарифный MDX воспроизводимо генерируется из двух канонических JSON.
- [ ] Check-mode падает на drift, а unit-тест покрывает минимум нормальный и ошибочный вход.
- [ ] Старый `docs/TARIFF_MATRIX.md` не используется генератором.
- [ ] Репозиторный доменный контракт называет `product.mmbrn.tech`.
- [ ] Внешний DNS/dashboard шаг указан как невыполненный, пока нет evidence.
- [ ] Mintlify validate/link checks и узкие script tests зелёные.
- [ ] Desktop и mobile проверены скриншотами; текст и навигация не перекрываются.
- [ ] Dynin, Rodchenko и Vesnin увидели назначенные зоны и оставили review evidence.
- [ ] `sprint:gate`, `procedure-run:journal` и Teamlead closure review дают LGTM.

## Out of scope

- Страницы мастерских и процедур, их портфолио и примеры.
- Реализация или изменение тарифной бизнес-логики.
- Новые SKU, цены или entitlement.
- Фактическое изменение DNS/Mintlify dashboard без отдельного разрешения владельца.
- Перенос файлов `apps/docs` в новый физический каталог.

## Проверка после PR

```bash
node scripts/product-docs-tariffs.mjs --check
node --test scripts/product-docs-tariffs.test.mjs scripts/verify-mintlify-docs.test.mjs
yarn docs:validate
yarn docs:links
```

Если реальные имена package scripts отличаются, использовать существующие узкие
команды `apps/docs` и записать точные команды в отчёт спринта; не сочинять зелёный прогон.
