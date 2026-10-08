<!-- канал: llm — протокол произведён yarn consilium -->

# Метаданные сеанса

| Поле | Значение |
|------|----------|
| Дата (UTC) | 2026-10-08T11:12:40.818Z |
| Команда | `yarn consilium` |
| Модель | xai/grok-4.5 |
| Файл | `docs/seanses/archive-gc-journal-2026-10-08.md` |
| Порядок ролей | Архитектор → Структурщик → Математик → Верстальщик → Музыкант → Teamlead |
| Повестка | `C:/Users/USER19~1/AppData/Local/Temp/claude/c--Users-user190825-practice-Membrana/76cd8a36-7385-4879-9883-c88a7c362917/scratchpad/gc-agenda.md` |

**Вход сеанса** (что комната действительно получила):

| Вход | Носитель | Размер | Отпечаток | Доставка |
|------|----------|-------:|-----------|----------|
| повестка (эхо в голове) | `C:/Users/USER19~1/AppData/Local/Temp/claude/c--Users-user190825-practice-Membrana/76cd8a36-7385-4879-9883-c88a7c362917/scratchpad/gc-agenda.md` | 3362 | `0b1c8f60726b` | полностью |
| инструкция консилиума | `docs/prompts/CONSILIUM_PROMPT.md` | 4494 | `b6bd1a8dc127` | полностью |
| координация ролей | `docs/VIRTUAL_TEAM_PROMPT.md` | 8034 | `75959c7f060d` | **обрезан** |
| контекст: Архитектура | `docs/ARCHITECTURE.md` | 6034 | `33f0886d9bac` | **обрезан** |
| контекст: Дизайн | `docs/DESIGN.md` | 5998 | `c0c614192971` | полностью |
| контекст: Сервисы | `docs/SERVICES.md` | 6034 | `cf5d799f7980` | **обрезан** |
| архив RAG | — | 12038 | `6dd653523f44` | **не доехал** |
| повестка | `C:/Users/USER19~1/AppData/Local/Temp/claude/c--Users-user190825-practice-Membrana/76cd8a36-7385-4879-9883-c88a7c362917/scratchpad/gc-agenda.md` | 3362 | `0b1c8f60726b` | **не доехал** |

> ⚠ Часть входа не доехала до комнаты целиком. Утверждения протокола о своём входе
> сверять с этой таблицей, а не с текстом реплик.

**Условия прогона:** `--min-replies 30`

**Вопрос:**

Сборщик мусора холодного архива понижения (#2588) с собственным журналом заданий: как доказать, что удаление по сроку действительно происходит? Повестка — 8 пронумерованных пунктов в файле; по КА�ЖДОМУ пункту 1–8 обязательны эхо пункта и вердикт одной строкой в итоге, без вердикта пункт считается упавшим.

---

# Консилиум: GC холодного архива с журналом заданий (#2588)

**Повестка:** доказать, что удаление по сроку действительно происходит; форма GC с собственным журналом; 8 пунктов повестки → вердикты для нарезки (код не пишется).

**Участники:** Teamlead (Tarasov), Архитектор (Vesnin), Структурщик (Ozhegov), Математик (Dynin), Музыкант (Kuryokhin), Верстальщик (Rodchenko).

**Порядок реплик:** Архитектор → Структурщик → Математик → Верстальщик → Музыкант → Teamlead

---

[Архитектор]: Конструкция ясна из слова владельца 08.10 и дыр Д1–Д6: нынешний office-cron + `purgeExpired` даёт **строку лога**, не **вещдок**. Журнал заданий — отдельная лемма рядом с архивом в **media** (владелец байт и строк). Два уровня: **Run** (прогон тика) и **Job** (единица работы = партия или orphan-долг). Без Run нет ответа на «прогона не было»; без Job нет долга по файлу. Рекомендация: форма «journal-first GC», ADR-дополнение к 0031 п.4, не новый сервис.

[Структурщик]: Словарь: не смешивать `DowngradeArchiveBatch`, `PurgeRun`, `PurgeJob`. Журнал — таблицы в media schema рядом с `downgrade-archive.store`, публичный API — internal HTTP + узкая panel-дверь через office. Office остаётся **пусковиком** (как сейчас), media — **исполнителем и владельцем журнала**. Прямой импорт office→store media запрещён; только контракт `POST .../purge-expired` расширяется до «создай/продолжи run». Слабая связанность: флаги env остаются в office, факт исполнения — в media.

[Математик]: Инвариант уборки из консилиума 05.10 и ADR-0031: `expiresAt = frozenAt + retentionDays`, предикат `now >= expiresAt` — не трогаем. Доказательство удаления — не «метка `deleted`», а тройка чисел на job: `bytesBefore`, `rmResult ∈ {removed, already_absent, failed}`, `existsAfter: false` (stat). Run-агрегат: `jobs.total/ok/failed`, `bytes.freed`, `blobs.failed`. Идемпотентность: повторный capture того же `batchId` в статусе `purged` = no-op с тем же вещдоком, не второй rm-цикл «наугад».

[Верстальщик]: Человеку нужен **читаемый след**, не дашборд ради дашборда. v1 — одна панель OwnerAdmin: список последних N run (время, dryRun/live, counts, статус), раскрытие run → jobs с итогами. Конструктивизм: `tabular-nums`, badge статуса (`success` / `warning` / `error` / `dry-run`), без графиков тома. Empty state: «прогонов ещё не было» ≠ «всё чисто» — разные подписи.

[Музыкант]: С потока артефактов: media уже владеет файлами на диске; GC — тот же контур, что freeze/thaw, не параллельный «чистильщик в office». Порядок 06.10 «сначала строки, потом файлы» для live-партии оставляю, но журнал обязан **до** rm зафиксировать `storageRef` snapshot — иначе после markPurged вещдок пути потерян (Д2). Orphan = job без batch-строк, только path+reason. Каскад device (Д6) — отдельный producer orphan-долгов, не молчаливый Cascade.

[Teamlead]: Планка владельца: «удаление по сроку **действительно** происходит». Нынешний sweep — тренировка (лог), не матч (вещдок). Связка на нарезку: Веснин форма/ADR → Ожегов schema+API → Дынин предикаты/идемпотентность/тесты → Курёхин порядок blob/rm → Родченко panel read-only после контракта. Вердикт сессии: **идём в journal-GC в media**, office-пусковик сохраняем. Код сегодня не пишем — только вердикты 1–8.

[Архитектор]: Пункт 1 — где живёт журнал. Вариант A: media co-located (цена = миграции media, выигрыш = одна транзакционная граница с archive). Вариант B: отдельная БД (цена = distributed truth, рано). Беру A. Схема: `ColdArchivePurgeRun` + `ColdArchivePurgeJob`. Job.target: `batch` | `orphan_blob`. Обязательные поля Run: `id`, `startedAt`, `finishedAt?`, `trigger` (cron|panel|manual), `mode` (dryRun|live), `status`, counters. Job: `runId`, `targetType`, `batchId?`, `storageRefs[]`, `status`, `rmOutcomes[]`, `attempts`, `lastError?`.

[Структурщик]: Уточняю леммы. Задание **не** только партия: (1) batch-job по `ArchiveBatch` frozen+expired; (2) orphan-job по долгу path. Прогон = Run, всегда создаётся, даже empty. `purgeExpired` становится **оркестратором run**, не «тихо почистил». Имена без синонимов: не `SweepLog` рядом с `PurgeRun`. Индекс: `(status, nextAttemptAt)` для захвата; unique `(runId, batchId)` где batchId not null.

[Математик]: Пункт 2 — идемпотентность численно. Lease: `claimedAt`, `claimedBy`, `leaseUntil`. Захват: `UPDATE ... WHERE status='pending' AND (leaseUntil IS NULL OR leaseUntil < now) RETURNING`. Двойной cron office: второй POST видит active Run в окне тика → join/ignore по политике `one active run per mode`, не параллельные live-run. Повтор job: maxAttempts (константа, v1 = 5); backoff; после лимита `status=dead_letter`, счётчик виден. At-least-once на rm + stat-after = безопаснее exactly-once-фантазии.

[Верстальщик]: Пункт 7 заранее: минимум v1 — office panel read-only (уже есть `sweep-preview` как dry-run дверь). Расширить до «история run» + «детали job», без кнопок live-purge в UI v1 (включение — словом владельца и env, не кнопкой «удалить всё»). Media «дверь» для человека — не нужна; иначе два словаря статусов.

[Музыкант]: Физическое удаление: `rm({force:true})` (Д5) маскирует absent. Нужен явный путь: `stat` до → `unlink` без глотания ENOENT как «успех без различия» → `stat` после. В журнал: per-ref `beforeExists`, `afterExists`, `action`. «Уже не было» = отдельный outcome `already_absent` (подозрение orphan/race), не смешивать с `removed`. Замер volume filesystem — optional secondary, не блокирует DoD v1; per-file proof важнее df.

[Teamlead]: Фиксирую спор «df vs stat»: v1 DoD = stat-after по каждому ref + запись в job; volume — P2/observability. Кто против — сказать сейчас. Молчание = принятие. Дальше пункт 3–4 без расползания в мониторинг дисков кластера.

[Архитектор]: Пункт 3 — вещдок = строки job outcomes + rollup run. «Удалено» в домене = batch `deleted` **и** все refs `afterExists=false` (или dryRun: «было бы»). Если markPurged прошёл, а blob failed — batch не должен врать `deleted` без оговорки: либо delayed mark после blobs, либо status `purged_records_blob_pending`. Цена смены порядка: ведущая 06.10 сказала строки→файлы против orphan DB; журнал снимает страх — можно **сначала snapshot refs в job, потом строки, потом файлы**.

[Структурщик]: Порядок v2: (0) create Run; (1) select candidates; (2) insert Jobs со snapshot `storageRefs`; (3) per job live: transaction markPurged; (4) rm+stat; (5) finalize job; (6) finalize run. Dry-run: 0–2 + would-be counters, без mark/rm. Оборачиваем `purgeExpired`, не плодим второй cron-path. Флаги office: `ENABLED` default off, `DRY_RUN` default on — судьба: **сохранить**; live только когда ENABLED && !DRY_RUN и journal умеет mode=live.

[Математик]: Пустой прогон (пункт 5): Run с `jobs.total=0`, `status=succeeded`, `finishedAt` — обязателен. Сторож пульса: не «лог cron», а предикат `last_finished_run_at >= now - 2h` (при ENABLED); нарушение = alert/metric, в v1 хотя бы panel badge «пульс просрочен». Пропущенный час при ENABLED=false — не инцидент; при ENABLED=true и тишине — инцидент. Различать `trigger skipped by flag` (office может писать skipped-run через soft endpoint) vs media down.

[Верстальщик]: Пульс на UI: один индикатор в шапке секции cold-archive — `ok` / `stale` / `disabled`. Текст «GC выключен» vs «GC включён, последнего успешного run > 2ч» — без цвета-alone (иконка+текст). Детали stale ведут к списку run. Это v1 minimum, DESIGN tokens, OwnerAdmin only.

[Музыкант]: Пункт 4 — orphan. Источники: failed rm после markPurged; Д6 cascade device delete; ручной мусор. Долг в журнале до `afterExists=false` или dead_letter. После лимита: visible dead_letter queue (panel) + path list для ops; авто-rm не молчать. Д6: убрать «немой» Cascade на archive samples **или** before-delete hook, который создаёт orphan jobs по storageRef — иначе архитектура вечно дырявая. Предпочтение: **Restrict/SetNull + явный GC path**, не Cascade.

[Teamlead]: Д6 — BLOCK на «оставим Cascade как есть». В нарезке блок «device delete vs archive» обязателен. Владельцу не подкладываем сюрприз «прибор удалили — диски полные, журнала нет». Принимаем: orphan-pipeline + политика FK. Дальше пункт 6 — отношение к текущей уборке.

[Архитектор]: Пункт 6: **оборачивает** `purgeExpired`, не параллельный GC. Office cron будит media; media сам по cron в v1 **не** дублируем (один метроном — проще pulse). Идемпотентность на стороне media. Флаги office без ломки: preview panel всегда dryRun. ADR-0031 п.4 дополнить: «доказательство = journal run/job, не syslog».

[Структурщик]: Контракт media internal: `POST /v1/internal/downgrade-archive/purge-expired` → ответ расширить `runId` + summary; `GET .../purge-runs` + `GET .../purge-runs/:id` для panel proxy. Office `cold-archive-sweep` модуль: при ENABLED создаёт/запрашивает run; при выкл — опционально `skipped` audit (один row) чтобы Д3 не повторить. Не тащить journal schema в office Prisma.

[Математик]: Безопасность пункта 8 — как state machine: `disabled → dryRun enabled → live`. Переход live: явные условия (1) слово владельца зафиксировано в задаче/ADR note; (2) N успешных dry-run подряд с ненулевой выборкой на staging или со счётчиком would-delete; (3) panel pulse green; (4) `DRY_RUN=false` только после (1–3). Обратный переход — мгновенный. Live без journal finalize = запрещён конфигурацией (code assert).

[Верстальщик]: UI не даёт toggle live в v1 — только отображение текущего mode из health/config endpoint (read-only). Иначе кнопка «включить удаление» в panel соблазнит обойти слово владельца. Copy: «Необратимое удаление. Режим: dry-run/live/выкл». Alert-warning на live.

[Музыкант]: Согласен: live не из UI. На диске audio-артефакты (samples) — потеря = конец истории сигнала; dry-run first не церемония, а обязательный rehearse. Ещё: batch size и rate-limit rm, чтобы тик не стопорил media event-loop — job chunks, не один гигантский await-all.

[Teamlead]: Нарезка блоков ≤400 строк (вход плана): (B1) Prisma run/job + store; (B2) wrap purgeExpired + lease; (B3) rm/stat outcomes + orphan; (B4) FK/D6 policy; (B5) office proxy+flags+skipped; (B6) panel read-only; (B7) tests идемпотентности/empty run/pulse predicate; (B8) ADR note + rollout checklist. Parallel: B1→B2→B3; B4 отдельно; B5 после API; B6 после GET. Вердикты 1–8 — ниже таблицей, без «зависит».

[Архитектор]: Сводка формы: journal в media; run+job; office trigger; proof=stat-after; orphan+D6 закрыты; empty run пишется; wrap not replace; panel office RO; enable ladder owner-gated. Цена альтернативы «только улучшенный лог» — снова Д1–Д3 через ротацию. Отклоняем. Нужен короткий ADR-0031a илиamend, не новый номер ради тщеславия — на усмотрение при нарезке.

[Структурщик]: Имена полей обязательные (п.1) — закрепляю: Run:`id, mode, trigger, status, startedAt, finishedAt, enabledSnapshot, dryRunSnapshot, jobsTotal, jobsSucceeded, jobsFailed, jobsDeadLetter, bytesFreed, errorSummary?`. Job:`id, runId, targetType, batchId?, deviceId?, storageRefs, status, attempt, leaseUntil?, outcomes jsonb, bytesFreed, lastError?`. Без этого schema-срез не стартует.

[Математик]: DoD численный: (1) dry-run run persists; (2) live job с tmp-file test: afterExists false; (3) повтор purge того же batch — 0 rm, status kept; (4) empty run row exists; (5) maxAttempts→dead_letter; (6) cascade/restrict test — нет «тихого» wipe samples without job. Без UI e2e в math-пакете — unit store+pure pulse predicate.

[Верстальщик]: DoD UI: OwnerAdmin страница/секция cold-archive: таблица runs, drawer jobs, pulse badge, mode badge; a11y aria-label на статусах; loading/empty/error. Не блокирует backend-merge: panel отдельным блоком после GET.

[Музыкант]: DoD blob: outcomes различают removed/already_absent/failed; orphan queue не пустой при forced fail inject в тесте. Принимаю порядок snapshot→rows→files.

[Teamlead]: Все шесть на «Принимаю» по таблице. Пункт без одной строки вердикта = упал — секретарь заполняет эхо+вердикт по 1–8. LGTM на **решение консилиума** как вход нарезки #2588; LGTM на код — после блоков. Матч = journal proof, не cron log.

[Архитектор]: Принимаю итог. Граница: media владеет истиной GC; office — метроном и зеркало panel.

[Структурщик]: Принимаю. Словарь Run/Job/orphan зафиксирован; cascade Д6 — отдельный блок нарезки.

[Математик]: Принимаю. Инварианты expiresAt, stat-after, empty run, pulse predicate — в тестах.

[Верстальщик]: Принимаю. Panel RO v1, без live-toggle.

[Музыкант]: Принимаю. Snapshot refs до markPurged; orphan после лимита виден.

[Teamlead]: Принимаю. Исполнение — связка по B1–B8; красный прогон без journal row = BLOCK. Консилиум закрыт.

---

## Итоговое решение консилиума

| # | Эхо пункта | Вердикт (одна строка) |
|---|------------|------------------------|
| 1 | Где живёт журнал (media/отдельно), схема: задание = партия/прогон/оба; обязательные поля | **media co-located:** `PurgeRun` + `PurgeJob` (batch и orphan); run всегда, job = единица долга; обязательные поля — id/mode/trigger/status/timestamps/counters у run; targetType/refs/outcomes/attempts у job. |
| 2 | Кто планирует/исполняет; идемпотентность, лиз, двойной пуск | **office-пусковик будит media-исполнителя** (media-cron v1 нет); lease+claim на job; один active live-run; повтор идемпотентен по batchId/outcome. |
| 3 | Доказательство физического удаления: stat / volume / оба; вещдок в журнале | **v1: stat до/после на каждый ref → outcomes в job + rollup run; volume/df — P2, не DoD.** |
| 4 | Orphan: долг, лимит, после лимита, видимость; Д6 cascade device | **orphan-job до success/dead_letter (maxAttempts=5), dead_letter в panel; Д6: убрать немой Cascade — Restrict/hook + orphan jobs (BLOCK иначе).** |
| 5 | След пропущенного/сорвавшегося; empty run; сторож пульса | **empty run — обязательная строка; pulse = last success run при ENABLED (порог ~2h) + опциональный skipped-run при флаге выкл; media-down ≠ тишина без следа.** |
| 6 | Отношение к purgeExpired; порядок строки/файлы; флаги office | **оборачивает purgeExpired; snapshot refs → mark строк → rm/stat; флаги ENABLED off / DRY_RUN on сохраняются.** |
| 7 | Где виден журнал человеку — минимум v1 | **office OwnerAdmin read-only: список run + детали job + pulse/mode; live-кнопок нет; отдельной human-двери media нет.** |
| 8 | Безопасность: owner word, dry-run first, порядок dry-run→live | **disabled → dry-run → live только словом владельца + N успешных dry-run + green pulse; UI live-toggle запрещён; откат мгновенный.** |

**Definition of Done (для плана нарезки, код не в этом сеансе):**
- Schema Run/Job в media + wrap `purgeExpired` с `runId` в ответе.
- Per-ref outcomes (`removed` \| `already_absent` \| `failed`) + empty run persistence.
- Orphan path + политика FK против Д6.
- Office: флаги, proxy GET runs, skipped/pulse; panel RO.
- Тесты: идемпотентность, stat-after, dead_letter, pulse predicate.
- ADR-0031 amend: proof = journal, не syslog.
- Rollout checklist: dry-run first → owner gate → live.
- Блоки нарезки ≤ 400 строк (B1–B8 выше).

**Решение целиком:** да — journal-first GC в media с office-метрономом; вход в план нарезки #2588 без кода в этой задаче.

---

*Реплик в диалоге: 36; каждый участник высказался не менее одного раза.*

---

## Полное эхо повестки (сборка)

# Повестка: сборщик мусора холодного архива с собственным журналом заданий (#2588)

## Слово владельца 08.10

«Убеждаемся в том, что удаление по истечении срока действительно происходит. Полагаю, для
этого нам нужен специальный garbage collector, который умеет работать по своему собственному
журналу заданий».

## Что есть в стволе (сверено по коду 08.10)

- office `packages/background-office/src/modules/cold-archive-sweep/`: ежечасный `@Cron('0 * * * *')`
  UTC; два флага env — `COLD_ARCHIVE_SWEEP_ENABLED` (выкл по умолчанию → media не зовём) и
  `COLD_ARCHIVE_SWEEP_DRY_RUN` (вкл по умолчанию). Тик зовёт media
  `POST /v1/internal/downgrade-archive/purge-expired {dryRun}`. Итог — ТОЛЬКО строка лога; отказ
  media — warn и «следующий час». Ручка панели `GET /v1/panel/admin/cold-archive/sweep-preview`
  (OwnerAdmin) — всегда dryRun. Флагов нет в `.env.example` office.
- media `downgrade-archive-purge.service.ts` + `downgrade-archive.store.ts`: кандидаты —
  `state='frozen' AND expiresAt<=now`; по партии: (1) читаем `storageRef` строк,
  (2) `markPurged` — удаление строк `DowngradeArchivedSample` и метка партии `deleted` одной
  транзакцией, (3) удаление файлов `rm(..., {force:true})`. Неудача файла — только счётчик
  `blobs.failed` в ответе и warn в логе.
- ADR-0031 п.4: срок — снимок в партии (`expiresAt = frozenAt + retentionDays`), уборка по
  предикату `now >= expiresAt`; пуск — office cron с выключателем и dry-run.

## Дыры (найдены при сверке)

- Д1. Итог прогона нигде не сохраняется (лог ротируется).
- Д2. Осиротевший файл теряется навсегда: строк уже нет, повтор его не видит.
- Д3. Пропущенный (office лежал, флаг выкл, media 502) или сорвавшийся прогон следа не оставляет.
- Д4. «Удалено» = метка партии `deleted`, а не доказанное отсутствие файлов и освобождённое место.
- Д5. `rm force:true` молчит при отсутствии файла — «успех» не отличает «удалил» от «уже не было».
- Д6. У `DowngradeArchivedSample.device` стоит `onDelete: Cascade`: удаление прибора сносит строки
  архива мимо уборки — файлы осиротеют без единой записи.

## Пункты (по КАЖДОМУ — эхо пункта и вердикт одной строкой; без вердикта пункт считается упавшим)

1. Где живёт журнал заданий (media рядом с архивом / отдельно) и его схема: задание = партия?
   прогон? оба? Какие поля обязательны.
2. Кто планирует и кто исполняет: office-пусковик будит media / media сам по cron;
   идемпотентность и повтор (лиз/захват задания, двойной пуск).
3. Доказательство физического удаления: проверка отсутствия каждого файла (stat после rm),
   замер объёма тома, или оба. Что пишется в журнал как вещдок.
4. Осиротевшие файлы: долг в журнале до успеха; лимит повторов; что после лимита; видимость.
   Отдельно — Д6 (каскад при удалении прибора).
5. След пропущенного/сорвавшегося прогона: пустой прогон тоже строка? как обнаружить «прогона не
   было» (сторож пульса)?
6. Отношение к нынешней уборке: заменяет / оборачивает `purgeExpired`; порядок «сначала строки,
   потом файлы» (решение ведущей 06.10) — сохраняется ли; судьба флагов office.
7. Где виден журнал человеку (панель office? дверь media?) — минимум v1.
8. Безопасность: удаление необратимо — включение только словом владельца, dry-run первым;
   какой порядок включения и какие условия перехода dry-run → live.

Код в этой задаче НЕ пишется: итог консилиума — вход для плана нарезки (блоки ≤ 400 строк).

---

## Закрытие: вопрос → решение → зуб

*Дописано сессией производства 08.10 после прогона (не LLM-текст протокола). Каждый вопрос, оставленный
в репликах открытым или «на усмотрение», сведён к решению плана нарезки
`docs/sprint/cut/archive-gc-journal-2588.json` и к зубу, который его держит. Где решение — за
владельцем, это сказано прямо: такие строки ведут в `//owner-questions` плана и НЕ считаются закрытыми
до его слова.*

| # | Вопрос из реплик | Решение | Зуб |
|---|------------------|---------|-----|
| 1 | Архитектор: «ADR-0031a или amend — на усмотрение при нарезке» | Дополнение ADR-0031 (не новый номер): доказательство = журнал, не лог; `purge-journal` ≠ `downgrade-archive` | блок g7, зона `docs/adr/ADR-0031-downgrade-archive.md` |
| 2 | Архитектор: при сбое файла — отложенная метка партии или статус `purged_records_blob_pending`? | Ни то, ни другое: порядок снимок путей → строки → файлы (вердикт 6), партия `deleted`, долг путей переходит в задание `orphan_blob` | g3b `purge-gc.runner.test.ts` — сбой rm ⇒ задание-долг с путём; g3a `purge-retry-policy.test.ts` |
| 3 | Музыкант / Teamlead: Д6 — `Restrict` или ловушка «перед удалением прибора — задания orphan» | План: `onDelete: Restrict` на обеих связях архива с прибором (g1a). **Подтверждение — за владельцем** (`//owner-questions` п.3) | g1a `purge-journal.schema.test.ts` |
| 4 | Резчик / Структурщик: где контракт пульса (core?) | media отдаёт `lastFinishedRunAt`/`lastSucceededRunAt`; office считает `disabled/ok/stale` чистой функцией; core не трогается | g5 `cold-archive-pulse.test.ts` |
| 5 | Математик / Структурщик: писать ли «пропущенный» прогон, когда office выключен флагом | v1 — НЕ писать: решение владельца 05.10 «выключено = тишина» сохраняется, пульс показывает `disabled` из режима office. **Подтверждение — за владельцем** (п.6) | `cold-archive-sweep.scheduler.test.ts` (выкл ⇒ 0 вызовов media) + g5 pulse-тест `disabled` |
| 6 | Математик: maxAttempts=5, порог пульса ~2 ч, N успешных dry-run «на staging» | Значения внесены в план как предложение. **Числа — за владельцем** (п.1, п.2, п.4) | g3a (константа попыток), g5 (константа порога) |
| 7 | Музыкант: размер партии и ограничение темпа rm, чтобы тик не держал цикл событий media | Не больше K партий за прогон (константа) | g3b DoD «партий за прогон ≤ K» |
| 8 | Верстальщик: «пустое состояние ≠ всё чисто» | Разные подписи в разделе панели | g6b `ColdArchiveJournalBoard.test.tsx` |

**Замечание о входе сеанса.** Таблица метаданных отмечает «повестка — не доехал» для хвостового эха; головное
эхо той же повестки доехало полностью (`0b1c8f60726b`, 3362 байт), и все 8 пунктов получили вердикт в итоговой
таблице. Дрейфа повестки нет — перезапуск не потребовался.
