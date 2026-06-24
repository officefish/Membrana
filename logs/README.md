# Local debug logs

Каталог для **локальных** логов при отладке (не коммитятся). Не путать с CI-артефактами и deploy-выводом в корне репо — см. `docs/CONTRIBUTING.md`.

| Путь | Приложение |
|------|------------|
| [`apps/client/logs.txt`](./apps/client/logs.txt) | Device-board trace (приоритет для `yarn logs:parse`) |
| [`apps/client/console-logs.txt`](./apps/client/console-logs.txt) | Membrana client (Vite, browser console) — fallback |

Агентам: при «читай лог» / «обновил логи» — `yarn logs:parse` (см. [`docs/device-board-scripts/CLIENT_LOGS_PARSING.md`](../docs/device-board-scripts/CLIENT_LOGS_PARSING.md)).
