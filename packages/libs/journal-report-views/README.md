# @membrana/journal-report-views

Общие React-рендеры отчётов журнала телеметрии, переиспользуемые клиентом
(`apps/client`) и кабинетом (`apps/cabinet`).

## Что делает

Чисто презентационные компоненты и адаптеры для двух журнальных схем:

- `fft-threshold-test/v0.2` — `FftThresholdReportView` (полоса ✓/✗ по кадрам +
  нормализованная матрица метрик), адаптер `fftThresholdReportFromItem`.
- `trends-fft/v0.1` — `TrendsFftReportView` (блок победителя, топ-3 рейтинг,
  разбор совпадения по клику), адаптер `trendsFftReportFromItem`.

Компоненты не знают об источнике данных: `LiveJournalItem` парсится адаптерами,
а каталог шаблонов тенденций передаётся через проп `getTemplate` (по умолчанию —
системный каталог `@membrana/trends-detector-service`).

## Установка

Внутренний workspace-пакет:

```jsonc
// package.json
"@membrana/journal-report-views": "*"
```

## Использование

```tsx
import {
  fftThresholdReportFromItem,
  FftThresholdReportView,
  trendsFftReportFromItem,
  TrendsFftReportView,
} from '@membrana/journal-report-views';

const fft = fftThresholdReportFromItem(item);
if (fft) return <FftThresholdReportView report={fft} />;

const trends = trendsFftReportFromItem(item);
if (trends) return <TrendsFftReportView report={trends} getTemplate={getTemplate} />;
```

## API

- `FftThresholdReportView`, `FrameTickStrip`, `ReportMatrix`
- `TrendsFftReportView`, `TrendsScoreRanking`, `TrendsMatchDetailTable`, `buildBreakdownForResult`
- `fftThresholdReportFromItem`, `FFT_THRESHOLD_JOURNAL_SCHEMA`
- `trendsFftReportFromItem`, `TRENDS_FFT_JOURNAL_SCHEMA`
- Типы: `FftThresholdTestReport`, `FftThresholdFrameReportRow`, `TrendsFftReport`
