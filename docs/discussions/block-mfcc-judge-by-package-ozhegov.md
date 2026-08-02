# Обсуждение: block-mfcc-judge-by-package-ozhegov

<!-- Автогенерация yarn ask. Каждый блок ниже — одно обращение к персонажу. -->

## 2026-08-02 13:58 UTC · ozhegov

**Вопрос:** Ревью блока mfcc-judge-by-package спринта handoff-7-9. Зубов плагина 36, все зелёные; типы клиента чисты.

ВХОД БЛОКА — обзор Дынина (docs/discussions/mfcc-judge-semantics.md). Его вердикт: машина одна, переписана дважды; расхождение ровно одно — strictness есть выбор порогов, и он остаётся у клиента; judgedValues семантики не добавляет и остаётся у клиента; тип вектора это ABI, не семантика; отказ у пакета честнее (ветвь типа против поля).

ЧТО СДЕЛАНО. vectorMagnitude стал мостом к magnitudeOf. judgeFrame и judgeSeries больше не считают сами — зовут evaluatePipe. Клиент разворачивает пресет в PipeSpec, конвертирует number[] в Float32Array, собирает judgedValues и разворачивает ветвь отказа в поле refusal, которое ждёт панель. Зависимость @membrana/mfcc-analyzer-service заведена в apps/client/package.json.

ЭКВИВАЛЕНТНОСТЬ ДОКАЗАНА, а не заявлена: снял прогоном эталон ДО правки, вписал числа в зуб. После правки состояния кадров и inBandCount совпали ТОЧНО, норма разошлась на 1e-7 (судья считает во Float32, прежняя копия в double), серия сошлась поле в поле: judgedCount 2, silentCount 2, passedCount 2, passRate 1, detected true, refusal null.

ТРИ РЕШЕНИЯ, КОТОРЫЕ ПРОШУ СУДИТЬ ОТДЕЛЬНО:
1. При отказе судьи на уровне КАДРА я ставлю state 'silent'. Довод: в словаре прибора немой = не судим, а кадр, о котором судья ничего не сказал, именно не судим. Выдумать 'failed' значило бы написать приговор за судью. Но 'silent' влияет на знаменатель серии — не подменяю ли я этим отказ отсутствием сигнала.
2. Судья пакета «все кадры немые» отказом НЕ считает — честно отдаёт отчёт с judgedCount 0. Прибору же это отказ. Я оставил различение на стороне прибора: refusal ставится клиентом. Верно ли, что это принадлежит прибору, а не судье.
3. judgeSeries сменил сигнатуру: принимает векторы вместо готовых кадров, потому что судья пакета судит прогон целиком. Внешних вызовов не было — проверил. Коллектор теперь копит векторы, а не приговоры.

Ответь по пунктам: 1) годен ли блок к вливанию — LGTM или BLOCK; 2) по каждому из трёх решений — принято или отвергнуто; 3) не осталось ли в плагине судящей логики, которой там быть не должно; 4) чего не хватает в зубах.

ДИФФ:
diff --git a/apps/client/src/plugins/mfcc-analyzer-test/mfccAnalyzerPlugin.ts b/apps/client/src/plugins/mfcc-analyzer-test/mfccAnalyzerPlugin.ts
index 5591b343..7b57010c 100644
--- a/apps/client/src/plugins/mfcc-analyzer-test/mfccAnalyzerPlugin.ts
+++ b/apps/client/src/plugins/mfcc-analyzer-test/mfccAnalyzerPlugin.ts
@@ -17,6 +17,12 @@
  * побайтово одинаковый выход — настройки задаются свойствами объекта.
  */
 import type { AudioSampleFrame } from '@membrana/audio-engine-service';
+import {
+  evaluatePipe,
+  magnitudeOf,
+  type MfccVector,
+  type PipeSpec,
+} from '@membrana/mfcc-analyzer-service';
 
 import {
   createAnalysisFrameFeed,
@@ -80,11 +86,54 @@ export function configFromHash(configHash: string): {
   };
 }
 
-/** Норма вектора — по ней кадр признаётся немым. */
+/**
+ * Норма вектора — по ней кадр признаётся немым. Счёт УШЁЛ В ПАКЕТ (`magnitudeOf`); здесь
+ * остался мост через контейнер:
+ * meyda отдаёт `number[]`, судья ждёт `Float32Array`. Это ABI, а не семантика — норма √Σx²
+ * от контейнера не зависит (обзор `docs/discussions/mfcc-judge-semantics.md`, §2).
+ */
 export function vectorMagnitude(vector: readonly number[]): number {
-  let sum = 0;
-  for (const v of vector) sum += v * v;
-  return Math.sqrt(sum);
+  return magnitudeOf(Float32Array.from(vector));
+}
+
+/**
+ * Пресет клиента → спека судьи. Разворот делает КЛИЕНТ, и это по праву, а не по недоделке:
+ * `strictness` у прибора есть выбор пары порогов внутри пресета, а у пакета такого понятия
+ * нет вовсе — в спеке уже лежат числа. Судья не обязан знать, из какого набора взяты его
+ * пороги.
+ */
+function specOf(
+  preset: MfccPresetSpec,
+  strictness: MfccSeriesResult['strictness'],
+  magnitudeFloor: number,
+): PipeSpec {
+  const pair = preset.strictness[strictness];
+  return {
+    bounds: preset.bounds,
+    configHash: preset.configHash,
+    minInBandRatio: pair.minInBandRatio,
+    minPassRate: pair.minPassRate,
+    minMagnitude: magnitudeFloor,
+    judgedCoefficients: preset.judgedCoefficients,
+  };
+}
+
+/** Вектор клиента → вектор судьи. `windowStartIndex` порядковый: серия равномерна. */
+function vectorsOf(raw: readonly (readonly number[])[], configHash: string): MfccVector[] {
+  return raw.map((v, i) => ({
+    coefficients: Float32Array.from(v),
+    windowStartIndex: i,
+    configHash,
+  }));
+}
+
+/**
+ * Слепок отсуженных коэффициентов — забота КЛИЕНТА, а не судьи. Пакет его не хранит
+ * принципиально: приговор кадра не есть архив его входа. Панели слепок нужен для показа,
+ * поэтому собирается здесь, рядом с вызовом, из тех же чисел.
+ */
+function judgedValuesOf(vector: readonly number[], preset: MfccPresetSpec): number[] {
+  return preset.judgedCoefficients.map((c) => vector[c] ?? Number.NaN);
 }
 
 /**
@@ -102,13 +151,24 @@ export function judgeFrame(
   magnitudeFloor: number,
 ): MfccFrameResult {
   const judged = preset.judgedCoefficients;
-  const magnitude = vectorMagnitude(vector);
-  const judgedValues = judged.map((c) => vector[c] ?? Number.NaN);
+  const judgedValues = judgedValuesOf(vector, preset);
+  const spec: PipeSpec = {
+    ...specOf(preset, 'normal', magnitudeFloor),
+    // Кадр судится долей коэффициентов в коридоре; доля прошедших КАДРОВ к одному кадру
+    // отношения не имеет, и подставлять сюда порог серии значило бы смешать два предмета.
+    minInBandRatio,
+    minPassRate: 0,
+  };
+  const outcome = evaluatePipe(vectorsOf([vector], preset.configHash), spec);
 
-  if (magnitude < magnitudeFloor) {
+  if (!outcome.ok) {
+    // Приговор неизвестен — и это НЕ «прошёл» и не «провалил». В словаре прибора кадр, о
+    // котором судья ничего не сказал, называется немым: он выходит из знаменателя серии, а
+    // причина отказа доедет до панели строкой серии. Выдумать здесь состояние значило бы
+    // написать приговор за судью.
     return {
       index,
-      magnitude,
+      magnitude: vectorMagnitude(vector),
       judgedValues,
       inBandCount: 0,
       judgedCount: judged.length,
@@ -116,21 +176,14 @@ export function judgeFrame(
     };
   }
 
-  let inBand = 0;
-  for (const c of judged) {
-    const value = vector[c];
-    const bounds = preset.bounds[c];
-    if (value === undefined || bounds === undefined || !Number.isFinite(value)) continue;
-    if (value >= bounds.min && value <= bounds.max) inBand += 1;
-  }
-  const ratio = judged.length === 0 ? 0 : inBand / judged.length;
+  const verdict = outcome.report.frames[0]!;
   return {
     index,
-    magnitude,
+    magnitude: verdict.magnitude,
     judgedValues,
-    inBandCount: inBand,
-    judgedCount: judged.length,
-    state: ratio >= minInBandRatio ? 'passed' : 'failed',
+    inBandCount: verdict.inBandCount,
+    judgedCount: verdict.judgedCoefficientCount,
+    state: verdict.state,
   };
 }
 
@@ -139,30 +192,59 @@ export function judgeFrame(
  * было нечем» разные вещи, и слить их значит соврать в пользу прибора.
  */
 export function judgeSeries(
-  frames: readonly MfccFrameResult[],
+  vectors: readonly (readonly number[])[],
   preset: MfccPresetSpec,
   strictness: MfccSeriesResult['strictness'],
+  magnitudeFloor: number,
 ): MfccSeriesResult {
-  const pair = preset.strictness[strictness];
-  const silentCount = frames.filter((f) => f.state === 'silent').length;
-  const judgedCount = frames.length - silentCount;
-  const passedCount = frames.filter((f) => f.state === 'passed').length;
-  const passRate = judgedCount === 0 ? 0 : passedCount / judgedCount;
+  const empty = {
+    configHash: preset.configHash,
+    strictness,
+    frames: [] as readonly MfccFrameResult[],
+    judgedCount: 0,
+    silentCount: 0,
+    passedCount: 0,
+    passRate: 0,
+    detected: false,
+  };
+  if (vectors.length === 0) return { ...empty, refusal: 'серия пуста — кадров не пришло' };
 
-  let refusal: string | null = null;
-  if (frames.length === 0) refusal = 'серия пуста — кадров не пришло';
-  else if (judgedCount === 0) refusal = `все ${frames.length} кадров немые — судить нечем`;
+  const outcome = evaluatePipe(
+    vectorsOf(vectors, preset.configHash),
+    specOf(preset, strictness, magnitudeFloor),
+  );
 
+  // Отказ у судьи — ОТДЕЛЬНАЯ ветвь типа, у панели — поле рядом с `detected`. Разворот
+  // ветви в поле делается здесь, на границе, и только в эту сторону: превратить ветвь в
+  // поле внутри пакета значило бы откатиться к менее честной конструкции, где `passRate: 0`
+  // читается как «серия провалилась», хотя серия не судилась вовсе.
+  if (!outcome.ok) return { ...empty, refusal: outcome.reason };
+
+  const report = outcome.report;
+  const frames: MfccFrameResult[] = report.frames.map((f, i) => ({
+    index: i,
+    magnitude: f.magnitude,
+    judgedValues: judgedValuesOf(vectors[i]!, preset),
+    inBandCount: f.inBandCount,
+    judgedCount: f.judgedCoefficientCount,
+    state: f.state,
+  }));
+
+  const mute = report.judgedCount === 0;
   return {
-    configHash: preset.configHash,
+    configHash: report.configHash,
     strictness,
     frames,
-    judgedCount,
-    silentCount,
-    passedCount,
-    passRate,
-    detected: refusal === null && passRate >= pair.minPassRate,
-    refusal,
+    judgedCount: report.judgedCount,
+    silentCount: report.silentCount,
+    passedCount: report.passedCount,
+    passRate: report.passRate,
+    // Отказ и обнаружение несовместны: инвариант прибора, а не судьи.
+    detected: !mute && report.detected,
+    // «Все кадры немые» судья отказом не считает — он честно отдаёт отчёт с judgedCount 0.
+    // Прибору же это отказ: «цели нет» и «судить было нечем» разные вещи, и различие
+    // принадлежит прибору, а не судье.
+    refusal: mute ? `все ${report.frames.length} кадров немые — судить нечем` : null,
   };
 }
 
@@ -179,7 +261,9 @@ export function createSeriesCollector(
   frameCount: number,
   magnitudeFloor: number,
 ) {
-  const collected: MfccFrameResult[] = [];
+  // Копятся ВЕКТОРЫ, а не приговоры: судью серии зовут по исходным числам, и приговор кадра
+  // архивом входа не является.
+  const collected: (readonly number[])[] = [];
   const pair = preset.strictness[strictness];
   return {
     /**
@@ -191,10 +275,13 @@ export function createSeriesCollector(
      */
     accept(vector: readonly number[]): { frame: MfccFrameResult; series: MfccSeriesResult | null } {
       const frame = judgeFrame(vector, collected.length, preset, pair.minInBandRatio, magnitudeFloor);
-      collected.push(frame);
+      collected.push(vector);
       return {
         frame,
-        series: collected.length < frameCount ? null : judgeSeries(collected, preset, strictness),
+        series:
+          collected.length < frameCount
+            ? null
+            : judgeSeries(collected, preset, strictness, magnitudeFloor),
       };
     },
     get size(): number {

**Ответ:**

# Ревью блока `mfcc-judge-by-package`

**Контекст.** Судья вынесен в `@membrana/mfcc-analyzer-service`, плагин переведён на `evaluatePipe`/`magnitudeOf`; эквивалентность подтверждена прогоном (norm δ ≤ 1e-7 объясним переходом double→Float32).

## 1) Годен ли блок к вливанию

**LGTM.** Границы совпали со словарём: плагин — прибор, пакет — судья, `@membrana/core` не задет, зависимость заведена в `apps/client/package.json` через `@membrana/*` без обхода `index.ts`. Циклов и «спагетти» нет.

## 2) По трём решениям

1. **`state: 'silent'` при отказе судьи на кадре — принято.** В словаре дома «немой = не судим», и это ровно случай отказа. Опасение про знаменатель снято тем, что `judgeSeries` берёт `silentCount` из отчёта пакета — то есть у судьи и у прибора одна и та же арифметика немоты, не две. Если в будущем появится второй повод молчать (например, «kадр отброшен фидом»), это будет новый термин, и его нужно называть отдельно, а не подкладывать под `'silent'`.
2. **`refusal` при «все кадры немые» — на клиенте, принято.** Судья `evaluatePipe` возвращает валидный отчёт с `judgedCount: 0` — это его словарь. «Цели нет» ≠ «судить было нечем» — различие принадлежит прибору, и разворот ветви типа в поле панели корректно локализован на границе. Инвариант «отказ и обнаружение несовместны» держится в одном месте (`judgeSeries`) — хорошо.
3. **Смена сигнатуры `judgeSeries` на векторы — принято.** Судья пакета судит прогон целиком по исходным числам; копить приговоры и потом их «пересуживать» было бы двумя фасадами на одно. Внешних вызовов не было — риск ABI-регрессии нулевой.

## 3) Осталась ли судящая логика в плагине

Нет. `vectorMagnitude` — мост контейнера (`number[] → Float32Array`), не счёт. `specOf` — разворот пресета в ABI судьи. `judgedValuesOf` — слепок для панели, приговором не является. Разворот `Outcome`-ветви в поле `refusal` — граничная работа прибора. Судящих веток (порогов, коридоров, ratio) в плагине не осталось.

## 4) Чего не хватает в зубах

- **Зуб на границу немоты снизу:** `magnitude` ровно на `magnitudeFloor` — `'silent'` или судится. Пакет решает, плагин обязан это зафиксировать зубом, иначе граница уйдёт молча.
- **Зуб на `judgeFrame` с `minPassRate` пресета ≠ 0:** проверить, что подстановка `minPassRate: 0` внутри кадрового вызова действительно изолирует кадр от порога серии (сейчас это утверждение в комментарии, не в зубе).
- **Зуб на `configHash`-mismatch:** `vectorsOf` штампует хэш пресета, но если пресет сменили между `accept`-ами коллектора, поведение не описано. Либо запретить, либо задокументировать в зубе.
- **Зуб на порядок полей `refusal` vs `detected`:** инвариант «несовместны» — прямой кандидат в property-тест (для любого отчёта `refusal !== null ⇒ detected === false`).

Норма δ=1e-7 из-за double→Float32 — принимаю, но пометь это в README сервиса одной строкой, чтобы следующий читатель не искал расхождение как баг.

---
