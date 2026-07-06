# @membrana/yamnet-detector-service

Zero-shot нейро-детекция дрона: YAMNet (AudioSet, 521 класс) → агрегация дрон-релевантных
классов → `DetectionResult`. Эшелон 0, Способ A (без обучения) по `INTEGRATIONS_STRATEGY §4.2.1`.

**Статус:** implemented (ND1, спринт `neural-drone-plugin`). **Семейство:** neural.

## Как работает

1. `AudioWindow` → ресемпл в 16 кГц + паддинг до фрейма YAMNet (`src/math/resample.ts`).
2. Инференс graph-model TF.js, выход `Identity:0` = score `[кадры × 521]` (`src/core/model.ts`).
3. clip-score = среднее по кадрам; drone-score = max взвешенных дрон-классов
   (Propeller/Helicopter/Light engine/Aircraft/…, `src/core/drone-classes.ts`);
   `isDrone = drone-score ≥ 0.25` (порог до калибровки ND3) — `src/core/scoring.ts`.

## Веса — бандл (офлайн)

`assets/model/` — model.json + 4 шарда (~16 МБ), скачаны с tfhub `yamnet/tfjs/1`.
Сеть в рантайме не нужна (офлайн-гарантия free-тарифа). `assets/yamnet_class_map.csv` —
источник `src/core/class-names.ts` (генерат).

## Использование

```ts
// node (бенчмарк, Electron main): бандленные веса + WASM-бэкенд
import { createYamnetDetectorNode } from '@membrana/yamnet-detector-service/node';
const detector = createYamnetDetectorNode();
const result = await detector.detect(window); // AudioWindow

// браузер (плагин, ND2): модель читается fetch'ем, провайдер инжектится
import { createYamnetDetector, YamnetModel } from '@membrana/yamnet-detector-service';
const detector = createYamnetDetector({
  modelProvider: async () => YamnetModel.fromArtifacts(await fetchArtifacts()),
});
```

Первый `detect()` платит загрузку графа (лениво, кэшируется); дальше — только инференс.

## Латентность (замер 2026-07-06, node, 1с-окно, после прогрева, N=25)

| Бэкенд | p50 | p95 |
|--------|-----|-----|
| WASM (`/node`, по умолчанию) | 32 мс | **56 мс** ✅ (цель p95 < 100) |
| чистый JS CPU (фолбэк) | 582 мс | 877 мс |

В браузере TF.js сам выбирает WebGL — ожидаемо быстрее WASM.
