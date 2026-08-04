# Active membrana-local-sprint

Текущий локальный sprint-route: [`membrana-local-sprint`](./procedures/membrana-local-sprint/README.md).

## Focus

- Активного локального спринта нет. Standing marathon `workflow-examples-marathon`
  остаётся отдельным маршрутом накопления evidence.

## Предыдущий спринт

- **sprint-dictionary-to-lib** (#1681) · gate pass 2/2 honest_pair · PR #1706 merged ·
  [`OPEN.md`](./local-sprint/sprint-dictionary-to-lib/OPEN.md) — словарь прогона
  спринта в lib + структурный `orphanedBy`; журнальный close невозможен (ложный
  fail от коллизии ратификаций, #1705).
- **run-journal-sequence-validator** (#1683) · gate pass 1/1 · журнал закрыт
  производителем (close pass) ·
  [`OPEN.md`](./local-sprint/run-journal-sequence-validator/OPEN.md) — валидатор
  монотонности sequence уровня ленты.

- **harness-product-deploy-2026-08-02** · CLOSED
  [`CLOSURE.md`](./local-sprint/harness-product-deploy-2026-08-02/CLOSURE.md) ·
  Harness PR #1650 и production deploy двух Mintlify-проектов.
- **product-mintlify-container-2026-08-02** · код и task closure доставлены PR
  #1640/#1646; production custom domain закрыт Harness-спринтом.

## Ранее

- **procedure-run-journal-2026-08-01** · F1 code pass + review-sprint gate pass ·
  F2/F3 не заведены.

## Правило

Новые локальные задачи спринта регистрируются с `sprintKind: "membrana-local-sprint"`.
Старые `day-sprint` записи остаются историей, но не используются как новый вход.
