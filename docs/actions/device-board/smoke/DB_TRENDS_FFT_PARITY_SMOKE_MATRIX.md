# Trends FFT Parity v0.8 — smoke matrix (B3)

> **Эпик:** `db-trends-fft-parity-mic-v08` · фаза **`db-trends-parity-b3-smoke-lgtm`**
> **Промпт:** [`DEVICE_BOARD_TRENDS_FFT_PARITY_V08_EPIC_PROMPT.md`](../prompts/DEVICE_BOARD_TRENDS_FFT_PARITY_V08_EPIC_PROMPT.md)

Проверка **behavioral parity** device-board с плагином **«Анализатор тенденций FFT»** (`trends-fft-analyzer`) после фаз B0–B2.

---

## Автоматическая часть (CI)

```bash
yarn trends-parity:smoke-matrix
yarn usercase:build-mvp-microphone   # после правок v08 JSON
```

Покрывает:

- 30 комбинаций `FftTrendsPolicy` (6× count × 5× intervalMs) — resolve + badge
- v08 import: **MakeFftTrendsPolicy → MakeFftTrendsAnalysis → MakeReportFromAnalysis → PublishReport**
- `createTrendsFftScenarioReportPayload` → schema **`trends-fft/v0.1`**
- `analyzeTrendsFromFftFrames` subsample + classify path

---

## Предусловия (ручной smoke 60 s)

| # | Требование |
|---|------------|
| 1 | Ветка **`vesnin`**, client dev, hard refresh |
| 2 | Import [`device-scenario-microphone-main-v08-policy-constructor.json`](./device-scenario-microphone-main-v08-policy-constructor.json) или bundled MVP |
| 3 | Run **main** ≥ **60 s**, INFO logging ON |
| 4 | Sidebar plugin **«Анализатор тенденций FFT»** — тот же preset (20×500 ms · auto · DRONE_TIGHT) |

---

## A/B checklist (plugin vs graph)

| # | Plugin (sidebar) | Device-board (graph) | Match |
|---|------------------|----------------------|-------|
| 1 | `schema: trends-fft/v0.1` in journal | `publish-done` → `schema: trends-fft/v0.1` | ☐ |
| 2 | `detectedState` / icon / name | Same fields in report payload | ☐ |
| 3 | `confidence` ±5% | Same order of magnitude | ☐ |
| 4 | `measurementsCount` / `intervalMs` | Inspector MakeFftTrendsPolicy | ☐ |
| 5 | Journal renderer (TrendsFftReportView) | No observation/v1 wrapper | ☐ |

**PASS:** ≥1 полный цикл analysis → report → publish с **`trends-fft/v0.1`**; субъективно не хуже plugin на том же mic stream.

---

## Ожидаемые логи (graph)

```text
[device-board][analysis] fft-trends-start { measurementsCount, intervalMs, detectionMode }
[device-board][analysis] fft-trends-done { analysisId, detected, confidence, templateId }
[device-board][report] trends-report-done { schema: 'trends-fft/v0.1', … }
[device-board][journal] publish-done { schema: 'trends-fft/v0.1', … }
```

**Не должно быть:** `device-board-observation/v1`, `trends-fft-report/v1`.

---

## Связанные команды

```bash
yarn trends-parity:smoke-matrix
yarn workspace @membrana/device-board test -- src/graph/trends-fft-parity-smoke-matrix.test.ts
```

Sign-off: [`logs/trends-fft-parity-b3-signoff-2026-06-21.md`](./logs/trends-fft-parity-b3-signoff-2026-06-21.md)
