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

- `apps/cabinet/src/pages/NodesPage.tsx`: `<NodeOverflowHoldLine hold={state?.overflowHold ?? null} />` в карточке и `resolveNodeVitality` вместо голого `deviceLive` для подписи.
- Замена стабов на импорты A/B (таблица выше).
- Если A выбрал `plugin-contracts`, а не `core`: `apps/client` и `apps/cabinet` получают зависимость (строки `package.json`).
