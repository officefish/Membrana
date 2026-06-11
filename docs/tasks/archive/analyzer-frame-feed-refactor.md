# Архив: Анализаторы: AudioFrameFeed и миграция fft-threshold-test + harmonic-detector-viz

| Поле | Значение |
|------|----------|
| **ID** | `analyzer-frame-feed-refactor` |
| **Статус** | archived |
| **Размер** | M |
| **Создана** | 2026-06-11 |
| **Архивирована** | 2026-06-11 |
| **GitHub Issue** | #55 |
| **Linear** | — |
| **Промпт** | [`docs/prompts/ANALYZER_FRAME_FEED_REFACTOR_PROMPT.md`](../../docs/prompts/ANALYZER_FRAME_FEED_REFACTOR_PROMPT.md) |

## Заметки при закрытии

techies68 ff5c8b5; AudioFrameFeed + fft-threshold-test + harmonic-detector-viz sample-library mode

## Отчёт о выполнении

**Что сделано.** Единый слой `AudioFrameFeed` в `apps/client/src/lib/audioAnalysis/` (mic, buffer offline-scan, sample-library hub, graph stub). Мигрированы плагины `fft-threshold-test` и `harmonic-detector-viz`: конфиг `analysisSource`, переключатель в UI, `droneDetectionHub` с суффиксом `-sample` для режима библиотеки. Экспорт `loadSampleBufferById` в `sampleLibraryPlaybackHub`.

**Коммиты.** `ff5c8b5` на ветке `techies68` (после постановки `cd14c3f`).

**Тесты.** `yarn workspace @membrana/client test` — 53/53; lint без ошибок.

**Связь со стратегией.** Подготовка к device-board D1 (`AudioFrame` socket) и к задаче `trends-fft-microphone-plugin` (#56).

**Реестр.** `yarn task:archive analyzer-frame-feed-refactor` — 2026-06-11.

**Известные нюансы / отложено.** Live-follow кадров во время play сэмпла — v1.1; `fft-indices-viz` / `sound-quality-viz` — отдельная волна.

---

*Карточка сгенерирована `yarn task:archive`. Спецификация остаётся в `docs/prompts/`.*
