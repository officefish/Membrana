# Промпт (эпик): Membrana Studio — настольная расширенная версия полевого клиента

> **Task-промпт для координатора и агента** · [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md)  
> **Task-эпик** (6 PR) · **Размер:** **L** (фазы MS0–MS5)  
> **Ожидаемый артефакт:** 6 последовательных PR; каждый `Closes` подзадачу в GitHub Issue эпика.  
> **Реестр:** `id` = **`membrana-studio-desktop`** в [`docs/tasks/registry.json`](../tasks/registry.json)  
> **Канон продукта:** [`MEMBRANE_PLATFORM.md`](../MEMBRANE_PLATFORM.md) §«Линейка полевых приложений»

**GitHub Issue:** [#93](https://github.com/officefish/Membrana/issues/93).

---

## Контекст продукта

Полевой клиент `apps/client` уже работает в браузере и через `yarn workspace @membrana/client dev` (paired + MP7 WebSocket проверены на prod). Для **расширенной** полевой работы (все модули, плагины, микрофон, журнал, sample library, device-board) нужна **настольная оболочка** с доступом к файловой системе и нативным окном.

**Membrana Studio** — это бренд и пакет `apps/membrana-studio`: Electron-оболочка, которая загружает **тот же** `apps/client` (renderer), но с режимом `electron-system-files` и `window.electronAPI`.

**Membrana Device** — **отдельный продукт** (будущий эпик `membrana-device-desktop`): узкий конфигуратор одного прибора — **только** коннектор узла (pairing) + модуль **device-board**, без каталога модулей/плагинов. В scope **Studio** не входит; общий только контракт `electronAPI` и паттерн shell (переиспользование в Device — фаза после MS5).

| Продукт | Пакет | Renderer | Модули / плагины |
|---------|-------|----------|------------------|
| Web client | `apps/client` в браузере | Vite SPA | полный каталог |
| **Membrana Studio** | `apps/membrana-studio` | `apps/client` | полный каталог |
| **Membrana Device** (v2) | `apps/membrana-device` | slim shell | только connector + device-board |

**Связанные документы:**

| Документ | Зачем |
|----------|--------|
| [`MEMBRANE_PLATFORM.md`](../MEMBRANE_PLATFORM.md) | Pairing, узел, REST vs WS |
| [`MEDIA_LIBRARY_ARCHITECTURE.md`](../MEDIA_LIBRARY_ARCHITECTURE.md) | `electron-fs` backend, путь `apps/membrana-studio` |
| [`DEVICE_BOARD_HACKATHON_BRIEF.md`](./DEVICE_BOARD_HACKATHON_BRIEF.md) | Сценарий «скачать desktop → pairing → device-board» (Studio) |
| [`MEMBRANE_NODE_REALTIME_GATEWAY_EPIC_PROMPT.md`](./MEMBRANE_NODE_REALTIME_GATEWAY_EPIC_PROMPT.md) | MP7 WS — smoke в MS5 |
| [`TASK_CLOSURE_REGULATION.md`](./TASK_CLOSURE_REGULATION.md) | Закрытие фаз + installer smoke |

**Ветка:** shell + preload → feature-ветка `membrana-studio` (или текущая рабочая). Контракты `@membrana/core` не трогаем без ветки `vesnin`.

---

## Мнение виртуальной команды

```text
[Teamlead — Vesnin]:
Studio = полный apps/client в Electron; Device — отдельный эпик, не смешивать в один installer.
MS0→MS5 строго последовательно. MS5 — paired smoke на prod (mic + journal WS) обязателен до archive.
Не дублировать бизнес-логику media-library в main: только FS + IPC в shell.

[Структурщик — Ozhegov]:
apps/membrana-studio: main | preload | media-library-fs | paths. Renderer — apps/client без форка.
preload экспортирует electronAPI.mediaLibrary + trendsTemplates (как в electronMediaLibraryPort.ts).
Запрещено: импорт agenda/plugins в main process; второй AudioContext в shell.

[Математик — Dynin]:
Квоты electron-fs — soft limit на диске; не смешивать с server quota в paired mode.
resolveMediaLibraryBackend: paired + server OK → server; иначе electron-fs в Studio.

[Музыкант]:
DoD MS5: Studio + микрофон Windows, live brief в cabinet ≤1 с после окна 3+2 с.
Разрешение микрофона ОС — в runbook MS5.

[Верстальщик — Rodchenko]:
Окно Studio: title «Membrana Studio»; StorageRuntimeIndicator показывает «Electron FS».
Иконка и NSIS-брендинг — MS4, DESIGN.md токены для about/splash (минимум).
```

---

## План спринта (фазы MS0–MS5)

| Фаза | Реестр `id` | PR | Lead | Содержание | Зависит от |
|------|-------------|-----|------|------------|------------|
| **MS0** | `membrana-studio-ms0-canon` | 0 | Vesnin | Глоссарий Studio vs Device; пути в MEDIA_LIBRARY_ARCHITECTURE; README `apps/membrana-studio` | — |
| **MS1** | `membrana-studio-ms1-shell` | 1 | Ozhegov | Electron main + preload; `yarn studio:dev` (client Vite + Studio); prod load `client-dist` | MS0 |
| **MS2** | `membrana-studio-ms2-media-fs` | 2 | Ozhegov | `electronAPI.mediaLibrary` — FS в `%APPDATA%/Membrana/media-library/` | MS1 |
| **MS3** | `membrana-studio-ms3-journal-fs` | 3 | Ozhegov | Journal FS backend (замена stub); trendsTemplates на диске | MS2 |
| **MS4** | `membrana-studio-ms4-installer` | 4 | Rodchenko | electron-builder, NSIS Windows, `yarn studio:package` | MS3 |
| **MS5** | `membrana-studio-ms5-prod-smoke` | 5 | Vesnin | Prod env в build, paired + MP7 smoke, runbook | MS4 |

**Out of scope эпика Studio:**

- `apps/membrana-device` (отдельный эпик).
- Auto-update / code signing (v2).
- macOS / Linux installer (после Windows LGTM).
- Дублирование cabinet UI в Studio.

**Оценка:** MS0 0.5д · MS1 1–2д · MS2 2д · MS3 1д · MS4 1–2д · MS5 1д.

---

## Промпт целиком (для вставки агенту)

### Кто ты

Координатор виртуальной команды Membrana. Соблюдай [`VIRTUAL_TEAM_PROMPT.md`](../VIRTUAL_TEAM_PROMPT.md). Реализуешь **Membrana Studio**, не Membrana Device.

### MS1 — shell (обязательно)

- Пакет `@membrana/membrana-studio` в `apps/membrana-studio`.
- Dev: `MEMBRANA_STUDIO_DEV=1` → `BrowserWindow` на `http://localhost:5173` (ждать Vite).
- Prod: `file://` на `client-dist/index.html`; client build с `base: './'`.
- `contextIsolation: true`, `nodeIntegration: false`, preload → `window.electronAPI`.
- Корневые скрипты: `yarn studio:dev`, `yarn studio:build`, `yarn studio:package`.

### MS2 — media-library FS

Реализовать порт `IElectronMediaLibraryPort` в main process:

- Манифест JSON + blobs в `%APPDATA%/Membrana/media-library/`.
- Reserved collections `__buffer__`, `__tariff_dataset__` (константы из `@membrana/media-library-service`).
- Preload: Blob ↔ ArrayBuffer для IPC.

Клиент уже подключает backend через [`resolveMediaLibraryBackend.ts`](../../apps/client/src/lib/resolveMediaLibraryBackend.ts) и [`electronMediaLibraryPort.ts`](../../apps/client/src/lib/electronMediaLibraryPort.ts).

### MS3 — journal + trends

- Заменить stub [`electron-journal-storage-backend.ts`](../../packages/services/telemetry-journal/src/backends/electron-journal-storage-backend.ts) на FS или делегат с IPC.
- `electronAPI.trendsTemplates.read/write` → `%APPDATA%/Membrana/trends-templates.json`.

### MS4 — installer

- `electron-builder`, `productName: "Membrana Studio"`, `appId: space.membrana.studio`.
- Артефакт: NSIS `.exe` для Windows.

### MS5 — prod smoke

1. Собрать Studio с `VITE_CABINET_API_URL=https://cabinet.membrana.space`.
2. Pairing → mic live → cabinet видит journal + brief по WS.
3. Runbook в `apps/membrana-studio/README.md`.

### Запрещённые импорты (shell)

- main/preload **не** импортируют `@membrana/agenda`, плагины, React.
- Допустимо: `@membrana/core` (типы/ошибки) только если tree-shake не тянет DOM — предпочтительно дублировать константы collection id в shell.

---

## Definition of Done (эпик)

- [ ] `apps/membrana-studio` dev и packaged build на Windows.
- [ ] StorageRuntimeIndicator: «Electron FS» в автономном режиме.
- [ ] Paired mode: server journal + MP7 WS работают как в браузере.
- [ ] Документация: README Studio + § в MEMBRANE_PLATFORM.
- [ ] `yarn task:archive membrana-studio-desktop` после MS5 LGTM.

---

## Membrana Device (заготовка для отдельного эпика)

Кратко для triage — **не реализовывать в Studio**:

| Аспект | Device |
|--------|--------|
| Цель | Настройка одного прибора на объекте |
| UI | Connector (pairing) + device-board fullscreen |
| Каталог | Нет modules/plugins кроме device-board |
| Пакет | `apps/membrana-device` |
| Shell | Переиспользовать паттерн MS1 (общий preload позже) |

Issue Device создаётся **после** MS4 installer Studio (общий опыт упаковки).
