# Membrana local sprint log

Хронология локальных спринтов (`sprintKind: membrana-local-sprint` в реестре).
Активный спринт — [`LOCAL_SPRINT_ACTIVE.md`](./LOCAL_SPRINT_ACTIVE.md).

---

## 2026-10-01 — `board-hold-modal-2533` — **CLOSED · gate pass 3/3 · experience hit (предмет 3/3; объём b1 +17 %, b2 +50 % над оценкой, порог 400 не пробит) · PR #2534 влит**

- **Closure:** [`local-sprint/board-hold-modal-2533/CLOSURE.md`](./local-sprint/board-hold-modal-2533/CLOSURE.md) —
  ратификация 30.09 14:51Z инструментом с умолчаниями; b1 `0f4b03bf` (ozhegov), b2 `c20b9a96` (rodchenko); PR #2534 влит
  владельцем 30.09 15:23Z; живая приёмка b3 на приборе `9e86ec85` — три состояния словами владельца (30.09 «окно
  починилось» — жёлтое «место освобождено»; 01.10 — красный «Буфер полон», фаза «по стражу прибора», 1056 проб · 486.5 MB;
  после «Возобновить» — «Удержание снято»). Сервер 01.10 07:17Z: 486.5 / 512 MB.
- **Goal:** окно «Буфер полон», бейдж доски и плашка панели судят место по живой оси причины тем же порогом, что страж
  (`BUFFER_STOP_RATIO`): место освобождено при неснятом удержании → «Место освобождено — снимите удержание»; фаза
  локального эпизода честная — подтверждения сервера при политике `stop` не бывает.
- **Source:** [#2533](https://github.com/officefish/Membrana/issues/2533) — живая проверка владельца 30.09 после вывоза 1057 проб.
- **OPEN:** [`local-sprint/board-hold-modal-2533/OPEN.md`](./local-sprint/board-hold-modal-2533/OPEN.md)
- **Cut:** [`sprint/cut/board-hold-modal-2533.json`](./sprint/cut/board-hold-modal-2533.json) — 3 блока (b1 view-model/ozhegov ·
  b2 поверхности + пакет доски/rodchenko · b3 приёмка/dynin), резчик rodchenko
  ([конспект](./discussions/cut-board-hold-modal-2533-rodchenko.md)); ратифицирован 2026-09-30T14:51:27Z.
- **Finding at cut:** гипотеза #2319 (рестарт media) к окну не относится — канала сервер→клиент об эпизоде нет; «ещё не
  подтверждено сервером» — постоянное состояние любой остановки по стражу 95 % (сервер отказывает при 100 %, после стража
  POST закрыт); 486.7 MB / 512 MB = 95.06 % — первое пересечение порога стража.
- **Not in sprint:** #2319, #2484, счётчик «Записано до остановки», порог стража, авто-снятие удержания, квота наборов,
  кабинет; соседняя находка 01.10 — #2538 (старый предел 512 МБ после смены тарифа).

## 2026-09-30 — `ritual-reads-decisions` — **CLOSED · gate pass 5/5 · experience miss (overflow b1, предмет 5/5)**

- **Closure:** [`local-sprint/ritual-reads-decisions/CLOSURE.md`](./local-sprint/ritual-reads-decisions/CLOSURE.md) —
  ратификация 30.09 15:14+03 инструментом; b1 `9b3a5abc` (+`91e28d71`, `0262e151` по ревью), b2 `85bf1bce`,
  b3 `1663f4ca`, b4 `ecfdbb83`; живая проверка трёх читателей на файлах 28–30.09 при ещё активных карточках
  закрытых спринтов; PR `--no-merge`, мердж — слово владельца.

- **Goal:** решения, принятые в спринтах, доходят до читателей ритуала по машинному носителю: ведомость
  решённого (ратифицированные `//decisions` / `//recut-*` планов нарезки + закрытые прогоны лент ↔ карточки
  реестра) для вечернего фидбека, каркаса дня и зуба утверждений; голова выражения как символ в зубе.
- **Source:** остаток [`ritual-reads-done-work`](./local-sprint/ritual-reads-done-work/CLOSURE.md) (#2514) по
  первому боевому прогону 29.09 (протокол `team-evening-feedback-2026-09-29.md`, утро 30.09).
- **OPEN:** [`local-sprint/ritual-reads-decisions/OPEN.md`](./local-sprint/ritual-reads-decisions/OPEN.md)
- **Prompt:** [`prompts/RITUAL_READS_DECISIONS_PROMPT.md`](./prompts/RITUAL_READS_DECISIONS_PROMPT.md)
- **Cut:** [`sprint/cut/ritual-reads-decisions.json`](./sprint/cut/ritual-reads-decisions.json) — 5 блоков
  (b1 ядро/dynin · b2 порт+вечер/vesnin · b3 каркас дня/ozhegov · b4 зуб утверждений/tarasov · b5 приёмка/angelina),
  резчик ozhegov ([конспект](./discussions/cut-ritual-reads-decisions-ozhegov.md)); ратифицирован владельцем 2026-09-30T15:14:18+03:00.
- **Finding at cut:** за 16–30.09 закрыто 4 прогона спринтов, архивировано 0 карточек — каркас дня читает только
  `status === 'active'`; зуб утверждений видит `NIGHT_RUN_MAX_AGE_MS = 36 ч` как непрозрачную форму при нуле
  вхождений символа в стволе; тело PR (#2506) — не машинный носитель, признанный предел.
- **Boundary:** порядок ритуалов, промпты персон и регламенты, список OUTCOMES зуба, архивация карточек ритуалом,
  тело PR как носитель решений — вне спринта.

## 2026-09-29 — `ritual-reads-done-work` — **CLOSED · gate pass 4/4 · experience hit**

- **Closure:** [`local-sprint/ritual-reads-done-work/CLOSURE.md`](./local-sprint/ritual-reads-done-work/CLOSURE.md) —
  ратификация 15:19+03 инструментом; b1 `b9418242`, b2 `3f1471c9`, b3 `9963fd10`; живая проверка обоих
  `:dry` на документах 29.09 при ещё не исправленном `//date`; PR `--no-merge`, мердж — слово владельца.

- **Goal:** читатели ритуала судят по предмету, а не по документу: проекция ассерций + строка свежести
  для каркаса дня; блок «сделанное, заведённое билетами» + свежесть посылок для вечернего фидбека.
- **Source:** И8, [`PREP_2026-09-28_PRODUCT_AND_TOOLING_WEEK.md`](./PREP_2026-09-28_PRODUCT_AND_TOOLING_WEEK.md) §4
- **OPEN:** [`local-sprint/ritual-reads-done-work/OPEN.md`](./local-sprint/ritual-reads-done-work/OPEN.md)
- **Prompt:** [`prompts/RITUAL_READS_DONE_WORK_PROMPT.md`](./prompts/RITUAL_READS_DONE_WORK_PROMPT.md)
- **Cut:** [`sprint/cut/ritual-reads-done-work.json`](./sprint/cut/ritual-reads-done-work.json) — 4 блока,
  резчик ozhegov ([конспект](./discussions/cut-ritual-reads-done-work-ozhegov.md)); ратифицирован владельцем 2026-09-29T15:19:14+03:00.
- **Finding at cut:** гипотеза «генератор читает архивные ключи» опровергнута замером — архив за
  границей чтения 22k; корень — `//date` застрял на 24.09 и отсутствие факта свежести во входах.
- **Boundary:** порядок ритуалов, формат `main-day-assertions.json`, промпты персон, основание снятия
  с очереди `review:oversized`, `DAILY_CODE_REVIEW` как второй потребитель — вне спринта.

## 2026-09-29 — `sample-library-paging-a11y` — **CLOSED (gate pass 3/3 · experience hit)**

- **CLOSURE:** [`local-sprint/sample-library-paging-a11y/CLOSURE.md`](./local-sprint/sample-library-paging-a11y/CLOSURE.md) —
  прогноз ↔ исход (150/170/50 → 256/306/78, все под порогом), 12 порч красные, ревью Родченко LGTM /
  Дынин BLOCK→LGTM, gap живого замера 320px.

- **Goal:** доступность органов листания библиотеки проб в Studio и кабинете: индикатор как живой
  статус (снять пустой `aria-current`), правило фокуса после смены страницы, клавиатура без
  глобальных слушателей, разметка узкого экрана.
- **Issue:** — (заведётся с первым PR фазы Б)
- **OPEN:** [`local-sprint/sample-library-paging-a11y/OPEN.md`](./local-sprint/sample-library-paging-a11y/OPEN.md)
- **Prompt:** [`prompts/SAMPLE_LIBRARY_PAGING_A11Y_PROMPT.md`](./prompts/SAMPLE_LIBRARY_PAGING_A11Y_PROMPT.md)
- **Cut:** [`sprint/cut/sample-library-paging-a11y.json`](./sprint/cut/sample-library-paging-a11y.json) — 3 блока
  (a1 Studio · a2 кабинет · a3 зуб близнецов), резчик rodchenko
  ([конспект](./discussions/cut-sample-library-paging-a11y-rodchenko.md)); ждёт ратификации владельца.
- **Boundary:** `MoveAllToCollectionDialog` (проверен 27.09), `OverflowWindow`, общий пакет под `nav`,
  стрелки и набор страниц, мердж — вне спринта. Узкий экран без браузера — gap.

## 2026-09-29 — `batch-collection-run-contour` — **IMPLEMENTED (gate pass 4/4 · experience miss)**

- **Goal:** прогон детекторов по коллекции как отдельный live↔batch контур, без повторного
  строительства уже закрытых массового переноса из буфера и пагинации библиотеки.
- **Issue:** [#494](https://github.com/officefish/Membrana/issues/494)
- **OPEN:** [`local-sprint/batch-collection-run-contour/OPEN.md`](./local-sprint/batch-collection-run-contour/OPEN.md)
- **Prompt:** [`prompts/BATCH_COLLECTION_RUN_CONTOUR_PROMPT.md`](./prompts/BATCH_COLLECTION_RUN_CONTOUR_PROMPT.md)
- **CLOSURE:** [`local-sprint/batch-collection-run-contour/CLOSURE.md`](./local-sprint/batch-collection-run-contour/CLOSURE.md)
- **Cut:** [`sprint/cut/batch-collection-run-contour.json`](./sprint/cut/batch-collection-run-contour.json) ·
  ратифицирован владельцем; architecture verdict принят без recut.
- **Gate:** 4/4 `honest_pair`; experience `miss`, runner 514 строк против 390.
- **Delivery:** stacked PR #2517 → #2518 → #2519 → #2520 → evidence; везде `--no-merge`.
- **Boundary:** новый `SampleCollectionRef` / batch-runtime не введён; перенос и пагинация не
  переисполнялись; merge запрещён заказом владельца.

## 2026-09-08 — `tariff-matrix-2333` — **OPEN**

- **Goal:** серверная адаптация к матрице тарифов по принятому M1: версия контракта,
  проекция сетка -> база кабинета, зубы 2/3, проход разноски и один рубильник правды.
- **Issue:** [#2333](https://github.com/officefish/Membrana/issues/2333)
- **OPEN:** [`local-sprint/tariff-matrix-2333/OPEN.md`](./local-sprint/tariff-matrix-2333/OPEN.md)
- **Prompt:** [`prompts/TARIFF_MATRIX_2333_SERVER_ADAPTATION_PROMPT.md`](./prompts/TARIFF_MATRIX_2333_SERVER_ADAPTATION_PROMPT.md)
- **Cut:** [`sprint/cut/tariff-matrix-2333.json`](./sprint/cut/tariff-matrix-2333.json) · ратифицирован владельцем 2026-09-08T20:20:33+03:00
- **Status:** implementation checks pass; awaiting review/PR.
- **Boundary:** M2-M5, `tariff:reseed`, зуб 1, релиз сетки, прибор-край и prod deploy вне этого спринта.

## 2026-09-08 — `tariff-matrix-2331` — **OPEN → closure**

- **Goal:** матрица тарифов в контейнере strategic-docs как единственный источник правды (T13–T16);
  сетка `docs/tariffs/tariff-grid.json` — производная релиза с зубом «сетка = релиз».
- **Task:** `tariff-matrix-2331` ([#2331](https://github.com/officefish/Membrana/issues/2331))
- **OPEN:** [`local-sprint/tariff-matrix-2331/OPEN.md`](./local-sprint/tariff-matrix-2331/OPEN.md)
- **Plan:** [`sprint/cut/tariff-matrix-2331.json`](./sprint/cut/tariff-matrix-2331.json) — 5 блоков,
  две ратификации владельца (v1 12:30 через ведущую; перерезка b3 19:54 напрямую)
- **Консилиум:** [`seanses/tariff-matrix-scalars-fate-2026-09-08.md`](./seanses/tariff-matrix-scalars-fate-2026-09-08.md)
- **Не сделано:** пересев базы и приборов (сид читает скаляры как прежде), режим холодного
  хранилища, переходы между тарифами — заседание `tariff-single-truth` и задание В.

## 2026-08-20 — `media-per-device-token` — **OPEN**

- **Goal:** реализация ADR-0028 Р1+Р2: per-device client key media вместо служебного
  `MEDIA_API_TOKEN` в `PairResponse.mediaToken`, плюс revoke cascade от `pairedKey`.
- **Task:** `media-per-device-token` (Issue с первым PR по DoD)
- **OPEN:** [`local-sprint/media-per-device-token/OPEN.md`](./local-sprint/media-per-device-token/OPEN.md)
- **Prompt:** [`prompts/SESSION_V_PER_DEVICE_TOKEN_SPRINT_2026-08-20.md`](./prompts/SESSION_V_PER_DEVICE_TOKEN_SPRINT_2026-08-20.md)
- **Cut:** [`sprint/cut/media-per-device-token.json`](./sprint/cut/media-per-device-token.json) · ждёт ратификации владельца в чате
- **Boundary:** Р3/Р4, `apps/client`, изменение формы `PairResponse`, prod deploy — вне прогона.

## 2026-08-08 — `static-mmbrn-inventory-export` — **CLOSED**

- **Goal:** offline, read-only Affine source snapshot extractor with sealed exact-set manifest
- **Task:** `static-mmbrn-inventory-export` (#1305-A), parent `static-mmbrn-container`
- **OPEN:** [`local-sprint/static-mmbrn-inventory-export/OPEN.md`](./local-sprint/static-mmbrn-inventory-export/OPEN.md)
- **CLOSURE:** [`local-sprint/static-mmbrn-inventory-export/CLOSURE.md`](./local-sprint/static-mmbrn-inventory-export/CLOSURE.md)
- **Gate:** recut v2 · 3/3 `honest_pair` · 0 findings · focused tests 16/16
- **Boundary:** live source snapshot and INV-1 remain `NOT_PERFORMED`; S5 excluded
- **Delivery:** exact-SHA `0b559221` LGTM · PR #1806 merged as `741a4033` · task archived

---

## 2026-08-02 — `harness-product-deploy-2026-08-02` — **CLOSED**

- **Goal:** отдельные страницы 13 мастерских и 23 процедур, честный marathon debt,
  production deploy Product и Harness
- **Issue:** [#1622](https://github.com/officefish/Membrana/issues/1622)
- **OPEN:** [`local-sprint/harness-product-deploy-2026-08-02/OPEN.md`](./local-sprint/harness-product-deploy-2026-08-02/OPEN.md)
- **CLOSURE:** [`local-sprint/harness-product-deploy-2026-08-02/CLOSURE.md`](./local-sprint/harness-product-deploy-2026-08-02/CLOSURE.md)
- **Delivery:** PR #1650 merged; Product and Harness custom domains verified
- **Prompt:** [`prompts/HARNESS_WORKFLOW_PAGES_PROMPT.md`](./prompts/HARNESS_WORKFLOW_PAGES_PROMPT.md)

---

## 2026-08-02 — `product-mintlify-container-2026-08-02` — **CLOSED**

- **Goal:** формальный Product Mintlify на базе `apps/docs`: Device Board, узлы,
  тарифная проекция и контракт `product.mmbrn.tech`
- **Issue:** [#1622](https://github.com/officefish/Membrana/issues/1622)
- **OPEN:** [`local-sprint/product-mintlify-container-2026-08-02/OPEN.md`](./local-sprint/product-mintlify-container-2026-08-02/OPEN.md)
- **Prompt:** [`prompts/PRODUCT_MINTLIFY_CONTAINER_PROMPT.md`](./prompts/PRODUCT_MINTLIFY_CONTAINER_PROMPT.md)
- **Next:** `harness-workflow-pages` получает свежий cut после закрытия Product

---

## 2026-08-01 — `procedure-run-journal-2026-08-01` — **OPEN**

- **Goal:** журнал прогона процедур: local trail с subject/evidence/gaps, чтобы прогон доказывал покрытие предмета, а не только факт запуска
- **OPEN:** [`local-sprint/procedure-run-journal-2026-08-01/OPEN.md`](./local-sprint/procedure-run-journal-2026-08-01/OPEN.md)
- **Prompt:** [`prompts/PROCEDURE_RUN_JOURNAL_SPRINT_PROMPT.md`](./prompts/PROCEDURE_RUN_JOURNAL_SPRINT_PROMPT.md)
- **F1:** `procedure-run-journal-f1-local-trail` — code pass; local JSONL trail + CLI + tests; report [`F1_REPORT.md`](./local-sprint/procedure-run-journal-2026-08-01/F1_REPORT.md)
- **Review-sprint:** `procedure-run-journal-2026-08-01-code-review` — `sprint:cut` contract, владелец ратифицировал v1/v2/v3, Дынин/Веснин/Ожегов дали LGTM после BLOCK fixes, `sprint:gate` exit 0
- **Procedure note:** исходный проход был blocked из-за отсутствия pre-work frames; закрывающий review-sprint прошёл как отдельный честный прогон с evidence
