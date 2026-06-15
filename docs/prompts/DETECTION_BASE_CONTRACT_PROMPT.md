# Промпт: Detection — контракт `@membrana/detector-base`

> **Task-промпт** · `detection-base-contract` · размер **S** · **1 PR**  
> Родитель: [#47](https://github.com/officefish/Membrana/issues/47) Single-Node Detection First  
> Реестр: `detection-base-contract` · **без реальной базы звуков**

---

## Контекст

Пакет `packages/services/detectors/base` уже существует (`DroneDetector`, `AudioWindow`, `DetectionResult`, test-fixtures). Нужно **закрыть DoD** стратегического плана: метрики бенчмарка, mock-детектор в тестах, статус в `ARCHITECTURE.md` §1e.

**Не делаем:** реэкспорт из `@membrana/core` (циклическая зависимость); реальные WAV.

---

## Промпт целиком (для вставки агенту)

### Кто ты

Координатор Membrana (Vesnin). План → код → тесты.

### Что построить

1. Тип `DetectionMetrics` (precision, recall, f1, latencyP50Ms, latencyP95Ms, sampleCount).
2. Mock `DroneDetector` в unit-тестах (pass-through / fixed result).
3. Обновить `packages/services/detectors/base/README.md` и `docs/ARCHITECTURE.md` §1e: `detector-base` → **stable v0.1**, не scaffold.
4. Экспорт новых типов из `src/index.ts`.

### Архитектура

| Слой | Путь | Ответственность |
|------|------|-----------------|
| Контракт | `packages/services/detectors/base/` | Типы, fixtures, ошибки |
| Документация | `docs/ARCHITECTURE.md` §1e | Статус пакета |

**Запрещено:** импорт `@membrana/harmonic-detector-service` в base; Web Audio в base.

### Definition of Done

- [ ] `DetectionMetrics` экспортирован; ≥1 unit-тест на mock-детектор.
- [ ] `yarn workspace @membrana/detector-base test` зелёный.
- [ ] `ARCHITECTURE.md` §1e: detector-base = stable v0.1.
- [ ] `yarn task:archive detection-base-contract` после merge.

---

## Заметки для человека

Порядок: **1 из 5** в цепочке #47 без полевой базы звуков.
