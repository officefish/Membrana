# Обсуждение: block-mfcc-judge-survey-dynin

<!-- Автогенерация yarn ask. Каждый блок ниже — одно обращение к персонажу. -->

## 2026-08-02 13:32 UTC · dynin

**Вопрос:** Блок mfcc-judge-survey спринта handoff-7-9. Ты держатель. Зона одна: docs/discussions/mfcc-judge-semantics.md — блок производит ОБЗОР, не правку. Бюджет 160 строк. Правка плагина — соседний блок, и он ждёт твоего вердикта.

ПРЕДМЕТ. Прибор тембрового теста (плагин клиента) судит собственными копиями, тогда как пакет @membrana/mfcc-analyzer-service отдаёт судящую машинерию из корня. В индексе пакета записано: «Цена промедления уже уплачена — прибор 31.07 судил собственной копией счёта, потому что до детектора пакета было не дотянуться». Риск, названный до нарезки: плагин судит по ПРЕСЕТУ, пакет по ГРАНИЦАМ, и это может оказаться не заменой один-к-одному, а сведением двух разных машин.

ЧТО Я ИЗМЕРИЛ, поле в поле.

Плагин, mfccAnalyzerPlugin.ts:
- vectorMagnitude(vector: readonly number[]) — корень суммы квадратов;
- judgeFrame(vector, index, preset: MfccPresetSpec, minInBandRatio, magnitudeFloor) → {index, magnitude, judgedValues, inBandCount, judgedCount, state: 'passed'|'failed'|'silent'}. Немой кадр выходит из знаменателя серии;
- judgeSeries(frames, preset, strictness) → {configHash, strictness, frames, judgedCount, silentCount, passedCount, passRate, detected, refusal}. Отказ с причиной: «серия пуста» и «все кадры немые» различены.

Пакет, detectors/pipe.ts и common.ts:
- PipeFrameState = 'passed' | 'failed' | 'silent' — ТЕ ЖЕ три состояния;
- PipeSpec = {bounds: Bounds[], configHash, minInBandRatio, minPassRate, minMagnitude, judgedCoefficients: number[]|null};
- PipeFrameVerdict = {windowStartIndex, magnitude, inBandCount, judgedCoefficientCount, inBandRatio, state};
- PipeReport = {configHash, frames, judgedCount, silentCount, passedCount, passRate, detected}. Немые в знаменатель не идут — записано дословно;
- evaluatePipe возвращает DetectorOutcome<PipeReport> = отчёт ЛИБО refuse(причина);
- magnitudeOf(coefficients: Float32Array), inBounds(value, bounds), boundsProblem, ratioProblem, judgeRun.

Соответствие настроек, как я его вижу: preset.bounds↔spec.bounds, minInBandRatio↔minInBandRatio, preset.strictness[strictness].minPassRate↔minPassRate, magnitudeFloor↔minMagnitude, preset.judgedCoefficients↔judgedCoefficients, preset.configHash↔configHash.

Ответь строго по пунктам — твой ответ станет телом обзора и входом соседнего блока.

1) Вердикт по КАЖДОЙ из трёх функций плагина: заменяется пакетом полностью / заменяется с мостом / остаётся у клиента. По каждой — почему, а не «похоже».

2) Где семантики ВПРАВДУ расходятся, если расходятся. Я вижу три кандидата: тип вектора (number[] против Float32Array); поле judgedValues, которого у пакета нет; strictness — у плагина это выбор пары порогов внутри пресета, у пакета порог просто лежит в спеке. Есть ли четвёртое, чего я не увидел.

3) Отказ. У плагина refusal — строка внутри результата, поле рядом с detected. У пакета отказ — ОТДЕЛЬНАЯ ветвь типа: DetectorOutcome это отчёт ЛИБО отказ. Это разные конструкции. Какая честнее и что это значит для правки: клиенту придётся разворачивать ветвь в поле или наоборот.

4) Что остаётся у клиента ПО ПРАВУ, а не по недоделке. Пресеты (MFCC_PRESET_FIRST_CUT) — чьё это: клиента, потому что калибровка снята на его корпусе, или пакета? Экстрактор (meyda) остаётся у клиента по решению — это уже установлено и не пересматривается.

5) Чем соседний блок докажет, что замена не изменила поведения. Назови проверяемый признак, а не «тесты зелёные»: у плагина есть свои фикстуры, и вопрос в том, что именно обязано совпасть до и после.

**Ответ:**

# Обзор: mfcc-judge-semantics

Держатель: dynin. Соседний блок (правка плагина) ждёт вердикта.

## 1. Вердикт по функциям плагина

- **`vectorMagnitude(number[])` — заменяется пакетом с мостом.** Пакетный `magnitudeOf(Float32Array)` вычисляет ту же норму (√Σx²). Расхождение только в контейнере: клиент получает от meyda `number[]`, пакет ждёт `Float32Array`. Мост — одна конверсия на входе в pipe, не отдельная функция.
- **`judgeFrame` — заменяется полностью.** `judgeRun` + `PipeFrameVerdict` покрывают всё: те же три состояния, тот же критерий «немой», тот же `inBandCount`. Единственное поле-сирота — `judgedValues` (см. §2).
- **`judgeSeries` — заменяется полностью через `evaluatePipe`.** Поле в поле: `configHash`, `frames`, `judgedCount`, `silentCount`, `passedCount`, `passRate`, `detected` — совпадают буквально. Немые вне знаменателя — записано у обоих. Различие в конструкции отказа обсуждается в §3, но это форма обёртки, а не другая логика.

## 2. Где семантика ВПРАВДУ расходится

Из трёх твоих кандидатов — расходится один.

- **Тип вектора (number[] vs Float32Array)** — это не семантика, это ABI. Норма и `inBounds` от контейнера не зависят.
- **`judgedValues` — семантики не добавляет.** Это диагностический слепок отсуженных коэффициентов на кадре. Пакет его не хранит принципиально: `PipeFrameVerdict` — приговор, а не архив входа. Если плагину нужен слепок для UI — это отдельная забота клиента (см. §4), а не расхождение судьи.
- **`strictness` — вот здесь расходится по-настоящему.** У плагина strictness — это **функция выбора** порогов из пресета: `preset.strictness[strictness] → {minPassRate, minInBandRatio?}`. У пакета strictness как понятия нет: в `PipeSpec` уже лежат числа. Это означает: **выбор строгости — ответственность клиента**, пакет судит по готовым порогам.

Четвёртого я не вижу. Если проглядел — назови кадр, где приговоры разойдутся при одинаковых порогах; я пересчитаю.

## 3. Отказ: поле vs ветвь

Честнее — **ветвь типа** (`DetectorOutcome<PipeReport>`). Причина не стилистическая: отказ и отчёт — **несовместимые состояния мира**. При refusal нет `passRate`, `detected` бессмысленно, `frames` пуст или неполон. У плагина refusal — строка рядом с `detected: false`, и это провоцирует читателя интерпретировать `passRate=0` как «серия провалилась», хотя серия просто не судилась. Пакет закрывает эту дыру типом.

Что это значит для правки:
- Клиент **разворачивает ветвь в форму, ожидаемую UI**: если UI сегодня читает `{detected, refusal}`, адаптер на границе делает `outcome.kind === 'refused' ? {detected: false, refusal: outcome.reason, ...} : {detected: outcome.report.detected, refusal: null, ...report}`.
- Обратного движения (превращать ветвь в поле в самом пакете) быть не должно — это откат к менее честной конструкции.

## 4. Что остаётся у клиента по праву

- **Пресеты (`MFCC_PRESET_FIRST_CUT`) — у клиента.** Калибровка снята на клиентском корпусе, на клиентском экстракторе (meyda), при клиентских параметрах окна. Пресет — это **эмпирика конкретной сборки прибора**, а не универсальный контракт судьи. Пакет обязан принимать `PipeSpec` и не обязан знать, откуда взялись `bounds`.
- **Выбор strictness → готовая `PipeSpec`** — у клиента (следствие §2). Клиент разворачивает `preset.strictness[level]` в числа и собирает `PipeSpec`.
- **Экстрактор (meyda)** — у клиента, установлено, не пересматриваю.
- **`judgedValues`-слепок для UI**, если нужен — у клиента, собирается параллельно вызову `evaluatePipe` из тех же коэффициентов. Пакет не обязан.

## 5. Признак эквивалентности для соседнего блока

Не «тесты зелёные». Проверяемый инвариант:

**На фикстурах плагина, при одинаковом `configHash` и одинаковых числовых порогах, для каждого кадра `i`: `plugin.frames[i].state === adapted(pipe).frames[i].state` И `plugin.frames[i].inBandCount === pipe.frames[i].inBandCount` И `|plugin.frames[i].magnitude − pipe.frames[i].magnitude| < 1e-6`. На уровне серии: `passRate`, `judgedCount`, `silentCount`, `passedCount`, `detected` совпадают точно (это целые и рациональные от целых — не эпсилон, а равенство).**

Если хоть один кадр разошёлся по `state` — замена не эквивалентна, и это повод остановить правку и вернуться ко мне: значит, я упустил четвёртое расхождение из §2.

---
