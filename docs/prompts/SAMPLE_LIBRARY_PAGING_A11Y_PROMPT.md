# Промпт: Доступность органов листания библиотеки проб (Studio + кабинет)

> **Task-промпт** спринта `sample-library-paging-a11y` по процедуре
> [`membrana-local-sprint`](../procedures/membrana-local-sprint/README.md). Размер: **M**.
> Ожидаемый артефакт: **1 PR** (`yarn pr:ship --no-merge`) — оба дома библиотеки + зубы.
> Реестр: `id` = `sample-library-paging-a11y` в [`docs/tasks/registry.json`](../tasks/registry.json).
> Прогон: [`docs/local-sprint/sample-library-paging-a11y/OPEN.md`](../local-sprint/sample-library-paging-a11y/OPEN.md).
> Нарезка: [`docs/sprint/cut/sample-library-paging-a11y.json`](../sprint/cut/sample-library-paging-a11y.json).

---

## Контекст

Пагинация библиотеки проб (PR #2505, `794930f6`) влита 28.09 с критерием про фриз; про
доступность критерий молчал. Верстальщик в вечернем фидбеке назвал пропуск: клавиатура,
`aria-current`, фокус после смены страницы. Чтение ствола показало: `aria-current` стоит на
индикаторе без набора страниц и без живой области; кнопка, запертая под пальцем, в Chromium
роняет фокус на `body` (в кабинете — на каждой смене из-за `loading`).

Два дома — близнецы: `apps/client/src/components/sample-library/SampleLibraryPagination.tsx` и
`apps/cabinet/src/components/sample-library/CabinetSampleTablePagination.tsx`; сверка —
`apps/client/src/modules/sample-library-paging-twins.test.ts`.

**Не трогаем:** `MoveAllToCollectionDialog` (проверен 27.09), `OverflowWindow.tsx` (образец),
`semanticSurfaceContrast.test.ts`, видимый текст индикатора «2 / 27».

## Что построить

1. Индикатор страницы — `role="status" aria-live="polite" aria-atomic="true"` со скрытой фразой
   «Страница N из M, записи A–B из T»; `aria-current` снят.
2. Правило фокуса: остаётся на нажатой кнопке; на краю диапазона — соседняя кнопка; `loading`
   кабинета — `aria-disabled` + `btn-disabled` + `aria-busy` на `nav`, клик гасится, `disabled` не ставится.
3. Клавиатура: родные `<button>`, никаких слушателей на `window`/`document`, стрелок нет.
4. Узкий экран: статический предикат разметки (`flex-wrap`, без `whitespace-nowrap`/фиксированной
   ширины); живой замер 320px — gap без браузера.

## Тесты

| Область | Минимум |
|---------|---------|
| Studio | `sample-library-pagination.test.tsx` (jsdom): статус-фраза, фокус после края, родные кнопки, нет слушателей, разметка |
| Кабинет | новый `CabinetSampleTablePagination.test.tsx` (jsdom): то же + `loading` не роняет фокус и не листает |
| Близнецы | `sample-library-paging-twins.test.ts`: общие слова доступности, запрет `aria-current` у обоих |

Каждый зуб — с порчей, проверенной руками; порча вернулась зелёной → предмет зуба переписан.

## Definition of Done

- [ ] Три решения нарезки ратифицированы владельцем (`sprint:cut` → `contract`).
- [ ] `yarn turbo run typecheck test --filter=@membrana/client --filter=@membrana/cabinet` — зелёный.
- [ ] `sprint:gate` pass по всем блокам, `sprint:experience` записан.
- [ ] `yarn pr:ship --no-merge` → `yarn code-review:pr <N>` → `node scripts/review-gate.mjs --pr <N> --publish`.
- [ ] CLOSURE.md называет gaps (узкий экран без браузера; Chromium «disabled → blur» не в jsdom).

## Out of scope

Набор страниц «1 2 3 …», стрелки внутри нава, общий пакет под один `nav`, мердж.
