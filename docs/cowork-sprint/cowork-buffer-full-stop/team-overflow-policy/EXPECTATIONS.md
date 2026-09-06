# Expectations — Block `overflow-policy`

> Односторонний документ (Phase 1, дописывается по ходу Phase 2). Чужие ветки и чужие
> `EXPECTATIONS.md` не читались; всё ниже — **допущения этого блока, не договорённости**.
> Сведение — Phase 3, Interface Consilium.

## Два имени, которые нельзя слить

`bufferPolicy` — поле политики (мой блок, настройка). `overflowPolicy` — поле ответа отказа
(блок A, свидетельство в эпизоде). A кладёт **значение** моего `bufferPolicy.mode` под своим
именем `overflowPolicy`; поле у себя не заводит.

## Что мне нужно от соседей

| От блока | Что | Форма (моё допущение) | Инварианты |
|---|---|---|---|
| A (`refusal-contract`) | Место, где A читает политику прибора для `overflowPolicy` | A читает **строку `Device`** media, которую уже держит для квоты (`prisma.device.findUnique`), и зовёт мою чистую функцию `effectiveBufferPolicy(device)` из `modules/devices/buffer-policy.ts`; либо `DevicesService.getEffectiveBufferPolicy(deviceId)` | Читать **колонку напрямую нельзя** без `effective()`: порченая строка обязана дать `stop`, а не упасть и не дать `smart_cleanup` с пустым S. Временная константа `stop` у A заменяется этим вызовом на интеграции |
| A | Словарь причин — **другой закрытый список**, не тот же union | Мои причины (`unknown_mode`, `params_incomplete`, `params_invalid`, …) — про **запись настройки**; причины A (`device_buffer_full`, `user_storage_full`) — про **отказ загрузки**. Общий тип не нужен | Если A выберет пакет для словаря (`plugin-contracts` или `core`), готов переселить туда `BUFFER_POLICY_MODES` и `SmartCleanupParams` одним адаптером |
| C (`device-hold`) | Подключение читателя к живому источнику | `createBufferPolicyReader(source)` где `source = () => Promise<unknown>` — C (или координатор) подставляет `getQuota()` бэкенда `server-storage-backend.ts`, который возвращает сырой ответ `/quota` | Читатель НЕ ходит в сеть сам; владелец частоты чтения — C (M4: квота читается ≥ 1/мин, после стопа тоже). Читатель принимает **сырой JSON**, а не `StorageQuota` — иначе поле пришлось бы протаскивать через тип C |
| C | Плагин перестаёт быть хозяином `bufferPolicy` | `micBufferRecorderPluginState.bufferPolicy` становится зеркалом `reader.current().mode`; дефолт `'auto-cleanup'` в плагине удаляется | Порча: дефолт `auto-cleanup` вернулся в плагин → красный (зуб на интеграции, у меня — только в моём каталоге) |
| C | Тип `BufferPressurePolicy` из `media-library-service` | остаётся `'auto-cleanup' \| 'stop'` до интеграции — не мой пакет и не зона | На интеграции `stopDecision` получает `mode` от читателя; `'smart_cleanup'` для `stopDecision` = «не стоп» до T12 — отдельная строка в контракте |
| координатор | Строки сборки | `MembraneModule` уже импортирует `PairModule` — новых импортов в `app.module.ts` **не нужно** | Общие файлы блок не трогает |

## Что я готов отдать

| Блоку | Что | Форма | Инварианты |
|---|---|---|---|
| A | Поле политики на media | `Device.bufferPolicy: BufferPolicyMode` (enum БД `stop \| smart_cleanup`, NOT NULL, DEFAULT `stop`) + `Device.bufferPolicyParams: Json?` | Все существующие ряды после миграции — `stop`; неизвестное значение отвергает сам тип Postgres |
| A | Чистый читатель | `effectiveBufferPolicy(row: { bufferPolicy?: unknown; bufferPolicyParams?: unknown } \| null): { mode, params }` — `packages/background-media/src/modules/devices/buffer-policy.ts` | Без сети, без Prisma; `⊥` → `stop`; `smart_cleanup` с неполным S → `stop` |
| A | Сервисный вход | `DevicesService.getEffectiveBufferPolicy(deviceId)` | Читает строку заново на каждый вызов — кеша нет (то же свойство, что у квоты #2281) |
| C | Канал эффективной политики | поле **`bufferPolicy: { mode, params }`** в ответе `GET /v1/devices/:deviceId/quota` | Тот же ход, что квота (M1: «нет отдельного long-poll»); значение уже пропущено через `effective()` на сервере |
| C | Читатель на клиенте | `apps/client/src/lib/buffer-policy/`: `effectiveBufferPolicy(raw)`, `createBufferPolicyReader(source)` → `{ refresh(), current() }` | `current()` до первого чтения = `stop`; после неудачного чтения = `stop`; результат никогда не `'auto-cleanup'` (тип) |
| C | Словарь режимов на клиенте | `BUFFER_POLICY_MODES = ['stop', 'smart_cleanup']` | `smart_cleanup` для остановки = «не гасить по буферу» — только когда T12 даст алгоритм; до того C вправе трактовать как `stop` (моё допущение, не норма) |
| кабинету (UI, вне блоков) | Ручки origin | `GET /v1/membranes/me` (+`bufferPolicy` на мембране и приборах) · `PUT /v1/membranes/me/buffer-policy` · `PUT /v1/membranes/me/buffer-policy/binding` · `PUT /v1/nodes/:nodeId/buffer-policy` | Все три записи — `200 { ok:true, …, contextSync:{updated,failed} } \| { ok:false, reason }` |
| всем | Закрытый список причин записи | `unknown_mode · params_incomplete · params_invalid · binding_active · binding_not_confirmed · node_not_paired` | Первые три — общие для media и кабинета; остальные — только origin |
| всем | Каркас S | `{ thresholdPercent: 1..100, selection: 'oldest_first' \| 'largest_first', protectLabeled: boolean }` | Имена-закладки без алгоритма; T12 расширяет, не ломая гейт |

## Мои стабы (исполняемые, в моей зоне)

| Стаб | Замещает | Где живёт |
|---|---|---|
| `quotaSourceStub` — источник сырого ответа `/quota` с полем `bufferPolicy`, умеет «отдать», «сломаться», «отдать порчу» | живой `getQuota()` бэкенда (зона C) | `apps/client/src/lib/buffer-policy/stubs/quota-source.stub.ts` |
| Моки `prisma`/`mediaBridge` в зубах разноски и привязки | живая база кабинета и media | инлайн в `membrane-context-fanout.service.test.ts`, `pair.service.test.ts`, `membrane-buffer-policy.service.test.ts` |
| Мок `prisma.device` в зубах media | живая база media | инлайн в `devices.service.buffer-policy.test.ts` |

Стабы в интеграционную ветку не мёржатся; стаб, доживший до прода, — дефект интеграции.

## Дельта Phase 2 (что уточнилось при постройке)

_дописывается по ходу_
