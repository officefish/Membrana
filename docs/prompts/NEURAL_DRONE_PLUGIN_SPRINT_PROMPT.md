# Sprint prompt: Нейро-детекция дрона (UC2 free-тарифа, YAMNet) — ND1–ND3

| Поле | Значение |
|------|----------|
| **Sprint** | `neural-drone-plugin` |
| **Тип** | Имплементация (детектор + клиентский плагин) |
| **Цель** | User case №2 free-тарифа: детекция дрона по звуку **нейросетью** (zero-shot) |
| **Форсайт** | `docs/seanses/foresight-2026-07-06.md` (S1, keystone) |
| **Канон** | `INTEGRATIONS_STRATEGY.md §4.2.1` (Способ A: zero-shot, в браузере, без обучения) |
| **Size** | M (3 задачи) |

> **Рамка:** нейро-детектор — **zero-shot / pretrained**, обучения нет, полевые записи (17.07) **не
> нужны**. Строим сейчас. Free выпускается с детекцией в бете; VDR-сертификация — следующим релизом.

## Реальность, к которой привязываемся

- Scaffold `@membrana/yamnet-detector-service` (`packages/services/detectors/yamnet`): `YamnetDetector
  implements DroneDetector` (сейчас `detect()` кидает `NotImplementedError`), семейство `neural`,
  цель p95 < 100 мс. Зависимости: `@membrana/core`, `@membrana/detector-base`.
- Контракт `@membrana/detector-base`: `detect(window: AudioWindow): Promise<DetectionResult>`;
  `DetectionResult = { isDrone, confidence, reasoning?, fundamentalsHz?, features?, latencyMs }`.
- Образец клиентского плагина: `apps/client/src/plugins/trends-fft-sample-analyzer/` (offline-прогон по
  сэмплу через audio-engine, без прямого Web Audio, регистрация через `MembranaRegistry`).
- Библиотеки канона: `@tensorflow/tfjs`, `@tensorflow-models/yamnet` (TF.js работает и в браузере, и в node).

## Проектные решения (принять в спринте)

1. **Где инференс:** в `yamnet-detector-service` (реализует `DroneDetector` через TF.js) — работает и в
   node (бенчмарк), и в браузере (плагин). Не плодим отдельный analyzer-сервис; один источник.
2. **Веса модели — БУНДЛ, не runtime-fetch.** Studio скачивается и работает офлайн → веса YAMNet
   бандлятся как asset пакета, не тянутся с tfhub на каждом запуске. **Факт (ND1): ~16 МБ** (4 шарда;
   первоначальная оценка ~4 МБ была занижена — владелец подтвердил бандл после факта). Компромисс:
   бандл (офлайн-гарантия) принят; альтернатива — lazy-fetch с кэшем.
3. **Класс-маппинг AudioSet → дрон:** score по классам `Aircraft`, `Helicopter`, `Propeller, airscrew`,
   `Engine` (агрегат → confidence). Точный список порогов подобрать на free-v1 (ND3).
4. **Границы:** плагин — только публичный API audio-engine (ARCHITECTURE §1b), без `new AudioContext()`
   / `getUserMedia`; детектор не импортит клиентское. `check:boundaries` зелёный.

## Задачи

### ND1 — Реализация `YamnetDetector.detect()`
- [ ] TF.js YAMNet инференс на `AudioWindow`: ресемпл в 16 кГц моно (требование YAMNet), фрейминг, прогон.
- [ ] Агрегация score дрон-релевантных классов AudioSet → `isDrone` + `confidence`; `features` = score
  по классам; `reasoning` = топ-классы.
- [ ] Веса бандлятся (офлайн). Latency p95 < 100 мс (после прогрева модели).
- [ ] `contract.test.ts` зелёный + unit на маппинг классов и агрегацию.
- **Роль:** Математик (dynin) ведёт, Структурщик (ozhegov) — границы/зависимости. **Size:** M

### ND2 — Клиентский плагин нейро-детекции
- [ ] Плагин `neural-drone-analyzer` по образцу `trends-fft-sample-analyzer`: offline-прогон по сэмплу
  библиотеки + live-режим через audio-engine (без прямого Web Audio).
- [ ] UI: вердикт «дрон/не дрон» + confidence + топ-классы; регистрация через `MembranaRegistry`.
- [ ] Запись в каталог `docs/catalog/client/registry.json` (kind plugin, parent sample-library/microphone).
- **Роль:** Верстальщик (rodchenko) ведёт, Математик (dynin) — пресеты порогов. **Size:** M

### ND3 — Валидация на бенчмарке free-v1
- [ ] Прогнать `yamnet` через `benchmark:detectors` (сейчас scaffold-строка) → реальные precision/recall/F1.
- [ ] Внести строку в `DETECTOR_BENCHMARK.md` (пометка датасета/даты); сравнить с DRONE_TIGHT.
- [ ] Зафиксировать: нейро годен как второй независимый сигнал (вход в combined UC, S2), даже если сам
  по себе не бьёт stage-gate.
- **Роль:** Математик (dynin) ведёт, Teamlead (vesnin) — LGTM на таблицу. **Size:** S

## Порядок

**ND1 → ND2 → ND3.** ND2 зависит от ND1 (нужен рабочий детектор); ND3 валидирует ND1 и питает решение по S2.

## Non-goals
- **Не** fine-tune и **не** обучение (Способ A only); полевые записи не нужны.
- **Не** combined UC / alarm-loop (это S2, отдельный спринт).
- **Не** серверный inference (эшелон 2 `background-inference` — после stage-gate).

## Definition of Done
- `YamnetDetector.detect()` реализован, contract + unit тесты зелёные, веса бандлятся (офлайн).
- Плагин нейро-детекции зарегистрирован через `MembranaRegistry`, без прямого Web Audio, в каталоге клиента.
- `yamnet` строка в `DETECTOR_BENCHMARK.md` с реальными метриками на free-v1.
- `check:boundaries` + typecheck/lint/test по затронутым пакетам зелёные.
- Ручной прогон в UI (на владельце: библиотека сэмплов → нейро-плагин → вердикт).
