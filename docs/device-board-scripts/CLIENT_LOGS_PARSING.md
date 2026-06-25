# Client logs parsing (`logs_parsing`)

Операторский и агентский playbook для разбора дампов browser console device-board.

**Связанные документы:**

- Маркеры цепочки: [`SCENARIO_CHAIN_LOG_COOKBOOK.md`](./SCENARIO_CHAIN_LOG_COOKBOOK.md)
- Smoke MVP mic: [`USERCASE_MVP_MICROPHONE.md`](./USERCASE_MVP_MICROPHONE.md)
- Куда класть лог: [`logs/README.md`](../../logs/README.md)

---

## Когда применять

| Триггер | Действие |
|---------|----------|
| «обновил логи», «читай лог», «разбери logs.txt» | `yarn logs:parse` |
| Smoke P5 / operator sign-off | parse + сверка gate / publish / upload |
| `upload-failed` / paired mode | `yarn media:diag` — [`MEDIA_SERVER_DIAGNOSTICS.md`](../deploy/MEDIA_SERVER_DIAGNOSTICS.md) |
| reports ≠ tracks на сервере | parse + § «Reports vs tracks» ниже |
| Ошибка cabinet `live-records 500` | parse + grep `live-records` в дампе |

**Skill для Cursor:** [`.cursor/skills/membrana-client-logs-parsing/SKILL.md`](../../.cursor/skills/membrana-client-logs-parsing/SKILL.md)

---

## Источники логов

| Путь | Назначение |
|------|------------|
| `logs/apps/client/logs.txt` | Основной дамп (приоритет для `yarn logs:parse`) |
| `logs/apps/client/console-logs.txt` | Fallback (см. `AGENTS.md`) |

Формат строки (DevTools copy или trace export):

```text
index.ts:35 [INFO] [device-board][channel] message {runId: '7e8a289c', tick: 44, branch: 'main', …}
```

Включите чекбокс **INFO** на device-board перед Run. Фильтр DevTools: `[device-board]`.

---

## Быстрый старт (агент)

```bash
# последний runId в файле
yarn logs:parse

# конкретный прогон
yarn logs:parse -- --run-id 7e8a289c

# JSON для sprint OPEN / CI artifact
yarn logs:parse -- --json

# список всех runId в файле
yarn logs:parse -- --list-runs
```

**Не парсить вручную через ad-hoc `node -e`** — используйте `scripts/parse-client-logs.mjs` (логика в `scripts/lib/client-logs-parser.mjs`).

---

## Процесс `logs_parsing` (5 шагов)

### 1. Найти файл и runId

- Проверить `logs/apps/client/logs.txt`, иначе `console-logs.txt`.
- `yarn logs:parse -- --list-runs` — если в файле несколько прогонов.
- По умолчанию анализируется **последний** `runId` (последний `scenario-run-start`).

### 2. Запустить парсер

```bash
yarn logs:parse -- --file logs/apps/client/logs.txt --run-id <id>
```

Сохранить вывод в sprint note или приложить `--json`.

### 3. Прочитать сводку

| Поле отчёта | Смысл |
|-------------|--------|
| `onStart fn-1 bootstrap` | P0.3: `fn-1-block` + `start-recording` до main |
| `gate-true` ticks | Окна `windowSec` заполнены → hot path MakeTrack |
| `publish-done` | Trends reports ушли в journal (синхронно с gate) |
| `upload-ok` | WAV на media API (часто **позже** gate-тика) |
| `drone-skip` | `MakeReportFromTrack` без track в journal (**v0.9**); **v2.0-async** ожидает **0** на happy path |
| `asyncJobs` | AP v1: `start` / `resolved` / `rejected` / `cancelled` по chain-log |
| `mainTick` | `main-tick-blocked-ms` · `elapsedMs` на gate path |
| `smoke v2.0-async` | AP v1 operator matrix (`smokeV20Async` в JSON) |
| `operator smoke` | MVP v0.9 критерии; для v2.0 см. `smoke v2.0-async` |

### 4. Типовой gate-цикл

**v2.0-async (bundled default):**

1. `[recording] recording-window-full`
2. `sequence-latent-then-start` → Then branches fire-and-forget
3. `stop-recording` → `[track] slice-start` → `async-job-start` (track-upload)
4. `fft-trends-done` → `trends-report-done` → `[journal] publish-done` (sync, Then-2)
5. `main-tick-blocked-ms` — без ожидания `upload-ok` на том же tick
6. Detached: `[async-job] resolved` → drone `publish-done`
7. `main-infinity` → следующий tick

Ожидание: `smoke v2.0-async: PASS` · `drone-skip: 0`.

**v0.9-functions (legacy `7e8a289c`):**

1. `[recording] recording-window-full`
2. `stop-recording` → `[track] slice-start` → `[media] upload-start`
3. `fft-trends-done` → `[journal] publish-done`
4. `[report] drone-skip: track-not-in-journal` (upload ещё не завершён)
5. `main-infinity` → следующий tick

10 gate ticks; 10 publish; 3 upload-ok до Stop; **drone-skip: 9**.

### 5. Интерпретация для operator / sprint

| Критерий P5 | Как проверить в отчёте |
|-------------|------------------------|
| onStart bootstrap | `fn-1 bootstrap: PASS` |
| Run ≥60s | `max tick ≥60: PASS` |
| ≥2 recording windows | `gate windows ≥2: PASS` |
| Reports на сервере | `trends publish = gate: PASS` |
| Tracks на сервере | `upload-ok ≥2` — **WARN** если Stop раньше async; подождать 5–10 с или смотреть сервер |

---

## Reports vs tracks (timing)

**v2.0-async:** trends publish sync на gate; upload async via `StartAsyncJob`; drone report **после** `async-job resolved` — нет stable `drone-skip` на happy path.

**v0.9-functions (legacy):**

- `publish-done` (trends) — **на gate tick**.
- `upload-ok` — **на более позднем tick** (fire-and-forget `MakeTrack`).
- `drone-skip: track-not-in-journal` — sync второй `PublishReport` до upload.

Поэтому на сервере **reports раньше tracks** — норма для v0.9, не для v2.0 happy path.

```
gate tick 44:  publish-done ✓   upload-ok ✗
gate tick 330: upload-ok ✓     (slice от tick ~309)
```

См. также [`SCENARIO_CHAIN_LOG_COOKBOOK.md`](./SCENARIO_CHAIN_LOG_COOKBOOK.md) § «Типичные сбои».

---

## Аномалии в отчёте

| anomaly | Действие |
|---------|----------|
| `reports-ahead-of-tracks` | v0.9: информационно; v2.0: проверить detached drone path |
| `drone-skip-track-not-in-journal` | **v0.9:** норма до upload; **v2.0:** регресс — см. `smoke v2.0-async` |
| `main-tick-blocked-on-upload` | v2.0: регресс latent path (main tick ждёт upload) |
| `cabinet-telemetry-errors` | Отдельный тикет (cabinet `live-records` 500), не media upload |

---

## Маркеры (reference)

Парсер считает по подстрокам в строке (см. `scripts/lib/client-logs-parser.mjs`):

| Маркер | Роль |
|--------|------|
| `scenario-run-start` | начало runId |
| `[recording] recording-window-full` | gate-true (не дубли `node-enter`) |
| `[recording] stop-recording` | конец окна |
| `[track] slice-start` | MakeTrack |
| `[media] upload-start` / `upload-ok` | media pipeline |
| `[journal] publish-done` | report в journal |
| `[report] trends-report-done` | FFT trends path |
| `[report] drone-skip` | пропуск track report (v0.9 race) |
| `async-job-start` / `[async-job] resolved` | AP v1 job lifecycle |
| `sequence-latent-then-start` | latent Sequence dispatch |
| `event-dispatch-detached-start` | detached event branch |
| `main-tick-blocked-ms` | длительность main tick (`elapsedMs`) |
| `main-infinity` + `loop-repeat` | gate-false путь |

Полный cookbook: [`SCENARIO_CHAIN_LOG_COOKBOOK.md`](./SCENARIO_CHAIN_LOG_COOKBOOK.md).

---

## Расширение парсера

Новый маркер → `scripts/lib/client-logs-parser.mjs` + тест `scripts/client-logs-parser.test.mjs` + строка в этой таблице.

Не дублировать логику в агентских one-off скриптах.

---

## Пример вывода

**v0.9 baseline (`7e8a289c`):**

```text
file: logs/apps/client/logs.txt
runIds in file: 7e8a289c
selected: 7e8a289c

=== run 7e8a289c ===
onStart fn-1 bootstrap: yes · windowSec=5
main ticks: max=376 · gate-false (∞): 750
gate-true: 10 · ticks: 44, 85, 112, 153, 190, 229, 269, 309, 344, 376
publish-done: 10 · trends: 10 · upload-ok: 3 · drone-skip: 9
anomalies: reports-ahead-of-tracks … · drone-skip-track-not-in-journal …

smoke MVP microphone:
  fn-1 bootstrap: PASS
  gate windows ≥2: PASS (10)
  operator smoke (no upload wait): PASS
```

**v2.0-async (ожидаемый live run):** секция `smoke v2.0-async: PASS`, `drone-skip: 0`, маркеры `asyncJobs` / `mainTick`. Fixture: `node --test scripts/client-logs-parser.test.mjs`.

---

## Команды тестов

```bash
node --test scripts/client-logs-parser.test.mjs
yarn logs:parse -- --file logs/apps/client/logs.txt
```
