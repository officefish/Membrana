# DBP4 — Teamlead review: device-board pause runtime v0.7

> **Epic:** `device-board-pause-runtime-v07` · Issue [#142](https://github.com/officefish/Membrana/issues/142)  
> **Дата:** 2026-06-22  
> **Коммиты:** `fdb8197` (DBP-HF, DBP0–1), `814f28d` (DBP2–3)

---

## Smoke checklist (DBP4)

| # | Сценарий | Авто | Ручной browser |
|---|----------|------|----------------|
| 1 | Run → Pause → Resume → Stop, `onStop` только после Stop | `scenario-runtime-pause-smoke.test.ts` | Рекомендуется на `yarn workspace @membrana/client dev` |
| 2 | Marquee ≥2 узлов на `main` с Event в выделении → collapse function/group | `collapse-selection-eligibility.test.ts` | UI modal |
| 3 | Узел `pause-runtime` в exec → freeze до Resume | `block-executor.test.ts` pause-runtime | Palette → вставить в ветку |
| 4 | Alarm manual override после pause/resume | `scenario-runtime.test.ts` (regression) | optional |
| 5 | `yarn workspace @membrana/device-board test` | **442** green | — |
| 6 | `yarn workspace @membrana/core test` | **46** green (incl. `pause-runtime` kind) | — |

---

## Виртуальная команда

```text
[Teamlead — Vesnin]:
Tier T1. DBP-HF…DBP3 закрыты по DoD. Pause ≠ Stop зафиксировано в SCENARIO_RUNTIME и CONCEPT §7.4.
Программный smoke DBP4 зелёный. Регрессия onStop/onDisconnect не затронута.
Вердикт: **LGTM** — архивировать эпик `device-board-pause-runtime-v07`.
Утро: browser spot-check Pause/Resume в device-board editor при первом открытии клиента.

[Структурщик — Ozhegov]:
Границы пакетов соблюдены: `pause-runtime` kind в core (additive); runtime в device-board only.
Нет Web Audio в device-board. collapse-selection-eligibility — pure graph.

[Математик — Dynin]:
tick ms при паузе не инкрементируется во время freeze (waitWhileUnpaused в loop + exec).

[Музыкант]:
Audio-engine не останавливается при pause — по спеку. Mic smoke — human при client dev.

[Верстальщик — Rodchenko]:
Pause/Resume disabled states корректны; runtime status badge «пауза».
```

---

## Итог

**Вердикт: LGTM** · закрыть Issue #142 после `yarn task:archive` + `yarn task:close-github`.

**Follow-up (не блокер):** keyboard shortcut Pause; demount function (отдельный эпик).
