# Параллельный live-анализ (LP1–LP4)

> Итоговый документ спринта `live-parallel-detection-sprint`.
> Промпт: [`prompts/LIVE_PARALLEL_DETECTION_SPRINT_EPIC_PROMPT.md`](./prompts/LIVE_PARALLEL_DETECTION_SPRINT_EPIC_PROMPT.md).

Решает проблему: «Анализ дрона (live)» строил отчёт только после импорта 5‑с клипа (полный DDR) и не успевал за auto-нарезкой буфера.

---

## Режимы `mic-live-drone-analysis`

| Режим | `analysisMode` | Источник | Латентность | Журнал |
|-------|----------------|----------|-------------|--------|
| Ручной (поток) | `stream-manual` | микрофон, окно по кнопке | окно 3 с | brief сразу после окна |
| Авто (поток) | `stream-auto` | микрофон, параллельно нарезке | цикл 3 с + 2 с пауза | brief каждый цикл |
| Последний трек | `track-import` | `sampleImported` из буфера | brief быстро после импорта | brief; подробный DDR — по запросу (LP1b) |

Defaults: `streamWindowSec: 3`, `streamPauseSec: 2`.

---

## Два формата отчёта

| Формат | Schema | Когда | Содержание |
|--------|--------|-------|------------|
| Краткий (default) | `drone-detection-brief/v1` | каждый цикл / клип | 3 DSP-вердикта (harmonic, cepstral, flux): `isDrone` + confidence |
| Подробный | `drone-detection-report/v1` | по запросу на сервер (LP1b) | полный DDR: таблицы кадров, template-match |

Быстрый путь: `includeFrameVerdicts: false`, `Promise.all` по детекторам, без template-match.

---

## FFT-плагины в журнале (LP2)

`fft-threshold-test` (`fft-threshold-test/v0.2`) и `trends-fft-analyzer` (`trends-fft/v0.1`) снова пишут отчёты в live-журнал. Плагины **opt-in** (`active: false`). Synthetic trackId: `fft-threshold:<moduleId>:<testId>`, `trends-fft:<moduleId>:<reportId>`.

---

## Backpressure track-import (LP3)

Не более одного анализа в работе + одна задача в очереди (побеждает свежайший клип). Отставание surfaced в панели: «В очереди: …» и «Пропущено клипов: N».

---

## SLO

| Метрика | Цель |
|---------|------|
| Finalize окна потока (3 DSP, brief) | ≤ 500 мс после конца окна |
| Период stream-auto | окно + пауза = 3 + 2 = 5 с |
| track-import: одновременных анализов | ≤ 1 (плюс 1 в очереди) |
| Запись brief в журнал | в паузе, до старта следующего окна |

Подробный DDR (template-match, таблицы кадров) — вне hot path, только по запросу на сервер.

---

## Paired smoke (ручная проверка)

Без микрофона в headless CI — не блокер; проверять в браузере.

- [ ] Включить модуль микрофона + плагин «Анализ дрона (live)».
- [ ] **stream-auto**: при активном микрофоне отчёт `drone-detection-brief/v1` появляется в журнале каждые ~5 с, без «залипания» на формировании.
- [ ] **stream-manual**: кнопка «Старт окна (3 с)» → один brief после окна.
- [ ] **track-import** + auto-буфер (5 с): brief по каждому клипу; при отставании растёт счётчик «Пропущено клипов».
- [ ] Кнопка «Запросить подробный отчёт (сервер)» в track-import — pending (полноценно в LP1b).
- [ ] **FFT пороговый тест** (opt-in) на микрофоне → записи `fft-threshold-test/v0.2` в журнале.
- [ ] **Анализатор тенденций FFT** (opt-in) → записи `trends-fft/v0.1` в журнале «Отчёты»/«Обнаружения».

---

## Вне объёма

- Template-match на live stream.
- Подробный DDR для stream-режимов (нужен upload окна, v2).
- Изменение интервала `mic-buffer-recorder` (остаётся 5 с).
- SSE journal push.
