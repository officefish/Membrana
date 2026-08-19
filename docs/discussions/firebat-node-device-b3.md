# Обсуждение: firebat-node-device-b3

<!-- Автогенерация yarn ask. Каждый блок ниже — одно обращение к персонажу. -->

## 2026-08-19 13:17 UTC · ozhegov

**Вопрос:** Четыре вопроса структурщику, коротко: (1) Узел после b2 служебного токена НЕ имеет — значит ему нужна своя ручка загрузки записи под NodeKeyGuard. Форма: POST /v1/devices/:deviceId/node/samples (multipart, тот же SamplesService.upload, SamplesModule экспортирует сервис) — или загрузка = «результат задания» POST /node/tasks/:taskId/result с файлом в теле? (2) Хранилище очереди заданий: задание эфемерно (команда «снять пробу N с»; после рестарта media оператор повторит) — честна ли очередь В ПАМЯТИ с явной границей (одна очередь на deviceId, потолок 100, состояние queued|leased|done|failed, lease с TTL), или нужна таблица и это снова ревизия? (3) Регистрация FirebatNodeModule в app.module.ts (одна строка) — это монтирование дома внутри b3 (зона «module») или формально вне зоны и нужна ревизия? (4) Маршруты поллера: GET /v1/devices/:id/node/tasks?wait=0 (lease одного задания или пусто) · POST /node/tasks/:taskId/result · POST /node/heartbeat — ответы несут outcome: ok|stale_key|backoff; где рождается backoff (оператор ставит флаг на устройство? порог очереди?). Дай решение по каждому пункту и список ручек именами.

**Ответ:**

Контекст: b3 — контроллер поллера + очередь заданий. Ниже — решение по каждому пункту в терминах словаря дома.

**1. Загрузка записи узлом.** Разделяю две леммы: «сдать результат задания» ≠ «залить файл». Задание — команда с идентичностью (taskId), файл — её артефакт. Поэтому: `POST /v1/devices/:deviceId/node/tasks/:taskId/result` (multipart: `file` + `meta` JSON). Внутри — тот же `SamplesService.upload`; `SamplesModule` добавляет `exports: [SamplesService]`, `FirebatNodeModule` его импортирует. Отдельной `/node/samples` не заводим — второй фасад на одну функцию без ADR.

**2. Очередь.** In-memory честно, если явно назван режим и границы: `TaskQueueService` per-process, `Map<deviceId, Deque<Task>>`, состояния `queued|leased|done|failed`, lease TTL (например 30s) с авто-возвратом в `queued`, потолок 100/устройство, drop-oldest при переполнении. В README модуля — строкой: «эфемерная очередь, переживает только процесс; после рестарта — оператор повторяет». Таблицу — только когда появится требование переживать рестарт; это уже следующая ревизия.

**3. Регистрация в `app.module.ts`.** Одна строка `FirebatNodeModule` — это и есть акт монтирования дома, часть зоны b3 (сам модуль — его точка входа). Отдельной ревизии не нужно; но в PR-описании упомянуть строкой «app.module: +1 import».

**4. Ручки и outcome.** Именами:
- `GET  /v1/devices/:deviceId/node/tasks?wait=0` — lease одного задания или 204/пусто
- `POST /v1/devices/:deviceId/node/tasks/:taskId/result` (multipart)
- `POST /v1/devices/:deviceId/node/heartbeat`

`outcome` — не HTTP-статус, а поле в теле ответа/ack. Рождение:
- `stale_key` — из `NodeKeyGuard` (ключ отозван/сменён);
- `backoff` — из `TaskQueueService`, детерминированно: (а) очередь пуста и heartbeat чаще порога → `backoff: {retryAfterMs}`; (б) флаг `device.pollPaused` (оператор) → тот же outcome с большим TTL; (в) переполнение → `backoff` на результат.
- `ok` — успешный lease/приём.

Флаг паузы на устройстве — новое поле, значит либо использовать существующее (если есть), либо это уже b4/следующая ревизия; в b3 достаточно источника (а)+(в), (б) оставить заглушкой с TODO.

Риск связанности: экспорт `SamplesService` из `SamplesModule` — единственная новая межмодульная связь, она однонаправленна (`firebat-node` → `samples`), циклов нет. Проверь, что `firebat-node` не тянет ничего из `samples/*` мимо `index.ts` модуля.

[память:подсознание] emerge ozhegov-2026-08-17-server-plugin-foundation-m2-mount-homes — прямо про «дом = Nest-модуль с публичным контрактом приёма»: тот же вопрос, где монтируется точка приёма (здесь — `FirebatNodeModule` в `app.module.ts`), и почему это часть зоны, а не отдельная ревизия.
[память:подсознание] emerge ozhegov-2026-08-06-static-mmbrn-container-m5-affine-role — закрытый словарь операций (`upload-revision`, `write-metadata`): подтверждает, что «сдать результат» и «залить файл» разводятся не двумя ручками, а одной операцией `upload-revision`, вызванной из контекста задания.

---
## 2026-08-19 13:23 UTC · ozhegov

**Контекст:** C:/Users/USER19~1/AppData/Local/Temp/b3-ticket.md
**Вопрос:** Блок b3 исполнен по твоему решению (код в ticket): результат задания = та же загрузка (POST /node/tasks/:taskId/result multipart → SamplesService.upload; SamplesModule exports +1); очередь в памяти с явной границей (потолок 100, lease TTL 30 с с возвратом в queued, состояния queued|leased|done|failed, drop-oldest); ручки GET /node/tasks (lease) · POST /node/tasks/:id/result · POST /node/heartbeat под NodeKeyGuard, оператор POST /node/tasks · GET /node/tasks/queue под ApiTokenGuard+DeviceGuard; outcome в теле: ok|backoff (backoff рождается в очереди: пустая при опросе чаще 2 с, переполнение); stale_key — из guard (401); пульс — отдельная лемма recordPulse/lastPulse; FirebatNodeModule в app.module +1; index.ts — модуль и типы только; правило «NodeKeyGuard не на контроллере ключей» в комментарии модуля; флаг паузы устройства (б) не заведён — названо. 11 зубов. Подписываешь b3? «подписываю» или список недостающего.

**Ответ:**

Подписываю.

Проверил по своей норме — граница дома держится, словарь закрыт, связи однонаправленные:

- **Дом и его контракт.** `FirebatNodeModule` — единственная точка входа; `index.ts` экспортирует модуль + типы/константы словаря (`POLL_OUTCOMES`, `TASK_KINDS`, `TASK_STATES`, `NODE_KEY_*`). Репозитории devices, приём WAV, хранилище ключей — internal. Норма §1c соблюдена.
- **Однонаправленная связь.** `firebat-node → samples` (через `SamplesService.upload`) и `firebat-node → devices` (гарды). Обратных рёбер нет, детекторы и клиент не импортируют дом.
- **Два лица — два гарда.** `NodeKeyGuard` только на ручках узла; `NodeKeyController` (b2) под `ApiTokenGuard+DeviceGuard`. Комментарий в модуле фиксирует правило словом — это и есть словарная статья границы.
- **Словарь исходов закрыт.** `ok | stale_key | backoff` как поле тела; `stale_key` рождается только в guard (401). Смешения с HTTP-статусом нет.
- **Термины разведены.** `task` (задание), `sample` (принятая запись, id из `SamplesService`), `pulse` (наблюдение «жив») — три леммы, ни одна не тянет на себя чужой смысл. `recordPulse/lastPulse` вынесены отдельной парой методов — правильно.
- **Эфемерность названа словом** в шапке `task-queue.service.ts`: «переживает только процесс». Это и есть определение до реализации — следующая ревизия (persistence) войдёт по контракту, не ломая словарь.

Одна пометка на память, не блокер b3:

- **Флаг паузы устройства (пункт «б»)** назван и оставлен снаружи — согласен, но зафиксируйте отдельным тикетом, чтобы «пауза» не всплыла как синоним `backoff` в разговоре оператора. Один термин — один смысл.

b3 закрыт.

---
