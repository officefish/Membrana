# INSIGHT: Канонический FSM сессии recorder (anti-L18)

| Поле | Значение |
|------|----------|
| **ID** | `insight-kuryokhin-recorder-session-fsm` |
| **Статус** | adopted |
| **Источник** | virtual-team-kuryokhin |
| **Создан** | 2026-06-25 |

---

## Проблема / наблюдение (Курёхин)

L18: clip recorder не re-arm после `StopRecording` при активной session. Логика recorder/clip/mic journal размазана по `scenarioMicJournalBridge` без **явного FSM**. Каждый новый async path (upload, detached drone) добавляет edge-case.

## Гипотеза

**RecorderSessionFSM** в `@membrana/audio-engine-service` (foundation):

States: `Idle | Armed | Recording | Flushing | ReArming | Error`

- Transitions documented + unit-tested in foundation
- device-board bridge **только** вызывает FSM API, не дублирует flags
- chain-log emits `recorder.fsm.<state>`

## Scope

- In: FSM type, tests, bridge refactor slice (L18 class)
- Out: new node kinds

## Связи

- L18/L19 lessons, `audio-engine-service`, `insight-loop-engineering-competition-test`
