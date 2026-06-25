# Competition Sprint Brief: MVP UserCase async v2 — упаковка AP v1

| Поле | Значение |
|------|----------|
| **sprintId** | `comp-mvp-async-v2-2026-06-25` |
| **Предшественник** | `comp-mvp-packaging-2026-06-21` (архив) |
| **baseBranch** | `main` (bundled `usercase-mvp-microphone` **v2.0-async**) |
| **teams** | alpha, beta, gamma |
| **LGTM Product** | 2026-06-25 — open sprint |
| **LGTM Vesnin** | 2026-06-25 — Phase 0 open |

**Синтез v1:** [`COMPETITION_V1_DESIGN_SYNTHESIS.md`](../comp-mvp-packaging-2026-06-21/COMPETITION_V1_DESIGN_SYNTHESIS.md)

---

## Problem

Bundled MVP **v2.0-async** (Issue #176) доказан технически: latent Sequence, `StartAsyncJob`, detached drone report, sync trends на gate. Canvas по-прежнему **инженерный** — оператор не видит async orchestration как продуктовую историю.

Три команды **независимо** переупаковывают **тот же v2.0-async runtime** в читаемый UserCase, используя editor toolbox + **новые Promise nodes**.

**Соревнование в packaging**, не в runtime-логике.

---

## Функциональный паритет (F1–F7)

| # | Поведение | Критерий |
|---|-----------|----------|
| F1 | Bootstrap | onConnect + initial |
| F2 | Recording gate | latent Sequence Then-0/1, MakeTrack |
| F3 | Async upload | `StartAsyncJob(track-upload)` — не блокирует main tick |
| F4 | Trends sync | Then-2 publish на gate (ADR AD3) |
| F5 | Drone report | detached `on-async-resolved` — **не** sync на hot path |
| F6 | Teardown | onStop / onDisconnect |
| F7 | Run | ≥60s, `yarn logs:parse` → `smoke v2.0-async: PASS`, `drone-skip: 0` |

**Запрещено:** менять node kinds, ломать AP v1 topology intent, обходить audio-engine.

---

## Editor toolbox (must use ≥4)

| Инструмент | Минимум |
|------------|---------|
| Comment groups | ≥4 semantic frames на `main` |
| User functions | ≥2 collapsed functions |
| **Sequence latentThen** | видим на main gate path |
| **Promise nodes** | ≥1 `start-async-job` + detached `on-async-resolved` |
| Exec layout LR | `verify-layout` green |
| Async groups | `fn-UploadPipeline` / `fn-TrendsPublish` или эквивалент по замыслу |

---

## Состав команд (наследие v1)

| Team | Codename | Фокус v2 (надстройка) |
|------|----------|------------------------|
| A | alpha | Operator journey **+ async narrative** (upload/detached drone как акт IIb) |
| B | beta | Модульные functions: upload pipeline / trends / gate — **измеримые** |
| C | gamma | Poster: ①–⑥ с шагом «async upload» и «detached report» |

Жюри: все 5 ролей; Музыкант оценивает non-blocking gate + trends parity.

---

## Definition of Done (Phase 2β)

- [ ] `usercase-mvp-microphone-<team>-async-v2` (или согласованный id в brief amendment)
- [ ] `meta.bundledGraphVersion` или `meta.competitionBase: v2.0-async`
- [ ] `yarn usercase:build` + `verify-layout` + `verify-competition` green
- [ ] Demo script PASS + smoke v2.0-async
- [ ] `CONCEPT.md` §Implementation + наследование замысла v1 (ссылка на synthesis)

---

## Demo script

1. Apply team UserCase → Run ≥60s.
2. Chain-log: `sequence-latent-then-start`, `async-job-start`, trends `publish-done` на gate, detached `async-job resolved` → drone publish.
3. `yarn logs:parse` → `smoke v2.0-async: PASS`.
4. Canvas explain ≤30s новому оператору **включая async**.

---

## Evaluation hints

Наследовать scorecard v1 (C1–C6) + **C7 Async clarity** — насколько упаковка объясняет non-blocking upload и detached drone.

---

## Deliverable paths

```
docs/device-board-scripts/usercase-mvp-microphone-<team>-async-v2/
docs/competition-sprint/comp-mvp-async-v2-2026-06-25/team-<team>/CONCEPT.md
```

Ветки: `comp/comp-mvp-async-v2-2026-06-25/{alpha,beta,gamma}`
