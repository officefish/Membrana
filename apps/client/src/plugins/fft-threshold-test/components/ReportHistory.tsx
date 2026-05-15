import React, { useEffect, useState } from 'react';

import { fftThresholdReportHistory } from '../fftThresholdReportHistory';
import { useFftThresholdReports } from '../useFftThresholdReports';

import { ReportCard } from './ReportCard';

export const ReportHistory: React.FC = () => {
  const reports = useFftThresholdReports();
  const newestId = reports[0]?.testId ?? null;
  const [expandedId, setExpandedId] = useState<string | null>(newestId);

  useEffect(() => {
    if (newestId) {
      setExpandedId(newestId);
    }
  }, [newestId]);

  useEffect(() => {
    if (reports.length === 0) {
      setExpandedId(null);
    }
  }, [reports.length]);

  const handleClear = (): void => {
    fftThresholdReportHistory.clear();
    setExpandedId(null);
  };

  return (
    <section className="space-y-2" aria-label="История отчётов">
      <div className="flex items-center justify-between gap-2 min-h-10">
        <h4 className="text-xs font-semibold text-base-content">История отчётов</h4>
        {reports.length > 0 && (
          <button
            type="button"
            className="btn btn-ghost btn-xs min-h-10 text-base-content/60"
            onClick={handleClear}
          >
            Очистить
          </button>
        )}
      </div>
      {reports.length === 0 ? (
        <p className="text-xs text-center text-base-content/50 py-2">Отчётов пока нет</p>
      ) : (
        <div className="space-y-2">
          {reports.map((report) => (
            <ReportCard
              key={report.testId}
              report={report}
              expanded={expandedId === report.testId}
              onToggle={() =>
                setExpandedId((current) =>
                  current === report.testId ? null : report.testId,
                )
              }
            />
          ))}
        </div>
      )}
    </section>
  );
};
