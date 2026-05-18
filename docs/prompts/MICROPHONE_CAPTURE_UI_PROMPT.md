# Промпт: выразительный блок захвата микрофона

> **Task-промпт для агента-разработчика.** Процесс: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).  
> Реестр: `id` = `microphone-capture-ui` в [`docs/tasks/registry.json`](../tasks/registry.json).  
> Консилиум: [`docs/seanses/microphone-capture-ui-2026-05-18.md`](../seanses/microphone-capture-ui-2026-05-18.md).  
> **GitHub Issue:** #49 · ветка: `boyarskiy`.

---

## Контекст

Блок запуска микрофона и выбора устройства в `MicrophoneModule` — главная «дверь» в Membrana. Решение консилиума: вынести презентацию в `MicrophoneCapturePanel`, не трогая hub/coordinator/engine.

| Документ | Зачем |
|----------|--------|
| [`VIRTUAL_TEAM_PROMPT.md`](../VIRTUAL_TEAM_PROMPT.md) | Boyarskiy / Rodchenko |
| [`DESIGN.md`](../DESIGN.md) | Токены, a11y, анимации 150–200 ms |
| [`MODULE_AND_PLUGIN_UI.md`](../MODULE_AND_PLUGIN_UI.md) | Card, эталон capture |
| [`ARCHITECTURE.md`](../ARCHITECTURE.md) | Границы модуля и плагинов |

---

## Промпт целиком (для вставки агенту)

### Кто ты

Координатор Membrana; UI — **Rodchenko**, приёмка звука/live — **Boyarskiy** (ветка `boyarskiy`).

### Что построить

1. `apps/client/src/modules/microphone/components/MicrophoneCapturePanel.tsx` — props-only UI.
2. `MicrophoneModule.tsx` — оркестрация engine + hub + coordinator; рендер панели сверху.
3. Герой-статус, select устройства, одна CTA, permission hint, dev-docs в `<details>`.

### Архитектура

| Слой | Путь | Ответственность |
|------|------|-----------------|
| Презентация | `components/MicrophoneCapturePanel.tsx` | Разметка, a11y |
| Оркестрация | `MicrophoneModule.tsx` | stream, devices, hub |
| Engine | `@membrana/audio-engine-service` | acquire/release, enumerate |
| Hub | `microphoneStreamHub.ts` | без изменений API |

**Запрещено:** второй захват микрофона в панели; FFT в блоке; отдельный npm-пакет; дублирование capture в плагинах.

### Definition of Done

- [ ] Панель вынесена; hub/coordinator тесты зелёные (`microphoneCaptureCoordinator.test.ts`).
- [ ] Статус live/off — текст + иконка (не только цвет).
- [ ] `yarn workspace @membrana/client test` (client tests) pass.
- [ ] Ручной smoke: старт → harmonic/fft плагин видит поток.
- [ ] `MODULE_AND_PLUGIN_UI.md` — абзац про эталон capture.

### Out of scope

- Level-meter (v1.1).
- Изменения плагинов ниже capture-блока.

---

## Заметки для человека-постановщика

Закрытие: merge PR `boyarskiy` → `main`, отчёт в #49, `yarn task:archive microphone-capture-ui`.
