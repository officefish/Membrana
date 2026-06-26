# Membrana Studio

**Membrana Studio** — настольная (Electron) **расширенная** версия полевого клиента: полный `apps/client` (все модули и плагины) в нативном окне с хранением на диске (`electron-system-files`).

| Продукт | Назначение |
|---------|------------|
| **Membrana Studio** (этот пакет) | Полевой анализ: микрофон, журнал, sample library, device-board, pairing |
| **Membrana Device** (будущий `apps/membrana-device`) | Узкий конфигуратор: только pairing + device-board |
| **Web** (`apps/client` в браузере) | Тот же renderer, без FS |

## Статус

Эпик **MS0–MS6** — [`docs/prompts/MEMBRANA_STUDIO_DESKTOP_EPIC_PROMPT.md`](../../docs/prompts/MEMBRANA_STUDIO_DESKTOP_EPIC_PROMPT.md).

**MS6** — Host Bridge Contract: [`docs/STUDIO_HOST_BRIDGE_CONTRACT.md`](../../docs/STUDIO_HOST_BRIDGE_CONTRACT.md) · дневник STx: [`docs/device-board-scripts/STUDIO_HOST_LESSONS.md`](../../docs/device-board-scripts/STUDIO_HOST_LESSONS.md).

**MS1** — shell + `yarn studio:dev`.  
**MS2** — `electronAPI.mediaLibrary` → `%APPDATA%/Membrana/media-library/` (manifest + blobs).  
**MS3** — `electronAPI.journal` + `electronAPI.trendsTemplates` → journal и trends на диске.  
**MS4** — `yarn studio:package` → NSIS installer в `release/`.

## Хранение (MS2–MS3)

| Путь (Windows) | Содержимое |
|----------------|------------|
| `%APPDATA%/Membrana/media-library/manifest.json` | коллекции + метаданные сэмплов |
| `%APPDATA%/Membrana/media-library/blobs/*.bin` | WAV и др. |
| `%APPDATA%/Membrana/journal/items.json` | live journal (tracks/reports) |
| `%APPDATA%/Membrana/trends-templates.json` | пользовательские FFT-шаблоны trends |
| `%APPDATA%/Membrana/logs/device-board-trace-latest.txt` | **T1** — trace сценария (support) |
| `%APPDATA%/Membrana/logs/shell-YYYY-MM-DD.log` | **M1** — shell log (после DL-1; см. ниже) |

В UI: `StorageRuntimeIndicator` → **Electron FS**. Paired + server OK → journal на cabinet; media-library backend — по `resolveMediaLibraryBackend` (server при доступности, иначе electron-fs). Journal backend — `resolveJournalBackend` (sync + electron-fs fallback). Trends — `userTemplatesPersistence` через `electronAPI.trendsTemplates`.

## Команды

| Команда | Действие |
|---------|----------|
| `yarn studio:dev` | Vite client + Electron (dev, `localhost:5173`) |
| `yarn studio:build` | Client dist → `client-dist/` + compile shell |
| `yarn studio:package` | `studio:build` + NSIS `.exe` → `apps/membrana-studio/release/` |
| `yarn workspace @membrana/membrana-studio start` | Electron после `studio:build` (`MEMBRANA_STUDIO_DEV` не задан) |

## Installer (MS4)

Windows NSIS: `yarn studio:package` (требует `electron` binary и `electron-builder`). Артефакт:

- `apps/membrana-studio/release/Membrana Studio Setup <version>.exe`

Code signing и auto-update — вне scope MS4.

## CI / условный релиз (DR6 deploy-pipeline-refactor)

Workflow [`.github/workflows/desktop-studio.yml`](../../.github/workflows/desktop-studio.yml) собирает
Electron-пакет **условно** и **декаплированно** от деплоя сервера: тяжёлый installer не пересобирается
на каждый серверный деплой — только когда изменения коснулись приложения или его зависимостей.

| Триггер | Поведение |
|---------|-----------|
| push в `main` | собрать installer (артефакт CI) **только если** `@membrana/client` или `@membrana/membrana-studio` затронуты (turbo affected: изменённые пакеты + их зависимые) |
| push тега `studio-v*` | собрать всегда + приложить `.exe` к GitHub Release |
| `workflow_dispatch` | собрать вручную (force) |

Студия по графу turbo **не** зависит от `@membrana/client` (renderer копируется скриптом `studio:build`),
поэтому affected-триггером служит изменение **либо** renderer (`@membrana/client` и его зависимости —
`core`, `device-board`, `services/*`, `libs/*`), **либо** оболочки (`@membrana/membrana-studio`).

```bash
# релиз десктопа: тег → CI соберёт NSIS и приложит к GitHub Release
git tag studio-v0.1.0 && git push origin studio-v0.1.0
```

Сборка идёт на `windows-latest` (`yarn studio:package`, NSIS). Code signing / auto-update — вне scope DR6
(в DR6 далее — только индикатор версии и «доступно обновление», следующим шагом).

## Pairing и MP7

Studio использует `VITE_CABINET_API_URL` (baked при `MEMBRANA_STUDIO_PROD=1` / `yarn studio:package`):

- Prod: `https://cabinet.membrana.space`
- WebSocket: `wss://cabinet.membrana.space/v1/nodes/realtime`

Подробнее: [`docs/MEMBRANE_PLATFORM.md`](../../docs/MEMBRANE_PLATFORM.md).

## Prod smoke (MS5 runbook)

### Automated (`yarn studio:ms5-smoke`)

После `yarn studio:package` (prod `VITE_CABINET_API_URL`):

| Check | Что проверяет |
|-------|----------------|
| `studio-main-js` | `apps/membrana-studio/dist/main.js` |
| `client-dist-index` | renderer собран |
| `prod-cabinet-url-baked` | `https://cabinet.membrana.space` в client-dist |
| `nsis-installer` | `.exe` в `release/` |
| `cabinet-health` | `GET /health` prod |
| `mp7-ws-smoke` | `yarn cabinet:mp7:prod` (нужен `.env` VPS; или `--no-mp7`) |

### Manual (оператор, Windows)

1. **Установка:** `apps/membrana-studio/release/Membrana Studio Setup 0.1.0.exe`.
2. **Запуск Studio** → `StorageRuntimeIndicator` показывает **Electron FS**.
3. **Pairing:** Connector → ключ из cabinet → «связан».
4. **Mic live:** Microphone → разрешить микрофон ОС → auto-capture / live.
5. **Cabinet:** journal + brief по WS (подтверждается MP7 smoke).
6. **Локально:** `%APPDATA%/Membrana/journal/items.json` и `media-library/` после записи.

### Commands

```bash
yarn studio:package      # prod build + NSIS
yarn studio:ms5-smoke    # automated MS5
yarn cabinet:mp7:prod    # MP7 WS only
```

Dev без installer: `yarn studio:dev` — shell **сам компилирует** `dist/main.js` при первом запуске (нужен бинарник `electron`).

Если окно «Unable to find Electron app» — нет `apps/membrana-studio/dist/main.js`; `yarn studio:dev` или `yarn workspace @membrana/membrana-studio dev` соберут его автоматически.

Если Electron binary не скачался: `node node_modules/electron/install.js` из корня репо.

## Логи и диагностика

**Канон:** [`docs/DESKTOP_APP_LOGGING_POLICY.md`](../../docs/DESKTOP_APP_LOGGING_POLICY.md) · support: [`docs/support/DESKTOP_SUPPORT_RUNBOOK.md`](../../docs/support/DESKTOP_SUPPORT_RUNBOOK.md).

| Канал | Файл (Windows) | Назначение |
|-------|----------------|------------|
| **T1** scenario trace | `%APPDATA%\Membrana\logs\device-board-trace-latest.txt` | gate, upload, journal — **основной** для support |
| **M1** shell log | `%APPDATA%\Membrana\logs\shell-YYYY-MM-DD.log` | main, IPC, crash — **DL-1** (`electron-log`) |

**T1** — auto-flush при stop (`scenario-run-stop`) и `beforeunload`. **M1** — при каждом запуске Studio.

**Пользователь:** INFO на device-board → воспроизвести → Download trace → отправить файл в support.

**Разработчик / агент:**

```bash
yarn logs:parse:studio          # paste в logs/apps/studio/logs.txt
yarn logs:parse                 # или AppData trace, если новее
yarn desktop:support-collect    # manifest + trace для тикета
```

Подробнее: [`logs/apps/studio/README.md`](../../logs/apps/studio/README.md) · [`CLIENT_LOGS_PARSING.md`](../../docs/device-board-scripts/CLIENT_LOGS_PARSING.md).
