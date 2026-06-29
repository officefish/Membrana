# OPEN: DB3H-S4 — микрофон async + audit детекторов

| Поле | Значение |
|------|----------|
| **Sprint** | `db3h-s4-microphone-detectors-2026-06-26` |
| **Registry** | `db3h-s4-microphone-detectors` |
| **Parent** | `device-board-three-hosts-2026-06-26` |
| **Status** | **active** — старт после закрытия DB3H-S3 |
| **Started** | 2026-06-26 |

**Prompt:** [`LIVE_PARALLEL_DETECTION_SPRINT_EPIC_PROMPT.md`](../../prompts/LIVE_PARALLEL_DETECTION_SPRINT_EPIC_PROMPT.md)  
**Предшественник:** [`db3h-s3-studio-host-2026-06-26/CLOSURE.md`](../db3h-s3-studio-host-2026-06-26/CLOSURE.md)

---

## Цель

Стабильный **live-параллельный** контур микрофона и детекторов: stream-auto без отставания журнала; audit legacy DSP vs template-match; точка подключения neural (без реализации tier 1.B).

Studio + browser smoke остаются на `yarn logs:parse` / UserCase async-v2 — не регрессировать.

---

## Первые фазы (из LP эпика)

| Phase | Deliverable | Status |
|-------|-------------|--------|
| S4-0 | CI baseline + inventory детекторов / mic plugins | ⏳ |
| LP1 | `mic-live-drone-analysis` stream modes (brief в журнал) | частично shipped |
| LP2–LP4 | FFT plugins → live journal; stream cycle 3s+2s | ⏳ |
| S4-audit | harmonic/cepstral/spectral-flux — keep vs deprecate | ⏳ |

---

## Команды старта

```bash
yarn turbo run lint typecheck test build --continue
# smoke не регрессировать:
yarn logs:parse:studio
yarn workspace @membrana/device-board test
```

**Out of scope:** `neural-tier-1b-contract`, `db3h-s2-cabinet-host`, `yarn rag:index --full`.
