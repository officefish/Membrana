# Active membrana-local-sprint

Текущий локальный sprint-route: [`membrana-local-sprint`](./procedures/membrana-local-sprint/README.md).

## Focus

- **evening-reads-done-work-20261002** (магистраль 02.10; PR #2551) ·
  ратифицирован 02.10 10:26:49+03 инструментом · b1 (vesnin) + b2 (tarasov) + b3 (angelina) —
  **gate pass 3/3 `honest_pair`; experience hit (3/3, overflow 0/3)** · [`OPEN.md`](./local-sprint/evening-reads-done-work-20261002/OPEN.md) ·
  [`CLOSURE.md`](./local-sprint/evening-reads-done-work-20261002/CLOSURE.md) — вечер и code-review больше не получают
  пустой oversized по #2543/#2544: #2544 несёт report+plan, #2543 — AUDIT+plan+experience; `code-review:pr` печатает
  provenance документов дня (`cwd`, `git-root`, SHA файлов). Сдача `pr:ship --no-merge`; мердж — слово владельца.
- **device-quota-after-tariff-2538** ([#2538](https://github.com/officefish/Membrana/issues/2538)) ·
  ратифицирован 01.10 08:35:59Z инструментом с умолчаниями · b1 `2b09b9f3` (dynin) + b2 `4133dfcc` (vesnin) — PR #2541
  **влит владельцем** 01.10 (`00257180`) · живая приёмка b3 на приборе `9e86ec85` (Studio `00257180`): лимит 2.00 GB по
  обеим осям, строка «предел сервера прочитан 20:05:41», сервер 17:14Z 1945.6/2048 МБ совпадает; «Место освобождено» при
  2 ГБ и бейдж после «Возобновить» — n/a (не наблюдались) · **gate pass 3/3 `honest_pair`** · experience **miss** по
  правилу инструмента (точность 2/3: b1 425 строк > порога 400; по предмету 3/3) ·
  [`CLOSURE.md`](./local-sprint/device-quota-after-tariff-2538/CLOSURE.md) · [`OPEN.md`](./local-sprint/device-quota-after-tariff-2538/OPEN.md) —
  предел прибора читается лёгким `refreshQuota()` с моментом чтения (строка возраста в окне, отказ чтения не стирает
  предел и помечается «снимок от …»); тики связанного режима (30 с / 60 с) и смена `tariff.id` в опросе кабинета
  перечитывают предел — смена тарифа доезжает до прибора без действий оператора. Карточки в реестре нет; Issue закрывает
  вечерний хвост. Выделено: #2540 «cabinet unreachable». Попутная находка со снимка (в работу не взята): бейдж в шапке
  доски перекрыт галкой «INFO».

- **board-hold-modal-2533** ([#2533](https://github.com/officefish/Membrana/issues/2533)) ·
  ратифицирован 30.09 14:51Z инструментом с умолчаниями · b1 `0f4b03bf` + b2 `c20b9a96` — PR #2534 **влит владельцем**
  30.09 15:23Z · живая приёмка b3 — три состояния словами владельца 30.09/01.10 · **gate pass 3/3 `honest_pair`** ·
  experience **hit** по правилу инструмента (порог 400 не пробит), объём над оценкой у b1 (+17 %) и b2 (+50 %) назван в
  [`CLOSURE.md`](./local-sprint/board-hold-modal-2533/CLOSURE.md) · [`OPEN.md`](./local-sprint/board-hold-modal-2533/OPEN.md) —
  окно «Буфер полон», бейдж доски и плашка панели читают место по живой оси причины: при освобождённом месте и
  неснятом удержании — «Место освобождено — снимите удержание» (жёлтое), фаза локального эпизода — «удержание · по
  стражу прибора (до отказа сервера не дошло)». Карточки в реестре нет; Issue закрывает вечерний хвост. Соседняя
  находка #2538 (старый предел после смены тарифа) — вне спринта.

- **ritual-reads-decisions** (продолжение ritual-reads-done-work #2514; Issue с первым PR) ·
  ратифицирован 30.09 15:14+03 инструментом · **gate pass 5/5 honest_pair** · прогноз↔исход **miss** по объёму b1
  (495/400), по предмету 5/5 · [`OPEN.md`](./local-sprint/ritual-reads-decisions/OPEN.md) ·
  [`CLOSURE.md`](./local-sprint/ritual-reads-decisions/CLOSURE.md) — решённое доходит до читателей ритуала по
  машинным носителям: ведомость решённого (ядро + один порт) даёт вечеру блок «Решённое» после книги сделанного,
  каркасу дня — исключение карточек закрытых спринтов с посылкой «долг закрытия», зубу утверждений — голову
  выражения как символ и «решено: …» в причине. Живьём 30.09 при активных карточках: batch и trace-freeze вне top-3,
  `aria-current` несёт якорь решения, `NIGHT_RUN_MAX_AGE_MS = 36 ч` → не подтверждено. Четыре карточки закрытых
  спринтов — архивировать ведущей. Сдача `pr:ship --no-merge`; мердж — слово владельца.

- **ritual-reads-done-work** (И8 недельного плана 28.09; Issue с первым PR) ·
  ратифицирован 29.09 15:19+03 · **gate pass 4/4 honest_pair** · прогноз↔исход **hit** (4/4) ·
  [`OPEN.md`](./local-sprint/ritual-reads-done-work/OPEN.md) · [`CLOSURE.md`](./local-sprint/ritual-reads-done-work/CLOSURE.md) —
  два читателя ритуала судят по документу, а не по предмету: каркас дня получает проекцию ассерций
  со строкой свежести предикатом probe (вместо сырого файла, обрезанного 22k из 115k); вечер получает
  блок «сделанное, заведённое билетами» (архитектурные слоты 27.09 по #2488/#2489 → #2492–#2498).
  Порядок ритуалов, формат ассерций, промпты персон и основание снятия с очереди oversized — вне спринта.

- **sample-library-paging-a11y** (Issue — с PR) ·
  ратифицирован 29.09 15:13+03 · gate pass 3/3 `honest_pair` · experience `hit` (3/3) ·
  [`OPEN.md`](./local-sprint/sample-library-paging-a11y/OPEN.md) · [`CLOSURE.md`](./local-sprint/sample-library-paging-a11y/CLOSURE.md) —
  доступность органов листания библиотеки проб в обоих домах: индикатор → живой статус вместо
  пустого `aria-current`, фокус не падает на `body` (край → соседняя кнопка; `loading` кабинета без
  `disabled`), клавиатура без глобальных слушателей; 12 порч красные. Gap: живой замер 320px без
  браузера. Сдача `pr:ship --no-merge`; мердж — слово владельца.
- **batch-collection-run-contour** ([#494](https://github.com/officefish/Membrana/issues/494)) ·
  gate pass 4/4 `honest_pair` · experience `miss` (3/4, runner overflow) ·
  [`OPEN.md`](./local-sprint/batch-collection-run-contour/OPEN.md) ·
  [`CLOSURE.md`](./local-sprint/batch-collection-run-contour/CLOSURE.md) — read-only прогон
  детекторов по коллекции на существующих `CollectionSampleReader` и plugin request; перенос и
  пагинация признаны уже закрытыми стволом. Стек #2517 → #2518 → #2519 → #2520 → evidence;
  все PR без merge.

- **tariff-matrix-2333** ([#2333](https://github.com/officefish/Membrana/issues/2333)) ·
  implementation checks pass, awaiting review/PR · [`OPEN.md`](./local-sprint/tariff-matrix-2333/OPEN.md) —
  серверная адаптация к матрице тарифов по принятому M1: версия контракта на `Tariff`/`Device`,
  S6 проекция сетка→база, зуб 3 `Tariff`↔`Device`, проход разноски и один рубильник правды.
- **sanitation-2026-08-20** ([#2009](https://github.com/officefish/Membrana/issues/2009)) ·
  gate pass 9/9 honest_pair · прогноз↔исход hit (9/9) · [`OPEN.md`](./local-sprint/sanitation-2026-08-20/OPEN.md) —
  шесть вердиктов oversized-PR (все LGTM, находки → #2020); смоук подъёма графа DI media/office в CI
  (судит dist — esbuild не эмитит design:paramtypes) + правило @Optional в каноне; веха secret-parser-built:
  критерии 1–2 закрыты, критерий 3 эскалирован владельцу с ценой (#2022).
- **media-per-device-token** (без Issue до первого PR; ADR-0028 Р1+Р2) ·
  cut awaiting owner ratification · [`OPEN.md`](./local-sprint/media-per-device-token/OPEN.md) —
  media выдаёт per-device client key вместо служебного `MEDIA_API_TOKEN` в `PairResponse.mediaToken`;
  revoke `pairedKey` каскадно отзывает media-key. Р3/Р4, `apps/client`, форма `PairResponse` и prod deploy вне спринта.

- **capture-sidecar-protocol** (без Issue: след доставки — локальный спринт) · GATE PASS 4/4
  `honest_pair` · experience `hit` · [`OPEN.md`](./local-sprint/capture-sidecar-protocol/OPEN.md) —
  форма спутника, порядок съёмки, fail-closed глагол и живая приёмка на записи узла.

- **contour-sanity-2026-08-19** ([#1972](https://github.com/officefish/Membrana/issues/1972)) ·
  gate pass 7/7 honest_pair · прогноз↔исход hit (7/7) · [`OPEN.md`](./local-sprint/contour-sanity-2026-08-19/OPEN.md) —
  санитария контура прогонов: диагноз красного rag-теста (Дынин) → решение; ревью-долг #1951/#1953
  протоколами персон (Веснин/Курёхин); хвосты #1972 и синглтон импорта в хосте (Ожегов).
  Диагноз: красный — часы под параллельным turbo, не поиск; PR #1983/#1984 + хвосты/синглтон.

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

- **tariff-matrix-2331** ([#2331](https://github.com/officefish/Membrana/issues/2331)) · CLOSED ·
  PR #2334 merged (`f5dcc7f4`) · [`OPEN.md`](./local-sprint/tariff-matrix-2331/OPEN.md) —
  матрица тарифов как единственный источник правды: гранулы по ресурсу с паспортами,
  шаблон `tariff-matrix`, релиз, указатель `docs/TARIFF_MATRIX.md`, пересев сетки
  из релиза и зуб `tariff:grid`.

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
