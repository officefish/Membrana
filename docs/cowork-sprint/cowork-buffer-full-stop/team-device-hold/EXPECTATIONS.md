# Expectations — Block `device-hold`

Односторонний документ (регламент §3): что жду от соседей, что отдаю, какие стабы держу.
Чужих EXPECTATIONS не читал. Дописывается по ходу Phase 2.

## Что мне нужно от соседей

| От блока | Что | Форма (сигнатура/схема) | Инварианты (единицы, частоты, порядок, владелец времени) |
|---|---|---|---|
| A `refusal-contract` | TypeScript-тип ответа отказа и словарь причин — **одним импортом** из общего пакета, доступного `apps/client` и `packages/services/media-library` | Ожидаю: `import { type BufferOverflowRefusal, type BufferOverflowReason, BUFFER_OVERFLOW_REASONS, isBufferOverflowRefusal } from '@membrana/core'` (путь `contracts/buffer-overflow`). Поля по заседанию: `{ ok:false; reason: 'device_buffer_full' \| 'user_storage_full'; buffer:{usedBytes:number;limitBytes:number}; userStorage:{usedBytes:number;limitBytes:number}; overflowPolicy:'stop'\|'smart_cleanup'; overflowId:string; overflowAt:string }`. Нужен type-guard `isBufferOverflowRefusal(raw:unknown)`: я не хочу проверять полноту полей сам | HTTP `200`; `overflowId` стабилен на все отказы эпизода; `overflowAt` — ISO 8601 UTC, чеканится сервером **вместе** с `overflowId` при первом отказе эпизода и не меняется внутри эпизода; байты — целые `number`; `413` больше не значит «квота». Владелец времени факта — сервер |
| A `refusal-contract` | Гарантия: отказ приходит **на POST пробы** (`/collections/:id/samples`), не на `/quota` и не отдельным каналом | тот же ответ на том же пути | один канал — путь отправки; второго канала «только для переполнения» нет (M4) |
| B `overflow-policy` | Эффективная политика прибора на клиенте | Ожидаю функцию `getEffectiveOverflowPolicy(): 'stop' \| 'smart_cleanup'` из `apps/client/src/lib/buffer-policy/` и `subscribeEffectiveOverflowPolicy(listener)`; умолчание и любая дыра — `stop` | Читается синхронно из кеша; источник — контекст прибора / ответ `/quota` (не через кабинет); смена политики — событие, не опрос. Мне НЕ нужно поле `bufferPolicy` плагина — это зеркало, я его не читаю |
| B `overflow-policy` | Не переопределять `overflowPolicy` из ответа A: эпизод хранит снимок политики **из ответа сервера** (главенство сервера) | — | при расхождении эффективной политики B и `overflowPolicy` в отказе A — прибор верит отказу |

## Что я готов отдать

| Блоку | Что | Форма | Инварианты |
|---|---|---|---|
| 4/4 (окно, #2310) | Сигнал окна | `getDeviceOverflowHold().subscribeWindowSignal((s: OverflowWindowSignal) => void)`; `OverflowWindowSignal = { overflowId: string \| null; episode: OverflowHoldEpisode; cause: 'entered' \| 'start-refused' }` | `entered` — ровно один на `overflowId` (и один на локальный эпизод до повышения; повышение сигнала не даёт); `start-refused` — на каждый отбитый старт при удержании; закрытие окна удержание не снимает |
| 4/4 | Статус удержания для плашки/бейджа/окна | `getDeviceOverflowHold().isHeld()`, `.getEpisode()`, `.subscribe(listener)` | `getEpisode()` несёт `reason`, `overflowId`, `overflowAt`, `policy`, `buffer`, `userStorage` — окно строится из этого + ответа A, **без второго запроса квоты** |
| 4/4 | Сброс человеком | `getDeviceOverflowHold().release('human')` | единственный путь ручного возобновления; после сброса новый старт идёт штатно; авто-сброса нет |
| 4/4 / кабинет | Значение состояния узла | `RuntimeStatePayload.overflowHold?: RuntimeOverflowHoldPayload \| null` (`@membrana/core`, node-realtime); `{ phase:'held_local'\|'held'; reason:string; overflowId:string\|null; overflowAt:string; policy:'stop'\|'smart_cleanup' }` | push при входе/повышении/сбросе и при reconnect; `null` = удержания нет |
| кабинет | Предикаты | `resolveNodeVitality(...) → 'dead' \| 'stopped_buffer_full' \| 'alive'`, `NODE_DEAD_SILENCE_MS = NODE_RECENT_PRESENCE_WINDOW_MS` (300 с) | один порог; телеметрия в предикате не участвует |
| кабинет | Строка карточки | `<NodeOverflowHoldLine hold={payload.overflowHold} />` (`apps/cabinet/src/components/nodes/`) | таблицу код→текст не несу — сырой код приглушённо; проводка в `NodesPage.tsx` — на интеграции |
| A (сервер) | Поведение прибора после отказа | 0 POST при удержании, без ретраев; heartbeat 120 с и `GET /quota` ≥ 1/мин продолжаются | сервер увидит: пробы прекратились, квота читается, узел жив |

## Мои стабы (исполняемые, в моей зоне)

| Стаб | Замещает | Где живёт | Судьба |
|---|---|---|---|
| `refusal-contract.stub.ts` — тип `OverflowRefusalStub`, литералы `device_buffer_full` / `user_storage_full`, guard `isOverflowRefusalStub` | словарь и тип A | `apps/client/src/lib/device-overflow-hold/stubs/` | умирает на интеграции: импорт заменяется на словарь A; структурный зуб «одна копия строк» после этого проходит по монорепо |
| `effective-policy.stub.ts` — `getEffectiveOverflowPolicyStub()` (умолчание `stop`), `setEffectiveOverflowPolicyStubForTests` | читатель эффективной политики B | там же | заменяется читателем B; плагинное `bufferPolicy` не читаю |
| Фейковый `fetch` с ответом `200 {ok:false,…}` | сервер записей с A | тесты `server-storage-backend.test.ts`, `device-overflow-hold/*.test.ts` | тесты остаются, форма ответа — из контракта A |

## Что вносит интеграция (координатор), по моей части

- `apps/cabinet/src/pages/NodesPage.tsx`: `<NodeOverflowHoldLine vitality={…} hold={state?.overflowHold ?? null} />` в карточке; `resolveNodeVitality({ presenceOnline: deviceLive, lastPresenceAtMs: null, nowMs: Date.now(), overflowHold })` — подпись «Сценарий остановлен» заменить на строку удержания, когда `vitality === 'stopped_buffer_full'`.
- Барель `packages/services/media-library/src/index.ts`: экспорт `type SampleRefusal`, `type SampleUploadGate`, `parseSampleRefusal` из `backends/server-storage-backend.ts` (у меня тип выведен из сигнатуры `ServerStorageBackend.onSampleRefusal` — после строки барели заменить на прямой импорт).
- Замена стабов на импорты A/B (таблица выше): `stubs/refusal-contract.stub.ts` → словарь A (в `wiring.ts` и `localGuard.ts`), `stubs/effective-policy.stub.ts` → читатель B (в `micBufferRecorderPlugin.ts`); каталог `stubs/` удаляется.
- Если A выбрал `plugin-contracts`, а не `core`: `apps/client` и `apps/cabinet` получают зависимость (строки `package.json`).

## Дельта Phase 2 (что сделано против Phase 1)

| Было в Phase 1 | Стало | Почему |
|---|---|---|
| разбор отказа на путь отправки → «модульный реестр как trace hook» | **статические** `ServerStorageBackend.onSampleRefusal(listener)`, `ServerStorageBackend.setSampleUploadGate(gate)`, `resetSampleRefusalWiringForTests()`; `putSample` бросает `DomainError('…','SAMPLE_REFUSED', refusal)`; 413 → `PAYLOAD_TOO_LARGE` | класс уже экспортирован барелем — статические методы не требуют строк в общем файле |
| бэкенд знает словарь | бэкенд словаря НЕ знает: отказ = `200 {ok:false, reason:string}`; литерал судит носитель (стаб) | третьей копии строк в `media-library` нет; A на интеграции меняет только клиентскую сторону |
| `HoldActivation = entered \| promoted \| unchanged` | + `ignored` (политика не `stop` — страж молчит) | явный исход вместо тихого no-op |
| сигнал окна `{ overflowId, episode, cause }` | + `attempt: StartAttempt \| null` (`{ source: 'mic' \| 'board'; what }` на `start-refused`) | окну (4/4) нужно знать, что именно отбито |
| `release(by)` | как в концепте; `by` пока не хранится в эпизоде (эпизод обнуляется) | 4/4 спросит — добавлю журнал сброса |
| «удержание переживает рестарт сценария» | + снимок в `localStorage` (`membrana.device-overflow-hold.v1`, try/catch) — переживает и перезагрузку страницы прибора; восстановленный эпизод окна не поднимает | ночной сценарий: reload не должен снова застучать |
| vitals: старт на входе в удержание | `startOverflowHoldVitals` подписан на носитель и тикает при ЛЮБОМ эпизоде (и `smart_cleanup`) — читает, не судит | чтение квоты не снимает удержание (DoD «нет авто-resume» — зуб) |
| адаптер доски: «отбить upload» | `startRecorderRecording` → `refuseStart`; вход в удержание → `cancelAllActiveClipRecorders()` + сброс `pendingTrackUploads`; `startAsyncJob(track-upload)` при `isHeld()` → `asyncJobStore.reject(promiseId,'overflow-hold')`; `disposeOverflowHoldAdapter()` для тестов | сценарий видит честный отказ job, не вечное ожидание; kill-пути у адаптера нет |
| адаптер микрофона: `humanRestart` снимал флаг | `humanRestart` удалён: ручной старт при удержании отбивается тем же фактом (T5); выход — только `release` | «сброс — действие человека» = кнопка окна, не кнопка записи |
| карточка кабинета | `NodeOverflowHoldLine({ vitality, hold })`: `dead` → ничего; `stopped_buffer_full` → «жив · не пишет · буфер полон · <reason> · с <время>»; `held_local` → «эпизод ещё не подтверждён сервером» | таблица код→текст остаётся у 4/4 |

### Что я жду от B дополнительно (выявлено сборкой)

- Панель плагина показывает `bufferVerdict.say` по зеркалу `bufferPolicy` (умолчание `auto-cleanup`), а носитель судит по эффективной политике (умолчание `stop`). До интеграции возможна картинка «панель говорит „автоочистка“, а прибор удержан». Это шов B↔C: когда B заменит хозяина `bufferPolicy` зеркалом, `syncConfig(...bufferPolicy)` плагина должен получать эффективную политику B — тогда слово и действие снова из одного источника. Поле и панель я не трогал.
