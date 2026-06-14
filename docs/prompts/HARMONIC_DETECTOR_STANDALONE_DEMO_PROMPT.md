# Промпт: экспериментальное демо гармонического детектора БПЛА (standalone)

> **Task-промпт для агента-разработчика** (Cursor IDE / Claude / другой LLM).  
> **Этап 2** после готового сервиса классификации: автономное веб-приложение для live-демонстрации, **без интеграции в крупный продукт** и без привязки к конкретной платформе.  
> Размер: **M** · ожидаемый артефакт: **1 PR** · порт dev: **5178** (или соседний свободный).

---

## Контекст

Реализован npm-пакет **`@membrana/harmonic-detector-service`** — DSP-классификатор, который по аудиоокну (или спектру magnitudes) отвечает: есть ли признаки мультиротора, `confidence` 0..1, текстовое `reasoning`, опционально частоты `fundamentals`.

Нужно **экспериментальное демо-приложение**: отдельный Vite+React проект, который слушает микрофон, прогоняет поток через детектор и показывает результат в реальном времени. Цель — проверить алгоритм «в поле» (тишина, речь, воспроизведение записи дрона), отладить пороги и UX индикатора **до** любой встройки в продуктовый клиент.

**Вне scope:** плагины, общий UI-фреймворк продукта, телеметрия, облако, многоузловая сеть, TDOA.

**Связанные материалы (техническая правда, не брендинг):**

| Документ / API | Зачем |
|----------------|--------|
| `packages/services/detectors/harmonic/README.md` | Публичный API сервиса |
| `createHarmonicDetector()`, `classifySpectrum()` | Точки входа |
| `docs/discussions/dsp-drone-detector-v0.1.md` | Окно FFT 2048, 48 kHz, hop 50 % |
| `@membrana/fft-analyzer-service` (`FftCore`) | Спектр из сэмплов (если цепочка через FFT) |
| [`LIVE_DETECTION_UI.md`](../LIVE_DETECTION_UI.md) | **Обязательно:** сглаживание live-статуса и вёрстка demo |

---

## Промпт целиком (для вставки агенту)

### Кто ты

Ты — **senior full-stack инженер** (TypeScript, Web Audio, React). Пишешь **самостоятельное экспериментальное приложение** — как open lab / proof-of-concept, а не модуль внутри чужого монорепо-продукта. Перед кодом — краткий план (1–2 абзаца + дерево файлов).

---

### Продукт: «Harmonic Drone Lab» (рабочее название)

Одностраничное веб-приложение:

```text
микрофон → буфер сэмплов → детектор → UI (статус + confidence + пояснение)
```

**Пользователь видит:**

| Элемент | Поведение |
|---------|-----------|
| Главный статус | «Дрон обнаружен» / «Дрон не обнаружен» — крупно, цвет success / neutral |
| Confidence | Полоса или проценты 0–100 %, обновление live |
| Reasoning | **Статическая строка** «Пояснение: …» (не collapse) |
| Fundamentals | **Статическая строка** «Гармоники: …» (не collapse) |
| Управление | Start / Stop захвата микрофона; опционально слайдер порога confidence |
| Состояние микрофона | «Нет доступа», «Слушаем…», ошибки — явные сообщения |

**Не требуется:** авторизация, бэкенд, сохранение истории, карта, несколько микрофонов.

---

### Техническая архитектура

Разместить демо **рядом с сервисом** (co-located package demo — удобно для разработки библиотеки):

```text
packages/services/detectors/harmonic/
├── demo/                          # корень Vite-приложения
│   ├── index.html
│   ├── main.tsx
│   ├── vite.config.ts             # root: demo, port 5178
│   ├── App.tsx
│   ├── hooks/
│   │   └── useLiveHarmonicDetection.ts
│   └── components/
│       ├── DetectionStatus.tsx
│       ├── ConfidenceMeter.tsx
│       ├── ReasoningPanel.tsx
│       ├── FundamentalsList.tsx
│       └── MicControls.tsx
```

**Цепочка live (норматив):**

1. `getUserMedia` → `AudioContext` → `ScriptProcessor` или `AudioWorklet` / `AnalyserNode` — получить моно-сэмплы.
2. Нарезка окон **N = 2048**, **sampleRate = 48000** (или нативный sr с ресэмплингом / предупреждением в UI).
3. Hop **H = N/2** (50 % overlap) — буферизация между кадрами.
4. На каждое окно: `HarmonicDetector.detect({ samples, sampleRate, timestamp, durationSec })`.
5. Throttle UI-обновлений (например, не чаще 10–15 Hz), без `setInterval` вместо потока кадров.

**Зависимости демо (допустимо):**

- `@membrana/harmonic-detector-service` — классификатор;
- при необходимости `@membrana/fft-analyzer-service` только если выносите FFT в хук (сервис уже умеет FFT внутри `detect`);
- **не** импортировать `apps/client`, agenda, telemetry, device-board.

**Стили:** Tailwind CSS + DaisyUI **или** чистый CSS modules — нейтральная тёмная тема («лабораторный» вид). Без логотипов и названий сторонних продуктов. Допустимы `data-theme="dark"` и `forest`-подобная палитра как пресет, без привязки к дизайн-системе конкретного приложения.

**Live UI (обязательно):** см. [`LIVE_DETECTION_UI.md`](../LIVE_DETECTION_UI.md) — `DetectionSmoother` (EMA + гистерезис + 3/6 кадров), переходы 400–500 ms, экран на всю высоту без прыгающего scrollbar.

**Запрещено:**

- `framer-motion` / `motion.*` в JSX;
- `<details>` / `collapse` для reasoning и fundamentals;
- дублирование math классификатора в UI-слое;
- блокирующий main thread тяжёлым FFT без батчинга;
- хардкод API-ключей.

---

### Скрипты package.json (сервис harmonic)

Добавить в `packages/services/detectors/harmonic/package.json`:

```json
"dev:demo": "vite --config demo/vite.config.ts"
```

Документировать в README сервиса § Demo.

**Alias в `demo/vite.config.ts`:** резолв `@membrana/harmonic-detector-service` на `../src/index.ts` (исходники, HMR).

---

### Тесты

| Область | Минимум |
|---------|---------|
| Хук / утилиты | 1–2 unit-теста: нормализация буфера, расчёт hop (если вынесено) |
| E2E | Не обязателен; ручная приёмка в README |
| Сервис | Не ломать существующие 13+ тестов harmonic |

---

### Ручная приёмка (чеклист в README)

- [ ] `yarn workspace @membrana/harmonic-detector-service dev:demo` открывает UI на localhost:5178.
- [ ] Разрешение микрофона → индикатор обновляется.
- [ ] Тишина / комнатный шум → «не дрон», низкий confidence.
- [ ] Воспроизведение с телефона/колонки записи пропеллера (или синтетический WAV) → рост confidence, возможное срабатывание.
- [ ] Stop корректно освобождает микрофон и AudioContext.
- [ ] Нет утечек при повторном Start.

---

### Definition of Done

- [ ] Standalone demo в `harmonic/demo/`, команда `dev:demo` работает.
- [ ] UI: статус, confidence, reasoning, fundamentals (опционально), start/stop.
- [ ] README § Demo: запуск, приёмка, известные ограничения (браузер, sample rate).
- [ ] `yarn workspace @membrana/harmonic-detector-service test` — зелёный.
- [ ] `yarn workspace @membrana/harmonic-detector-service typecheck` — зелёный.
- [ ] Нет зависимостей от продуктового клиента.

---

### Out of scope (следующий этап)

- Встраивание в модуль «Микрофон» крупного приложения.
- Публикация в общий event bus / header sensor.
- Демо-запись в telemetry.

---

## Заметки для постановщика

- Промпт намеренно **без бренда Membrana** в тексте задания для агента — только нейтральное «лабораторное демо» и npm-имена пакетов.
- Физически код остаётся в монорепозитории; при регистрации в `registry.json` можно использовать id `harmonic-detector-demo` и ссылку на Issue #45 фаза 2.
- После merge: обновить `issue-45-harmonic-bridge.md` (чеклист фазы 2).
