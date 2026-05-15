import { FFT_THRESHOLD_TELEMETRY_SCHEMA } from '../adapters/fftThresholdReportFromEntry';

import { FftThresholdTelemetryReportCard } from './FftThresholdTelemetryReportCard';
import { registerReportRenderer } from './registry';

let initialized = false;

/** Регистрирует рендеры отчётов по schema (идемпотентно). */
export function initReportRenderers(): void {
  if (initialized) return;
  registerReportRenderer(FFT_THRESHOLD_TELEMETRY_SCHEMA, FftThresholdTelemetryReportCard);
  initialized = true;
}
