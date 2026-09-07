# Integration Checks — `cowork-buffer-full-stop` · Phase 4

Ветка `cowork/cowork-buffer-full-stop/integration` от `edcbbda9`; блоки A `f05e4bdc`, B `769fbbc8`,
C `b420c930` влиты чисто (96 файлов), поверх — адаптеры контракта §5. Норма 03.09: у каждой
проверки назван предмет, число взятых файлов и хотя бы одна порча с красным. Все порчи прогнаны
руками в собранной ветке (мутация → прогон → красный → `git checkout --`), дерево после — чистое.

## 1. Адаптеры (§5 контракта)

| # | Шов | Что сделано | Файлы | Коммит |
|---|---|---|---|---|
| A-1 | B→A | `uploadOrRefuse` читает `overflowPolicy` из поля `bufferPolicy` ответа `getQuota` (та же строка `Device`, что квота) ещё раз через `effectiveBufferPolicy` B (⊥/порча → `stop`); `overflow-policy.temporary.ts` удалён | `samples.service.ts`, `samples.service.refusal.test.ts` (+smoke §6.1) | `e1205b3f` (удаление файла — в `2fe3f524`, стояло в индексе) |
| A-2 | A | Барель `plugin-contracts/src/index.ts` экспортирует `buffer-overflow` поимённо; mapper media импортирует `'@membrana/plugin-contracts' with { 'resolution-mode': 'import' }`; типы-литералы `StopPolicy`/`SmartCleanupPolicy` через `typeof` словаря для CJS | `index.ts` (contracts), `buffer-overflow-refusal.ts` | `2fe3f524` |
| A-3 | A→C | `apps/client`, `apps/cabinet` ← `@membrana/plugin-contracts` (`package.json` `*`, `tsconfig.app.json` path + reference, `vite.config.ts` alias, `yarn.lock`); `wiring.ts` судит отказ `isBufferOverflowRefusal`, `localGuard.ts` — `BUFFER_OVERFLOW_REASONS.DEVICE_BUFFER_FULL`, `types.ts` — `OverflowPolicy`, `deviceOverflowHold.ts` — `isOverflowPolicy`; каталог `device-overflow-hold/stubs/` удалён | 13 файлов | `1493b457` (стабы удалены в `2fe3f524`) |
| B-1 | B | Четыре копии `BUFFER_POLICY_MODES` → один union: media (значения из mapper A — единственного места литералов в CJS media), кабинет-сервер (type-only импорт + `satisfies`, назначенный носитель CJS), кабинет-UI и клиент — импорт `OVERFLOW_POLICIES`/`OverflowPolicy` | 8 файлов | `76c96e07` |
| BC-1 | B→C | `ServerStorageBackend.getQuotaRaw()`; мост `apps/client/src/lib/buffer-policy-bridge.ts` (`getEffectiveOverflowPolicy`, `subscribeEffectiveOverflowPolicy`, `refreshEffectiveOverflowPolicy`, `bindBufferPolicySourceToBackend`); `mediaLibraryHubBridge` привязывает источник к бэкенду и читает политику ПЕРЕД каждой публикацией квоты (штатное чтение + vitals C); стаб источника B → фикстура зубов читателя `quotaSourceFixture.ts` | 8 файлов + `buffer-policy-bridge.test.ts` (smoke §6.4) | `a5dd13f6` |
| BC-2 | B→C | `BufferPressurePolicy = OverflowPolicy`, ветка автоочистки в `stopDecision` → `smart_cleanup` («не стоп» до T12); плагин `mic-buffer-recorder`: `bufferPolicy` снят из конфига, состояние — зеркало читателя (умолчание `stop`, `setBufferPolicy`), панель показывает режим без кнопок; зуб B `no-auto-cleanup` поднят на `apps/client/src` + `media-library/src` | 9 файлов | `13d0ea07` |
| C-1 | C→кабинет | `NodesPage.tsx`: `resolveNodeVitality({ presenceOnline: deviceLive, lastPresenceAtMs: null, nowMs, overflowHold })`, `<NodeOverflowHoldLine />`, при `stopped_buffer_full` подпись «Сценарий остановлен» → слово удержания | `NodesPage.tsx` + зуб `NodesPage.overflow-hold-wiring.test.ts` | `88739ef0` |
| C-2 | C | Барель `media-library/src/index.ts`: `parseSampleRefusal`, `type SampleRefusal`, `SampleRefusalAxis`, `SampleRefusalListener`, `SampleUploadGate`; клиент берёт тип прямым импортом | `index.ts` + зуб `media-library-barrel.test.ts` | `53e22deb` (+зуб — см. коммит доков) |
| I11 | интеграция | `buffer-overflow-dictionary.test.ts` расширен на `apps/client/src`, `apps/cabinet/src`, `background-cabinet/src`, `media-library/src` | 1 файл | `1a80247c` |
| X-1, X-2 | вне зон | не тронуты (по заданию) | — | — |

`app.module.ts` не понадобился (контракт §5, подтверждено сборкой и swagger).

## 2. Зубы интеграции — предмет, объём, правило исключения

| Зуб | Предмет | Файлов взяла проверка | Правило исключения (названо явно) |
|---|---|---|---|
| `packages/background-media/src/modules/samples/buffer-overflow-dictionary.test.ts` | боевые исходники 7 корней: `plugin-contracts/src`, `background-media/{src,scripts}`, `background-cabinet/src`, `services/media-library/src`, `apps/client/src`, `apps/cabinet/src` | **754** | не сканируются `*.test.ts(x)` / `*.spec.ts` (в фикстурах литералы законны); судится код без строк комментариев; каталоги `stubs/` не исключаются, а запрещены в зонах блоков; `smart_cleanup` допущен ровно в 4 файлах: словарь, mapper media, назначенный CJS-носитель кабинета (`membrane/buffer-policy.ts`, `satisfies`), генерат wire (`domain/node-realtime-wire.ts`, зеркало core под `verify:wire-sync`) |
| `apps/client/src/lib/buffer-policy/no-auto-cleanup.test.ts` | ярус 1 — каталог читателя B (`auto[-_]?cleanup` нигде, включая идентификаторы); ярус 2 — литерал `'auto-cleanup'` в `apps/client/src` + `media-library/src` | 5 / **420** | `*.test.ts(x)` не сканируются — там `'auto-cleanup'` законен как порча на входе читателя; комментарии не судятся |
| `apps/client/src/lib/buffer-policy-bridge.test.ts` | мост поверх живого `getQuotaRaw()` (фейковый `fetch`) + страж C | 6 тестов | — |
| `apps/cabinet/src/pages/NodesPage.overflow-hold-wiring.test.ts` | исходник `NodesPage.tsx` | 1 | — |
| `apps/client/src/lib/device-overflow-hold/media-library-barrel.test.ts` | барель `media-library/src/index.ts` (рантайм-экспорт `parseSampleRefusal`) | 1 | типовые строки бареля через свёрнутый `dist/index.d.ts` порчей не ловятся (см. §4, P-C2) |
| `samples.service.refusal.test.ts` (описание «A-1») | `uploadOrRefuse` + `effectiveBufferPolicy` B | 3 теста | — |

## 3. Прогоны (финальные, на восстановленных исходниках, после `yarn build` всего графа)

| Команда | Результат |
|---|---|
| `yarn workspace @membrana/background-media vitest run` (весь пакет) | **46 файлов / 395 passed** (блок A: samples + firebat-node + buffer-cleanup — внутри; блок B: devices — внутри) |
| `yarn workspace @membrana/plugin-contracts vitest run` | 2 / **33 passed** (блок A) |
| `yarn workspace @membrana/media-library-service vitest run` (весь пакет) | 12 / **156 passed** (блок C: `server-storage-backend-refusal`; BC-2: `buffer-stop`) |
| `yarn workspace @membrana/client vitest run` (весь пакет) | 105 файлов: **103 passed / 528 tests passed**; 2 файла красные ДО интеграции и не в зонах — `microphone-stream-viz/types.test.ts`, `microphone/microphoneStreamHub.test.ts` («No test suite found in file», без диффа к `edcbbda9`) |
| `yarn workspace @membrana/cabinet vitest run` (весь пакет) | 23 / **174 passed** (блок B UI, блок C кабинет, C-1) |
| `yarn workspace @membrana/background-cabinet vitest run` (весь пакет) | 47 / **454 passed** (блок B: membrane + pair) |
| `yarn workspace @membrana/core vitest run src/contracts/node-realtime` | 5 / **51 passed** (блок C) |
| `typecheck`: `plugin-contracts`, `media-library-service`, `core`, `background-media`, `background-cabinet` | **0 ошибок** (все пять) |
| `typecheck` (`tsc -b`) `@membrana/client`, `@membrana/cabinet` — с принудительной перекомпиляцией (touch входа) | **0 ошибок** |
| `yarn verify:wire-sync` | OK (core ↔ cabinet синхронны) |
| `yarn workspace @membrana/background-media verify:swagger` | Swagger OK; `201 stored · 200 refusal (enum = словарь) · 413 transport-only` |
| `yarn workspace @membrana/background-cabinet verify:swagger` | Swagger OK |
| `yarn build` (корень, turbo, весь граф) | exit 0 |

Собственные зубы трёх блоков в собранной ветке — зелёные (все входят в прогоны выше).

## 4. Порчи → красный (по адаптерам)

| # | Адаптер | Порча (внесено временно) | Чем судилось | Красный |
|---|---|---|---|---|
| P-A1a | A-1 | `overflowPolicy: 'stop'` вместо `overflowPolicyOf(quota)` | `samples.service.refusal.test.ts` | **1 failed** / 19 («smart_cleanup с полным S → smart_cleanup») |
| P-A1b | A-1 | файл `overflow-policy.temporary.ts` вернулся | dictionary | **1 failed** / 10 |
| P-A2 | A-2 | mapper импортирует `../../../../plugin-contracts/src/…` | dictionary | **1 failed** / 10 |
| P-A3a | A-3 | каталог `device-overflow-hold/stubs/` вернулся | dictionary | **1 failed** / 10 |
| P-A3b | A-3 | `LOCAL_GUARD_REASON = 'device_buffer_full'` (вторая копия) | dictionary | **1 failed** / 10 |
| P-A3c | A-3 | `wiring.ts` не судит отказ словарём (guard → `true`) | `wiring.test.ts` | **2 failed** / 5 |
| P-B1 | B-1 | `BUFFER_POLICY_MODES = ['stop','smart_cleanup']` в клиенте | dictionary | **1 failed** / 10 |
| P-BC1a | BC-1 | `effective-policy.stub.ts` вернулся | dictionary | **1 failed** / 10 |
| P-BC1b | BC-1 | `getQuotaRaw()` отбрасывает поле (возвращает `getQuota()`) | `buffer-policy-bridge.test.ts` | **3 failed** / 6 |
| P-BC2a | BC-2 | дефолт `'auto-cleanup'` в состоянии плагина | `no-auto-cleanup` + `buffer-stop-wiring` | **2 failed** / 19 |
| P-BC2b | BC-2 | панель снова `patchConfig({ bufferPolicy })` | `buffer-stop-wiring.test.ts` | **1 failed** / 11 |
| P-C1 | C-1 | `<NodeOverflowHoldLine />` снят с карточки | `NodesPage.overflow-hold-wiring.test.ts` | **1 failed** / 3 |
| P-C2 | C-2 | строка `parseSampleRefusal,` снята с бареля | `media-library-barrel.test.ts` | **1 failed** / 1 |

**P-C2, честная история (4 холостых захода):** порча «снять `type SampleRefusal` с бареля» через
`tsc -b` клиента не краснеет: (1) `tsc -b` пропускает проект как up-to-date, если менялся только
`.d.ts` в `node_modules`; (2) `tsc -p --noEmit` — не тот судья (резолвит пакеты иначе, сыплет
чужие TS7006); (3) `dist/index.d.ts` библиотеки — свёрнутый `vite-plugin-dts`, и тип
`SampleRefusal` остаётся в нём достижимым через `SampleRefusalListener`. Поэтому предмет C-2
судится рантайм-экспортом бареля из исходников (vitest alias), а типовые строки — компиляцией
`wiring.ts` клиентом (зелёная). Побочно: перестроить dist библиотеки надо её собственным
`build` (`tsc -b && vite build`), а не голым `tsc -b` — иначе `index.d.ts` ссылается на
несуществующие per-file декларации и все типы библиотеки для приложений становятся `any`.

## 5. Smoke §6 → чем проверен

| § | Сценарий | Проверка |
|---|---|---|
| 1 | B→A: `stop` / `smart_cleanup`+S / `smart_cleanup` без S → `stop`; константы нет | `samples.service.refusal.test.ts` (описание A-1, 3 теста) + dictionary («временной константы нет») |
| 2 | A→C: фейковый `fetch` → `SAMPLE_REFUSED` → импортированный `isBufferOverflowRefusal` → `held`, один `entered`, 100 повторов → 0 сигналов, 1 `fetch` | `wiring.test.ts` (фикстура сверена `isBufferOverflowRefusal` при загрузке), `overflow-hold-adapter.test.ts` |
| 3 | C→кабинет: push `overflowHold` → `parseRuntimeOverflowHoldPayload` → wire → `stopped_buffer_full`, `dead` ложен | `runtimeRealtimeBridge.hold-push.test.ts`, `overflow-hold-payload.test.ts` (core), `nodeVitality.test.ts`, `verify:wire-sync`, C-1 зуб |
| 4 | B→C: сырой `/quota` с `smart_cleanup` через `getQuotaRaw()` → мост → `smart_cleanup` → страж `ignored`; `/quota` упал → `stop` | `buffer-policy-bridge.test.ts`; `overflow-hold-adapter.test.ts` («страж молчит», «дыра синка → stop и страж снова судит»). **Вторая половина п.4 («серверный отказ при smart_cleanup всё равно входит в удержание») — НЕ выполнена, см. §6** |
| 5 | Зеркало: панель показывает режим от читателя; `'auto-cleanup'` нет в `apps/client/src` и `media-library/src` | `buffer-stop-wiring.test.ts`, `no-auto-cleanup.test.ts` (420 файлов) |
| 6 | Структура: один носитель литералов; `stubs/` нет; временного файла нет; wire-sync, оба swagger | dictionary (754 файла), `verify:wire-sync`, `media:verify-swagger`, `cabinet:verify-swagger` |
| 7 | Собственные зубы трёх блоков в собранной ветке | §3 |

## 6. Что потребовало бы переписать блок (не сделано, метрика ретроспективы)

**BC-2, строка контракта «серверный отказ входит в удержание при любой политике».** У носителя C
`isHeld() = эпизод ≠ null ∧ policy === 'stop'` (`deviceOverflowHold.ts:152`), и два зуба C
утверждают обратное контракту: `deviceOverflowHold.test.ts:70` («политика smart_cleanup в
отказе: эпизод записан, но удержания нет») и `wiring.test.ts` («smart_cleanup — как есть»,
`isHeld() === false`). Исполнить строку контракта = изменить логику носителя (одна строка) и
перевернуть два зуба блока — это правка блока, не адаптера; по правилу интеграции остановлено и
названо. Сегодня в собранной ветке: серверный отказ с `overflowPolicy: smart_cleanup` пишет
эпизод (виден кабинету как `held`), но `isHeld()` ложен — шлюз отправки открыт, старт не
отбивается. При T12-отсутствии алгоритма это ровно ночной сценарий для приборов с включённой
умной очисткой; умолчание всех приборов — `stop`, поэтому дыра открывается только явным
выбором оператора. Решение — координатору/владельцу (одна строка + два зуба у C).

## 7. Адаптировано в тестах блоков (не переписано)

- `wiring.test.ts` (C): ожидание «дыра `overflowPolicy` → `stop`» заменено на «отказ не по форме
  словаря → удержания нет»: полноту отказа теперь судит импортированный предикат A
  (C сам просил «не проверять полноту полей сам»), а `effective(⊥) = stop` — норма политики B,
  не отказа A. Боевой код C не менялся.
- `overflow-hold-adapter.test.ts`, `buffer-stop-wiring.test.ts` (C): стаб `setEffectiveOverflowPolicyStubForTests`
  → мост (`setBufferPolicySourceForTests`), проверки про `'auto-cleanup'`-конфиг → проверки зеркала.
- `bufferPolicyReader.test.ts`, `effectiveBufferPolicy.test.ts` (B): стаб источника → фикстура
  `quotaSourceFixture.ts` (не стаб соседа: живой источник — `getQuotaRaw()`).
- `samples.service.refusal.test.ts` (A): фикстура `getQuota` получила поле `bufferPolicy` B.
- `test/buffer-stop.test.ts` (media-library, ствол): `'auto-cleanup'` → `'smart_cleanup'` в зубе
  «взаимоисключение режимов».

## 8. Известные ограничения

- Политика для локального стража читается перед КАЖДОЙ публикацией квоты (лишний `GET /quota`
  на цикл; при удержании — ≥ 1/мин по vitals C). Плата за «страж судит по политике того же цикла».
- Отказ сервера НЕ по форме M2 (например, без `overflowPolicy`) удержание «по серверу» не
  открывает — прибор верит только полному отказу. Сервер A чеканит полную форму (swagger-зуб);
  риск — только чужой/старый сервер.
- `packages/core` держит свою копию union `RuntimeOverflowPolicy = 'stop' | 'smart_cleanup'`
  (`node-realtime/events.ts`, `validate-payloads.ts`) — вне периметра I11 (core не зависит от
  `plugin-contracts`, правки core вне разрешённого профиля); генерат wire кабинета допущен в
  зубе как зеркало core.
- CJS-серверы (media, кабинет) не импортируют рантайм-объект ESM-словаря: по одному назначенному
  носителю литералов на сервер под `satisfies` (mapper A; `membrane/buffer-policy.ts` B) —
  зуб знает их поимённо.
- В истории коммитов удаление стабов/временного файла и переименование фикстуры попали в
  коммит A-2 (`2fe3f524`): они уже стояли в индексе, когда цепочка коммитов упала на `git add`
  несуществующих путей. Содержательно — A-1/A-3/BC-1, названо в их сообщениях.
