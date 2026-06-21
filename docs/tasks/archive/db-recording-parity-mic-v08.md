# Архив: DB Recording Parity v0.8: mic-buffer-recorder quality, enum RecordingPolicy (эпик A0–A5)

| Поле | Значение |
|------|----------|
| **ID** | `db-recording-parity-mic-v08` |
| **Статус** | archived |
| **Размер** | L |
| **Создана** | 2026-06-21 |
| **Архивирована** | 2026-06-21 |
| **GitHub Issue** | #133 |
| **Linear** | — |
| **Промпт** | [`docs/prompts/DEVICE_BOARD_RECORDING_PARITY_V08_EPIC_PROMPT.md`](../../docs/prompts/DEVICE_BOARD_RECORDING_PARITY_V08_EPIC_PROMPT.md) |

## Заметки при закрытии

Epic A0-A5 complete

## Отчёт о выполнении

Эпик **A** закрыт 2026-06-21.

| Фаза | Результат |
|------|-----------|
| A0 | Enum RecordingPolicy + constructor node kinds в `@membrana/core` / device-board |
| A1 | `clipRecorder` continuous path; GetSample → FFT only |
| A2 | Format-aware upload; journal preview |
| A3 | MakeRecordingPolicy inspector + palette «Конструкторы» |
| A4 | Smoke 5s WAV sign-off run `85db5c36`; CI matrix green |
| A5 | Archive + LGTM |

**Ключевой fix топологии:** bootstrap `StartRecording` перед `IsRecordingWindowFull` (v08 usercase MVP).

**Unblocks:** `db-trends-fft-parity-mic-v08`.

---

*Карточка сгенерирована `yarn task:archive`. Спецификация остаётся в `docs/prompts/`.*
