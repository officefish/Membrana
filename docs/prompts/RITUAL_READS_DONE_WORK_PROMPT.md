# Промпт: Ритуал читает сделанное — проекция ассерций для каркаса дня, билеты-результаты для вечернего фидбека

> **Task-промпт для агента-разработчика.** Процедура: [`membrana-local-sprint`](../procedures/membrana-local-sprint/README.md).
> Размер задачи: **M**. Ожидаемый артефакт: **1 PR** (`--no-merge`, мердж — слово владельца).
> Реестр: `id` = `ritual-reads-done-work` в [`docs/tasks/registry.json`](../tasks/registry.json); фазы `ritual-reads-done-work-b1…b4`.
> Прогон: [`docs/local-sprint/ritual-reads-done-work/OPEN.md`](../local-sprint/ritual-reads-done-work/OPEN.md).
> Нарезка: [`docs/sprint/cut/ritual-reads-done-work.json`](../sprint/cut/ritual-reads-done-work.json) · резчик ozhegov →
> [`cut-ritual-reads-done-work-ozhegov.md`](../discussions/cut-ritual-reads-done-work-ozhegov.md).

---

## Контекст

Долг **И8** недельного плана ([`PREP_2026-09-28_PRODUCT_AND_TOOLING_WEEK.md`](../PREP_2026-09-28_PRODUCT_AND_TOOLING_WEEK.md) §4):
читатель ритуала судит по документу, а не по предмету. Два симптома одного класса:

1. **Вечерний фидбек не видит результатов архитектурных разборов.** 27.09 два слота по PR #2488 и
   #2489 нашли настоящее (несовместимые подписи `moveSamplesBatch` на шве двух PR, дубль 745 строк
   против ратифицированного запрета); результаты легли в билеты #2492–#2498. Фидбек
   (`scripts/team-evening-feedback.mjs`) читает `DAY_DOC_INPUTS` + git-сводку дня + гейт — билетов
   ни в одном входе нет. Итог: 26, 27, 28.09 и каркас 29.09 требуют слот, сделанный 27.09.
2. **Каркас дня утверждает ложное о перечеканке.** `scripts/_main-day-issue.mjs` подкладывает
   `docs/tasks/main-day-assertions.json` как текст через `readBounded(…, 22_000)` — файл 115 531 байт.
   В окне видно `//date` = «Перечеканено 24.09» и `sources[0].date = 2026-09-29`; `//recut-29-09` и
   архивные ключи — за границей чтения. Модель разрешает противоречие в пользу `//date`. Факт свежести
   (`magistralFreshness`, тот же предикат, что у `yarn main-day-probe`) в генератор не подаётся.

**Не трогаем:** порядок шагов `ritual-day-run.mjs` / `ritual-evening-run.mjs`; формат и архивные ключи
`main-day-assertions.json` (след решений владельца); промпты персон и регламенты; основание снятия PR
с очереди `review:oversized`; состав `DAY_DOC_INPUTS` (добавляются вычисляемые факты, не документы).

**GitHub Issue:** заведётся с первым PR после ратификации нарезки владельцем.

---

## Что построить

| Блок | Персона | Предмет |
|------|---------|---------|
| b1 `assertions-projection` | ozhegov | `scripts/lib/main-day-assertions-view.mjs` — чистая проекция файла ассерций для промпта каркаса: `sources[0]` дословно, `assertions[]`, строка свежести через **тот же импорт** `magistralFreshness` из `scripts/lib/main-day-magistral-freshness.mjs`, счёт мета/архивных ключей числом без содержимого. Провод в `_main-day-issue.mjs` вместо сырого дампа. |
| b2 `done-ledger-core` | dynin | `scripts/lib/review-done-ledger.mjs` — чистое ядро «книга сделанного»: PR ↔ билеты, ссылающиеся на `#PR` и созданные не раньше дня мерджа. Без ФС, сети и часов. |
| b3 `evening-reads-done-work` | vesnin | Провод в вечер: блок «Сделанное, заведённое билетами» (порт `review-done-ledger-port.mjs`: git log oversized за окно + `gh issue list`) и строка свежести посылок — в промпте ДО документов дня. Недоступный порт печатается словами, не пустотой. |
| b4 `live-check-closure` | angelina | Живая приёмка на сегодняшних документах (`main-day-issue:dry`, `team-evening-feedback:dry`), `sprint:gate`, `sprint:experience`, `CLOSURE.md`. |

**Запрещено:** вторая копия предиката свежести (grep на дубль = красный); снятие PR с очереди oversized
по билету (только аннотация); правка промптов персон и регламентов; правка порядка ритуалов.

---

## Тесты (зуб без порчи — не зуб)

| Область | Минимум |
|---------|---------|
| b1 | фикстура с `//date` 24.09 + `sources[0]` сегодня + гейт сегодня → блок несёт `aligned`, не несёт «Перечеканено 24.09»; сырой дамп той же фикстуры зуб роняет |
| b2 | билет до дня мерджа — не результат; PR без билетов — «разбор не заведён»; `#24880` ≠ `#2488` |
| b3 | при входах 27–29.09 промпт вечера несёт «#2488 → билеты #2492 #2493 #2494»; отказ порта печатается словами |
| b4 | живые `:dry` на сегодняшних файлах, выдержки в `CLOSURE.md` |

---

## Definition of Done

- [ ] Нарезка ратифицирована владельцем (`yarn sprint:cut --plan docs/sprint/cut/ritual-reads-done-work.json` → `contract`).
- [ ] b1–b4 исполнены в своих зонах; `node --test` по новым зубам зелёный; `yarn sprint:gate` pass; `yarn sprint:experience` записан.
- [ ] Живая проверка: `yarn main-day-issue:dry` несёт «свежесть посылок: aligned»; `yarn team-evening-feedback:dry` несёт билеты #2492–#2498 напротив #2488/#2489.
- [ ] `yarn pr:ship --no-merge`, `yarn code-review:pr <N>`, `node scripts/review-gate.mjs --pr <N> --publish`.

## Out of scope

- Ремонт застрявшего `//date` в `main-day-assertions.json` — долг чеканщика, не читателя.
- `DAILY_CODE_REVIEW` как второй потребитель книги сделанного — отдельное слово.
- Изменение основания снятия с очереди `review:oversized` — развилка на слово владельца.
- Замена host-local артефакта ревью (`docs/discussions/pr-*-code-review.md` в .gitignore) — отдельный долг очереди.
