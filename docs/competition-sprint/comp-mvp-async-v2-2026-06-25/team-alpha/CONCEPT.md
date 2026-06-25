# Concept — Team Alpha (Vesnin + Музыкант)

> **Phase 1 complete** · **Phase 2α in progress** · sprint `comp-mvp-async-v2-2026-06-25` · наследие v1: [Live Observation Pipeline](../../comp-mvp-packaging-2026-06-21/team-alpha/CONCEPT.md) · синтез: [COMPETITION_V1_DESIGN_SYNTHESIS.md](../../comp-mvp-packaging-2026-06-21/COMPETITION_V1_DESIGN_SYNTHESIS.md)

## One-liner

**«Live Observation Pipeline + async narrative»** — те же три акта, но **Act IIb** объясняет non-blocking upload и detached drone report как часть operator journey, не как инженерный Promise subgraph.

## Product thesis

Оператор v2.0-async должен **слышать** async: upload уходит «в фоне», trends публикуются на gate без ожидания, drone report приходит отдельным событием. Alpha упаковывает latent Sequence + Promise nodes в **нарратив времени**, не в topology dump.

## Architecture

| Слой | Решение |
|------|---------|
| **id** | `usercase-mvp-microphone-alpha-async-v2` |
| **Base** | bundled MVP **v2.0-async** — тот же runtime |
| **Пакеты** | `docs/device-board-scripts/` + build only |

```text
[Act I Bootstrap]     initial + onConnect
[Act II Live]         main gate + trends (sync on gate)
[Act IIb Async]       upload pipeline (collapsed) + detached drone frame
[Act III Teardown]    onStop + onDisconnect
```

### User functions (≥2)

| id | name | Содержимое |
|----|------|------------|
| `fn-alpha-async-v2-bootstrap` | Bootstrap | onConnect + initial |
| `fn-alpha-async-v2-observation` | Observation + async | gate latent Sequence + StartAsyncJob strip |
| `fn-alpha-async-v2-detached-report` *(optional)* | Detached drone | on-async-resolved collapsed |

### Async packaging (must show)

- latent **Sequence Then-0/1/2** visible on main path
- ≥1 `start-async-job` + detached `on-async-resolved` в comment frame «Act IIb»

## Key decisions (ADR-lite)

| ID | Решение | Альтернатива | Почему |
|----|---------|--------------|--------|
| AV-A1 | Act IIb = отдельная semantic group (warning) | Async внутри Act II | Operator видит «фоновую отправку» |
| AV-A2 | RU copy с «не блокирует tick» | English tech | Operator locale |
| AV-A3 | Detached drone — success frame, не на hot path | Sync publish | ADR AD3 + F5 |

## Trade-offs

| Плюс | Минус |
|------|-------|
| Async story = продолжение v1 journey | +1 act = больше groups на canvas |
| Музыкант: gate non-blocking явен | Pin discipline при collapse async |

## Phase 2 plan

### 2α — vertical slice

- main: latent gate + один collapsed upload function + comment Act IIb
- smoke v2.0-async partial (upload start in chain-log)

### 2β — full DoD

- F1–F7 parity, verify-layout, demo script ≤30s с async

## Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Скрыть detached handler в collapse | Отдельный comment frame «Отчёт пришёл» |
| Сломать Then-2 trends | Не трогать topology intent — только упаковка |

## Demo narrative (2–3 мин)

1. Apply alpha UserCase → Run.
2. Act I: подключение.
3. Act II: gate + trends на экране.
4. Act IIb: «upload ушёл в фоне» → chain-log `async-job-start`.
5. Detached: drone publish без блокировки tick.
6. `yarn logs:parse` → `smoke v2.0-async: PASS`.

---

## Implementation

### 2α — vertical slice

- [x] `yarn usercase:build-competition-async-v2 alpha`
- [x] main: latent Sequence + Act IIb groups + gate/trends functions
- [x] verify-layout green

### 2β — full DoD

- [x] `packMvpUserCaseForTeamAsyncV2` — detached report function, StartAsyncJob visible
- [x] `yarn usercase:verify-competition-async-v2` green
- [ ] F7 operator smoke (browser Run ≥60s)

*Team Alpha · comp-mvp-async-v2-2026-06-25*
