# Политика логов и support-feedback — настольные приложения Membrana

| Поле | Значение |
|------|----------|
| **Версия** | **1.0** (LGTM 2026-06-26) |
| **Консилиум** | [`seanses/desktop-logging-policy-2026-06-26.md`](./seanses/desktop-logging-policy-2026-06-26.md) |
| **Продукты** | Membrana Studio · Membrana Device (план) |
| **Спринт** | `db3h-s5-desktop-logging` |
| **Связано** | [`CLIENT_LOGS_PARSING.md`](./device-board-scripts/CLIENT_LOGS_PARSING.md) · [`STUDIO_HOST_LESSONS.md`](./device-board-scripts/STUDIO_HOST_LESSONS.md) |

Пользователи устанавливают **настольные** приложения на свои ПК. Support и разработка должны **одинаково** знать:

1. **Где** лежат диагностические артефакты (и что *не* является логом).
2. **В каком формате** их читать и передавать.
3. **Какой канал** feedback: файл, скрипт под руководством, будущий in-app export.

Браузерный `apps/client` (Vite) — отдельный контур (dev paste в `logs/apps/client/`); здесь только **Electron hosts**.

---

## 1. Два канала логов (канон)

| Канал | ID | Файл | Содержимое | Статус реализации |
|-------|-----|------|------------|-------------------|
| **Scenario trace** | T1 | `device-board-trace-latest.txt` | gate, upload, journal, mic — smoke device-board | **DL-2** ✅ auto-flush on stop/crash |
| **Shell log** | M1 | `shell-YYYY-MM-DD.log` | main, IPC, crash, FS | **DL-1** ✅ `electron-log` |

Оба канала — только под `Membrana/logs/`. Запись на диск **только из Electron main**; renderer → IPC (как journal / media-library).

---

## 2. Продукты

| Продукт | Пакет | README | Статус |
|---------|-------|--------|--------|
| **Membrana Studio** | `apps/membrana-studio` | [`README.md`](../apps/membrana-studio/README.md) | Shipped (NSIS) |
| **Membrana Device** | `apps/membrana-device` (план) | [`README.md`](../apps/membrana-device/README.md) | План |

**Общее:** один `userData` root (`Membrana/`), один формат T1, одна политика путей. Device наследует политику при появлении shell.

---

## 3. Классы артефактов (не путать)

| Класс | ID | Пример пути | Лог? | Для support |
|-------|-----|-------------|------|-------------|
| **Scenario trace** | T1 | `…/logs/device-board-trace-latest.txt` | ✅ | **Основной** |
| **Shell log** | M1 | `…/logs/shell-2026-06-26.log` | ✅ | IPC, crash, FS |
| **DevTools paste** | T2 | `logs.txt` в AppData или repo | ✅ | Допустимо; хуже из‑за `…` (ST8) |
| **User data / journal** | D1 | `…/journal/items.json` | ❌ | Opt-in только |
| **Media library** | D2 | `…/media-library/` | ❌ | Не в bundle по умолчанию |
| **Legacy app log** | L0 | `…/logs/app-YYYY-MM-DD.log` | ⚠️ **deprecated** | Не использовать |
| **Chromium internal** | X1 | `Cache`, `GPUCache`, … | ❌ | Не собирать |

---

## 4. Корень данных (`userData`)

Electron: `app.setPath('userData', …/Membrana)` в Studio [`main.ts`](../apps/membrana-studio/src/main.ts).

| ОС | Путь |
|----|------|
| **Windows** | `%APPDATA%\Membrana\` |
| **macOS** | `~/Library/Application Support/Membrana/` |
| **Linux** | `~/.config/Membrana/` |

### Канонические подпути

```
Membrana/
├── journal/items.json
├── media-library/
├── trends-templates.json
└── logs/
    ├── device-board-trace-latest.txt   # T1
    ├── shell-YYYY-MM-DD.log            # M1 (после DL-1)
    └── support-manifest.json           # последний collect (опционально)
```

**Ротация M1:** до 5 файлов × 5 MB (после DL-1). **T1:** `latest` перезаписывается; архив `device-board-trace-<runId>.txt` — при export по желанию.

---

## 5. Формат scenario trace (T1)

**Строка:**

```text
[INFO] [device-board][media] upload-ok {runId: '092a986c', tick: 53, branch: 'main', trackId: 'track-…', …}
```

| Поле | Назначение |
|------|------------|
| `[device-board][stage]` | `recording`, `journal`, `media`, `async-job`, … |
| `runId` | 8 hex — один прогон |
| `tick` | Main loop tick |

**Разбор (разработка):** `yarn logs:parse` / `yarn logs:parse:studio` — см. [`CLIENT_LOGS_PARSING.md`](./device-board-scripts/CLIENT_LOGS_PARSING.md).

**Лимит буфера UI:** 10 000 строк — для длинных run предпочитать Download trace или auto-flush (DL-2).

### Формат shell log (M1, после DL-1)

```text
2026-06-26T12:34:56.789Z [info] [main] journal IPC read ok
2026-06-26T12:35:01.123Z [error] [renderer] uncaughtException …
```

Redaction в main до записи: pairing token, `Authorization`, чувствительные PII.

---

## 6. Политика feedback (пользователь → Membrana)

### Уровень A — самообслуживание (без репозитория)

1. INFO на device-board → воспроизвести → **Download trace**.
2. Сохранить как `%APPDATA%\Membrana\logs\device-board-trace-latest.txt`.
3. Отправить T1 (+ M1 когда появится) + версия приложения, ОС, Studio/Device.

**Не просить** по умолчанию: D1, D2, X1.

### Уровень B — под руководством support

```powershell
cd C:\path\to\Membrana
yarn desktop:support-collect
```

Собирает manifest + T1 (+ M1 после DL-1) в `%TEMP%\membrana-support-<timestamp>\`.

### Уровень C — разработчик / агент

| Команда | Назначение |
|---------|------------|
| `yarn logs:parse` | Smoke summary по T1 |
| `yarn logs:parse:studio` | Явно `logs/apps/studio/logs.txt` |
| `yarn studio:journal-fs-check` | Проверка D1 на диске |

Repo paste (gitignored): `logs/apps/studio/logs.txt`, `logs/apps/client/logs.txt`.

### Уровень D — backlog (спринт S5)

| Фаза | Deliverable |
|------|-------------|
| DL-1 | `electron-log` → M1 в main |
| DL-2 | Auto-flush T1 при scenario stop / crash |
| DL-3 | In-app: «Папка логов», «Отправить диагностику» |

Sentry — вне scope S5 v1.

---

## 7. Membrana Studio vs Membrana Device

| Аспект | Studio | Device (план) |
|--------|--------|----------------|
| `userData` | `Membrana/` | **Тот же** |
| T1 / M1 | Да | **Те же имена** |
| Media library D2 | Есть | Нет в v1 |
| Support script | `yarn desktop:support-collect` | Тот же; `product` в manifest |

---

## 8. Приватность

- T1: device handles — не секреты, но идентифицируют машину.
- D1: тексты отчётов — только с согласия.
- Bundle по умолчанию: T1 + M1 + manifest; journal — opt-in checkbox (DL-3).

---

## 9. Чеклист support

```text
[ ] Studio или Device, версия, autonomous/paired
[ ] device-board-trace-latest.txt (T1)
[ ] shell-*.log (M1) — когда DL-1 готов
[ ] НЕ media-library без необходимости
[ ] Разбор: yarn logs:parse; FS — studio:journal-fs-check
[ ] runId из trace
```

---

## 10. Матрица документации (обязательная синхронизация)

Любое изменение политики → обновить **все** строки таблицы (фаза **DL-DOC** спринта S5).

| Контур | Путь | Что держать |
|--------|------|-------------|
| **Канон** | `docs/DESKTOP_APP_LOGGING_POLICY.md` | Этот файл |
| **Консилиум** | `docs/seanses/desktop-logging-policy-2026-06-26.md` | Решения + LGTM |
| **Studio app** | `apps/membrana-studio/README.md` | §Логи и диагностика |
| **Device app** | `apps/membrana-device/README.md` | §Логи (наследование) |
| **Web client** | `apps/client/README.md` | Dev paste; ссылка на desktop policy |
| **Host contract** | `docs/STUDIO_HOST_BRIDGE_CONTRACT.md` | §Logging |
| **Support RU** | `docs/support/DESKTOP_SUPPORT_RUNBOOK.md` | User-facing |
| **Parse playbook** | `docs/device-board-scripts/CLIENT_LOGS_PARSING.md` | T1/M1, пути |
| **Studio lessons** | `docs/device-board-scripts/STUDIO_HOST_LESSONS.md` | ST8 + ссылка на канон |
| **Repo logs** | `logs/README.md`, `logs/apps/studio/README.md` | Operator paste |
| **Agent skill** | `.cursor/skills/membrana-client-logs-parsing/SKILL.md` | + Claude mirror |
| **Cloud agents** | `AGENTS.md` | Краткая ссылка |
| **Epic** | `docs/prompts/MEMBRANA_STUDIO_DESKTOP_EPIC_PROMPT.md` | MS logging ref |
| **Sprint** | `docs/prompts/DB3H_S5_DESKTOP_LOGGING_SPRINT_PROMPT.md` | DoD + DL-DOC |

---

## 11. Ссылки

| Документ | Зачем |
|----------|--------|
| [`CLIENT_LOGS_PARSING.md`](./device-board-scripts/CLIENT_LOGS_PARSING.md) | Маркеры, smoke |
| [`SCENARIO_CHAIN_LOG_COOKBOOK.md`](./device-board-scripts/SCENARIO_CHAIN_LOG_COOKBOOK.md) | Цепочка capture → journal |
| [`DESKTOP_SUPPORT_RUNBOOK.md`](./support/DESKTOP_SUPPORT_RUNBOOK.md) | Тикеты |
| [`DB3H_S5_DESKTOP_LOGGING_SPRINT_PROMPT.md`](./prompts/DB3H_S5_DESKTOP_LOGGING_SPRINT_PROMPT.md) | Спринт |
