# Task registry storage contract

## Цель

`docs/tasks/registry.json` — горячая read-проекция для открытых задач. Она должна оставаться маленькой и безопасной для утренних ритуалов.

`docs/tasks/archive.jsonl` — холодный архив закрытых задач. Новые закрытия пишутся туда через `yarn task:archive`.

## Hot registry statuses

В `registry.json` допустимы:

- `draft` — запись ещё не исполняется; `promptPath` может быть `null`.
- `active` — исполняемая задача; `promptPath` обязателен.
- `review` — задача на closure/teamlead review; `promptPath` обязателен.
- `paused` — временно остановлена; `promptPath` обязателен.
- `deferred` — отложена; `promptPath` может быть `null`.

Legacy statuses `archived`, `closed`, `completed` пока читаются как миграционный долг, но новые закрытия не должны добавлять такие строки в hot registry.

## Archive log

Файл: `docs/tasks/archive.jsonl`.

Одна строка — один JSON-record закрытой задачи:

- `archiveSchemaVersion: 1`
- `id`
- `title`
- `status: "archived"`
- `archivedAt`
- `archiveNotes`
- `githubIssueClosedAt`

Запись/обновление делаются атомарно через temporary file → rename.

## Ritual invariant

`yarn main-day-issue` использует только ritual-safe задачи:

- `status in ["active", "review"]`
- `promptPath` — непустая строка

Promptless `active/review` записи считаются ошибкой контракта и ловятся `yarn tasks:audit:verify`.

## Commands

- `yarn tasks:audit` — отчёт по статусам, promptless задачам и legacy rows.
- `yarn tasks:audit:verify` — CI-friendly проверка контракта; legacy closed rows пока разрешены warning-ом.
- `yarn tasks:audit:verify --strict` — будущий gate после полной миграции legacy rows.
- `yarn task:archive <id>` — переносит hot task в `archive.jsonl`, пишет карточку `docs/tasks/archive/<id>.md`, обновляет README.
- `yarn task:close-github` — закрывает Issues по archive queue и обновляет `githubIssueClosedAt`.
