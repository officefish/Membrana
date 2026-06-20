# Teamlead review: DB Realtime Observation Pipeline (P0–P3)

> **Reviewer:** Vesnin (Teamlead)  
> **Branch:** `vesnin`  
> **Epic:** `db-realtime-observation-pipeline`  
> **PR:** #132 (extends scenario chain trace)

---

## LGTM summary

**Approve merge** после green CI на `origin/vesnin`.

| Слой | Изменения | OK |
|------|-----------|-----|
| `@membrana/client` | async MakeTrack, continuous PCM, frame trends, observation schema publish | ✅ |
| `@membrana/journal-report-views` | `device-board-observation/v1` parser | ✅ |
| `apps/cabinet` | `trendsFromObservationItem` parity | ✅ |
| `@membrana/device-board` | без изменений контрактов (host ports прежние) | ✅ |

**Не нарушено:** границы пакетов, Web Audio через engine, media-library без device-board dep.

---

## Phase checklist

| Phase | DoD | Status |
|-------|-----|--------|
| P0 | windowSec=3, crossfade, async upload, no drone publish, alarm journal skip | ✅ |
| P1 | `ScenarioContinuousPcmBuffer` slice в MakeTrack | ✅ |
| P2 | `device-board-observation/v1` + linked trackId + renderers | ✅ |
| P3 | `analyzeTrendsFromFftFrames`, stateful flux | ✅ |

---

## Risks / follow-ups

1. **Async track** — journal report может появиться до `appendTrack`; playback по клику — после upload (ожидаемо).
2. **Cabinet server** — observation schema должна приниматься API (как trends payload); при 500 — проверить whitelist на сервере.
3. **Client localhost** — после deploy cabinet SPA обновится; **apps/client** — hard refresh / dev rebuild локально.
4. **Server-side async encode** — out of scope; follow-up epic.

---

## Deploy

```bash
MEMBRANA_DEPLOY_BRANCH=vesnin yarn device-board:deploy:prod
```

Smoke:

1. `https://media.membrana.space/health` + `https://cabinet.membrana.space/health`
2. Client hard refresh → Run scenario `main (3).json`
3. Каждые ~3 s: `observation-wrap-done`, один `publish-done`, `uploadMode: async`
4. Journal: «Анализатор тенденций FFT», без «нет совместимого рендера»

---

**Verdict:** LGTM — push to PR #132, merge when CI green, deploy prod.
