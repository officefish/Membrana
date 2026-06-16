# Промпт: mic-buffer — прелоадер счётчика сэмплов после записи

> **Task-промпт для агента-разработчика** (Cursor IDE / Claude / другой LLM).
> Процесс постановки: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).
> Размер задачи: **S**. Ожидаемый артефакт: **1 PR** — UX-фикс плагина записи в буфер.
> Реестр: `id` = `mic-buffer-sample-count-loading` в [`docs/tasks/registry.json`](../tasks/registry.json).

---

## Контекст

После остановки записи плагин `mic-buffer-recorder` публикует `capture.stop`; `mediaLibraryHubBridge` импортирует blob в буфер (особенно на remote-server это занимает время). UI продолжает показывать **старый** `sampleCount` и техническую строку `N сэмплов в __buffer__`, из-за чего кажется, что запись не сработала.

**Связанные документы:**

| Документ | Зачем |
|----------|--------|
| [`DESIGN.md`](../DESIGN.md) | DaisyUI loading spinner, состояния loading |
| [`MODULE_AND_PLUGIN_UI.md`](../MODULE_AND_PLUGIN_UI.md) | панель плагина микрофона |
| [`ARCHITECTURE.md`](../ARCHITECTURE.md) | hub `capture.stop` → import |

**GitHub Issue:** `null` (локальный UX-фикс; при PR — создать `imperfection`).

---

## Промпт целиком (для вставки агенту)

### Кто ты

Координатор виртуальной команды Membrana (Teamlead Vesnin). Пакет: **`@membrana/client`**, плагин `mic-buffer-recorder`.

### Что построить

1. После успешного `publishMediaLibraryCaptureStop` показывать **прелоадер** вместо строки со счётчиком сэмплов, пока импорт не завершён.
2. Снять прелоадер при `sampleImported` (source `mic-buffer-recorder`) или `bufferCleared`; safety timeout ~30 с.
3. Заменить технический текст на пользовательский: **«В памяти хранится: N семпл/семпла/семплов»** (корректное склонение).
4. Не менять hub/bridge контракты, media-library-service, cabinet.

### Архитектура

| Слой | Путь | Ответственность |
|------|------|-----------------|
| UI | `MicBufferRecorderPanel.tsx` | spinner + copy |
| state | `micBufferRecorderPluginState.ts` | `bufferSampleCountPending` |
| plugin | `micBufferRecorderPlugin.ts` | pending on stop, clear on hub events |
| utils | `recordingUtils.ts` | `formatStoredSampleCount` |

### Definition of Done

- [ ] После «Стоп» счётчик заменён на spinner до обновления квоты/импорта.
- [ ] Текст без `__buffer__` и лимита в строке счётчика (квота байт — отдельно).
- [ ] Unit-тест склонения «семпл/семпла/семплов».
- [ ] `yarn workspace @membrana/client test` + typecheck для затронутых файлов.

### Out of scope

- Ошибки импорта на сервере (отдельный Issue).
- Изменение текста confirm «Очистить буфер».

---

## Заметки для человека-постановщика

Issue: `imperfection` — «Показать загрузку счётчика сэмплов после записи в mic-buffer».
