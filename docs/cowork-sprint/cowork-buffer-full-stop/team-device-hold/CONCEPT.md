# Concept — Block `device-hold` (C · M3 + M4)

| Поле | Значение |
|------|----------|
| спринт | `cowork-buffer-full-stop` |
| билет | #2309 |
| ветка | `cowork/cowork-buffer-full-stop/device-hold` от `edcbbda9` |
| протоколы-посылки | M3 `buffer-full-stop-m3-device-stop-2026-09-06.md`, M4 `buffer-full-stop-m4-life-after-2026-09-06.md`, эпик `docs/meeting/buffer-full-stop/EPIC.md` |
| данности (не переоткрываю) | T2, T5, T6, T8, T9, T16; поля отказа M2; политика M1 |

Блок изнутри, без оглядки на соседей: что такое удержание на приборе, где оно живёт, кто его
включает, что оно гасит, что живёт после и как это видит кабинет.

## 1. Одна машина на два входа

Сегодня в стволе (`edcbbda9`) машина стопа — внутри плагина микрофона: флаг
`bufferStoppedPermanently` + вердикт `bufferVerdict` + проверки в `canStartRecording`. Доска
устройства (`scenarioMicJournalBridge`) стопа по буферу не знает вовсе: `startRecorderRecording` и
`uploadTrackAsync` идут в медиа-библиотеку без вопроса «а можно ли». Ночью 05→06.09 именно этот
путь стучал 11 часов.

Решение: носитель `DeviceOverflowHold` — **один модульный синглтон на прибор**,
`apps/client/src/lib/device-overflow-hold/`. Плагин и доска становятся **тонкими адаптерами**: они
не хранят флагов, не считают вердикта, не решают «можно ли» — они спрашивают `isHeld()` и зовут
`refuseStart(...)`. Структурный зуб бьёт по источнику: в плагине и доске нет ни одного локального
флага удержания (`bufferStoppedPermanently`, `held`, `overflowStopped`), ни второй записи
`overflowId`.

```
                    +--------------------------+
  сервер (A) ------>|                          |<------ локальный страж (квота до отправки)
  ok:false+reason   |    DeviceOverflowHold    |
  +overflowId       |  episode · isHeld · signal|
                    +------+---------+---------+
                           |         |
              адаптер mic -+         +- адаптер board
         (canStart / quench)       (startRecorder / upload)
                           |         |
                           v         v
             сигнал окна (4/4)   состояние узла runtime.state (кабинет)
```

### API носителя

```ts
interface DeviceOverflowHold {
  activateFromServer(refusal: OverflowRefusalSnapshot): HoldActivation;   // главный источник
  activateFromLocalGuard(guard: LocalGuardSnapshot): HoldActivation;      // ранний страж
  isHeld(): boolean;                 // эпизод активен ∧ политика эпизода = stop
  getEpisode(): OverflowHoldEpisode | null;
  subscribe(listener): () => void;   // смена удержания: вход / повышение id / сброс
  subscribeWindowSignal(listener): () => void;   // сигнал окна — для 4/4
  refuseStart(attempt: { source: 'mic' | 'board'; what: string }): boolean; // отбить старт + сигнал
  release(by: 'human' | 'cleanup'): void;        // единственные два выхода
}
```

`HoldActivation = 'entered' | 'promoted' | 'unchanged'` — что случилось с эпизодом: новый
эпизод, локальный эпизод получил серверный id, или ничего (повторный отказ того же id).

### Эпизод

```ts
interface OverflowHoldEpisode {
  readonly overflowId: string | null;      // null — локальный страж, сервер ещё не чеканил
  readonly overflowAt: string;             // ISO: у сервера — его чекан; у стража — момент стража
  readonly reason: string;                 // литерал словаря A (на моей стороне — стаб)
  readonly policy: 'stop' | 'smart_cleanup';
  readonly source: 'server' | 'local';
  readonly buffer: { usedBytes; limitBytes } | null;
  readonly userStorage: { usedBytes; limitBytes } | null;
  readonly enteredAtMs: number;
}
```

## 2. Два источника вердикта, главенство сервера

| Источник | Когда | Что даёт |
|---|---|---|
| **Сервер (главный)** | ответ на POST пробы `200 {ok:false, reason, overflowId, overflowAt, …}` | полный эпизод с id и временем факта |
| **Локальный страж (вторичный)** | чтение квоты до отправки: `stopDecision(fill, {policy: stop}).action === 'stop'` | эпизод без id, `overflowAt` = сейчас |

Правила сведения (M3 (б)):

- Локальный страж при пустом носителе → `entered`, эпизод `source:'local'`, `overflowId:null`.
- Сервер при локальном эпизоде → `promoted`: тот же эпизод получает `overflowId`, `overflowAt`
  сервера, `reason`/`policy`/оси сервера; **сигнала окна нет** — окно уже поднято локальным
  эпизодом (один факт — одно окно, T9).
- Сервер при серверном эпизоде с тем же `overflowId` → `unchanged`; 100 отказов — 0 новых сигналов.
- Сервер с **другим** `overflowId` при активном эпизоде → это новый факт переполнения (сервер
  освобождал место и заполнился снова) → `entered`, новый сигнал окна. Сервер главнее.
- Локальный страж при серверном эпизоде → `unchanged`: страж не понижает и не переписывает сервер.

Локальный страж срабатывает **только при эффективной политике `stop`** (читается через мой
стаб-провайдер B). При `smart_cleanup` страж молчит: за место отвечает сервер, отказ придёт
оттуда, если придёт.

## 3. Что гасится и что живёт при удержании и `stop`

| Гасится (адаптерами, по `isHeld()`) | Живёт (носитель не трогает) |
|---|---|
| отправка новых проб: плагин не публикует `capture.stop`, доска не зовёт `importBlob`; сверх того — транспортный шлюз `ServerStorageBackend.setUploadGate(() => hold.isHeld())`: при удержании `putSample` отбивается **до** `fetch` — 0 POST, порча «ретрай» → красный | WebSocket узла и его heartbeat 120 с (`nodeRealtimeClient` не знает о hold) |
| активная запись: mic — `cancelActiveRecorder('overflow-hold')` (не `finish` — иначе клип уйдёт в POST в закрытую дверь); board — `cancelAllActiveClipRecorders()` | детекция и наблюдение потока без записи: сценарий доски не останавливается, `ScenarioRuntime` бежит |
| новый старт: `canStartRecording` → `hold.refuseStart({source:'mic'})`; `startRecorderRecording` → `hold.refuseStart({source:'board'})` — оба дают сигнал окна (T5) | рантайм плагина и доски, поток микрофона |
| | чтение квоты ≥ 1/мин (см. §5) |

Ретраев нет: отказ сервера не ставится в очередь, `pendingTrackUploads` при удержании
отбрасывается с `asyncJobStore.reject(promiseId, 'overflow-hold')` — сценарий видит честный отказ
job, не вечное ожидание.

Авто-возобновления нет: освобождение места (квота ниже лимита, новый ответ `/quota`) **не
трогает** эпизод. Выход только `release('human')` (кнопка окна 4/4 — я отдаю метод) или
`release('cleanup')` (существующее событие `mediaLibrary.bufferCleared`).

## 4. Рестарт сценария и однократность окна

Носитель — синглтон уровня приложения, не плагина: teardown/install плагина, stop/run сценария
доски, смена сценария — не создают и не сбрасывают эпизод. Сверх памяти процесса — снимок эпизода
в `localStorage` (ключ `membrana.device-overflow-hold.v1`, try/catch): перезагрузка страницы
прибора ночью не должна «забыть» стоп и снова застучать. Восстановленный эпизод — тот же id, окно
по нему **не поднимается заново само** (сигнал — только на `entered` и на отбитый старт).

Сигнал окна `OverflowWindowSignal = { overflowId, episode, cause: 'entered' | 'start-refused' }`:

- `entered` — ровно один раз на `overflowId` (и один раз на локальный эпизод до повышения);
- `start-refused` — на каждый отбитый старт при удержании (T5: окно закрываемо, не обходимо).

## 5. Жизнь после остановки (M4)

| Канал | После стопа | Где |
|---|---|---|
| heartbeat `presence.heartbeat` | как было, 120 с (`NODE_PRESENCE_HEARTBEAT_INTERVAL_MS`) | `nodeRealtimeClient` — не меняется; зуб: удержание не гасит таймер |
| чтение квоты | ≥ 1/мин: `startOverflowHoldVitals({ readQuota, intervalMs: 60_000 })` включается на входе в удержание, выключается на сбросе; чтение — `getDefaultMediaLibraryService().refresh()` | `device-overflow-hold/vitals.ts` |
| состояние узла | `runtime.state` несёт `overflowHold`; push при `entered`/`promoted`/`release` и при reconnect | `runtimeRealtimeBridge` подписан на hold |
| `telemetry-track/v1` | законно молчит: производитель привязан к импорту клипа (вещдок §7) | — |

## 6. Значение состояния узла и предикаты кабинета

`packages/core/src/contracts/node-realtime/events.ts`:

```ts
export interface RuntimeOverflowHoldPayload {
  readonly phase: 'held_local' | 'held';   // фаза удержания: без id / с серверным id
  readonly reason: string;                 // литерал словаря A
  readonly overflowId: string | null;
  readonly overflowAt: string;             // ISO
  readonly policy: 'stop' | 'smart_cleanup';
}
RuntimeStatePayload.overflowHold?: RuntimeOverflowHoldPayload | null;
```

Отдельное значение, а не новая `phase` сценария: сценарий доски при удержании может быть в
`main` (детекция живёт) — фаза сценария и фаза удержания ортогональны. Wire кабинета
(`node-realtime-wire.ts`) — генерат, перегенерируется `yarn wire:generate`; валидатор
`parseRuntimeOverflowHoldPayload` — в `validate-payloads.ts`.

Кабинет, `apps/cabinet/src/lib/nodeCardStatus.ts`:

```ts
export const NODE_DEAD_SILENCE_MS = NODE_RECENT_PRESENCE_WINDOW_MS; // 300 000 — ОДИН порог
resolveNodeVitality({ presenceOnline, lastPresenceAtMs, nowMs, overflowHold })
  → 'dead' | 'stopped_buffer_full' | 'alive'
```

- `dead` ⇔ presence не жив ∨ молчание heartbeat дольше `NODE_DEAD_SILENCE_MS`;
- `stopped_buffer_full` ⇔ ¬dead ∧ `overflowHold` ∧ `overflowId ≠ null`;
- `alive` — остальное (в т.ч. удержание без id: показывается строкой, но предикат не истинен —
  M4 требует id).

Порог выбран из трёх существующих: presence-окно 300 с (кандидат аудита M4). Не echo-ping 3 с
(это проба кабинет→узел, не признак жизни), не heartbeat 120 с (один пропуск ≠ смерть).
Телеметрия в предикате не участвует.

Карточка: `apps/cabinet/src/components/nodes/NodeOverflowHoldLine.tsx` — строка
«жив · не пишет · буфер полон» + сырой код причины приглушённо + время факта. Таблица код→текст —
4/4 (M5), у меня её нет. Проводка в `NodesPage.tsx` — интеграция (файл общий).

## 7. Разбор отказа на пути отправки и репро обрыва

`server-storage-backend.ts`:

- `putSample`: `200` с телом `{ok:false, reason, …}` → **доменный отказ**: объявить слушателям
  `ServerStorageBackend.onSampleRefusal(listener)` (модульный реестр, как `setMediaLibraryTraceHook`;
  статический метод класса — барель не трогаю) и бросить `DomainError(…, 'SAMPLE_REFUSED', refusal)`;
  словаря бэкенд не знает — он транспорт, литералы проверяет носитель;
- `413` → `PAYLOAD_TOO_LARGE`, не `QUOTA_EXCEEDED` (M2: 413 только настоящему «тело велико»);
- `setUploadGate(gate)`: при `gate() === true` `putSample` не делает `fetch`, бросает
  `DomainError('…', 'UPLOAD_HELD')`.

Репро гипотезы №1 (M4 (г)): зуб в `liveJournalTrackWriter.test.ts` — поток микрофона жив,
heartbeat узла идёт 10 минут на фейковых таймерах, импорта клипов нет → `telemetry-track/v1` = 0
строк при 6 heartbeat. Вещдок: производитель трека — `appendLiveJournalTrackFromSampleImport`,
единственный вызов — из импорта (`mediaLibraryHubBridge.handleCaptureStop`). Развязка: молчание
документируется как законное (M4), пост-стоп режима не строю — состояние узла несёт факт.

## 8. Что НЕ строю

Окно/кнопки/плашку/бейдж (4/4); словарь причин (A) — у меня стаб; поле политики и его панель
(B) — у меня стаб-провайдер; ретраи; авто-возобновление; гашение WS/heartbeat; вторую машину;
«смерть по телеметрии»; фиктивную телеметрию; алгоритм очистки; тарифы.
