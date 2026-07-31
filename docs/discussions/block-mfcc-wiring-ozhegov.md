# Обсуждение: block-mfcc-wiring-ozhegov

<!-- Автогенерация yarn ask. Каждый блок ниже — одно обращение к персонажу. -->

## 2026-07-31 13:12 UTC · ozhegov

**Контекст:** C:/Users/USER19~1/AppData/Local/Temp/block-mfcc-wiring.md
**Вопрос:** Разбери блок включения по шести пунктам. Приговор по meyda в клиенте — с доводом. Назови швы и дай легальное «нет с причиной».

**Ответ:**

# Разбор блока `mfcc-plugin-wiring`

Хорошо, пойдём по существу. Ты держишь регистр граней — я начну с периметров.

---

## 1. Приговор по `meyda` в клиенте

**Законно, с условием.**

Ты прав, что возражение P1 было о периметре **ядра** (`@membrana/mfcc-analyzer-service`), а не клиента. Ядро экспортирует интерфейс `{ extract(samples) }` — уже без имени библиотеки. Клиент — инъектор, именно его место применять **конкретный** `Meyda.extract()`.

**Условие:** `meyda` кладётся в `apps/client/package.json` как `dependencies` (не `devDependencies`), потому что это — **рантайм-зависимость** виджета, не тулинг. Сейчас в корневых devDeps, это ошибка развёртывания, а не зоны.

**Шов:** `apps/client/package.json` → добавить `"meyda": "^5.6.3"` в `dependencies`.

---

## 2. Где живёт настройка считалки

**Свойства Meyda — глобальные и однократные.**

`Meyda.melBands = 40` — это присваивание на объект, не вызова. Если на странице два плагина с разными преsets (`mel40` и `mel13`), второй перепишет первому. Это беда.

**Решение:** не менять Meyda глобально, а **оборачивать каждый экстрактор в замыкание**:

```ts
function createMfccExtractor(preset: MfccPresetSpec) {
  const localMeyda = { ...Meyda, melBands: preset.melBands };
  return (samples: Float32Array) => {
    return localMeyda.extract('mfcc', samples, {});
  };
}
```

Или **легальное нет:** если плагин один на странице (микрофонный модуль не предусмотрен быть multi-instance), оставить глобальное присваивание с комментарием `// TODO: refactor if multi-instance`. Это временно до ревизии Meyda-враппера в foundation.

**Шов:** либо `mfccExtractor.ts` получает замыкание, либо `installMfccAnalyzerTest` применяет настройку в `start()` с явным доком по однократности.

---

## 3. Разбор трёх файлов

### `mfccExtractor.ts`
**Что:** функция-генератор экстрактора или класс-обёртка над `Meyda.extract()`.  
**Почему:** инкапсулирует логику Meyda (глобальное состояние, параметры, проверку результата). Ядро не должно знать про Meyda вообще.  
**Форма:**
```ts
export function createMfccExtractor(preset: MfccPresetSpec): MfccExtractor {
  // применить preset в замыкании или в Meyda (см. пункт 2)
  // вернуть (samples) => number[] | null
}
```

### `mfccAnalyzerTestPlugin.ts`
**Что:** фабрика плагина — `createMfccAnalyzerTestPlugin()`.  
**Почему:** соответствует контракту `Plugin<TConfig>` из agenda; регистрируется один раз в `registerClientModules`.  
**Форма:**
```ts
export function createMfccAnalyzerTestPlugin(): Plugin<MfccPluginState> {
  return {
    id: 'mfcc-analyzer-test',
    name: 'MFCC Analyzer',
    version: '0.1',
    description: '...',
    active: false,
    config: { /* default state */ },
    install(context: PluginContext) {
      const extract = createMfccExtractor(/* preset */);
      const { start, stop, teardown } = installMfccAnalyzerTest({ extract, onState, preset });
      // вернуть teardown
    }
  };
}
```

### `index.ts`
**Что:** экспорты — фабрика + типы контракта, всё остальное внутренние детали.  
**Почему:** единственная публичная точка входа плагина из клиента.  
**Форма:**
```ts
export { createMfccAnalyzerTestPlugin } from './mfccAnalyzerTestPlugin';
export type { MfccPluginState, MfccPresetSpec } from '@membrana/mfcc-analyzer-service';
// НЕ экспортировать installMfccAnalyzerTest, createMfccExtractor — это внутренность
```

---

## 4. Расхождение с образцом по `moduleId`

**Чинить, но не здесь — назвать заём на будущее.**

У `fft-indices-viz` панель читает `moduleId` и дёргает конфиг из стора (`useMembranaStore`). У MFCC панель берёт `extract` пропом и состояние локальное.

**Причина:** инъекция `extract` сделана намеренно (ядро ничего про UI не знает), но рассогласовалось с паттерном других плагинов. Это легальный выбор верстальщика — избежать связанности плагина со стором.

**Заём:** в `MicrophoneModule.tsx` рядом с включением плагина добавить комментарий:
```ts
// TODO: unify plugin config patterns — MFCC uses injection, FFT uses moduleId+store.
// Decision: keep injection for now, revisit in MODULE_CONFIG_UNIFICATION task.
MembranaRegistry.registerPlugin('microphone', createMfccAnalyzerTestPlugin());
```

Не чинить здесь — это архитектурный выбор на уровне регистра.

---

## 5. Легальное «нет с причиной»

**Не добавлять** историю сессий и восстановление конфига между перезагрузками страницы.

**Причина:** плагин `mfcc-analyzer-test` — именно **тестовый** (в названии), интерфейс для лабораторного анализа фрагментов, не часть UI квадрата. Если будет промышленный анализатор MFCC как модуль (в регистре), там будет и персистентность. Сейчас — вещдок по включению и работоспособности, это достаточно.

---

## 6. Оценка объёма

**Прогноз 180 строк выдержан.**

- `mfccExtractor.ts` — 20–25 строк (замыкание + вызов Meyda + null-check)
- `mfccAnalyzerTestPlugin.ts` — 40–50 строк (фабрика, контракт Plugin, install/teardown)
- `index.ts` — 3–5 строк
- `registerClientModules.ts` — +3 строки (один вызов `registerPlugin`)
- `MicrophoneModule.tsx` — +1–2 строки (условие рендера)
- `package.json` — +1 запись в dependencies

**Итог:** 70–90 строк новых + минимальные правки = уместилось в 180.

---

## Швы (границы для ревью)

| Шов | Файл | Что проверить |
|-----|------|---------------|
| **Периметр ядра** | `@membrana/mfcc-analyzer-service/src/index.ts` | экспортирует только `MfccPluginState`, `MfccPresetSpec`, контракты — не сам Meyda |
| **Инъекция** | `mfccAnalyzerTestPlugin.ts` | `extract` применяется в `install()`, не в фабрике; одна настройка на жизнь плагина |
| **Регистр** | `registerClientModules.ts` + `MicrophoneModule.tsx` | плагин включён через `MembranaRegistry`, рендер по `activeIds` |
| **Клиентские зависимости** | `apps/client/package.json` | `meyda` в `dependencies`, не `devDependencies` |
| **Однократность** | `mfccExtractor.ts` | Meyda-обёртка не пишет глобальное состояние, либо явно документирована как однократная и потокоуязвимая |

---

**Приговор:** блок к запуску. `meyda` в клиент — законно. Настройка считалки — оборачиваешь в замыкание или документируешь однократность. Три файла по роли. Регистр — фиксится комментарием-заёмом.

---
