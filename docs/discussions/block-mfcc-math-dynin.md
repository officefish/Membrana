# Обсуждение: block-mfcc-math-dynin

<!-- Автогенерация yarn ask. Каждый блок ниже — одно обращение к персонажу. -->

## 2026-07-31 12:36 UTC · dynin

**Контекст:** C:/Users/USER19~1/AppData/Local/Temp/block-mfcc-math.md
**Вопрос:** Разбери блок по пяти пунктам. Назови швы ДО работы, дай легальное «нет с причиной» и оценку объёма.

**Ответ:**

# Разбор блока `mfcc-plugin-math`

## Пункт 1. Три функции — вход, выход, смысл

### 1.1 `detectMagnitudeThreshold`

**Вход:**
- `silentFrames: readonly MfccFrameResult[]` — кадры, снятые на источнике, который молчит по факту (микрофон молчит, либо записано на фоне тишины, проверено слухом).

**Выход:**
- `number` — норма вектора, ниже которой кадр объявляется «немым» (`silent` state).

**Смысл (по существу):**
Это **пороговый детектор активности** (VAD-like) на спектральной области. Вектор коэффициентов близ нуля — шум квантования или электроники, не информация. Порог даёт **защиту от попадания молчания в судимую выборку**.

**Численно:**
- Возьми норму каждого кадра (L2 или max — вопрос ниже).
- На хвосте распределения (перцентиль ~99 или mean + 3σ) проведи черту.
- Результат: скалярный floor для проверки `magnitude >= floor → судимый кадр`.

**Честно о границе:** если всё молчит одинаково, порог неопределён. Нужна предпосылка: в `silentFrames` есть **вариативность** (не 0.0000000001 везде, а разброс, пусть малый). Если нет — отказать с причиной.

---

### 1.2 `applyMfccPipeThreshold`

**Контекст:** `mfccAnalyzerPlugin` уже считает `judgeSeries`, проверяя `inBandCount >= judgedCount * minInBandRatio`. Это логика **без порога по magnitude**.

**Вход:**
- `series: MfccSeriesResult` (уже судящееся).
- `magnitudeFloor: number` (из `detectMagnitudeThreshold` выше или из state).
- `frames: readonly MfccFrameResult[]` (те же, что в series, с исходными magnitude).

**Выход:**
- Переоцененная `MfccSeriesResult` (новые `judgedCount`, `silentCount`, `passRate`, `detected`).

**Смысл:**
Пересчитать судимость кадров **с фильтром по magnitude**. Алгоритмически:

```
для каждого кадра в series:
  если magnitude < floor:
    переметить в silent (не судим)
  иначе:
    оставить как есть (passed/failed)

пересчитать: 
  judgedCount = кадры, у которых magnitude >= floor
  passedCount = из них прошли воротца
  passRate = passedCount / judgedCount
  detected = passRate >= minPassRate?
```

**Честно:** это **не обвязка**, а **пересчёт счёта**, то есть логика. Быть может, она должна вообще не отдельный файл, а функция-утилита на месте `judgeFrame` / `judgeSeries`? Или вообще переделать `judgeSeries` сразу на входе принимать `magnitudeFloor`?

---

### 1.3 `buildMfccTestReport`

**Вход:**
- `series: MfccSeriesResult` (вычисленная серия).
- `preset: MfccPresetSpec` (конфиг, коридоры, strictness).
- `magnitudeFloor: number` (замеренный порог).
- `frames: readonly MfccFrameResult[]` (для деталей).

**Выход:**
```ts
interface MfccTestReport {
  readonly configHash: string;
  readonly strictnessUsed: MfccStrictnessLevel;
  readonly verdict: 'detected' | 'not_detected' | 'inconclusive';
  readonly confidence: number;  // [0, 1] — мера того, насколько уверены
  readonly summary: {
    readonly totalFrames: number;
    readonly silentFrames: number;
    readonly judgedFrames: number;
    readonly passedFrames: number;
    readonly passRate: number;
  };
  readonly magnitudeFloorUsed: number;
  readonly reasoning: string;  // человеко-читаемо: «прошли 87% из 40 судимых»
  readonly warnings: readonly string[];  // «корпус не откалиброван» / «немых > 30%»
}
```

**Смысл:**
Преобразовать сухие цифры `series` в **аналитический отчёт** — что произошло, почему вердикт такой, какие предупреждения. Это **интерпретирующий слой**.

---

## Пункт 2. Швы — контакты с соседями

```
╔════════════════════════════════════════════════════════════════╗
║                 ЖИЗНЕННЫЙ ЦИКЛ ПЛАГИНА                        ║
║              (mfccAnalyzerPlugin.ts главное)                  ║
├─────────────────────────────────────────────────────────────────┤
│ 1. init: preset выбран → detectMagnitudeThreshold(silentFrames)║
│    РЕЗУЛЬТАТ: magnitudeFloor → в state (mfccPluginState)       │
│                                                                 ║
│ 2. perFrame: новый кадр → judgeFrame() → MfccFrameResult      ║
│    (magnitude уже считана, но silent-статус пока без floor)   ║
│                                                                 ║
│ 3. perSeries: накопили кадры → applyMfccPipeThreshold()        ║
│    ПЕРЕСЧЁТ: вычитаем немые кадры по floor → MfccSeriesResult║
│                                                                 ║
│ 4. report: series готова → buildMfccTestReport()               ║
│    ОТЧЁТ: вывести юзеру                                        ║
└─────────────────────────────────────────────────────────────────┘
    ↓
╔════════════════════════════════════════════════════════════════╗
║         ЭКРАН (rodchenko/MfccTestPanel.tsx)                    ║
║          Отчёт нарисован, юзер видит reasoning                ║
└════════════════════════════════════════════════════════════════┘
```

**Швы:**

| Шов | Файл 1 | Файл 2 | Что передаётся | Когда |
|-----|--------|--------|-----------------|-------|
| **floor → state** | `detectMagnitudeThreshold.ts` | `mfccPluginState.ts` | `number` (magnitudeFloor) | инициализация |
| **frame + floor → series** | `applyMfccPipeThreshold.ts` | `mfccAnalyzerPlugin.ts` | MfccFrameResult[] + floor | на каждую серию |
| **series → report** | `buildMfccTestReport.ts` | UI (rodchenko) | MfccTestReport | вывод результата |

---

## Пункт 3. Легальное «нет с причиной»

### Про `applyMfccPipeThreshold` — **перенос логики — не делать.**

**Аргумент:**
`judgeFrame` и `judgeSeries` живут в `mfccAnalyzerPlugin.ts` и вызываются из главного цикла плагина. Вынос в отдельный файл с переписыванием счёта — это **рисккофф**:

- Синхронизировать состояние между двумя копиями логики (в плагине и в pipe-файле).
- Если в будущем захочешь оптимизировать счёт (например, incrmemental update), придётся менять в двух местах.

**Альтернатива (рекомендую):**
Оставить `judgeSeries` и `judgeFrame` в плагине, но **передавать magnitudeFloor как параметр** (уже можешь):

```ts
// В mfccPluginState.ts
effectiveMagnitudeFloor(state, presetMinMagnitude) → уже есть

// В mfccAnalyzerPlugin.ts
const floor = effectiveMagnitudeFloor(state, preset.minMagnitude);
const series = judgeSeries(frames, preset.strictness[strictnessLevel], floor);
```

Файл `applyMfccPipeThreshold.ts` **не нужен**. Полукруг 40 строк уходит.

---

### Про `buildMfccTestReport` — **делать, но с ограничениями на confidence.**

**Запрос:** confidence `[0, 1]` — это **опасное число**. Оно никогда не должно быть близко к 1, потому что:

1. **Корпус не откалиброван** (ты сам пишешь `undecided_corpus_bias`). Любое число > 0.7 — иллюзия.
2. **Немых кадров может быть > 30%** — это признак, что микрофон был в шуме, и вердикт ненадёжен.
3. **Четыре коэффициента из 24** — это узкая полоса. На переходах (дрон стартует, меняет обороты) правила могут срать.

**Что вместо confidence:**

```ts
type Confidence = 'high' | 'medium' | 'low';

// High: passRate ≥ 0.95 И silentRate < 10% И minInBandRatio достаточный запас
// Medium: 0.70 ≤ passRate < 0.95 ИЛИ 10% ≤ silentRate < 30%
// Low: passRate < 0.70 ИЛИ silentRate ≥ 30% ИЛИ corpus_bias = true
```

**Warnings список обязателен:**

```ts
warnings: [
  ...(preset.situationsCalibrated === false ? ['⚠️ корпус не откалиброван на вашу сценарий'] : []),
  ...(silentRate > 0.3 ? ['⚠️ > 30% немых кадров — микрофон был в шуме'] : []),
  ...(judgedCount < 10 ? ['⚠️ мало судимых кадров (< 10)'] : []),
]
```

---

## Пункт 4. Оценка объёма

### `detectMagnitudeThreshold` — **25–35 строк**
```ts
export function detectMagnitudeThreshold(
  silentFrames: readonly MfccFrameResult[]
): number {
  if (!silentFrames.length) 
    throw new Error('detectMagnitudeThreshold: empty silent frames');
  
  const magnitudes = silentFrames.map(f => f.magnitude);
  
  // Проверка: есть ли вариативность?
  const avg = magnitudes.reduce((a, b) => a + b, 0) / magnitudes.length;
  const variance = magnitudes.reduce((sum, m) => sum + (m - avg) ** 2, 0) / magnitudes.length;
  
  if (variance < 1e-10) 
    throw new Error('detectMagnitudeThreshold: no variability in silent frames');
  
  // Перцентиль 99 или mean + 3σ
  const sorted = [...magnitudes].sort((a, b) => a - b);
  const p99idx = Math.floor(sorted.length * 0.99);
  return sorted[p99idx] * 1.2; // +20% запас
}
```

### `applyMfccPipeThreshold` — **НЕ ДЕЛАТЬ** (логика в плагине, 0 новых строк)

### `buildMfccTestReport` — **60–85 строк**
```ts
export interface MfccTestReport {
  readonly configHash: string;
  readonly strictnessUsed: MfccStrictnessLevel;
  readonly verdict: 'detected' | 'not_detected';
  readonly confidence: 'high' | 'medium' | 'low';
  readonly summary: { /* counts */ };
  readonly magnitudeFloorUsed: number;
  readonly reasoning: string;
  readonly warnings: readonly string[];
}

export function buildMfccTestReport(
  series: MfccSeriesResult,
  preset: MfccPresetSpec,
  magnitudeFloor: number,
  frames: readonly MfccFrameResult[]
): MfccTestReport {
  const silentRate = series.silentCount / series.frames.length;
  
  const reasoning = 
    series.detected
      ? `✓ ${series.passedCount}/${series.judgedCount} судимых прошли (${(series.passRate * 100).toFixed(1)}%)`
      : `✗ ${series.passedCount}/${series.judgedCount} судимых — не достаточно для детекции`;
  
  const confidence = 
    series.passRate >= 0.95 && silentRate < 0.1 ? 'high' :
    series.passRate >= 0.70 || silentRate < 0.3 ? 'medium' :
    'low';
  
  const warnings: string[] = [];
  if (!preset.situationsCalibrated) warnings.push('⚠️ корпус не откалиброван...');
  if (silentRate > 0.3) warnings.push('⚠️ > 30% немых кадров...');
  if (series.judgedCount < 10) warnings.push('⚠️ мало судимых кадров...');
  
  return {
    configHash: series.configHash,
    strictnessUsed: series.strictness,
    verdict: series.detected ? 'detected' : 'not_detected',
    confidence,
    summary: { /* ... */ },
    magnitudeFloorUsed: magnitudeFloor,
    reasoning,
    warnings,
  };
}
```

---

## Пункт 5. Что в отчёте быть НЕ должно

❌ **`confidence: number [0, 1]`** — вместо дискретного `'high' | 'medium' | 'low'`  
→ Числа создают ложную точность. Категории честнее.

❌ **Отсутствие `warnings`** — если что-то подозрительно, юзер должен знать  
→ Скрывание сомнений — враг разведки.

❌ **`reasoning` = просто `detected: true`** — без пояснения, на чём держится вердикт  
→ Числовой отчёт без языка неполезен.

❌ **Вероятность без модели** — например, `confidence = passRate`  
→ `passRate = 0.95` — это НЕ вероятность того, что это дрон. Это вероятность того, что **кадры прошли фильтры**. Разные вещи.

---

## Итоговая оценка объёма

| Файл |

---
