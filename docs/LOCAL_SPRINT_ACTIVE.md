# Active membrana-local-sprint

Текущий локальный sprint-route: [`membrana-local-sprint`](./procedures/membrana-local-sprint/README.md).

## Focus

- **capture-sidecar-protocol** (без Issue до ратификации формы) · RATIFIED ·
  IMPLEMENTATION PENDING · [`OPEN.md`](./local-sprint/capture-sidecar-protocol/OPEN.md) — форма
  спутника, порядок съёмки, fail-closed глагол и живая приёмка на записи узла.

- **dump-inventory-from-archive** ([#1814](https://github.com/officefish/Membrana/issues/1814)) ·
  gate pass 4/4 honest_pair (закрыт первым заходом) · прогноз↔исход **hit** ·
  [`OPEN.md`](./local-sprint/dump-inventory-from-archive/OPEN.md) —
  опись дампа читается из содержимого артефакта (манифест v2, конвейер
  lib/archive-inventory), живая приёмка на proof-стенде, дрилл подтвердил откат.
  Строка 2 хендофа 09.08. Первый прогон, где обязательность записи прогноза (ADR-0026)
  сработала по построению.

- **s-queue-tail-2026-08-10** (без Issue: S-очередь дня) ·
  gate pass 3/3 honest_pair · прогноз↔исход записан (`miss`, b3 406>400) ·
  [`OPEN.md`](./local-sprint/s-queue-tail-2026-08-10/OPEN.md) —
  хвост очереди S хендофа 09.08: вердикт долга typecheck (карточка
  `fix-node-modules-links-1647`), ADR-0026 amnesty-by-schema, гейт обязательности записи
  «предсказание ↔ исход» в execution-gate; долг мостика `forecast-record-step-optional`
  repaid. Шоту предикат отказал (capability_chaining).
- **review-diff-explicit-base** ([#1771](https://github.com/officefish/Membrana/issues/1771)) ·
  gate pass 3/3 honest_pair · [`OPEN.md`](./local-sprint/review-diff-explicit-base/OPEN.md) —
  ревью читает дифф с ЯВНОЙ базой (`gh pr diff` из тракта убран), вердикт несёт `base:`
  рядом с head, гейт сверяет базу исходом `unknown`. Строка 7 хендофа 08.08.
- **tariff-concurrent-move-reason** ([#1777](https://github.com/officefish/Membrana/issues/1777)) ·
  gate pass 1/1 honest_pair · PR #1813 merged (`ff13a0bd`) ·
  [`OPEN.md`](./local-sprint/tariff-concurrent-move-reason/OPEN.md) —
  параллельная смена тарифа отвечает своей причиной `tariff_moved_concurrently`, а не
  `same_tariff`. Строка 4 хендофа 08.08; шоту предикат отказал (touches_server).

- **feedback-claims-code-probe** ([#1795](https://github.com/officefish/Membrana/issues/1795)) ·
  gate pass 3/3 honest_pair · [`OPEN.md`](./local-sprint/feedback-claims-code-probe/OPEN.md) —
  сверка утверждений вечернего протокола с деревом (`yarn feedback:claims`), врезка третьим
  звеном в хвост вечера, предикат ласточки на `hard`. Долг попугая
  `#team-feedback-claims-code-unverified`, строка 5 хендофа 08.08.
- Standing marathon `workflow-examples-marathon` остаётся отдельным маршрутом накопления
  evidence.

## Предыдущий спринт

- **static-mmbrn-inventory-export** (#1305-A) · CLOSED · gate pass 3/3
  `honest_pair` · PR #1806 merged ·
  [`CLOSURE.md`](./local-sprint/static-mmbrn-inventory-export/CLOSURE.md). Live
  production read и S5 остаются за пределами этого спринта.

- **deploy-procedures** · gate pass 3/3 honest_pair · журнал закрыт производителем ·
  [`OPEN.md`](./local-sprint/deploy-procedures/OPEN.md) — две процедуры деплоя по
  серверам (`deploy-office-vds`, `deploy-media-vps`), обёртка `deploy:run`, врезка в
  `cabinet:deploy:prod` и `vds:run`; ADR-0023 ACCEPTED.

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
