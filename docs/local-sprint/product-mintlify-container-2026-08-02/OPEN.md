# Membrana Local Sprint OPEN: product-mintlify-container-2026-08-02

| Поле | Значение |
|------|----------|
| Sprint | `product-mintlify-container-2026-08-02` |
| Procedure | `membrana-local-sprint` |
| Registry task | `product-mintlify-container` |
| Parent epic | `dual-mintlify-product-harness` |
| Issue | [#1622](https://github.com/officefish/Membrana/issues/1622) |
| Prompt | [`PRODUCT_MINTLIFY_CONTAINER_PROMPT.md`](../../prompts/PRODUCT_MINTLIFY_CONTAINER_PROMPT.md) |
| Branch | `codex/product-docs-container` |
| Lead | vesnin |
| Support | dynin · rodchenko |
| Status | implementation and visual preview reviewed · sprint gate pass · exact-SHA closure pending |

Experience record: `miss`, cut accuracy `2/4` (`50%`). Product surface and task
contract stayed within tolerance; tariff projection and execution evidence
overflowed their estimates. See `SEGMENTS.json` and `EXPERIENCE.jsonl`.

## Предмет

Формализовать существующий `apps/docs` как единственный Product-контейнер
Mintlify: Device Board, отдельные страницы узлов и тарифная витрина из живого
канона. Репозиторный доменный контракт меняется с `docs.mmbrn.tech` на
`product.mmbrn.tech`; внешняя публикация остаётся отдельным owner-step.

## Обзор до нарезки

- `apps/docs` уже содержит Product-only документацию Device Board и узлов.
- `apps/docs-harness` уже существует отдельно и обслуживает `harness.mmbrn.tech`.
- Тарифный канон: `docs/tariffs/tariff-grid.json` и `tariff-scalars.json`.
- `docs/TARIFF_MATRIX.md` отражает прежнюю SKU-модель и не является источником.
- PR #1620 смешивает два корпуса; его нельзя вливать в Product как есть.
- Harness зарегистрирован отдельной задачей `harness-workflow-pages`, но будет
  заново нарезан только после закрытия этого спринта.

## Accountable blocks

| Блок | Ответственный | Зона | Выход |
|------|---------------|------|-------|
| `product-surface` | rodchenko | `apps/docs` config/content/domain | Product navigation, link checks, Mintlify preview attempt with explicit external gap |
| `tariff-projection` | dynin | generator, CLI, tests, generated tariff MDX | unit pass, deterministic `--check`, generated diff |
| `task-contract` | vesnin | prompts, task registry, category config | эпик и две независимые карточки без registry drift |
| `execution-and-gates` | vesnin | sprint artifacts, review and closure | exact SHA, cut/trail/journal, focused checks, LGTM |

Подробная машинная нарезка:
[`product-mintlify-container-2026-08-02.json`](../../sprint/cut/product-mintlify-container-2026-08-02.json).

`apps/docs-harness` в этот cut не входит и не меняется. Карточка Harness остаётся
active, но её исполнение заморожено до закрытия Product и новой ратификации.

## Гейты

1. `sprint:cut` подтверждает схему и digest owner-ratification.
2. Каждый блок оставляет `context_run` и профильный `review_pass`.
3. `product-surface`: Mintlify validation, link-check и mobile viewport evidence.
4. `tariff-projection`: unit parsing обоих read-only JSON, deterministic `--check`
   и diff generated MDX.
5. `task-contract`: registry/README sync и task decomposition без uncategorized drift.
6. `execution-and-gates`: branch SHA, procedure evidence и closure manifest.
7. `sprint:gate` запрещает pass без evidence.
8. `procedure-run:journal` записывает предмет, evidence и gaps.
9. Teamlead closure review проверяет точный SHA до архивации.

Точные носители трёх условий Тарасова:

- checklist Product surface уже записан в секции **Definition of Done**
  [`PRODUCT_MINTLIFY_CONTAINER_PROMPT.md`](../../prompts/PRODUCT_MINTLIFY_CONTAINER_PROMPT.md):
  `docs.json`/навигация, link checks и скриншоты desktop/mobile;
- `node scripts/product-docs-tariffs.mjs --check` **ещё не существует**: это
  выход блока `tariff-projection`, а не предрабочий зелёный факт. Контракт выхода:
  бинарный exit `0/1`, рендер без времени, random и сетевого ввода;
- источник истины карточек — `docs/tasks/registry.json`; из него генерируется
  `docs/tasks/README.md`, а `task-list --sync-readme --check` проверяет проекцию.
  `tasks-decompose` читает тот же registry и отдельный
  `scripts/tasks-decompose.config.json`, проверяя полноту категоризации.

## Известные gaps до работы

- `task:start --no-issue` создал prompt stub, но не передал `--no-issue` в
  `task:register`; дочерние карточки пришлось регистрировать прямой командой с
  явным `noIssueReason`. Это пробел инструмента, не scope этого спринта.
- DNS и Mintlify dashboard нельзя подтвердить из репозиторного diff.
- Корневой `README.md` всё ещё описывает `apps/docs` только как Device Board.
  Rodchenko оценил это как P2; файл не входил в ратифицированную write-zone и
  должен быть согласован в Harness sprint вместе с общей картой двух поверхностей.
- Детальная нарезка Harness сознательно отложена, чтобы не протухнуть до второго PR.

## Visual evidence after publication

Локальный Mintlify CLI не смог скачать framework `0.0.3389` из-за повторного
`ECONNRESET`. После публикации PR #1640 облачный `Mintlify Deployment` прошёл,
и preview был проверен в desktop `1440×900` и mobile `390×844`. Четыре снимка и
наблюдения сохранены в [`VISUAL_REPORT.md`](./VISUAL_REPORT.md); первоначальный
локальный сбой остаётся в journal как исторический gap, но visual DoD закрыт.

## Не делаем

- Не строим Harness-страницы мастерских и процедур.
- Не создаём третий docs app и не переносим физически `apps/docs`.
- Не меняем тарифную бизнес-логику, предложения или цены.
- Не объявляем `product.mmbrn.tech` опубликованным без внешнего evidence.
