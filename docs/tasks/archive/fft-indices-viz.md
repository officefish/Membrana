# Архив: Плагин микрофона: live-визуализация FFT-индексов

| Поле | Значение |
|------|----------|
| **ID** | `fft-indices-viz` |
| **Статус** | archived |
| **Размер** | M |
| **Создана** | 2026-05-15 |
| **Архивирована** | 2026-05-15 |
| **GitHub Issue** | #41 |
| **Linear** | — |
| **Промпт** | [`docs/prompts/FFT_INDICES_VIZ_PLUGIN_PROMPT.md`](../../docs/prompts/FFT_INDICES_VIZ_PLUGIN_PROMPT.md) |

## Заметки при закрытии

GitHub #41; приёмка 2026-05-15. Плагин fft-indices-viz: live centroid/flux/RMS, adaptive activity, theme error/info/success, sidebar. PR в main — по запросу.

## Отчёт о выполнении (для GitHub Issue #41)

**Что сделано.** Плагин `fft-indices-viz` для модуля «Микрофон»: live-анализ центроида, спектрального потока и громкости. Три режима canvas, адаптивная шкала активности 0…1, история flux, настройки в сайдбаре. Цвета: `error` / `info` / `success`. Общий `fftMetricNormalize` (re-export для порогового теста).

**PRs.** Код в рабочей копии; merge PR — по запросу.

**Linear ticket.** —

**Связь со стратегией.** Расширение клиентской FFT-визуализации в модуле микрофона.

**Реестр.** `yarn task:archive fft-indices-viz` — 2026-05-15.

**Известные нюансы / отложено.** `sound-quality-viz` (#42) — отдельная задача.

---

*Карточка сгенерирована `yarn task:archive`. Спецификация остаётся в `docs/prompts/`.*
