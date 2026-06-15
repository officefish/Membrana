# @membrana/detector-report

DTO, сборка и экспорт **подробных отчётов** детекторов дрона. Общий контракт для плагина `sample-library-drone-analysis` и журнала телеметрии.

## Что делает

- Канонический DTO `DroneDetectionReport` (schema `drone-detection-report/v1`)
- UUID отчёта, метка времени **МСК** (`Europe/Moscow`)
- Pure-функции `exportDroneDetectionReportJson` / `exportDroneDetectionReportTxt`
- Скачивание в браузере: `downloadDroneDetectionReport(report, 'json' | 'txt')`
- Ключ телеметрии: `droneDetectionTelemetryReportUniqueId(reportId)`

## Установка

Пакет в workspace монорепо:

```json
"@membrana/detector-report": "*"
```

## Использование

```ts
import {
  buildDroneDetectionReport,
  exportDroneDetectionReportJson,
  downloadDroneDetectionReport,
} from '@membrana/detector-report';

const report = buildDroneDetectionReport({
  sample: {
    id: 'uuid',
    title: 'My sample',
    sampleRate: 48_000,
    durationSec: 5,
  },
  verdicts: [/* DroneDetectorVerdictSection[] from DDR2 */],
});

downloadDroneDetectionReport(report, 'json');
```

## API

| Экспорт | Описание |
|---------|----------|
| `buildDroneDetectionReport` | Сборка DTO с meta |
| `formatReportTimestampMoscow` | `15.06.2026, 16:42:03 МСК` |
| `createReportId` | `crypto.randomUUID()` |
| `droneDetectionTelemetryReportUniqueId` | `drone-report-{uuid}` |
| `exportDroneDetectionReportJson` / `Txt` | Сериализация |
| `downloadDroneDetectionReport` | Blob download (browser) |

Этапы эпика: **DDR1** (этот пакет) → DDR2 (данные детекторов) → DDR3 (UI) → DDR4 (telemetry).
