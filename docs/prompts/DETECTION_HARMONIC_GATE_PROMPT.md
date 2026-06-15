# Промпт: Detection — harmonic v0.1 на бенчмарке

> **Task-промпт** · `detection-harmonic-gate` · размер **L** · **1 PR**  
> Родитель: [#47](https://github.com/officefish/Membrana/issues/47)  
> Реестр: `detection-harmonic-gate` · **unit-тесты на синтетике, не поле**

---

## Контекст

`@membrana/harmonic-detector-service` и плагин `harmonic-detector-viz` реализованы (#45). Задача — **закрыть gate-prep**: контракт `DroneDetector`, тесты, регистрация в `benchmark-detectors.mjs`, README.

---

## Промпт целиком

### Что построить / проверить

1. `createHarmonicDetector()` implements `DroneDetector`; `contract.test.ts` зелёный.
2. Unit/integration tests на synthetic windows (≥70% meaningful coverage math+core).
3. Harmonic в списке детекторов `scripts/benchmark-detectors.mjs`.
4. `packages/services/detectors/harmonic/README.md` — API + порог confidence.

### DoD

- [ ] `yarn workspace @membrana/harmonic-detector-service test` зелёный.
- [ ] `yarn benchmark:detectors` включает harmonic с числами в отчёте.
- [ ] `ARCHITECTURE.md` §1e: harmonic = **implemented v0.1** (не scaffold).
- [ ] `yarn task:archive detection-harmonic-gate`.

### Out of scope

Достижение precision≥85% на полевых данных; cepstral/spectral-flux.

---

## Заметки

Порядок: **4 из 5**. После benchmark runner.
