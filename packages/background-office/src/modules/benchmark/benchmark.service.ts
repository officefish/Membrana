import { Injectable, Logger } from '@nestjs/common';

import type { BenchmarkReportDto } from './benchmark-report.dto';

/**
 * In-memory последняя сводка бенчмарка (ADR 0004, тот же принцип, что
 * DriftAnchorService): office stateless, после рестарта контейнера сводки нет
 * до следующего `yarn benchmark:push` — это видимо потребителю (404 + подсказка
 * на панели), не тихая деградация.
 */
@Injectable()
export class BenchmarkService {
  private readonly logger = new Logger(BenchmarkService.name);
  private report: BenchmarkReportDto | null = null;
  private ingestedAt: string | null = null;

  ingest(report: BenchmarkReportDto, now = new Date().toISOString()): void {
    this.report = report;
    this.ingestedAt = now;
    this.logger.log(
      {
        generatedAt: report.generatedAt,
        datasetVersion: report.datasetVersion,
        detectors: report.detectors.length,
      },
      'benchmark report ingested',
    );
  }

  /** Последняя сводка или null (office рестартован / push ещё не было). */
  latest(): { report: BenchmarkReportDto; ingestedAt: string } | null {
    return this.report && this.ingestedAt
      ? { report: this.report, ingestedAt: this.ingestedAt }
      : null;
  }
}
