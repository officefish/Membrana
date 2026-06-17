import type { DroneDetectionBriefReport } from '@membrana/detector-report';
import type React from 'react';

export interface BriefDroneDetectionReportViewProps {
  readonly report: DroneDetectionBriefReport;
}

export function BriefDroneDetectionReportView({
  report,
}: BriefDroneDetectionReportViewProps): React.ReactElement {
  return (
    <table className="table table-xs w-full">
      <thead>
        <tr>
          <th>Детектор</th>
          <th>Дрон</th>
          <th className="text-right">Уверенность</th>
        </tr>
      </thead>
      <tbody>
        {report.verdicts.map((verdict) => (
          <tr key={verdict.detectorName}>
            <td>{verdict.detectorName}</td>
            <td>{verdict.isDrone ? 'да' : 'нет'}</td>
            <td className="text-right tabular-nums">{(verdict.confidence * 100).toFixed(1)}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
