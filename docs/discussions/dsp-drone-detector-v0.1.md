# DSP drone detector v0.1 — контракт и спектральное окно

Журнал решений для `@membrana/dsp-drone-detector-service` (Этап 1 «Одинокий слушатель»).
Связь: [`DAY_ISSUES.md`](../DAY_ISSUES.md), [`SERVICES.md`](../SERVICES.md) § Параметры захвата v0.1, GitHub **#34**.

---

## Контракт v0.1 (Teamlead)

**Вход** (один спектральный кадр или агрегат кадров):

- `magnitudes: Float32Array` — амплитуды БПФ (линейная шкала, длина `fftSize / 2` или согласованная с `FftCore`);
- `sampleRate: number` — Гц;
- `fftSize: number` — размер окна БПФ (по умолчанию **2048**).

Опционально для отладки: `frequencies: Float32Array` — центры бинов (как `FftCore.computeFrequencies(sampleRate)`).

**Выход:**

```ts
{
  isDrone: boolean;
  confidence: number; // 0..1
  reasoning: string;
  fundamentals?: number[]; // Гц, обнаруженные несущие/гармоники
}
```

**Out of scope v0.1:** centroid/flux/RMS как **единственный** критерий (логика `packages/temp/fft/FFTDroneDetectorService` — reference only); ML/YAMNet/CLAP; TDOA.

---

## Окно БПФ и наложение (Математик)

### Разрешение по частоте

Для окна длины `N = fftSize` и частоты дискретизации `f_s`:

\[
\Delta f = \frac{f_s}{N}
\]

При **v0.1** (`f_s = 48\,000` Гц, `N = 2048`): **Δf ≈ 23,44 Гц**. Бин `k` соответствует центру частоты \(f_k \approx k \cdot \Delta f\) (см. `FftCore.computeFrequencies` в fft-analyzer).

Этого достаточно, чтобы отделить несущую ротора **80–250 Гц** от соседних бинов и искать гармоники **2f, 3f, …** до **2–5 kHz** (WHITE_PAPER §5.1).

### Длительность окна во времени

\[
T_{\mathrm{win}} = \frac{N}{f_s}
\]

При 48 kHz и N = 2048: **T_win ≈ 42,7 ms** — компромисс между задержкой индикатора и устойчивостью оценки спектра.

### Наложение 50 % (целевой hop)

**Норматив v0.1** для цепочки, питающей `classifySpectrum`:

\[
H = \frac{N}{2} = 1024 \quad\text{сэмплов} \quad\Rightarrow\quad \text{overlap} = 50\%
\]

\[
T_{\mathrm{hop}} = \frac{H}{f_s} \approx 21{,}3\,\text{мс при } 48\,\text{kHz}
\]

Соседние окна `[s, s+N)` и `[s+H, s+H+N)` перекрываются ровно наполовину — меньше скачков `confidence` при live-потоке, чем при hop = N.

### Псевдокод: от потока кадров к входу классификатора

```text
// Параметры v0.1 (см. SERVICES.md)
f_s ← 48000
N ← 2048
H ← N / 2

// На каждый приход временного кадра samples (длина ≥ N) от audio-engine:
magnitudes ← FFT( applyWindow(samples[0:N]) )   // Hann — как в fft-analyzer math/fft

// Опционально для стабильного confidence (рекомендация v0.1):
ringBuffer.push(magnitudes)
if ringBuffer.length ≥ 3:
  magnitudesAvg ← mean(ringBuffer.last(3))   // поэлементно
else:
  magnitudesAvg ← magnitudes

result ← classifySpectrum(magnitudesAvg, f_s, N)
```

Для **offline** (файл): нарезка с шагом `H` сэмплов по моно-каналу; последний неполный отрезок — zero-pad до `N` (как в `FftAnalyzer.analyzeAudioBuffer`).

### Текущая реализация vs целевой hop

| Режим | Сейчас в репозитории | Цель v0.1 для drone-detector |
|-------|----------------------|------------------------------|
| **Live** (`LiveSampler`) | `requestAnimationFrame` + `getFloatTimeDomainData(N)`; hop ≈ период rAF (~16–17 ms), не фиксированный 50 % | При интеграции dsp-drone-detector: буферизация кадров с hop **H = N/2** или усреднение 2–3 последних спектров |
| **File** (`analyzeAudioBuffer`) | hop = `liveMode.intervalMs` (дефолт **30 ms**), окно **N** | Для полевых скриптов: явно **H = N/2** или `intervalMs` ≈ 21 ms при 48 kHz |

Документировано в рамках **#34**; изменение кода live-loop — отдельная задача Структурщика/Музыканта, не блокирует каркас классификатора.

### Вспомогательные метрики (не единственный критерий)

Из `@membrana/fft-analyzer-service` (`metrics.ts`): `spectralCentroid`, `rms`, `lowEnergyPercent` — допустимы как **вспомогательные** признаки в `reasoning`, но **не** заменяют гармонический стек (несущая + кратные гармоники).

---

## Ссылки

- [`packages/services/fft-analyzer/README.md`](../../packages/services/fft-analyzer/README.md) — § Спектральное окно v0.1
- [`INTEGRATIONS_STRATEGY.md`](../INTEGRATIONS_STRATEGY.md) — эшелон 0.1 DSP
- [`WHITE_PAPER.md`](../WHITE_PAPER.md) — §5.1 акустический портрет дрона
