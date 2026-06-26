# Local debug logs

Каталог для **локальных** логов при отладке (не коммитятся). Канон настольных приложений: [`docs/DESKTOP_APP_LOGGING_POLICY.md`](../docs/DESKTOP_APP_LOGGING_POLICY.md).

| Путь | Приложение |
|------|------------|
| [`apps/studio/logs.txt`](./apps/studio/logs.txt) | **Membrana Studio** — dev paste (см. [`apps/studio/README.md`](./apps/studio/README.md)) |
| `%APPDATA%/Membrana/logs/device-board-trace-latest.txt` | **T1** — packaged Studio / Device |
| `%APPDATA%/Membrana/logs/shell-YYYY-MM-DD.log` | **M1** — shell (после DL-1) |
| `%APPDATA%/Membrana/logs/app-*.log` | **L0 deprecated** — не для `logs:parse` |
| [`apps/client/logs.txt`](./apps/client/logs.txt) | Browser client — device-board trace |
| [`apps/client/console-logs.txt`](./apps/client/console-logs.txt) | Browser console — fallback |

`yarn logs:parse` без `--file` берёт **самый свежий** из существующих файлов выше.

Support: `yarn desktop:support-collect` · playbook: [`CLIENT_LOGS_PARSING.md`](../docs/device-board-scripts/CLIENT_LOGS_PARSING.md).
