# Membrana Local Sprint OPEN: library-reconcile-on-open-2569

| Поле | Значение |
|------|----------|
| Sprint | `library-reconcile-on-open-2569` |
| Procedure | `membrana-local-sprint` |
| Issue | [#2569](https://github.com/officefish/Membrana/issues/2569) — Библиотека сэмплов сверяет коллекции с сервером при открытии (базовый набор зависит от тарифа). Соседняя находка — [#2570](https://github.com/officefish/Membrana/issues/2570) (ложное «Media-server недоступен» при загрузке) |
| Registry | карточка НЕ заведена (регистрация `sprintKind: membrana-local-sprint` — руками ведущей) |
| Cut | [`library-reconcile-on-open-2569.json`](../../sprint/cut/library-reconcile-on-open-2569.json) — **НЕ ратифицирован**. Фаза 1: дайджест `5fc3defe…`, `sprint:cut` → ровно одна находка `plan_unratified` |
| Cutter | dynin → [`cut-library-reconcile-on-open-2569-dynin.md`](../../discussions/cut-library-reconcile-on-open-2569-dynin.md) · лента актов [`trail/library-reconcile-on-open-2569.jsonl`](../../sprint/cut/trail/library-reconcile-on-open-2569.jsonl) |
| Lead | dynin (b1) |
| Support | angelina (модератор, гейт, b2) · владелец (ратификация, живая приёмка) |
| Branch / tree | `fix/library-reconcile-on-open` от `origin/main` `508d7275` · `Membrana-sanitation-b` |
| Status | OPEN · фаза 1 (разбор и план), ждёт ратификации владельца |

## Слово владельца (03.10)

> «базовый набор по планам тарифов зависит от выбранного тарифа… поэтому, полагаю, коллекции должны пересматриваться при открытии библиотеки».

> «при проверке можно изначально уточнять остался ли тариф тем же и более глубокое обновление делать только при смене тарифа».

## Причина (ствол `508d7275`, замер 03.10)

- `MediaLibraryService.init()` (`media-library-service.ts:211`) однократный. Открытие модуля (`SampleLibraryModule.tsx:115` →
  `useMediaLibrary` → `hooks.ts:28-37` → `init()`) после старта — пустой вызов: мост уже инициализировал сервис
  (`mediaLibraryHubBridge.ts:67`). Сверки с сервером при открытии нет.
- Тики моста (30 с) и опрос кабинета (60 с) при живом сервере зовут только `refreshQuota()` (#2538).
- Полный `refresh()` (`:126`) — не выход: пробы КАЖДОЙ коллекции, серверный `listSamples` (`server-storage-backend.ts:587`)
  листает по 40 последовательно. Буфер 8360 проб = **209 GET, ≈3–4 МБ**; плюс 3 GET системного набора, 27 GET набора
  d2609; квота — последней. «Пагинация» #2505 в Studio — нарезка на клиенте, транспорт тянет всё.
- Сервер `POST ensure-reserved` идемпотентен, переименовывает заводское имя, **возвращает список коллекций**
  (клиент ответ выбрасывает). `GET /collections` несёт `sampleCount`. `GET /quota` несёт `dataset.catalogId`, но
  `StorageQuota` его выбрасывает (#2563).
- Кабинет-близнец: `cabinetMediaLibrary.ts:35-51` кэширует сервис по `deviceId`; повторный вход внутри SPA — пустой
  `init()`. Первый вход тоже делает полный `refresh()` с 209 GET буфера (вне спринта).

## Механика (умолчание исполнителя и резчика)

`MediaLibraryService.reconcileOnOpen()`:

- сервис не инициализирован → `init()` и всё (дубля с первым открытием нет);
- иначе **лёгкая сверка**: `ensureReservedCollections` + `listCollections` + `getQuota` — 3 малых запроса, 0 списков проб;
  `collections` снимка заменяются (имена, `sampleCount`), `samplesByCollection` не трогается;
- **глубже** — только если `quota.dataset.catalogId` сменился относительно запомненного в памяти сервиса, или
  `sampleCount` системного набора разошёлся с загруженным списком (фоновый досев): перечитать пробы **только системного
  набора** (120 = 3 GET). Буфер — никогда;
- параллельные вызовы сливаются в один промис (StrictMode в dev монтирует дважды);
- запомненный каталог — в памяти сервиса; перезапуск и так делает полное чтение, на диск не пишется.

Вызов — `SampleLibraryModule`, эффект на монтирование (`[service]`), не в хуке `useMediaLibrary`: хук зовут ещё 5 панелей
плагинов и 2 места кабинета. Кабинет — тот же вызов при входе на страницу библиотеки. Поле `dataset?` в `StorageQuota` —
первая половина #2563; порт `IStorageBackend` не меняется.

Цена на приборе 9e86ec85: открытие — 3 малых запроса (сейчас 0, полный `refresh()` ≈ 240 GET и ≈4 МБ).

## #2570 — корень (разобран в этом плане, исполнение — развилка 6)

1. Начальный снимок любого сервиса (`media-library-service.ts:50-62`) — `backend: 'browser-limited'`,
   `serverReachable: false`, 100 МБ: «ещё не прочитано» неотличимо от «запасной локальный». Серверный сервис держит это
   до конца первого `refresh()`, где квота читается **последней**, после 209+ GET проб — отсюда «несколько секунд».
2. До подмены `getDefaultMediaLibraryService()` (`:466`) лениво создаёт настоящий browser-limited сервис, а
   `resolveMediaLibraryBackend.ts:56` пингует media до 3 раз (задержки 400/800 мс).
3. `resolveMediaLibraryStorageMode` (`quota-status.ts:13-17`) всё не-серверное зовёт `browser-limited-fallback`, баннер
   (`MediaLibraryQuotaBanner.tsx:13-15,54`) печатает «Media-server недоступен».

Закрытие: явная фаза загрузки в снимке → режим `loading` → баннер «Загрузка коллекций с сервера…»; квота первой в
`refresh()`; предупреждение — только по факту отказа (`attachService` вернул `false` → запасной бэкенд).

## Порча на стволе `508d7275` (временные файлы, прогнаны vitest, удалены)

| Зуб | Утверждение | Ствол |
|---|---|---|
| P1 | сервис инициализирован; открытие → `ensureReservedCollections` 1 раз, `listSamples` 0 | **красный**: `expected "ensureReservedCollections" to be called 1 times, but got 0 times` |
| P2 | сервер сменил имя системного набора после старта → после открытия имя новое | **красный**: `expected 'Базовый набор' to be 'Renamed-by-server'` |
| P3 | `getQuota()` несёт `dataset.catalogId` из `/quota` | **красный**: `expected undefined to be 'checkpoint-v1-catalog'` |
| P4 (#2570) | сервис с серверным бэкендом до первого чтения ≠ `browser-limited-fallback` | **красный**: `expected 'browser-limited-fallback' not to be 'browser-limited-fallback'` |

Добавлены резчиком в DoD b1: P1' (3 малых запроса), P1'' (два параллельных вызова → один залп), P2' (досев → только
системный набор), P3' (смена каталога → системный набор перечитан), P3'' (смена каталога → `listSamples(__buffer__)` = 0),
зуб источника (сверка не в `hooks.ts`). Исполнителем — P1''' (неинициализированный сервис → один `init`, без второй сверки).

## Блоки

| Блок | Persona | Зона | Оценка |
|---|---|---|---|
| b1 `reconcile-on-open` | dynin | `media-library-service.ts`, `types.ts`, `backends/server-storage-backend.ts`, зубы `test/media-library.test.ts`, `test/server-storage-backend.test.ts`, новый `test/library-reconcile-on-open.test.ts`; `apps/client/src/modules/SampleLibraryModule.tsx`; `apps/cabinet/src/lib/useCabinetSampleLibrary.ts` | 220 строк |
| b2 `live-check-closure` | angelina | `docs/local-sprint/library-reconcile-on-open-2569/`, `LOCAL_SPRINT_ACTIVE.md`, `LOCAL_SPRINT_LOG.md`, `sprint/experience/…segments.json` | 100 строк |

Порядок b1 → b2. Точка перерезки в b1: понадобилось менять порт `IStorageBackend` или серверный контроллер, либо
пробы буфера нужны заново — стоп и перерезка.

**b2 — живая приёмка владельцем** на приборе 9e86ec85 **без перезапуска Studio**, сценарий письменно в `CLOSURE.md`:
(1) тариф тот же — открыть библиотеку: в devtools ensure-reserved 1, `GET /collections` 1, `GET /quota` 1, `…/samples` 0;
(2) имя системного набора — «Базовый набор»; (3) смена каталога до M5 не воспроизводима — только зубы P3'/P3'';
(4) при развилке 6а — холодный старт: «Загрузка коллекций с сервера…» вместо жёлтого «Media-server недоступен».

## Что НЕ входит

Пересев набора по тарифу, наполнение checkpoint/observatory (M5); миграция данных; бейдж каталога (#2563, кроме поля
снимка); постраничная загрузка буфера с сервера в Studio (209 GET при старте — отдельный долг); смена порта
`IStorageBackend`; сервер; реакция на смену `tariffId` в опросе кабинета; двойной ensure-reserved внутри `init()`.

## Развилки на слово владельца

1. **Строгость сверки (ключевая).** (а) строго: тот же каталог → кроме `/quota` ничего; случай 03.10 (сервер переименовал
   набор после выкатки БЕЗ смены тарифа) **этим не чинится**. (б) **умолчание**: лёгкая сверка всегда (3 малых запроса,
   0 списков проб), глубокая — только при смене каталога или досеве. Порча под (б): при неизменном — списков проб 0,
   ensure-reserved 1; при сменённом — ensure-reserved 1 и пробы только системного набора.
2. **Чем сверять «тот же тариф»:** **`catalogId` из `/quota`** (умолчание; квота уже читается раз в 30 с; тариф ≠ каталог)
   или `tariffId` сопряжения (слой приложения, в кабинете нет).
3. **Запросы лёгкой сверки:** **ensure + список коллекций, порт не трогать** (умолчание) или ответ ensure-reserved как
   список (−1 запрос, меняется порт у трёх бэкендов).
4. **Кабинет:** **в b1** (умолчание, ≈10 строк) или отдельным билетом.
5. **Поле `dataset` (#2563):** **в b1, #2563 сужается до бейджа** (умолчание) или ждать #2563 — тогда без ветки по каталогу.
6. **#2570:** (а) слить в b1 одной зоной — ≈380 строк одним PR, приёмка + шаг (4); вторым кодовым блоком нельзя —
   `sprint:cut` даёт `zones_overlap` (те же три файла); (б) **умолчание** — отдельный спринт сразу после слияния b1:
   ≈220 + ≈160 строк, у #2570 своя приёмка холодного старта; разбор и порча P4 уже здесь.
7. **Загрузка буфера целиком при старте (209 GET):** завести отдельный билет?
