# Membrane Platform MP5 — Cloud telemetry journal

> **Эпик:** [#67](https://github.com/officefish/Membrana/issues/67) · **Реестр:** `membrane-platform-mp5-telemetry-journal`

## Активная задача

MP5: облачный журнал телеметрии — API + sync client + UI cabinet.

| Блок | Статус |
|------|--------|
| Prisma `TelemetryReport` + `TelemetryLiveRecord` | ✅ schema + migration |
| Cabinet API `POST/GET /v1/telemetry/reports` | ✅ |
| Cabinet API `POST/PATCH/GET /v1/telemetry/live-records` | ✅ |
| Client sync upload (paired mode) | ✅ |
| Cabinet journal UI (shared payload cards) | ✅ |
| Prod deploy + smoke MP5 | ⏳ `yarn cabinet:mp5:prod` |

## Закрыто ранее

MP4 archived 2026-06-12 @ `50584bf` (pair/status, unlink, quota regression).
