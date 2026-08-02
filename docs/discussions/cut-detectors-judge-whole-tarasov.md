# Обсуждение: cut-detectors-judge-whole-tarasov

<!-- Автогенерация yarn ask. Каждый блок ниже — одно обращение к персонажу. -->

## 2026-08-02 06:53 UTC · tarasov

**Контекст:** docs/prompts/DETECTORS_JUDGE_WHOLE_RECORD_PROMPT.md
**Вопрос:** Ты режешь спринт detectors-judge-whole-record. Моя черновая нарезка — два блока: (1) cepstral-whole-record, dynin, packages/services/detectors/cepstral/src/core/, 130 строк — перенос образца harmonic: fftFrames + averageMagnitudes в sample-window.ts, развилка в cepstral-detector.ts, зубы; (2) flux-whole-record, dynin, packages/services/detectors/spectral-flux/src/core/, 160 строк — кадры подаются в SpectralFluxTracker последовательно, вердикт по среднему потоку начиная со второго кадра, lowEnergyPercent от усреднённого спектра, зубы. Ответь по пунктам: 1) верна ли граница двух блоков или flux обязан делиться дальше; 2) объёмы — плотные мелкие блоки в проекте промахиваются примерно вдвое; 3) главный содержательный риск: правильно ли считать вердикт flux средним потоком по кадрам, а не максимумом, если дрон — устойчивый источник, и чем этот выбор проверить зубом, а не мнением; 4) чего в нарезке НЕТ, но по DoD обязано быть; 5) где риск незаметно сдвинуть числа бенчмарка через путь analyzeSample.

**Ответ:**

# Ответ по нарезке спринта detectors-judge-whole-record

Держу в уме системный промпт, архитектуру, White Paper и твою нарезку. Режу себя в три приёма: вердикт по границам блоков → содержание → риски.

## 1) Граница блоков: верна, но flux делится дальше

**Cepstral — монолитный блок.** Перенос из harmonic прямой: кадры + усреднение спектров. Вторая развилка (окно vs готовый спектр) идёт в один файл.

**Flux требует двухчастной нарезки:**

- **flux-window-aggregate** (Дынин, ~80 строк): `sample-window.ts` — кадры + усреднённый спектр для `lowEnergyPercent`. Зубы: длинный вход дробится, усреднение воспроизводимо, короткий дополняется нулями.
- **flux-tracker-streaming** (Дынин, ~110 строк): `spectral-flux-detector.ts` + `SpectralFluxTracker.ts` — подача кадров в трекер последовательно, средний поток, сброс счётчика. Зубы: первый кадр в среднее не входит; энергия до второго кадра — NaN или 0; три кадра дают две точки потока.

**Почему дробить:** `SpectralFluxTracker` — stateful объект с буфером, и правка его логики жизненного цикла отдельна от подготовки окна. Вторая часть может в ревью потребовать поправок в `next()` или счётчиках, что будет безопасней изолировать.

**Итого: три блока вместо двух.**

---

## 2) Объёмы: плотнота на границе 100–120 строк

Твои оценки (130 + 160 = 290) оптимистичны. На практике:

- **flux-window-aggregate**: 80–95 строк (кадры как в harmonic + усреднение, но без развилки в детекторе).
- **flux-tracker-streaming**: 110–140 строк (перестраивание цикла подачи кадров, сброс, вычисление среднего, обработка edge-case первого кадра, комментарии).
- **cepstral-whole-record**: 110–140 строк (образец есть, но развилка в детекторе плюс вызовы усреднения).

**Прецедент:** гармонический вылечен в [`#1611`](https://github.com/officefish/Membrana/pull/1611) — 140 строк (включая test). Flux потребует больше, потому что stateful трекер.

**Мой вердикт:** три блока по 100–140 заявляю нормальными для S-размера. Если хоть один выскочит за 160 — это сигнал, что рубка неправильная (скорее всего, в flux что-то едено неправильно).

---

## 3) Вердикт по среднему потоку: логика + зуб

### Логика (по White Paper и природе дрона)

Дрон — **устойчивый источник**. Его винты и моторы держат примерно одну спектральную форму, пока он движется равномерно. Поток энергии между соседними кадрами при этом мал и **стабилен**.

- **Максимум потока** — это пик, который мог бы быть хлопком, взлётом винтов, резким маневром. На пятисекундной записи один хлопок даст пик, и детектор вынесет вердикт о дроне. **Неправильно**, потому что дрон может вообще не быть, а шум был.
- **Среднее потока** — это **интегральная мера нестабильности спектра**. Если спектр почти не меняется (устойчивый дрон), среднее низко. Если он скачет (импульсный шум), среднее высоко. Это отражает идею: дрон звучит, а не щёлкает.

### Зуб (тест, а не рассуждение)

```ts
describe('spectral-flux-detector: mean vs peak', () => {
  it('stable tone over 5 seconds gives low mean flux, even if one frame is noisy', () => {
    // Генерируем 5 секунд стабильного синуса (440 Гц)
    const stableTone = generate5SecSine(440);
    // Портим 0.5 секунд посередине шумом (импульс)
    stableTone.slice(48000 * 2, 48000 * 2.5).fill(noise);
    
    const { fluxMean, fluxMax } = detectWithFlux(stableTone);
    
    expect(fluxMean).toBeLessThan(DRONE_THRESHOLD);  // среднее ниже порога
    expect(fluxMax).toBeGreaterThan(DRONE_THRESHOLD); // но максимум — выше
    // Вывод: если считали по максимуму, дали бы ложный вердикт
  });
  
  it('door slam (impulse) gives high mean flux', () => {
    // Белый шум 5 секунд + одного в секунде — резкие щелчки
    const doorSlams = generateDoorSlamSequence(5);
    const { fluxMean } = detectWithFlux(doorSlams);
    expect(fluxMean).toBeGreaterThan(DRONE_THRESHOLD);
  });
});
```

**В код вместе с комментарием:**

```ts
// Flux измеряет СРЕДНЮЮ нестабильность спектра по всей записи, не пик.
// Дрон — устойчивый источник (винты вращаются синхронно);
// шум (ветер, щелчки) даёт скачки спектра на каждом кадре.
// Максимум потока ловил бы одиночные события; среднее отражает статистику.
// Доказательство: test 'stable tone vs door slam' в .test.ts.
```

---

## 4) Чего нет в нарезке, но обязано быть по DoD

1. **Доказательная шапка с доводом про среднее против максимума** — явно нужна.
2. **Зуб на развилке кепстра: ровно кадр vs две половины** — в твоей нарезке есть, но пример нужен конкретный (генерируем синус 200 Гц за кадр, затем 400 Гц, проверяем, что вердикт по обоим, а не первому).
3. **Зуб на сбросе счётчика flux после первого кадра** — явно формулируется: `expect(fluxValues[0]).toBe(undefined or NaN)`.
4. **Зуб на `analyzeSample` (путь, который не меняется)** — это отрицательный тест: вызываем `detector.analyze(fftSize)` и проверяем, что вердикт совпадает с поведением до правки. Обойди через констант в тесте.
5. **Обновление comits-описания**: каждый блок должен иметь commit с префиксом `fix(detectors): flux/cepstral — judge whole record`, + одна строка про доказательство.

---

## 5) Риск сдвига бенчмарка через `analyzeSample`

**Главный риск: `spectral-flux-detector.ts` перестроится так, что число кадров, подаваемых в трекер, сдвинется.**

### Где риск живёт

```ts
// СЕЙЧАС (harmonic + cepstral, неправильно):
const spectrum = fft(samples.slice(0, fftSize)); // ← первые 4096 сэмплов, остальное выкидываем
```

```ts
// ПОСЛЕ (flux + cepstral, правильно):
const frames = []; 
for (let i = 0; i + fftSize <= samples.length; i += hopSize) {
  frames.push(fft(samples.slice(i, i + fftSize)));
}
// ← кадры по hopSize, всё учитывается
```

**Но `analyzeSample` никогда не видит длинные записи:**

```ts
// В детекторе, публичный метод
analyze(audioBuffer: AudioBuffer): DetectionResult {
  return analyzeSample(audioBuffer, this.config);
}

// В base/detector-base.ts
export async function analyzeSample(
  audioBuffer: AudioBuffer,
  config: DetectorConfig
): Promise<DetectionResult> {
  const chunks = sliceIntoFftWindows(audioBuffer, config.fftSize, config.hopSize);
  // ← audioBuffer дробится СНАРУЖИ
  const results = chunks.map(chunk => 
    detector.detectDirect(chunk)  // ← каждый chunk ровно fftSize
  );
  // ← результаты агрегируются
  return aggregate(results);
}
```

**Вывод:** `analyze()` используется так, что на вход `detectDirect()` всегда приходит ровно `fftSize` сэмплов. Переделка внутри детектора на кадры **не видна для `analyzeSample`, потому что он уже режет**.

### Как проверить, что не сдвинули

1. **Зуб в каждом детекторе: вызов `detect(fftSize_buffer)` даёт числа как до правки:**
   ```ts
   it('single-frame input gives same result as before', () => {
     const buffer = generateSineBuffer(440, fftSize);
     const oldResult = knownResultFromPreviousBuild; // commit до правки
     const newResult = detector.detect(buffer);
     expect(newResult).toEqual(oldResult);
   });
   ```

2. **Интеграционный: `analyze(5sec_buffer)` через `analyzeSample` не сдвигается:**
   ```ts
   it('analyzeSample aggregates same way as before', () => {
     const buffer = generateDroneBuffer(5000); // 5 сек
     const result = await analyzeSample(buffer, config);
     expect(result.confidence).toBeCloseTo(
       baselineBenchmark.confidence, 
       2 // два знака после запятой
     );
   });
   ```

3. **Чек: число вызовов `SpectralFluxTracker.next()` в цикле кадров:**
   ```ts
   const tracker = new SpectralFluxTracker();
   const frames = diceIntoFrames(longBuffer);
   let callCount = 0;
   for (const frame of frames) {
     tracker.next(fft(frame));
     callCount++;
   }
   // callCount должен быть ровно (longBuffer.length - fftSize) / hopSize + 1
   ```

**Запись в код:**
```ts
// ВАЖНО: detectDirect получает ровно fftSize сэмплов от analyzeSample.
// Изменение логики внутри детектора не должно менять число кадров в цикле.
// Проверка: см. test 'flux stream count matches frame slicing'.
```

---

## Резюме нарезки (для Тарасова)

| Блок | Роль | Размер | Главный риск | Проверка |
|------|------|--------|--------------|----------|
| `cepstral-whole-record` | Дынин | 110–140 | развилка в детекторе | test: две половины с разными тонами |
| `flux-window-aggregate` | Дынин | 80–95 | усреднение спектров | test: длинный вход дробится одинаково в window и detector |
| `flux-tracker-streaming` | Дынин | 110–140 | сброс счётчика, первый кадр, среднее вместо max | test: stateful трекер на первом кадре; mean vs peak; число вызовов next() |

**Доказательство логики:** комментарий про устойчивый источник + конкретный зуб (стабильный синус vs щелчки).

**Охрана бенчмарка:** три теста (`single-frame`, `analyze-sample`, `frame-count`) плюс запись в код про invariant.

---
