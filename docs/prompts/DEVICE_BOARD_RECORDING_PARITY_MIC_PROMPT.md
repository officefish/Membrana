# Промпт: Device-Board Recording Parity — reuse mic-buffer-recorder capture path

> **Task-промпт** · [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md)
> **Эпик-продолжение:** [`DEVICE_BOARD_RECORDING_GATE_V07_EPIC_PROMPT.md`](./DEVICE_BOARD_RECORDING_GATE_V07_EPIC_PROMPT.md) (#133)
> **Superseded by:** [`DEVICE_BOARD_RECORDING_PARITY_V08_EPIC_PROMPT.md`](./DEVICE_BOARD_RECORDING_PARITY_V08_EPIC_PROMPT.md) (фазы A0–A5; R5 → A1)
> **Реестр:** `id` = **`db-recording-parity-mic-r5`**
> **Размер:** **M** (1 день)
> **Ветка:** `vesnin`

**GitHub Issue:** [#133](https://github.com/officefish/Membrana/issues/133) (комментарий + не закрывать эпик)

---

## Контекст

Recording Gate v0.7 **крутится E2E** (gate → StopRecording → MakeTrack → Publish), но качество PCM **хуже**, чем запись через плагин **`mic-buffer-recorder`**:

- треск на стыках;
- трек «ускорен» (sample rate / duration mismatch);
- latency выше модульной версии.

**Причина:** device-board пишет через **GetSample tick-chunks** (~100 ms) в `ScenarioContinuousPcmBuffer`, а плагин — **непрерывный AudioWorklet capture** (`clipRecorder.ts` / `useMicBufferRecorder`).

**Цель дня:** перенести **метод записи** из плагина в bridge/host device-board **без** второго AudioContext и без нарушения §1b ARCHITECTURE (только `@membrana/audio-engine-service`).

---

## DoD

1. **Continuous capture** при `StartRecording`: один shared path с mic plugin (Worklet или общий сервис в `audio-engine-service` / bridge).
2. **StopRecording → takeSlice** возвращает PCM с `durationSec ≈ policy.windowSec ± 1 tick`.
3. **Ручной smoke:** 60 s mic → preview без щелчков; upload track в journal; A/B с записью через mic-buffer-recorder sidebar (субъективно «не хуже»).
4. **Не ломаем** main-v07 graph (узлы Start/Stop/gate без переделки).
5. Unit/integration test на slice length + sampleRate invariant.
6. Комментарий в #133 + `yarn task:archive db-recording-parity-mic-r5` при LGTM.

---

## Out of scope

- CollectSamples legacy path (оставить, не расширять).
- Новые node kinds.
- background-media / remote upload changes.

---

## Референсы (читать первым)

| Артеfact | Путь |
|----------|------|
| Плагин (эталон качества) | `apps/client/src/plugins/mic-buffer-recorder/clipRecorder.ts`, `useMicBufferRecorder.ts` |
| Текущий bridge (stub) | `apps/client/src/modules/device-board/scenarioMicJournalBridge.ts` — `startRecorderRecording`, `feedActiveRecordingFromCapture` |
| Continuous buffer | `scenario-continuous-pcm-buffer.ts` |
| Канон графа | `docs/device-board-scripts/device-scenario-microphone-main-v07.json` |
| Epic gate | `docs/prompts/DEVICE_BOARD_RECORDING_GATE_V07_EPIC_PROMPT.md` |

---

## План (один день)

| Шаг | Scope | DoD |
|-----|-------|-----|
| **P0** | Аудит: diff plugin vs bridge capture | Таблица «что переносим» в PR description |
| **P1** | Extract shared `ContinuousPcmCapture` (client или audio-engine) | Start/stop API без React |
| **P2** | Wire `StartRecording` → worklet; убрать tick-chunk concat из hot path | `stop-recording-empty` невозможен при active mic |
| **P3** | Smoke + fix sampleRate on MakeTrack/upload | Нет «ускорения» на preview |

---

## Мнение виртуальной команды

```text
[Teamlead — Vesnin]:
Не чинить concat GetSample — это потолок. День = parity с plugin, один PR на vesnin.

[Структурщик — Ozhegov]:
Один AudioContext через audio-engine. Bridge только orchestration; Worklet код — рядом с clipRecorder или в foundation.

[Музыкант]:
DoD = ears: 3 s window без click, спектр не «сжат». Лог: durationSec, sampleRate, chunk count.

[Математик — Dynin]:
Invariant: sum(samples)/sampleRate ≈ elapsedSec gate; merged Float32Array monotonic.
```

---

## Smoke checklist

- [ ] Import initial + main-v07, run 60 s
- [ ] Log: `stop-recording` durationSec 2.8–3.2
- [ ] Journal preview: нет треска на границах 3 s
- [ ] Сравнение с mic-buffer-recorder clip той же длительности
- [ ] `yarn turbo run lint typecheck test --filter=@membrana/device-board --filter=@membrana/client`
