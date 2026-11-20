# ADR-0032 — Уборщик холодного архива: media хранит журнал и исполняет, office будит и читает через дверь

> **Статус:** DRAFT (предложен) · 2026-11-20 — **merge файла ≠ принятие решения**; ратификация за владельцем (канон каталога `docs/adr/README.md`, шаг 3–4: DRAFT до LGTM владельца → ACCEPTED).
> **Трассируемость:** консилиум `docs/seanses/archive-gc-journal-2026-10-08.md` (вердикты 1–8 — итоговая таблица :122–:145; закрытие «вопрос → решение → зуб» — :211–:236); шторм `docs/storm/storm-archive-gc-questions-2026-10-08/REPORT.md` (Т1–Т6, слово владельца 08.10); план нарезки `docs/sprint/cut/archive-gc-journal-2588.json` (редакция v3, ратифицирована владельцем 18.11, `ratification.digest` 97b250b6…). Решения ниже — фиксация уже ратифицированного и уже лежащего в стволе; новых решений этот ADR не принимает, кроме названия долгов.
> **Родитель:** [ADR-0031](./ADR-0031-downgrade-archive.md) (архив понижения; п.4 «срок — только снимок», «Последствия» — уборка). Эпик #2632 (уборщик с журналом), исходная уборка #2588.

## Контекст

Вечерний протокол 18.11 (Веснин): граница «media хранит журнал — office читает через дверь» к этому дню зафиксирована **кодом** (блоки g1a, g1b, g2, g3a, g3b, g4a, g4b, g5a, g8a–g8c влиты), но не записью решения. Блок g7 (живая приёмка на аккаунте september и затем боевое включение) требует формального контракта: что именно доказывает удаление, кто имеет право будить боевой прогон, что выходит наружу и в каком порядке уборку включают.

Закрытие консилиума (строка 1, :221) предполагало оформить это **дополнением ADR-0031** в блоке g7. Граница сервисов, однако, — отдельное решение со своим жизненным циклом (замок при репликах, ручной триггер, правка двери — каждое потребует пересмотра именно границы, а не архива понижения). Поэтому граница вынесена в этот ADR; дополнение ADR-0031 в g7 остаётся (протокол приёмки, «доказательство = журнал»), ADR-0031 ссылается сюда одной строкой.

Различение словарей (из ADR-0031 и словаря журнала): **downgrade-archive** отвечает «что заморожено», **purge-journal** — «что и как уборщик удалил и чем это доказано» (`purge-journal.vocabulary.ts:7-9`).

## Наблюдаемое состояние (подтверждено кодом)

Ствол `442bd8d1` @ 2026-11-20. Пути — от корня репозитория; сокращения: `DA/` = `packages/background-media/src/modules/downgrade-archive/`, `CAS/` = `packages/background-office/src/modules/cold-archive-sweep/`.

| # | Факт | Где (файл:строка @ 2026-11-20) |
|---|------|--------------------------------|
| Н1 | Журнал — две таблицы media: `ColdArchivePurgeRun` (прогон: trigger, mode, status, снимки флагов, счётчики, `bytesFreed`) и `ColdArchivePurgeJob` (задание: `targetType` batch\|orphan_blob, снимок `storageRefs`, `outcomes`, `attempt`, `nextAttemptAt`, `leaseUntil`) | `packages/background-media/prisma/schema.prisma:363-383`, `:390-403`; миграция `packages/background-media/prisma/migrations/20261008140100_cold_archive_purge_journal/migration.sql` |
| Н2 | Журнал не держит прибор: `deviceId` задания — снимок, не FK; прогон не удаляется, пока есть задания (`RESTRICT`); партия — `NO ACTION` (партии не удаляются, уборка переводит их в `deleted`) | `schema.prisma:393-398`; миграция `…140100…/migration.sql` (хвост: `ColdArchivePurgeJob_runId_fkey` RESTRICT, `…_batchId_fkey` NO ACTION) |
| Н3 | Каскад архива от прибора снят: обе связи `DowngradeArchiveBatch.device` и `DowngradeArchivedSample.device` — `onDelete: Restrict`; глагола удаления прибора в media нет | `schema.prisma:258`, `:297`; миграция `packages/background-media/prisma/migrations/20261008140000_downgrade_archive_device_restrict/migration.sql`; `@Delete` в `packages/background-media/src/**/*.controller.ts` — ни одного на прибор целиком |
| Н4 | Единственный писатель журнала — `PurgeJournalStore` (create/updateMany по Run/Job — только в нём), его единственный потребитель — `PurgeGcRunner` | `DA/purge-journal.store.ts:175,199,222,236,269,288`; `DA/purge-gc.runner.ts:33,57`; провайдеры — `DA/downgrade-archive.module.ts:43-44` |
| Н5 | Порядок по партии: снимок путей в задание **до** `markPurged` → `markPurged` (строки архива + `deleted` одной транзакцией, условно `state='frozen' AND expiresAt<=now`) → `removeWithProof` по каждому пути → итог по политике повторов | `DA/purge-gc.runner.ts:6-9`, `:131-135`, `:137-166`; `DA/downgrade-archive.store.ts:402-418` |
| Н6 | Долг перед новым: live-прогон сперва берёт годные к захвату задания прошлых live-прогонов (≤ 50), затем новые партии (≤ 20 за прогон); задания dry-run долгом не считаются | `DA/purge-gc.runner.ts:38-40`, `:106-128` |
| Н7 | Один активный live-прогон — **замок процесса** (`liveActive`): второй параллельный live-пуск — отказ `purge_run_in_progress`, прогон не открывается, `runId: null`; при репликах нужен замок БД — назван долгом в самом коде | `DA/purge-gc.runner.ts:16-19`, `:52-53`, `:66-69`, `:89`; `DA/downgrade-archive-purge.service.ts:24-28` |
| Н8 | Оборванные рестартом `running` помечаются `abandoned` на старте следующего прогона — **все** прочие `running`, без различения процесса | `DA/purge-gc.runner.ts:78`; `DA/purge-journal.store.ts:217-227` |
| Н9 | Захват задания — по лизу 10 мин; `leaseUntil` — жетон: исход пишется только тем же жетоном, иначе `lease_lost` | `DA/purge-journal.store.ts:41`, `:267-300` |
| Н10 | Доказательство одного пути — stat до и после: `removed` (был → нет), `already_absent` (не было → нет, rm не зовётся), `failed` (есть после rm или наблюдение не удалось); «не смог посмотреть» = «файл есть» | `packages/background-media/src/blob/blob-removal-proof.ts:1-20`, `:42-46`, `:57-80`; `packages/background-media/src/blob/blob-storage.service.ts:73-75` |
| Н11 | Политика повторов: 5 попыток → `dead_letter`; пауза `1 ч · 2^(n−1)`, потолок 24 ч; повтор удаляет заново все пути снимка (уже снятые → `already_absent`) | `DA/purge-retry-policy.ts:15-22`, `:67-73`, `:76-79`, `:99-124` |
| Н12 | Дверь исполнения media: `POST /v1/internal/downgrade-archive/purge-expired`, тело `{dryRun}` обязательно и булево (иначе 400 `dry_run_required`), время только серверное; ответ 200 с `runId` | `DA/downgrade-archive-purge.controller.ts:39`, `:45-52`, `:66-73` |
| Н13 | Двери чтения media (тот же класс-охранник `ApiTokenGuard`): `GET purge-runs?limit`, `GET purge-runs/:id`, `GET purge-runs/:id/verify`, `GET purge-pulse`, `GET purge-schedule?limit`; отказы 400 `invalid_limit` (1..100, умолчание 20), 400 `invalid_run_id`, 404 `run_not_found`; токен — 401 | `DA/downgrade-archive-purge.controller.ts:54-58`, `:75-116`; `DA/purge-journal.dto.ts:11-27`; `packages/background-media/src/common/guards/api-token.guard.ts:13-26` |
| Н14 | Наружу — счётчики, id и булевы: задание отдаёт `pathsTotal` и разбивку исходов, аудит — `pathsExistNow: boolean[]` в порядке снимка, график — `batchId/membraneId/deviceId/expiresAt/frozenBytes`; адресов файлов нет | `DA/purge-journal-read.ts:5-7`, `:44-60`; `DA/purge-journal-verify.ts:6-7`, `:31-39`, `:42-57`; зубы `DA/purge-journal-read.test.ts:65`, `DA/purge-journal-verify.test.ts:77` |
| Н15 | Аудит прогона — «сейчас», а не по записи журнала: задание `clean` ⇔ партия `deleted` ∧ строк архива 0 ∧ ни одного пути снимка на диске; ошибка наблюдения = присутствие | `DA/purge-journal-verify.ts:10-12`, `:21-29`, `:53-54` |
| Н16 | Пульс media: `lastFinishedRunAt`, `lastSucceededRunAt` | `DA/purge-journal-read.ts:75-83` |
| Н17 | Office будит: `@Cron('0 * * * *')` UTC; режим — чистая функция двух флагов: `ENABLED` выкл → `disabled` (media не вызывается, прогона нет); вкл и `DRY_RUN` вкл → `dry-run`; live — только `ENABLED=true` ∧ `DRY_RUN=false` | `CAS/cold-archive-sweep.scheduler.ts:21-29`, `:69-91`; флаги — `packages/background-office/src/config/env.schema.ts:30-43` (ENABLED истинен только для `true`/`1`, DRY_RUN ложен только для `false`/`0`) |
| Н18 | Порядок включения и необратимость задокументированы в `.env.example` office: выкл → dry-run → live только словом владельца после g7; откат мгновенный флагами; переключателя live в панели нет | `packages/background-office/.env.example:50-75` |
| Н19 | Office читает через свою дверь под `@OwnerAdmin` (не-owner → 404): `GET /v1/panel/admin/cold-archive/{sweep-preview, purge-runs, purge-runs/:id, purge-runs/:id/verify, purge-schedule}`; превью жёстко `dryRun:true`; исходы клиента → 503 `media_not_configured`, 502 `media_unreachable`/`media_rejected` (5xx соседа), 4xx media — его статус и код | `CAS/cold-archive-sweep.controller.ts:24-52`, `:54-89`; `packages/background-office/src/modules/panel-auth/panel-auth.decorators.ts:17-18` |
| Н20 | **Шов g5b открыт.** Office шлёт `trigger` в теле (`panel` у превью), но дверь media читает только `dryRun` — исполнитель пишет умолчание `cron`; снимки флагов в прогоне не от office: `enabledSnapshot` всегда `true`, `dryRunSnapshot` = режим запроса. Зуба «trigger доходит до журнала» в media нет | `CAS/cold-archive-sweep.client.ts:21-22`, `:128-137`; `CAS/cold-archive-sweep.controller.ts:16`, `:63`; `DA/downgrade-archive-purge.controller.ts:69-72`; `DA/purge-gc.runner.ts:71` |
| Н21 | Пульса в office ещё нет: ни `cold-archive-pulse.ts`, ни прокси `purge-pulse`; панели журнала нет (`apps/panel/src/components/cold-archive/` отсутствует) — g5b, g6a–g6d не влиты | `CAS/` — 6 файлов (client, controller, module, scheduler + 2 теста); `apps/panel/src/lib/` без `coldArchiveApi.ts` |
| Н22 | Задание `orphan_blob` в словаре и схеме есть, но исполнитель его **не создаёт**: долг файлов после `markPurged` живёт как повтор того же задания `batch` со снимком путей | `DA/purge-journal.vocabulary.ts:24-26`; `DA/purge-gc.runner.ts:133` (только `targetType: 'batch'`), `:156-161` |
| Н23 | Кабинет запрещает удаление узла, пока у прибора есть `frozen`-партия: 409 `node_has_frozen_archive` (ближайший `expiresAt`, число партий); проверка до отзыва ключей; media не ответила внятно → 503 `frozen_archive_check_unavailable` (fail-closed, 404 прибора = архива нет) | `packages/background-cabinet/src/modules/membrane/membrane.service.ts:33`, `:223-245`, `:248-279`; `packages/background-cabinet/src/modules/pair/media-bridge.service.ts:176-205`; UI — `apps/cabinet/src/api/membrane.ts:186`, зуб `apps/cabinet/src/pages/NodesPage.delete-refusal.test.tsx:94` |

## Решение

### Р1 — Владение журналом: media, рядом с архивом
- Журнал уборщика — таблицы `ColdArchivePurgeRun` / `ColdArchivePurgeJob` в БД media (Н1), словарь литералов — один файл `purge-journal.vocabulary.ts`, равенство словаря, схемы и миграции держит `purge-journal.schema.test.ts`.
- **Пишет только исполнитель media** (`PurgeGcRunner` через `PurgeJournalStore`, Н4). Ни office, ни панель, ни кабинет в журнал не пишут и прямого доступа к БД media не имеют.
- Журнал — след, а не кэш: прогоны с заданиями не удаляются (RESTRICT, Н2); журнал не держит прибор (снимок `deviceId`, не FK).
- **Границы:** отдельного хранилища журнала (office, файлы, внешний сервис) нет; `@membrana/core` не трогается — контракт двери живёт в DTO media (`purge-journal.dto.ts`) и в клиенте office.

### Р2 — Метроном и исполнитель: office будит, media делает
- Планирует и будит **только office**: ежечасный cron UTC, режим — функция двух env-флагов (Н17). Отдельного cron у media нет (вердикт 2; `//out-of-scope` плана).
- **Выключено = тишина** (Т6): при `COLD_ARCHIVE_SWEEP_ENABLED` выкл office не зовёт media, прогон не пишется; пропуск отражается не строкой журнала, а режимом `disabled` в пульсе office (g5b).
- Исполняет **только media**: решение «удалять ли» — предикат `state='frozen' AND expiresAt<=now` на серверном времени (Н5, Н12; ADR-0031 п.4); флаги office media не читает — она получает лишь `dryRun` (и, после g5b, `trigger`).
- Один боевой прогон за раз — **замок в пределах процесса** (Н7) поверх лиза задания (Н9). Это корректно, пока media — один процесс (как замок двери `cabinet-register`, ADR-0029). **Границы:** запуск второй реплики media при включённой боевой уборке — запрещён до замены замка (см. Последствия, Д1).

### Р3 — Контракт дверей
- **Исполнение (media, служебная):** `POST /v1/internal/downgrade-archive/purge-expired` под `ApiTokenGuard` (`X-Membrana-Token` = `API_INTERNAL_TOKEN` media = `MEDIA_API_TOKEN` office). Тело: `dryRun` — обязательный булев; умолчания «боевой» нет (400 `dry_run_required`); `now` телом не подменяется. Ответ 200: поля отчёта b6 (`candidates`, `purged`/`purgedIds`, `refused`, `blobs`, `refusal`) + `runId`. Отказ параллельного live — `refusal.reason = 'purge_run_in_progress'`, `runId: null` (Н12, Н7).
- **Чтение (media, служебная, только GET):** `purge-runs`, `purge-runs/:id`, `purge-runs/:id/verify`, `purge-pulse`, `purge-schedule` под тем же охранником класса. Отказы — закрытый список: 401 (токен), 400 `invalid_limit`, 400 `invalid_run_id`, 404 `run_not_found` (Н13).
- **Чтение человеком (office):** только через `v1/panel/admin/cold-archive/*` под `@OwnerAdmin` (не-owner → 404); тело media отдаётся как есть; исходы соседа — 503 `media_not_configured`, 502 `media_unreachable` / `media_rejected`, 4xx media — его статус и код; 500 наружу не идёт (Н19). Отдельной человеческой двери у media нет (вердикт 7).
- **Запрещено наружу:** адреса файлов (`storageRefs`, ключи `outcomes`), токены, URL соседа. По пути — только число путей, разбивка исходов и `pathsExistNow: boolean[]` (Н14). Зуб «нет путей в JSON» обязателен у каждой новой двери этой группы.
- **Запрещено как глагол:** кнопка/дверь боевой уборки в панели; превью панели всегда `dryRun:true` независимо от флагов (вердикт 8, Н19).
- **Стык g5b — в работе (Н20, Н21).** Решение плана: `trigger` (`cron|panel|manual`) приходит от будящего и пишется в прогон как есть; снимки флагов прогона отражают флаги office на момент пуска; пульс office `pulseOf(mode, lastSucceededRunAt, now) → disabled|ok|stale` (порог 2 ч), режим — из флагов office. В стволе на 20.11 дверь media `trigger` из тела **отбрасывает** (всё пишется как `cron`, включая превью панели), `enabledSnapshot` захардкожен `true`. До закрытия шва журнал **не различает** cron и превью панели — читать прогоны `dry_run` как «могло быть превью».

### Р4 — Что считается доказательством удаления
- «Удалено» = **задание закрыто** (`succeeded`) **и** аудит сейчас (`verify`) даёт `clean`: партия `deleted`, строк архива 0, ни одного пути снимка на диске (Н15). Метка партии `deleted` сама по себе — не доказательство (Д4 консилиума); строка лога — тоже (Д1).
- По каждому пути — stat до и после (g2, Н10); `rm force:true` без наблюдения для уборщика запрещён (Д5). Ошибка наблюдения — `failed`, долг остаётся.
- Неснятые пути — долг задания; повтор с паузой; после 5 попыток — `dead_letter`, в v1 только видимость в панели, без оповещений (Т2, Н11).
- Пульс (Т1): при включённой уборке тревога `stale`, если успешного прогона нет > 2 ч; источник — `purge-pulse` media (Н16), вычисление — office (g5b, в работе). Пустой прогон — строка `succeeded` с нулями (вердикт 5).
- **Границы:** замер тома (df) — P2, не входит в доказательство v1.

### Р5 — Безопасность включения и необратимость
- Порядок (Н18): **выключено → `ENABLED=true` при `DRY_RUN=true` (пробные прогоны) → `DRY_RUN=false`**. Шаг 3 — только словом владельца, **после** приёмки g7 (живой сценарий Т4 на аккаунте september: два круга понижения, аудит по журналу, базе и диску через `verify`) и свежей копии базы и тома media. Откат — флагами, мгновенный; уже удалённое он не возвращает.
- Переключателя live в интерфейсе нет и не появится без нового решения (вердикт 8).
- Удаление прибора с архивом запрещено на двух уровнях: схема media — `RESTRICT` обеих связей архива с прибором (g1a, Н3); кабинет — 409 `node_has_frozen_archive` с объяснением и ссылкой на архив, fail-closed при недоступной media (g8b/g8c, Н23).
- **Границы:** выкатка, прод, SSH и смена флагов на проде — не исполнитель блока, а владелец.

## Последствия и открытые долги

| # | Долг | Почему важно | Где закрывать |
|---|------|--------------|---------------|
| Д1 | **Замок при репликах.** `liveActive` (Н7) — память процесса; `markAbandoned` (Н8) помечает `abandoned` **все** чужие `running`, то есть при второй реплике один процесс «оборвёт» живой прогон соседа. Лиз задания (Н9) защищает от двойного rm одного задания, но не от двух параллельных прогонов и не от ложного `abandoned` | Два live-прогона и искажённый журнал — ровно та ложь, от которой журнал строился | ADR о репликах media; до него — **одна реплика media при включённой уборке** (условие Р2) |
| Д2 | **`orphan_blob` vs повтор партии** (Н22). Долг файлов живёт как `retry` задания `batch`; цель `orphan_blob` в словаре и схеме не используется. Следствие: для файлов, осиротевших мимо партии (удаление прибора до g1a, ручная правка БД), задания нет вовсе — их журнал не видит | Словарь обещает больше, чем делает исполнитель; `verify` для `orphan_blob` написан, но кормить его нечем | Решение: либо исполнитель порождает `orphan_blob` (инвентарь диска против строк — новый блок), либо литерал помечается «зарезервирован» в словаре. Не в g7 |
| Д3 | **Триггер ручного запуска.** `manual` есть в словаре, но у него нет ни глагола, ни охраны: служебная дверь доступна любому держателю `API_INTERNAL_TOKEN`, и такой вызов сейчас пишется как `cron` (Н20). Кто имеет право на `manual` live и как это отличить от cron — не решено | Ручной live в обход флагов office — дыра в Р2 («будит только office») | g5b закрывает передачу `trigger`; право на `manual` live — отдельное слово владельца (не v1) |
| Д4 | **Шов g5b** (Р3): `trigger` из тела и снимки флагов office не доходят до журнала | Журнал не различает превью панели и cron | g5b, зуб «trigger тела → `ColdArchivePurgeRun.trigger`» в `downgrade-archive-purge.controller.test.ts` |
| Д5 | **Различие «frozen» и «любой архив»** в запрете удаления: кабинет проверяет только `frozen` (Н23), схема media держит `RESTRICT` на любой строке архива, включая след `deleted` (Н3) | Пока у media нет глагола удаления прибора — расхождение латентно; появится глагол — упрётся в БД без объяснения | Решать вместе с будущим глаголом удаления прибора в media |
| Д6 | Пульс и панель (g5b, g6a–g6d) не влиты (Н21) — Т1 и Т5 в стволе пока только на стороне media | Без пульса «тишина» неотличима от «упало» | Блоки g5b → g6a → g6b → g6c → g6d по `//order` плана |

Прочее: партии `failed` уборка по-прежнему не трогает (слово владельца 05.10); сроки замороженных партий не пересчитываются (ADR-0031 п.4).

## Definition of Done (для блоков, которые этот ADR держит)
- [ ] g5b: `trigger` тела двери media доходит до прогона; снимки флагов — от office; пульс `disabled|ok|stale` с порогом 2 ч; зуб «disabled → 0 вызовов media» сохранён.
- [ ] g6a–g6d: панель только читает; ни одной кнопки удаления; «прогонов ещё не было» ≠ «всё чисто».
- [ ] g7: дополнение ADR-0031 (доказательство = журнал + `verify`) и `CLOSURE.md` приёмки Т4; боевое включение — отдельное слово владельца.
- [ ] Каждая новая дверь группы `/purge-*` — под `ApiTokenGuard` на классе и с зубом «нет путей в JSON».
- [ ] Вторая реплика media при включённой уборке — только после ADR о репликах (Д1).

## Out of scope
- Новый контракт `@membrana/core`, новый пакет, узлы палитры — не вводятся (иначе — консилиум-гейт).
- Отдельный cron у media, live-переключатель в UI, замер тома как доказательство v1 — отвергнуты (вердикты 2, 8, 3).
- Глагол удаления прибора в media.

## Ссылки
- Консилиум: `docs/seanses/archive-gc-journal-2026-10-08.md`
- Шторм: `docs/storm/storm-archive-gc-questions-2026-10-08/REPORT.md`
- План: `docs/sprint/cut/archive-gc-journal-2588.json`
- Связанные ADR: [ADR-0031](./ADR-0031-downgrade-archive.md) (родитель), [ADR-0029](./ADR-0029-cabinet-registration-by-panel-code.md) (образец замка одного процесса и служебной двери)
