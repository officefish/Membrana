# Обсуждение: mfcc-plugin-sprint-cut

<!-- Автогенерация yarn ask. Каждый блок ниже — одно обращение к персонажу. -->

## 2026-07-31 12:10 UTC · tarasov

**Контекст:** docs/sprint/cut/INPUT-mfcc-plugin-sprint.md
**Вопрос:** Нарежь спринт по форме sprint-cut/1. Скажи прямо, что выбрасываешь и почему, и назови основания оценок.

**Ответ:**

Вот моя нарезка спринта.

## Выбросы

**Телеметрия и журналирование** — `fftThresholdTelemetry.ts`, `appendFftThresholdJournalReport.ts`, экспорт отчёта. Это полировка продукта. Прибор разведки просто должен показать *сейчас* — дроны проходят или нет. История прогонов тоже вон. Не к спринту.

**Нормирование по шкале глаза** — `normalizeMetrics.ts` наFFT имеет смысл (герцы в диапазон). Кепстральные коэффициенты сырые показываем — четыре судимых с воротами пресета рядом. Оператора нет; специалист читает числа.

**Хранилище истории прогонов** — `ReportHistory.tsx`, state под неё. Разовый тест — хватит кадра текущего прогона.

Итого к выбросу: **~280 строк**, из них ~180 реального кода (телеметрия, экспорт, история).

---

## Основание нарезки

**Основание оценок:**

1. **Код экрана** → точен прогноз (твоя зона). `FftThresholdTestPanel` у образца 360 строк; мы меньше (не три метрики, а четыре, зато без истории и нормирования). Даю **280–320 строк** `MfccTestPanel.tsx`.

2. **Состояние и команды** → точен, это ясная структура. `fftThresholdPluginState` 204 строки; у нас проще (без сохранения истории). Даю **140–160 строк** `mfccPluginState.ts`.

3. **Типы + регистрация плагина** → стабильно. Даю **120 строк** `mfccAnalyzerPlugin.ts` + `types.ts`.

4. **Отчёт одного прогона** — `buildFftThresholdTestReport.ts` 86 строк. У нас статус *за каждый кадр*: прошёл/не прошёл, судимые коэффициенты, сырые значения. Даю **60–80 строк** `buildMfccTestReport.ts`.

5. **Компоненты** — `ReportCard` (текущий результат) **50–70 строк**, `CoefficientRow` (вместо `NormalizedThresholdRow`, сырые значения) **40–50 строк**, `SourceSelect` — переиспользуем.

6. **Порог тишины** (новое, чего у образца нет) — `detectMagnitudeThreshold.ts` (снимаем на первой секунде молчания) **40–50 строк** + логика в `mfccPluginState.ts` (+30 строк).

---

## Спринт-кат/1 (форма)

```
[
  {
    blockId: "mfcc-plugin-core",
    persona: "ozhegov",  // структурщик: граф, состояние, регистрация
    context: "Пакет плагина, контракты, жизненный цикл",
    zone: [
      "apps/client/src/plugins/mfcc-analyzer-test/mfccAnalyzerPlugin.ts (120 строк)",
      "apps/client/src/plugins/mfcc-analyzer-test/mfccPluginState.ts (150–170 строк, включая логику порога тишины)",
      "apps/client/src/plugins/mfcc-analyzer-test/types.ts (60 строк)"
    ],
    estimate: { changedLines: 330, revisionAt: "2b3a11" },
    revisionAt: "2b3a11"
  },
  {
    blockId: "mfcc-plugin-ui-screen",
    persona: "rodchenko",  // верстальщик: экран
    context: "Основной экран плагина: выбор источника, текущий результат, строки коэффициентов",
    zone: [
      "apps/client/src/plugins/mfcc-analyzer-test/MfccTestPanel.tsx (280–320 строк)",
      "apps/client/src/plugins/mfcc-analyzer-test/components/CoefficientRow.tsx (45 строк)",
      "apps/client/src/plugins/mfcc-analyzer-test/components/ReportCard.tsx (50–70 строк)"
    ],
    estimate: { changedLines: 395, revisionAt: "3c4d22" },
    revisionAt: "3c4d22"
  },
  {
    blockId: "mfcc-plugin-math",
    persona: "dynin",  // математик: отчёт, пороги, сырые метрики
    context: "Трансформация сырого вывода MFCC в таблицу статусов кадров, вычисление порога тишины",
    zone: [
      "apps/client/src/plugins/mfcc-analyzer-test/buildMfccTestReport.ts (70–90 строк)",
      "apps/client/src/plugins/mfcc-analyzer-test/detectMagnitudeThreshold.ts (45 строк, новое)",
      "apps/client/src/plugins/mfcc-analyzer-test/applyMfccPipeThreshold.ts (рёбра вычислений через пресет)"
    ],
    estimate: { changedLines: 155, revisionAt: "4d5e33" },
    revisionAt: "4d5e33"
  },
  {
    blockId: "mfcc-plugin-tests",
    persona: "dynin",  // математик: покрытие
    context: "Unit-тесты отчёта и логики пороги; фикстуры кадров; интеграционный: прогон на тестовом буфере",
    zone: [
      "apps/client/src/plugins/mfcc-analyzer-test/__tests__/buildMfccTestReport.test.ts (~120 строк)",
      "apps/client/src/plugins/mfcc-analyzer-test/__tests__/detectMagnitudeThreshold.test.ts (~80 строк)",
      "apps/client/src/plugins/mfcc-analyzer-test/__fixtures__/mfccFrameFixtures.ts (фикстуры, если дополнять)"
    ],
    estimate: { changedLines: 200, revisionAt: "5e6f44" },
    revisionAt: "5e6f44"
  }
]
```

---

## Почему так

- **280 строк телеметрии/экспорта/истории** выбросил: плагин — прибор, не продукт. Специалист видит *сейчас*, не собирает архив.
- **Нормирование не до глаза** — сырые коэффициенты с воротами пресета рядом. Специалист сам знает `c0 ∈ [311, 573]`.
- **Порог тишины снимаем в плагине** — новое, чего у образца нет. На первую секунду молчания — определяем `minMagnitude`. Просто, надёжно.
- **Оценки от структуры образца + минус полировка.** Экран (280–320) и состояние (140–160) — то же дерево логики; тесты (200) — мой опыт с единый-узел-детектором; порог тишины (45) — отдельный файл.

LGTM для нарезки как есть.

---
## 2026-07-31 12:20 UTC · tarasov

**Контекст:** C:/Users/USER19~1/AppData/Local/Temp/recut-mfcc-core.md
**Вопрос:** Реши, как резать переполненный блок: два блока или N проходов ревью. Дай числа.

**Ответ:**

Анализирую.

**Положение:** `mfcc-plugin-core` 540 строк — переполнен на 35% выше порога 400. Четыре условия для N проходов ревью есть: закрытый алфавит (типы + пресеты) → зависимости соседей; DoD требует фиксту на каждый модуль; швы — чёткие (lifecycle / state / types / constants); число проходов можно ратифицировать одним актом.

**Решение:** Вариант Б — **один блок, три раздельных прохода ревью**.

Швы:

1. **Pass 1: `types.ts` + `presets.ts`** (110 строк) — контракт и константы, ни от чего не зависит, доступно сразу.
2. **Pass 2: `mfccPluginState.ts`** (150 строк) — состояние, конфиг, кэш; зависит от Pass 1.
3. **Pass 3: `mfccAnalyzerPlugin.ts`** (280 строк) — фабрика, install, жизненный цикл; зависит от Pass 1 и 2.

Четыре условия канона:
- ✅ **Закрытый алфавит:** Types+Presets образуют неделимый контракт, от которого зависят State и Plugin.
- ✅ **DoD с фиксту:** каждый pass — unit-тесты на файл (snapshot для пресета, mock для state, mock detectors для plugin).
- ✅ **Швы названы ДО работы:** в этом разборе, в плане спринта.
- ✅ **Каждый pass ≤ 400:** 110 | 150 | 280 — все по норме.

**Исполнитель:** `ozhegov` один, в одном блоке; PR с тремя реквестами ревью (`@tarasov` на каждый).

**Сроки:** 110 + 150 + 280 = 540. При спринте сегодня — включаешь в календарь: Pass 1 к 16:30, Pass 2 к 17:00, Pass 3 к 17:45. Остальные три блока ждут вывода: экран 395, математика 155, зубы 200 — параллельно или после, по расписанию владельца.

**Акт:** ратифицировать в `docs/seanses/sprint-2026-XX-XX.md` как Multi-Pass Block Review для `mfcc-plugin-core`, швы и условия зафиксированы.

---
