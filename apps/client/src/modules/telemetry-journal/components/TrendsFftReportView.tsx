import React from 'react';
import {
  TrendsFftReportView as SharedTrendsFftReportView,
  type TrendsFftReport,
} from '@membrana/journal-report-views';

import { useTemplateCatalog } from '../../../plugins/trends-fft-analyzer/useTemplateCatalog';

export interface TrendsFftReportViewProps {
  readonly report: TrendsFftReport;
}

/**
 * Client wrapper around the shared trends report view: injects the catalog-aware
 * `getTemplate` (system + user templates) from the trends-fft plugin.
 */
export const TrendsFftReportView: React.FC<TrendsFftReportViewProps> = ({ report }) => {
  const { getTemplate } = useTemplateCatalog();
  return <SharedTrendsFftReportView report={report} getTemplate={getTemplate} />;
};
