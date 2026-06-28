# Membrana Device

**Membrana Device** — планируемое настольное (Electron) приложение: **узкий** конфигуратор одного прибора — pairing + **device-board** без полного каталога модулей Studio.

| Продукт | Назначение |
|---------|------------|
| **Membrana Device** (этот пакет) | Pairing + device-board на поле |
| **Membrana Studio** | Полный клиент — [`../membrana-studio/README.md`](../membrana-studio/README.md) |
| **Web** | `apps/client` в браузере |

**Статус:** пакет `apps/membrana-device` ещё не создан; политика логов и путей **уже зафиксирована** для наследования при scaffold.

Эпик: [`docs/prompts/MEMBRANA_STUDIO_DESKTOP_EPIC_PROMPT.md`](../../docs/prompts/MEMBRANA_STUDIO_DESKTOP_EPIC_PROMPT.md) (Device — отдельная фаза после Studio).

---

## Логи и диагностика

**Канон:** [`docs/DESKTOP_APP_LOGGING_POLICY.md`](../../docs/DESKTOP_APP_LOGGING_POLICY.md) — **те же пути**, что у Studio (общий `userData`).

| Канал | Файл (Windows) | Назначение |
|-------|----------------|------------|
| **T1** | `%APPDATA%\Membrana\logs\device-board-trace-latest.txt` | trace сценария |
| **M1** | `%APPDATA%\Membrana\logs\shell-YYYY-MM-DD.log` | shell (после DL-1 в Studio shell) |

Device **не** использует media-library (D2); journal (D1) — тот же IPC-контракт, что Studio.

**Support:** [`docs/support/DESKTOP_SUPPORT_RUNBOOK.md`](../../docs/support/DESKTOP_SUPPORT_RUNBOOK.md) — в тикете указывать **Device**, не Studio.

При установке обоих продуктов папка `Membrana/` общая — логи не разделяются по приложению, различаем по manifest / версии в тикете.
