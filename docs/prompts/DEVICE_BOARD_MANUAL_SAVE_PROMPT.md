# Task: device-board — manual save, draft state, header layout

**GitHub Issue:** #108  
**Реестр:** `device-board-manual-save`  
**Пакет:** `@membrana/device-board`

## Решение

- Убран debounce autosave (1.5s)
- `isDirty` + `saveScenario()` по кнопке «Сохранить»
- Шапка: слева spinner + Save; справа Run/Stop, режим, Exit, ⚙ (Import/Export)
- Export/Import не пишут на сервер; Import → draft
- Выход с dirty → confirm; remount → load saved

## DoD

- [x] Нет layout shift от sync-текста в правой группе
- [x] Unit-тест fingerprint
- [ ] `yarn turbo run lint typecheck test --filter=@membrana/device-board` green
