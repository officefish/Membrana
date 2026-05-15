# Архив: Плагин микрофона: мониторинг качества звука

| Поле | Значение |
|------|----------|
| **ID** | `sound-quality-viz` |
| **Статус** | archived |
| **Размер** | M |
| **Создана** | 2026-05-15 |
| **Архивирована** | 2026-05-15 |
| **GitHub Issue** | #42 |
| **Linear** | — |
| **Промпт** | [`docs/prompts/SOUND_QUALITY_VIZ_PLUGIN_PROMPT.md`](../../docs/prompts/SOUND_QUALITY_VIZ_PLUGIN_PROMPT.md) |

## Заметки при закрытии

GitHub #42; приёмка 2026-05-15. Плагин sound-quality-viz: SNR/clarity/dynamics/peak/overall, sound-quality.ts в fft-analyzer, sidebar + panel.

## Отчёт о выполнении (для GitHub Issue #42)

**Что сделано.** Плагин `sound-quality-viz` для модуля «Микрофон»: live-оценка пригодности потока (SNR, чёткость, динамика, пик, overall 0–100 %). Pure TS в `@membrana/fft-analyzer-service` (`sound-quality.ts`, unit-тесты). UI: badge, полоса overall с `role="meter"`, четыре подметрики, подсказки на русском (`aria-live`, debounce ~1 с). Настройки в сайдбаре: размер буфера RMS, `loudnessRefMax`. Регистрация: `registerClientModules`, `MicrophoneModule`, `pluginSidebarDetails`. Teardown без утечек; `fft-indices-viz` и `fft-threshold-test` не затронуты.

**Пути.** `packages/services/fft-analyzer/src/math/sound-quality.ts`, `apps/client/src/plugins/sound-quality-viz/`.

**Тесты.** `yarn workspace @membrana/fft-analyzer-service test`, `yarn workspace @membrana/client typecheck` и `test` — зелёные.

**PRs.** Код в рабочей копии; merge PR — по запросу.

**Реестр.** `yarn task:archive sound-quality-viz` — 2026-05-15.

---

*Карточка сгенерирована `yarn task:archive`. Спецификация остаётся в `docs/prompts/`.*
