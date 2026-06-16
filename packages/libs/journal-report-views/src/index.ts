/**
 * @membrana/journal-report-views
 *
 * Общие React-рендеры отчётов журнала телеметрии, переиспользуемые клиентом
 * (`apps/client`) и кабинетом (`apps/cabinet`): FFT пороговый тест и тенденции FFT.
 * Компоненты чисто презентационные; источник шаблонов передаётся через `getTemplate`.
 */

// FFT threshold test
export { FftThresholdReportView } from './fft/FftThresholdReportView';
export type { FftThresholdReportViewProps } from './fft/FftThresholdReportView';
export { FrameTickStrip } from './fft/FrameTickStrip';
export { ReportMatrix } from './fft/ReportMatrix';
export { fftThresholdReportFromItem, FFT_THRESHOLD_JOURNAL_SCHEMA } from './fft/fromItem';
export { STRICTNESS_LABELS } from './fft/types';
export type { FftThresholdTestReport, FftThresholdFrameReportRow } from './fft/types';

// FFT trends analyzer
export { TrendsFftReportView } from './trends/TrendsFftReportView';
export type { TrendsFftReportViewProps } from './trends/TrendsFftReportView';
export { TrendsScoreRanking } from './trends/TrendsScoreRanking';
export type { TrendsScoreRankingProps } from './trends/TrendsScoreRanking';
export {
  TrendsMatchDetailTable,
  buildBreakdownForResult,
} from './trends/TrendsMatchDetailTable';
export type {
  TrendsMatchDetailTableProps,
  TrendsMatchDetailSection,
} from './trends/TrendsMatchDetailTable';
export { trendsFftReportFromItem, TRENDS_FFT_JOURNAL_SCHEMA } from './trends/fromItem';
export type { TrendsFftReport } from './trends/types';
