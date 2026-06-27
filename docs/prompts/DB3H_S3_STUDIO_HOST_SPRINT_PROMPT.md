# Промпт: DB3H-S3 — Membrana Studio (device-board host)

> **Task-промпт для агента-разработчика.**  
> Процесс: [`TASK_PROMPT_WORKFLOW.md`](./TASK_PROMPT_WORKFLOW.md).  
> Размер: **L**. Реестр: `db3h-s3-studio-host` · parent: `device-board-three-hosts-2026-06-26`.  
> Эпик Studio: `membrana-studio-desktop` ([#93](https://github.com/officefish/Membrana/issues/93)).  
> Консилиум: [`neural-detectors-strategy-2026-06-26.md`](../seanses/neural-detectors-strategy-2026-06-26.md).

---

## Контекст

Спринт 1 (`db3h-s1`) закрыт: alpha async-v2 e2e в браузере (gate → trends → upload → journal). **Следующий шаг** — тот же UserCase в **Membrana Studio** (`apps/membrana-studio` + `apps/client` renderer).

**Особенность Electron:** Studio работает с **локальной ФС** (`electron-system-files`), не только с cabinet/server. `resolveJournalBackend`: paired+cabinet OK → sync; иначе → `%APPDATA%/Membrana/journal/items.json` через `electronAPI.journal`. В этом спринте **обязательно** проверяем журнал **без связи с сервером** (autonomous или paired offline).

MS0–MS4 уже shipped (2026-06-23): shell, media FS, journal FS, NSIS installer. MS5 (prod paired MP7) — частично; MP7 WS timeout — follow-up в фазе ST4.

**Решение Teamlead (2026-06-26):** Studio приоритетнее cabinet (`db3h-s2` отложен). Один JSON сценария → одинаковый runtime в Studio и browser.

**Связанные документы:**

| Документ | Зачем |
|----------|--------|
| [`MEMBRANA_STUDIO_DESKTOP_EPIC_PROMPT.md`](./MEMBRANA_STUDIO_DESKTOP_EPIC_PROMPT.md) | MS0–MS5 канон |
| [`USERCASE_COMPETITION_LESSONS.md`](../actions/device-board/USERCASE_COMPETITION_LESSONS.md) | L18–L23 pack/runtime |
| [`STUDIO_HOST_LESSONS.md`](../actions/device-board/STUDIO_HOST_LESSONS.md) | ST1–ST8 host/Electron |
| [`STUDIO_HOST_BRIDGE_CONTRACT.md`](../STUDIO_HOST_BRIDGE_CONTRACT.md) | MS6 контракт трёх хостов |
| [`CLIENT_LOGS_PARSING.md`](../actions/device-board/CLIENT_LOGS_PARSING.md) | `yarn logs:parse` smoke |
| [`MEDIA_LIBRARY_ARCHITECTURE.md`](../MEDIA_LIBRARY_ARCHITECTURE.md) | On-disk layout, `electron-fs` backends |
| [`apps/membrana-studio/README.md`](../../apps/membrana-studio/README.md) | Journal FS paths, paired vs local |

---

## Два контура smoke (раздельно)

| Контур | Режим | Journal backend | DoD |
|--------|-------|-----------------|-----|
| **Online (ST2-O)** | `paired` + cabinet reachable | sync + WS (ST4) | trends + tracks как browser |
| **Offline (ST2-J)** | `autonomous` или paired без сети | `electron-fs` → `journal/items.json` | tracks + reports на диске; UI без server |

Offline — **обязательный** контур спринта. `upload-ok: 0` при offline — норма (нет background-media).

**Триггер ST-FS:** пробелы в политике путей/квот/sync → подфаза или отдельный спринт `studio-fs-policy` (не блокирует ST2-J).

---

## Промпт целиком (для вставки агенту)

### Кто ты

Координатор виртуальной команды Membrana (**Vesnin** / Teamlead). Ozhegov — shell/host-bridge; Rodchenko — Studio UX smoke; Kuryokhin — mic permission + recording parity.

### Что сделать

1. **ST0 — dev baseline:** `yarn studio:dev` поднимает Electron + client Vite; device-board модуль открывается; `StorageRuntimeIndicator` → **Electron FS**.
2. **ST1 — UserCase load:** embedded `usercase-mvp-microphone-alpha-async-v2` (post #181) загружается в Studio без расхождений с browser.
3. **ST2-O — online smoke (optional):** paired + server; Run ≥3 мин; `yarn logs:parse` — gate-true ≥2, upload-ok ≥2, publish-done ≥2.
4. **ST2-J — offline journal (обязательно):** режим **autonomous** (или отключить сеть / cabinet unreachable). Run alpha async-v2 ≥3 мин. Проверить:
   - `%APPDATA%/Membrana/journal/items.json` — entries tracks/reports после gate;
   - UI журнала показывает записи без cabinet;
   - `logs:parse`: publish-done локально; upload-ok может быть 0 (нет server) — **ожидаемо**;
   - media blobs в `%APPDATA%/Membrana/media-library/` при upload в electron-fs backend.
5. **ST3 — packaged smoke:** `yarn studio:package` → установленный `.exe`; повторить **ST2-J** (offline приоритет).
6. **ST4 — paired MP7 (MS5 follow-up):** prod env + journal WS; не блокер ST2-J.
7. **ST-FS — политика ФС (опционально, по триггеру):** если ST2-J выявил пробелы — документировать в `MEDIA_LIBRARY_ARCHITECTURE.md` §Studio offline: пути, квоты, paired fallback, journal vs media-library; unit/smoke тесты shell. Можно вынести в отдельный спринт `studio-fs-policy` при scope > 0.5д.
8. **ST5 — Host Bridge Contract:** канон [`STUDIO_HOST_BRIDGE_CONTRACT.md`](../STUDIO_HOST_BRIDGE_CONTRACT.md); unit tests host parity (`getDeviceHandle`, journal backend, dev URL).
9. **ST6 — реестр STx:** вести [`STUDIO_HOST_LESSONS.md`](../actions/device-board/STUDIO_HOST_LESSONS.md); новый симптом smoke → ST+1; консилиум [`studio-host-smoke-registry-2026-06-26.md`](../seanses/studio-host-smoke-registry-2026-06-26.md).
10. **ST-GATE — recording gate parity:** Studio autonomous = browser по `gate-true` / `elapsedSec`; закрыть ST6 open (run `f9939e7b`).

### Запрещено

- Форк `apps/client` бизнес-логики в `membrana-studio/main`.
- Прямой Web Audio из device-board/plugins (только `audio-engine-service`).
- `yarn rag:index --full` без ключа.
- Cabinet host (`db3h-s2`) в scope этого спринта.

### Definition of Done

- [ ] `yarn studio:dev` + device-board Run smoke PASS.
- [ ] **ST2-J offline:** journal на диске + UI без server (tracks + trends reports).
- [ ] ST2-O online (если есть paired env): parity с browser smoke.
- [ ] `yarn studio:package` green; installed app **offline** smoke documented.
- [ ] OPEN sprint обновлён; LGTM Teamlead.
- [ ] ST-FS: либо «не требуется», либо задача/спринт заведены с notes.

---

## Фазы спринта

| Phase | Deliverable | Lead |
|-------|-------------|------|
| ST0 | `yarn studio:dev` baseline + module load | Ozhegov |
| ST1 | alpha async-v2 embedded graph в Studio | Ozhegov |
| ST2-O | Online smoke (`paired`, `logs:parse`) | Vesnin |
| **ST2-J** | **Offline journal FS** — autonomous, `journal/items.json` | Ozhegov |
| ST3 | NSIS package + installed **offline** smoke | Rodchenko |
| ST4 | MP7 paired runbook / timeout triage | Vesnin |
| ST-FS | Политика ФС (опционально, по триггеру ST2-J) | Vesnin + Dynin |
| **ST5** | Host Bridge Contract + unit tests | Ozhegov |
| **ST6** | `STUDIO_HOST_LESSONS` registry + parse ritual | Vesnin |
| **ST-GATE** | Gate parity Studio = browser (`elapsedSec`) | Kuryokhin |

**OPEN:** [`docs/day-sprint/db3h-s3-studio-host-2026-06-26/OPEN.md`](../day-sprint/db3h-s3-studio-host-2026-06-26/OPEN.md)
