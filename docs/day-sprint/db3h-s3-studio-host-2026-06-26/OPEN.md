# OPEN: DB3H-S3 — Membrana Studio (device-board host)

| Поле | Значение |
|------|----------|
| **Sprint** | `db3h-s3-studio-host-2026-06-26` |
| **Registry** | `db3h-s3-studio-host` |
| **Parent** | `device-board-three-hosts-2026-06-26` |
| **Studio epic** | `membrana-studio-desktop` · [#93](https://github.com/officefish/Membrana/issues/93) |
| **Status** | **ST2-J PASS** — run `ec18db91` (2026-06-26) |
| **Started** | 2026-06-26 |

**Prompt:** [`DB3H_S3_STUDIO_HOST_SPRINT_PROMPT.md`](../../prompts/DB3H_S3_STUDIO_HOST_SPRINT_PROMPT.md)  
**Канон дня:** [`MAIN_DAY_ISSUE.md`](../../MAIN_DAY_ISSUE.md)  
**Предшественник:** [`db3h-s1-tech-debt-2026-06-26/CLOSURE.md`](../db3h-s1-tech-debt-2026-06-26/CLOSURE.md)

**Пересмотр приоритетов (Vesnin):** cabinet (`db3h-s2`) отложен; Studio — следующий хост после green browser smoke (#181).

**Особенность Electron:** журнал и media-library на **локальной ФС**; обязательный smoke **без сервера** (ST2-J).

---

## Phases

| Phase | Deliverable | Status |
|-------|-------------|--------|
| ST0 | `yarn studio:dev` + device-board module | ✅ test 7/7, `studio:build` OK |
| ST1 | alpha async-v2 UserCase в Studio | ✅ operator run `ec18db91` |
| ST2-O | Online smoke (`paired`, optional) | ⏳ |
| **ST2-J** | **Offline journal** — autonomous, `journal/items.json` | ✅ run `ec18db91` · `logs:parse` + `studio:journal-fs-check` |
| ST3 | `yarn studio:package` + installed **offline** smoke | ⏳ **следующий** |
| ST4 | MP7 paired runbook (MS5 follow-up) | ⏳ deferred |
| **ST5** | Host Bridge Contract + unit tests | ✅ contract + tests in PR |
| **ST6** | Реестр [`STUDIO_HOST_LESSONS.md`](../../device-board-scripts/STUDIO_HOST_LESSONS.md) + ritual | ✅ ST1–ST9 |
| **ST-GATE** | Recording gate parity (ST6 open, `elapsedSec` logs) | ✅ gate≥2 run `ec18db91` |
| ST-FS | Политика ФС (опционально, по триггеру) | — |

**Консилиум:** [`studio-host-smoke-registry-2026-06-26.md`](../../seanses/studio-host-smoke-registry-2026-06-26.md)

---

## Offline journal checklist (ST2-J)

1. **Очистить** `%APPDATA%/Membrana/journal/items.json` перед smoke (ST7 — stale tracks).
2. Node connection: **autonomous** (или paired + cabinet offline).
3. Run alpha async-v2 ≥3 мин.
4. Файл `%APPDATA%/Membrana/journal/items.json` — track + report entries.
5. UI журнала — записи видны без cabinet.
6. `yarn logs:parse`: `gate-true` ≥2, `publish-done` ≥2; `upload-ok` может быть 0.
7. При upload в FS: `%APPDATA%/Membrana/media-library/blobs/`.
8. На tick ≥40 в логах: `is-recording-window-full` с `elapsedSec ≥ 5` (ST-GATE).

Код: `apps/client/src/lib/resolveJournalBackend.ts` → fallback `electronAPI.journal`.

---

## Baseline (MS0–MS4 shipped)

| Check | Expected |
|-------|----------|
| `yarn workspace @membrana/membrana-studio test` | 7/7 |
| `yarn studio:build` | OK |
| `yarn studio:package` | NSIS 0.1.0.exe |
| Browser alpha async-v2 | smoke `c778c4ee` PASS |

---

## Первые команды

```bash
yarn studio:dev
# autonomous → Run ≥3 min → logs → yarn logs:parse
yarn studio:journal-fs-check --min-tracks 2 --min-reports 2
yarn workspace @membrana/membrana-studio test
```

**Out of scope:** `db3h-s2-cabinet-host`, neural contract, `rag:index --full`.
