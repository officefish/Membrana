# Плагин: `neural-drone-analyzer` — Нейро-детекция дрона (сэмпл)

> **Catalog-спецификация** · parent: `sample-library` · статус: **draft**
> Реестр: `docs/catalog/client/registry.json`

---

## 1. Идентичность

| Поле | Значение |
|------|----------|
| **id** | `neural-drone-analyzer` |
| **parentModuleId** | `sample-library` |
| **Lead** | Rodchenko + Dynin |
| **Статус catalog** | `draft` |
| **Спринт** | `neural-drone-plugin` (ND2), форсайт `foresight-2026-07-06` |

---

## 2. Зачем пользователю

UC2 free-тарифа: тот же сценарий детекции дрона, что спектральный анализ, но **нейросетью** —
YAMNet (AudioSet, 521 класс), zero-shot, без обучения. Выбрал сэмпл в библиотеке → получил
вердикт «дрон / не дрон» + score дрон-классов + топ-классы клипа. Второй независимый сигнал
детекции; вход будущего combined UC (fusion спектр+нейро, S2).

Веса модели бандлятся с приложением (~16 МБ) — работает **офлайн**, сети не нужно.

---

## 3. UX-состояния

| Состояние | Поведение |
|-----------|-----------|
| inactive | панель скрыта |
| model-loading | «Загрузка модели…» (прогрев на install, не на первом анализе) |
| idle | кнопка «Анализировать сэмпл» активна при выбранном сэмпле |
| analyzing | кнопка задизейблена, «Анализ…» |
| ready | badge Дрон/Не дрон + score % + латентность + топ-классы AudioSet (progress-бары) |
| error | alert с сообщением (модель не загрузилась / декодирование упало) |

---

## 4. install / teardown

- **install**: `warmUp()` модели (вне критического пути), `subscribeSamplePlayback`
  (автозапуск по окончании воспроизведения при `autoAnalyzeOnEnd`), controller в state.
- **teardown**: отписка playback, снятие controller, reset state.

---

## 5. Конфиг

| Поле | Дефолт | Смысл |
|------|--------|-------|
| `autoAnalyzeOnEnd` | `true` | автозапуск анализа по окончании воспроизведения |
| `droneScoreThreshold` | `0.25` (дефолт пакета) | порог drone-score; калибровка — ND3 |

---

## 6. Границы

- Аудио — только через `sample-playback-service` / `audio-engine-service` (ARCHITECTURE §1b),
  без прямого `new AudioContext()` / `getUserMedia`.
- Инференс — `@membrana/yamnet-detector-service` (браузерный провайдер модели через vite
  `?url`-бандл ассетов пакета); детектор не знает о клиенте.
- Регистрация — `MembranaRegistry.registerPlugin('sample-library', …)`.
- При `isDrone` — `publishDroneDetected` (общий hub, паритет со спектральными плагинами).

---

## 7. Код

| Артефакт | Путь |
|----------|------|
| Плагин | `apps/client/src/plugins/neural-drone-analyzer/neuralDroneAnalyzerPlugin.ts` |
| Провайдер модели | `apps/client/src/plugins/neural-drone-analyzer/yamnetBrowserModel.ts` |
| Панель | `apps/client/src/plugins/neural-drone-analyzer/NeuralDroneAnalyzerPanel.tsx` |
| Состояние | `apps/client/src/plugins/neural-drone-analyzer/neuralDroneAnalyzerState.ts` |
| Тесты | `neuralDroneAnalyzerState.test.ts` (state-машина + конфиг) |
