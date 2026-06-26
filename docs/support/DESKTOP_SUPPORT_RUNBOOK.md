# Support: настольные приложения Membrana (Studio / Device)

Краткая инструкция для пользователя и support. **Канон:** [`DESKTOP_APP_LOGGING_POLICY.md`](../DESKTOP_APP_LOGGING_POLICY.md) v1.0.

---

## Что отправить в support

1. Откройте **Membrana Studio** (или **Device**, когда выйдет).
2. На панели **device-board** включите **INFO**.
3. Воспроизведите проблему (Run сценария) и нажмите **Stop**.
4. Trace сохраняется автоматически в:
   ```
   %APPDATA%\Membrana\logs\device-board-trace-latest.txt
   ```
   (папка `logs` создаётся при первом запуске Studio). Альтернатива: **Download trace** вручную.
5. Приложите также `shell-YYYY-MM-DD.log` из той же папки (если есть).
6. Отправьте файлы + версию приложения, ОС, **Studio или Device**.

**Не отправляйте** без запроса: `media-library/`, большие аудио blobs, `journal/items.json` (только по отдельному согласию).

---

## Если support просит «собрать пакет» (есть Node / клон репозитория)

```powershell
cd C:\path\to\Membrana
yarn desktop:support-collect
```

Скрипт создаст папку в `%TEMP%` с `manifest.json` и копией trace (позже — и shell log). Заархивируйте и отправьте.

---

## Где лежат данные на диске (Windows)

| Путь | Что это |
|------|---------|
| `%APPDATA%\Membrana\logs\device-board-trace-latest.txt` | **T1** — диагностика сценария (нужна support) |
| `%APPDATA%\Membrana\logs\shell-YYYY-MM-DD.log` | **M1** — shell log |
| `%APPDATA%\Membrana\journal\items.json` | Журнал (данные, не console-log) |
| `%APPDATA%\Membrana\media-library\` | Библиотека сэмплов |
| `%APPDATA%\Membrana\logs\app-*.log` | **Устарело (L0)** — не использовать |

Открыть папку: `Win+R` → `%APPDATA%\Membrana` → Enter.

**README приложений:** [Studio](../../apps/membrana-studio/README.md) · [Device](../../apps/membrana-device/README.md).
