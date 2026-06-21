# Консилиум: Device-Board Collectors v0.5 (Recorder / SpectralAnalyser)

**Дата:** 2026-06-20  
**Участники:** виртуальная команда (Vesnin, Ozhegov, Dynin, Музыкант, Rodchenko)  
**Контекст:** обсуждение в чате + MVP-решения пользователя

## Проблема

Микрофон даёт только A/D и `MediaStream`; треки и FFT-анализ сейчас «размазаны» по host-мосту без явной модели на доске. Нужны две очереди (samples / fft frames) и terminal-узлы NewTrack / NewFftTrendsAnalysis.

## Решения

1. **Device-scoped singletons:** `RecorderRef`, `SpectralAnalyserRef` через `GetRecorder(device)` / `GetSpectralAnalyser(device)` — не методы микрофона.
2. **Policy на singleton — заморожена.** MVP: настройки Collect только в **правом сайдбаре** узла (defaults из mic plugins: `bufferSize`, `smoothingTimeConstant`, `windowSec`, `queueCapacity`).
3. **GetFFTFrame — отдельный узел.** Sample и Frame — разные сущности; цепочка `GetSample → GetFFTFrame → CollectFftFrames` — канонический dataflow.
4. **Collect\*** — append в singleton + **event-out** (квадратный порт) при flush; exec-тик не равен flush. Multicast подписчиков — в архитектуре, MVP тестируем **один** Collect.
5. **NewTrack / NewFftTrendsAnalysis** — data-in: **массив ref’ов** (`AudioSampleRef[]`, `FftFrameRef[]`).
6. Flush trigger MVP: `count >= queueCapacity` **OR** `elapsed >= windowSec`.

## Out of scope (MVP)

- Policy API на singleton
- Host-internal FFT без GetFFTFrame
- QA нескольких Collect на одном singleton

## Эпик

`device-board-collectors-v05` · промпт `docs/prompts/DEVICE_BOARD_COLLECTORS_V05_EPIC_PROMPT.md`
