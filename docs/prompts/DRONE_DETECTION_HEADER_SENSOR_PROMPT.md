# Промпт: глобальный датчик детекции дрона в шапке (Membrana client)

> **Task-промпт для агента-разработчика** (Cursor IDE / Claude / другой LLM).
> Скопируй блок **«Промпт целиком»** в начало диалога. Размер задачи: **M**.
> Ожидаемый артефакт: **1 PR** — перестройка `AppHeader` / `AppFooter`, глобальный хаб событий детекции, UI-датчик с затуханием, подключение минимум одного источника (`fft-threshold-test`).

---

## Контекст

Детекция дрона — **сквозная** функция клиента Membrana: пользователь должен видеть факт обнаружения **независимо от выбранного модуля**, без перехода в панель конкретного анализатора.

Сейчас в правой части шапки (`AppHeader`) заметно занимают:

- `StorageRuntimeIndicator` — режим persist (`Web local storage` / `Electron FS`);
- `ThemeSelector` — выбор темы.

Плагин `fft-threshold-test` уже выдаёт `isDetected` по завершении теста и пишет телеметрию с тегом `detected`. Нужен **единый визуальный индикатор** в chrome приложения и контракт для всех будущих анализаторов.

**Связанные документы:**

| Документ | Зачем |
|----------|--------|
| [`DESIGN.md`](../DESIGN.md) | Токены, a11y, длительность анимаций 150–300 ms |
| [`MODULE_AND_PLUGIN_UI.md`](../MODULE_AND_PLUGIN_UI.md) | Плагины не импортируют UI шапки напрямую |
| [`ARCHITECTURE.md`](../ARCHITECTURE.md) | Слабая связанность, hub-паттерн (`microphoneStreamHub`) |
| [`FFT_THRESHOLD_TEST_PLUGIN_PROMPT.md`](./FFT_THRESHOLD_TEST_PLUGIN_PROMPT.md) | Источник `isDetected` v0 |
| `apps/client/src/components/AppHeader.tsx` | Текущая вёрстка шапки |
| `apps/client/src/components/StorageRuntimeIndicator.tsx` | Что переносим в футер |

---

## Промпт целиком (для вставки агенту)

---

### Кто ты

Ты — **координатор виртуальной команды Membrana** под руководством **Vesnin** (Teamlead). Перед кодом — краткий план (1–2 абзаца + список файлов). UI — строго по [`DESIGN.md`](../DESIGN.md). Анализаторы **не импортируют** компоненты шапки; только публикуют события в общий хаб.

---

### Что построить (продуктовое описание)

#### 1. Глобальный датчик в шапке (правый угол)

Постоянно видимый элемент **«датчик дрона»** в `AppHeader`:

| Состояние | Поведение |
|-----------|-----------|
| **Покой** | Приглушённый индикатор (нейтральный/серый), малый размер; сигнализирует «мониторинг включён», без тревоги |
| **Срабатывание** | При событии **«дрон обнаружен»** от любого зарегистрированного источника — яркая активация (акцент/предупреждение по `DESIGN.md`, не только цвет: иконка + свечение/пульс) |
| **Удержание** | После срабатывания остаётся заметным **N секунд** (дефолт **4 s**, вынести в константу) |
| **Затухание** | Если за время удержания **не было новых** срабатываний — **плавное угасание** за **M секунд** (дефолт **3 s**, CSS transition / opacity) до состояния покоя |
| **Повтор** | Новое срабатывание **во время удержания или затухания** сбрасывает таймеры и снова доводит яркость до пика (re-trigger) |

Датчик **не модален**, не перекрывает контент; клик по нему опционален (см. § Опционально).

**Расположение в шапке (desktop, `md+`):**

```
[ Logo | подпись | модуль … ]     [ тема ] [ ● ДАТЧИК ДРОНА ]
                                      ↑           ↑
                              ThemeSelector   правый край
```

- **Крайний правый** — датчик.
- **Слева от датчика** (с отступом 12–16 px) — `ThemeSelector` без громоздкой подписи «тема» (достаточно `aria-label` на группе).
- **`StorageRuntimeIndicator` убрать из шапки** полностью.

На узких экранах (`< md`) допустимо перенос датчика + темы на вторую строку шапки, но порядок **тема → датчик** и выравнивание **вправо** сохранить.

#### 2. Индикатор типа стора — в футер, ненавязчиво

`StorageRuntimeIndicator` перенести в **`AppFooter`**, **правый нижний угол**:

- Одна строка или компактный badge: `Web` / `Electron` (без двух больших «карточек» как в шапке).
- Цвет `text-base-content/35`, размер `text-[9px]`–`text-[10px]`.
- Полная подпись режима — в `title` / `aria-label` при hover/focus.
- Текст в футере про «индикатор в шапке» (см. `AppFooter.tsx`) обновить: «…см. индикатор хранения внизу справа».

Это **статическая** информация о среде клиента; не конкурирует с датчиком дрона.

#### 3. Источники событий «дрон обнаружен»

Любой анализатор (плагин, модуль, сервис-клиент) сообщает факт **только при положительной детекции** (`isDetected === true` или эквивалент), не при каждом кадре.

**Минимум в этом PR:** подключить `fft-threshold-test` — при `finishCollection`, если `result.isDetected`.

**Контракт хаба** (новый файл, например `apps/client/src/lib/droneDetectionHub.ts`):

```ts
export interface DroneDetectionEvent {
  /** Уникальный ключ источника, напр. `fft-threshold-test` */
  readonly sourceId: string;
  /** Человекочитаемое имя для tooltip, напр. «FFT пороговый тест» */
  readonly sourceLabel: string;
  readonly timestamp: number;
  /** 0…1, опционально; если нет — UI трактует как 1 */
  readonly confidence?: number;
}

/** Публикует срабатывание (только detected=true). */
export function publishDroneDetected(event: DroneDetectionEvent): void;

/** Подписка для UI-датчика и тестов. */
export function subscribeDroneDetection(listener: (event: DroneDetectionEvent) => void): () => void;
```

Правила:

- Хаб **синхронный**, in-memory, без persist.
- Дубликаты от одного `sourceId` в течение **debounce 500 ms** не должны дёргать UI повторно (настраиваемая константа).
- Плагины вызывают `publishDroneDetected` из `install`/teardown-контекста, **не** из React-компонентов напрямую (вызов из plugin layer после `evaluateThresholdTest` — ок).

**Альтернатива/дополнение (не обязательно в v1):** подписка датчика на `TelemetryJournal` с фильтром `tags` includes `detected` — только если задержка приемлема; приоритет — прямой хаб для отзывчивости.

#### 4. Состояние UI-датчика

Singleton или hook, например `useDroneDetectionSensor()`:

- Внутри `subscribeDroneDetection` + таймеры `hold` / `fade`.
- Наружу: `phase: 'idle' | 'active' | 'fading'`, `lastEvent: DroneDetectionEvent | null`, `intensity: 0…1` для opacity/scale.
- Очистка таймеров на unmount подписчика.

Компонент: `DroneDetectionHeaderSensor.tsx` в `apps/client/src/components/`.

---

### Визуальный дизайн (Верстальщик)

- Форма: круг или «радар» 24–32 px в покое, до 36 px в пике (scale transition).
- Покой: `opacity ~0.35`, border `base-300`.
- Активен: `opacity 1`, ring/glow `primary` или `warning` (согласовать с Teamlead; предпочтение — **warning/amber** для тревоги, не success).
- Затухание: анимация `opacity` 1 → 0.35 за **M ms**, `ease-out`.
- `aria-live="polite"` на контейнере: при срабатывании объявлять «Обнаружен дрон» (можно с `sourceLabel`).
- `role="status"`, `aria-label` в покое: «Датчик детекции дрона, ожидание».

**Запрещено:** мигающая анимация бесконечным циклом в покое (только краткий pulse при срабатывании, ≤ 600 ms).

---

### Архитектура (Teamlead + Структурщик)

| Слой | Путь | Ответственность |
|------|------|-----------------|
| Хаб | `apps/client/src/lib/droneDetectionHub.ts` | publish / subscribe, debounce |
| Состояние UI | `apps/client/src/lib/droneDetectionSensorState.ts` или hook | таймеры hold/fade |
| Компонент | `apps/client/src/components/DroneDetectionHeaderSensor.tsx` | презентация |
| Шапка | `apps/client/src/components/AppHeader.tsx` | layout: тема + датчик |
| Футер | `apps/client/src/components/AppFooter.tsx` + `StorageRuntimeIndicator.tsx` | компактный режим стора |
| Источник | `fft-threshold-test/fftThresholdTestPlugin.ts` | `publishDroneDetected` при `isDetected` |

**Запрещено:**

- Импорт `AppHeader` / `DroneDetectionHeaderSensor` из плагинов.
- Хранение истории детекций в `localStorage` (история — телеметрия / модули).
- Блокировка UI или звуковые сигналы без отдельной задачи.

---

### Опционально (не блокирует DoD)

- Клик по датчику: tooltip с `lastEvent.sourceLabel` + время; или переход в модуль «Журнал телеметрии» / последний отчёт.
- Badge-счётчик срабатываний за сессию (малый `+N`).

---

### Тесты

| Область | Минимум |
|---------|---------|
| `droneDetectionHub` | debounce, subscribe/unsubscribe |
| `droneDetectionSensorState` / hook | re-trigger сбрасывает fade; после hold+fade → idle |
| Компонент | smoke render (Vitest + RTL), если уже есть в client |

Таймеры в unit-тестах — `vi.useFakeTimers()`.

---

### Definition of Done

- [ ] В шапке справа: датчик дрона; слева от него — выбор темы; `StorageRuntimeIndicator` убран из шапки.
- [ ] В футере справа внизу — компактный индикатор типа стора.
- [ ] При `isDetected` в `fft-threshold-test` датчик загорается, держится ~4 s, затухает ~3 s без повторных событий.
- [ ] Повторная детекция во время удержания/затухания снова усиливает индикатор.
- [ ] a11y: не только цвет; `aria-live` при срабатывании.
- [ ] `yarn workspace @membrana/client typecheck` и тесты client — зелёные.
- [ ] LGTM Teamlead.

---

### Out of scope

- Новые алгоритмы детекции дрона (только UI + wiring).
- Push-уведомления, звук, системный tray.
- Настройки длительности hold/fade в UI настроек (только константы в коде; конфиг — отдельная задача).
- Отображение «не обнаружено» как срабатывание датчика.
- Рендер карточек телеметрии в журнале.

---

### Порядок работы ролей

1. **Teamlead** — утвердить расположение, цвет тревоги, константы hold/fade.
2. **Структурщик** — хаб, state machine, подключение fft-threshold-test.
3. **Верстальщик** — `DroneDetectionHeaderSensor`, правки Header/Footer/StorageRuntimeIndicator.
4. **Музыкант** — smoke: микрофон + fft-threshold-test, визуально проверить цикл активации/затухания.
5. **Teamlead** — LGTM.

---

### Формат ответа координатора (планирование)

```text
[Teamlead]: …
[Структурщик]: …
[Верстальщик]: …
[Музыкант]: …

Итоговый артефакт: …
Definition of Done: …
```

---

## Сводка по ролям

### [Teamlead] — Vesnin

- Датчик — **глобальный chrome**, не фича одного модуля.
- Единственная точка интеграции для анализаторов — `publishDroneDetected`.
- Приоритет отзывчивости UI над парсингом журнала телеметрии.

### [Структурщик]

- Хаб по образцу `microphoneStreamHub.ts`.
- Таймерная машина hold/fade с re-trigger.

### [Верстальщик]

- Перекомпоновка `AppHeader` / `AppFooter`.
- Анимации в пределах 150–300 ms из `DESIGN.md`.

### [Музыкант]

- Проверка на live: офисный фон → тест с детекцией → визуальное срабатывание датчика без смены модуля.

---

## Заметки для человека-постановщика

- GitHub Issue: «Global drone detection sensor in app header» со ссылкой на этот файл.
- Следующие источники для хаба: будущий `dsp-drone-detector`, legacy-пресеты `FftAnalyzer` с `isDetected` в live-режиме — отдельными маленькими PR.
- Константы по умолчанию: **hold 4 s**, **fade 3 s**, **debounce 500 ms** — при приёмке подстроить по ощущениям в офисе.
