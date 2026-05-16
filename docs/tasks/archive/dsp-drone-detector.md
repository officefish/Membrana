# Архив: DSP-детектор дрона: сервис, демо-приложение, плагин микрофона

| Поле | Значение |
|------|----------|
| **ID** | `dsp-drone-detector` |
| **Статус** | archived |
| **Размер** | L |
| **Создана** | 2026-05-15 |
| **Архивирована** | 2026-05-16 |
| **GitHub Issue** | #45 |
| **Linear** | — |
| **Промпт** | [`docs/prompts/DSP_DRONE_DETECTOR_PROMPT.md`](../../docs/prompts/DSP_DRONE_DETECTOR_PROMPT.md) |

## Заметки при закрытии

Фазы 1–3 GitHub #45: `@membrana/harmonic-detector-service`, demo, плагин `harmonic-detector-viz` (normal + fullscreen), `microphoneCaptureCoordinator`, общий `DroneDetectionIndicator` для шапки и панели. `yarn workspace @membrana/client test` — 42 passed (2026-05-16).

## Отчёт о выполнении (для GitHub Issue #45)

**Что сделано.**

| Фаза | Артефакт |
|------|----------|
| 1 | `packages/services/detectors/harmonic/` — math, core, hooks, unit/integration tests |
| 2 | `harmonic/demo/` — Harmonic Drone Lab (`yarn workspace @membrana/harmonic-detector-service dev:demo`) |
| 3 | `apps/client/src/plugins/harmonic-detector-viz/` — install/teardown, `DetectionSmoother`, `publishDroneDetected` → `droneDetectionHub` |
| 3 | `microphoneCaptureCoordinator` — единый захват с модулем «Микрофон» |
| 3 | `apps/client/src/components/drone-detection/DroneDetectionIndicator.tsx` — шапка + панель плагина |
| UX | Слайдер «Порог чувствительности» (нейтральный `range-xs`), метка «Уверенность» на полосе |

**Проверки.** `yarn workspace @membrana/client typecheck` + `test` (42) — зелёные. Ручная приёмка: модуль «Микрофон» → плагин «Гармонический детектор БПЛА» → поток → fullscreen/Esc → датчик в шапке при срабатывании.

**Вне scope / follow-up (#47).** `yarn benchmark:detectors`, наполнение `docs/DATASET.md`.

**Реестр.** `yarn task:archive dsp-drone-detector` — 2026-05-16. Issue #45 — в очереди `yarn task:close-github`.

---

*Карточка сгенерирована `yarn task:archive`. Спецификация остаётся в `docs/prompts/`.*
