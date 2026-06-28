# Recording Parity v0.8 — smoke matrix (A4)

> **Эпик:** `db-recording-parity-mic-v08` · фаза **`db-rec-parity-a4-smoke-matrix`**
> **Issue:** [#133](https://github.com/officefish/Membrana/issues/133)
> **Промпт:** [`DEVICE_BOARD_RECORDING_PARITY_V08_EPIC_PROMPT.md`](../prompts/DEVICE_BOARD_RECORDING_PARITY_V08_EPIC_PROMPT.md)

Проверка **behavioral parity** device-board с плагином **«Запись в буфер»** (`mic-buffer-recorder`) после фаз A0–A3 (continuous `clipRecorder`, format upload, MakeRecordingPolicy UI).

---

## Автоматическая часть (CI)

```bash
yarn recording-parity:smoke-matrix
```

Покрывает:

- 18 комбинаций `RecordingPolicy` (resolve + badge) — `@membrana/device-board`
- MIME normalize / upload notes — `apps/client` `recording-upload-utils.test.ts`
- Gate E2E unit — `@membrana/device-board` runtime tests (236+)

---

## Предусловия (ручной smoke)

| # | Требование |
|---|------------|
| 1 | Ветка **`vesnin`**, `yarn workspace @membrana/client dev` (http://localhost:5173) |
| 2 | Hard refresh (Ctrl+Shift+R) |
| 3 | Модуль **Микрофон** открыт, поток live (coordinator) |
| 4 | Device-board: устройство **online**, Run → **main** (`onMainTick`) |
| 5 | Чекбокс **INFO** на доске включён |
| 6 | Плагин **«Запись в буфер»** доступен в sidebar (для A/B) |

**Сценарии для импорта:**

| JSON | Назначение |
|------|------------|
| [`device-scenario-microphone-main-v07.json`](./device-scenario-microphone-main-v07.json) | Канон topology (legacy `variable-get` RecordingPolicy) — **не менять** |
| [`device-scenario-microphone-main-v08-policy-constructor.json`](./device-scenario-microphone-main-v08-policy-constructor.json) | A3 wiring: **MakeRecordingPolicy → StartRecording** |
| [`usercase-mvp-microphone/`](./usercase-mvp-microphone/) | **Полный MVP** — все 6 обработчиков (см. [`USERCASE_MVP_MICROPHONE.md`](./USERCASE_MVP_MICROPHONE.md)) |

---

## Матрица 6×3 (windowSec × captureFormat)

Для каждой ячейки: задать policy → Run ≥ **60 s** → ≥1 цикл gate (Start → window full → Stop → MakeTrack → Publish).

**Критерии PASS:**

- Journal preview: **нет щелчков** на стыках окна
- `durationSec` в track ≈ `windowSec` (±10% или ±0.3 s, что больше)
- Preview **не ускорен** (осциллограмма / playback ≈ реальное время)
- Лог содержит `encoder: worklet` (WAV) или `mediarecorder` (webm/mp4)
- `captureFormat` в `[recording] stop-recording` и `[media] upload-start` совпадает с policy

**Критерии FAIL:** треск concat, preview ×2 speed, `stop-recording-empty`, upload без `mimeType`.

### Полная матрица (18 прогонов)

| windowSec | WAV | WebM | MP4 |
|-----------|-----|------|-----|
| **3** | ☐ | ☐ | ☐ |
| **5** | ☑ PASS (run 85db5c36) | ☐ | ☐ |
| **7** | ☐ | ☐ | ☐ |
| **10** | ☐ | ☐ | ☐ |
| **15** | ☐ | ☐ | ☐ |
| **30** | ☐ | ☐ | ☐ |

Заполнение policy:

- **v07:** sidebar Variables → `recordingpolicy1` → `{ windowSec, captureFormat }` (или inspector StartRecording fallback, если не wired)
- **v08 constructor:** inspector **MakeRecordingPolicy** → два select → Run

### Spot-check (минимум перед A5 LGTM)

Если нет времени на 18 прогонов — **обязательный subset**:

| windowSec | WAV | WebM | MP4 |
|-----------|-----|------|-----|
| 3 | ☐ | — | — |
| 5 | ☐ | ☐ | ☐ |
| 30 | ☐ | — | ☐ |

Итого **5 ячеек** + одна полная A/B строка (см. ниже).

---

## A/B с mic-buffer-recorder

Один и тот же preset/format для обеих сторон (рекомендация: **5 s · WAV**).

| Шаг | Device-board (graph v07 или v08) | Mic plugin (sidebar) |
|-----|----------------------------------|----------------------|
| 1 | Import JSON, Run main 60 s | Manual mode, **5 s**, **WAV** |
| 2 | Journal → последний track → preview | Buffer → play / waveform |
| 3 | Copy trace (`device-board-trace-*.txt`) | Записать `durationSec`, subjective quality |
| 4 | Сравнить: щелчки, latency до первого sample, тембр стыка | Эталон «не хуже» |

**PASS A/B:** device-board **субъективно не хуже** плагина; objective: `durationSec` diff ≤ 0.5 s при том же preset.

Логи A/B сохранять в [`logs/`](./logs/) (gitignored):  
`recording-parity-ab-5s-wav-device-board.txt` / `…-mic-plugin.txt`

---

## Ожидаемая цепочка логов (v0.8 clip path)

Фильтр консоли: `[device-board][recording]` и `[device-board][track]`.

### StartRecording (WAV)

```text
[device-board][recording] start-recording {
  windowSec, captureFormat: 'wav', encoder: 'worklet', stream, deviceHandle
}
```

### StopRecording → slice

```text
[device-board][recording] stop-recording {
  handle, durationSec, sampleRate, captureFormat, encoder, blobBytes
}
```

**Не должно быть:** PCM append на каждом `[capture] ok` для gate path (GetSample только FFT).

### MakeTrack → upload

```text
[device-board][track] slice-start { durationSec, captureFormat, blobBytes }
[device-board][media] upload-start { captureFormat, mimeType, durationSec, sampleRate }
[device-board][media] upload-ok { … }
```

WAV: `mimeType: audio/wav`, `encoder: worklet`.  
WebM/MP4: `encoder: mediarecorder`, MIME из `recording-upload-utils`.

Подробнее: [`SCENARIO_CHAIN_LOG_COOKBOOK.md`](./SCENARIO_CHAIN_LOG_COOKBOOK.md) § v0.8 recording gate.

---

## Шаблон записи одного прогона

```markdown
### Run: {windowSec}s · {FORMAT} · {date ISO}

- Scenario: v07 | v08-constructor
- Browser: …
- PASS/FAIL: …
- durationSec (log): …
- encoder: worklet | mediarecorder
- Subjective: clicks Y/N, preview speed OK Y/N
- A/B vs mic-plugin: better | same | worse
- Trace: logs/….
```

---

## Связанные команды

```bash
yarn workspace @membrana/core test
yarn workspace @membrana/device-board test
yarn workspace @membrana/client vitest run src/modules/device-board/
yarn recording-parity:smoke-matrix
```

---

## DoD фазы A4

- [x] Документ опубликован (этот файл)
- [x] Spot-check **5s · WAV** PASS — run `85db5c36` ([sign-off](./logs/recording-parity-a4-signoff-2026-06-21.md))
- [ ] Spot-check остальные ячейки (3s WAV, 5s WebM/MP4, 30s WAV/MP4) — по необходимости перед регрессией
- [x] A/B 5s WAV device-board trace — [`logs/recording-parity-ab-5s-wav-device-board.txt`](./logs/recording-parity-ab-5s-wav-device-board.txt)
- [x] `yarn recording-parity:smoke-matrix` green
- [x] v08 constructor JSON + bootstrap StartRecording импортируется без ошибок
- [x] Результаты занесены в комментарий #133 ([comment](https://github.com/officefish/Membrana/issues/133#issuecomment-4761130661))

**Следующая фаза:** A5 — LGTM Vesnin, `yarn task:archive` A0–A5, unblock эпик B (trends FFT).
