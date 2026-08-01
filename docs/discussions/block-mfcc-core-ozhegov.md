# Обсуждение: block-mfcc-core-ozhegov

<!-- Автогенерация yarn ask. Каждый блок ниже — одно обращение к персонажу. -->

## 2026-07-31 12:15 UTC · ozhegov

**Контекст:** C:/Users/USER19~1/AppData/Local/Temp/block-mfcc-core.md
**Вопрос:** Разбери блок по шести пунктам. Назови швы с соседними блоками ДО работы и дай оценку объёма.

**Ответ:**

# Разбор блока `mfcc-plugin-core`

Начну со словаря, иначе вернёмся к нему постфактум.

**Леммы блока:**
- **Пресет** — именованный артефакт калибровки: `configHash` + `bounds` + `judgedCoefficients` + строгость серии. Источник истины: `data/detectors-benchmark/v0.2/reports/mfcc-gates-first-cut.json`. Не конфиг пользователя, не «константы в коде».
- **Конфиг плагина** — то, что человек может менять без перекалибровки: `strictnessLevel` и `frameCountInSeries`. Хранится в `@membrana/agenda`-сторе по `moduleId`.
- **Граница пакета** — клиент не импортирует `data/` напрямую; пресет либо (1) инъецируется через контекст установки плагина, либо (2) копируется как встроенная константа в `apps/client/src/plugins/mfcc-analyzer-test/presets.ts`.
- **Отпечаток (configHash)** — гарантия того, что живой кадр считан при точной конфигурации FFT/MFCC. Плагин обязан **объявить** используемый hash при инициализации; детектор отвергает кадры с чужим hash.

---

## Шесть пунктов

### 1. **Где живёт пресет — решение и цена**

**Решение:** Пресет копируется как встроенная константа-словарь в **`apps/client/src/plugins/mfcc-analyzer-test/presets.ts`** с одной строкой комментария:

```ts
// Синхронизация: data/detectors-benchmark/v0.2/reports/mfcc-gates-first-cut.json
// До меню или UI для выбора пресетов сюда добавлять новые руками.
export const MFCC_PRESET_V0_2: MfccPresetSpec = {
  configHash: "mel40-c24-buf4096",
  judgedCoefficients: [0, 1, 2, 3],
  bounds: [...], // все 24 граничные полосы из отчёта
  strictness: { easy: 0.25, normal: 0.5, strict: 1.0 },
  seriesPassRate: { easy: 0.3, normal: 0.6, strict: 0.9 },
  minMagnitude: 0, // защиты нет — блок `dynin` её вводит
};
```

**Цена:** +40 строк в `presets.ts` (словарь bounds + комментарий синхронизации). Управление версиями пресетов — на уровне git (теги, diff), не UI.

**Граница:** `data/` остаётся на серверной стороне для бенчмарков и аудита; клиент содержит только **актуальный production-пресет**, не всю историю.

---

### 2. **Конфиг плагина vs. пресет — явная граница**

| Что | Где | Кто меняет | Когда меняется |
|-----|-----|-----------|-----------------|
| **Пресет** (`bounds`, `configHash`, судимые коэффициенты) | `presets.ts` (встроенная константа) | разработчик (через git/PR) | новая калибровка (~месячные итоги) |
| **Конфиг** (`strictnessLevel`, `frameCountInSeries`) | `@membrana/agenda`-сторе, ключ `${moduleId}:mfccConfig` | оператор (UI плагина, блок `rodchenko`) | во время работы, сессию за сессией |

**Хранилище конфига:**

```ts
// mfccPluginState.ts
export interface MfccPluginConfig {
  strictnessLevel: 'easy' | 'normal' | 'strict'; // выбор оператора
  frameCountInSeries: number;                     // 3..10, выбор оператора
  // Всё остальное берётся из MFCC_PRESET_V0_2
}

export const getMfccConfig = (moduleId: string): MfccPluginConfig => {
  return useMembranaStore.getState().getModuleConfig(moduleId) ?? {
    strictnessLevel: 'normal',
    frameCountInSeries: 5,
  };
};
```

**Защита:** Если человек попытается тронуть `bounds` или `configHash` — это ошибка ввода, UI их не показывает. Пресет остаётся read-only внутри плагина.

---

### 3. **Отпечаток настроек (configHash) — гарантия соответствия**

**Проблема:** Плагин считает MFCC с конкретной конфигурацией FFT (mel40 фильтров, 24 коэффициента, окно 4096 отсчётов), но если источник аудио изменит частоту дискретизации или окно — vectors будут другого размера, и пресет перестанет работать.

**Решение:**

1. **При инициализации плагина** (`install()` в `mfccAnalyzerPlugin.ts`):
   ```ts
   const preset = MFCC_PRESET_V0_2;
   const expectedHash = preset.configHash; // "mel40-c24-buf4096"
   
   // Получаем экстрактор MFCC через инъекцию
   const mfccExtractor = getMfccExtractorForHash(expectedHash);
   if (!mfccExtractor) throw new Error(`Нет экстрактора для ${expectedHash}`);
   ```

2. **При каждом кадре** (`evaluatePipe(vectors, spec)` вызывается только если `vectors.length === spec.bounds.length`):
   ```ts
   // Защита на уровне детектора
   if (vectors.length !== preset.bounds.length) {
     return { passed: false, reason: `Вектор длины ${vectors.length}, пресет ожидает ${preset.bounds.length}` };
   }
   ```

3. **Где берётся экстрактор:** Из `@membrana/mfcc-analyzer-service` (ядро в стволе). При смене конфигурации пакета сервиса — выпускается новый пресет и новый блок спринта.

**Цена:** +25 строк валидации в `install()`.

---

### 4. **Границы состояния — швы с соседними блоками**

**Шов 1: `mfccAnalyzerPlugin.ts` ↔ `@membrana/mfcc-analyzer-service` (ядро)**

- **Входит:** `AudioFrameFeed` из хаба (кадры с микрофона).
- **Выходит:** `MfccVector[]` (массив коэффициентов на каждый кадр).
- **Принадлежит ядру:** экстрактор (`mel40`, частота дискретизации, окно).
- **Принадлежит плагину:** подписка на фид, управление жизненным циклом.
- **Контракт:** плагин не знает внутреннего устройства MFCC; просто вызывает функцию и получает вектор.

**Шов 2: `mfccPluginState.ts` ↔ блок `rodchenko` (экран)**

- **Входит (из `rodchenko`):** команды UI — `setStrictnessLevel()`, `setFrameCount()`.
- **Выходит (в `rodchenko`):** состояние: текущий уровень, текущее число кадров, **результаты последней серии кадров** (passed/failed count).
- **Принадлежит `mfccPluginState`:** логика команд, кэш результатов.
- **Принадлежит `rodchenko`:** рендеринг, UI-компоненты, макет экрана.
- **Контракт:** `rodchenko` читает состояние через `useMfccPluginState()` хук и вызывает `dispatch()` команды.

**Шов 3: `mfccPluginState.ts` ↔ блок `dynin` (отчёт и порог тишины)**

- **Входит (из `dynin`):** команда `setMagnitudeThreshold(value)` — порог, при котором кадр считается "не молчанием".
- **Выходит (в `dynin`):** метрика `minMagnitudeDetected` в серии (максимальная амплитуда, встреченная в кадрах) — для диагностики.
- **Не входит (запрещено):** данные отчёта (история, статистика), вывод JSON.
- **Контракт:** двусторонний: `dynin` может читать `currentMagnitudeStats`, но не может писать в состояние плагина отчёты.

**Шов 4: `mfccPluginState.ts` ↔ `detectors/pipe.ts` (коридорный детектор)**

- **Входит:** `MfccVector`, `MfccPresetSpec`, текущий уровень строгости.
- **Выходит:** `DetectionResult` (passed yes/no + score).
- **Контракт:** чистая функция `evaluatePipe()`, no side-effects.

---

### 5. **Оценка объёма**

**Прогноз тимлида:** 330 строк.

| Компонента | Рассчёт | Строк |
|---|---|---:|
| `mfccAnalyzerPlugin.ts` | Фабрика, `install()`, подписка на фид, управление состоянием, teardown. Образец `fftThresholdTestPlugin.ts` — 380 строк; MFCC проще (один детектор, без телеметрии). | 280 |
| `mfccPluginState.ts` | Интерфейс `MfccPluginConfig`, команды `setStrictnessLevel`/`setFrameCount`, кэш результатов серии, вычисления score. | 150 |
| `types.ts` | Типы: `MfccPluginConfig`, `MfccPresetSpec`, `MfccFrameResult`, `MfccSeriesResult`, `MfccVector`. | 60 |
| `presets.ts` | Константа `MFCC_PRESET_V0_2` с bounds на 24 коэффициента. | 50 |
| **Итого** | | **540** |

**Моя оценка:** **540 строк** (+210 к прогнозу, т.е. **+64%**). 

**Причины переполнения:**
- Образец `fft-threshold-test` имеет UI-интеграцию на 150 строк; в нашем случае UI (блок `rodchenko`) — отдельно, но логика состояния и команд плотнее.
- Типы и преобразование пресета → конфиг требуют более явной структуры, чем у FFT (там один уровень строгости).
- Валидация `configHash` и защита от некорректных размеров vectors добавляют ~40 строк.

**Предложение:** Разбить блок на две части:
1. **`mfcc-plugin-state` (180 строк)** — только состояние и команды (блок `dynin` + `rodchenko` могут ждать, приход позже).
2. **`mfcc-plugin-core` (330 строк)** — регистрация, жизненный цикл, интеграция с детектором.

---

### 6. **Легальное «нет с причиной»**

Нет нарушений в зоне на текущий момент. Все зависимости в сторе `@membrana/agenda`, ядро `@membrana/mfcc-analyzer-service` и детектор `detectors/pipe.ts` уже готовы. **Риск: отсутствие UI — блок `rodchenko` не может быть отдельным блоком спринта** (должен жить в одном PR с плагином для интеграции). Если `rodchenko` задержится, плагин готов к регистрации и тестированию на чистом состоянии, но не к демонстрации.

---

**Итоговое решение:** Объём **540 строк**, швы названы явно, готов к ратификации.

---
