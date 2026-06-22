# Local debug logs

Каталог для **локальных** логов при отладке (не коммитятся). Не путать с CI-артефактами и deploy-выводом в корне репо — см. `docs/CONTRIBUTING.md`.

| Путь | Приложение |
|------|------------|
| [`apps/client/console-logs.txt`](./apps/client/console-logs.txt) | Membrana client (Vite, browser console) |

Агентам: при «читай лог» / «ошибка в client» — сначала `logs/apps/client/console-logs.txt`.
