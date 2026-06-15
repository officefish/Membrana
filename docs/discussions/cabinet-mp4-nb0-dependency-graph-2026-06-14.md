# Cabinet MP4 — аудит графа зависимостей (NB0)

> Night Build `cabinet-mp4-hardening-night-build`, фаза NB0.
> Дата: 2026-06-14. Lead: Ozhegov / Vesnin.

## Итог

**Нарушений границ пакетов не обнаружено.** SPA и NestJS-слои разделены корректно.

## Проверенные рёбра

| From | To | Механизм | Verdict |
|------|-----|----------|---------|
| `apps/cabinet` | `@membrana/media-library-service` | npm workspace + HTTP backend | ✅ |
| `apps/cabinet` | `@membrana/audio-engine-service` | npm workspace (`BufferPlayer`) | ✅ |
| `apps/cabinet` | `@membrana/core` | npm workspace (types/utils) | ✅ |
| `apps/cabinet` | `packages/background-media` | — | ✅ **отсутствует** |
| `apps/cabinet` | `packages/background-cabinet` | HTTP `/api` proxy only | ✅ |
| `apps/client` | `@membrana/media-library-service` | npm + paired HTTP | ✅ |
| `background-cabinet` | `background-media` | `MediaBridgeService` HTTP | ✅ |
| `background-cabinet` | `@membrana/tariff-dataset` | — | ✅ **отсутствует** (tariff в Prisma) |
| `background-cabinet` | `@membrana/agenda` / `apps/client` | — | ✅ **отсутствует** |

## Долг (не блокер NB0, цель NB1–NB2)

| Проблема | Риск | Фаза |
|----------|------|------|
| Дубликат `sampleLibraryPlaybackHub.ts` client ↔ cabinet | drift, двойные фиксы | NB1 |
| `SampleLibraryPage.tsx` ~650 строк | спагетти UI | NB2 |
| `cabinetMediaLibrary.ts` singleton без reset | stale session после logout | NB2 |

## Запрещённые импорты (контроль NB1+)

При миграции на `@membrana/sample-playback-service`:

- apps **не** импортируют `packages/background-*` напрямую;
- новый сервис зависит только от `@membrana/core` + `@membrana/audio-engine-service`.

## Команды верификации

```bash
# cabinet — только разрешённые @membrana/*
rg "from '@membrana/" apps/cabinet/src --no-filename | sort -u

# background-cabinet — без tariff-dataset npm
rg "tariff-dataset" packages/background-cabinet --glob "*.ts"
```

LGTM Ozhegov: граф чист для merge gate NB0.
