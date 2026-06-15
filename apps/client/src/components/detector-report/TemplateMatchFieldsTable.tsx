import React from 'react';
import type { TemplateMatchFieldRow } from '@membrana/detector-report';

import {
  matchBarTone,
  matchTone,
  TEMPLATE_MATCH_FIELD_LABELS,
} from './detectorReportUi';

export interface TemplateMatchFieldsTableProps {
  readonly fields: readonly TemplateMatchFieldRow[];
  readonly compact?: boolean;
}

export const TemplateMatchFieldsTable: React.FC<TemplateMatchFieldsTableProps> = ({
  fields,
  compact = false,
}) => {
  if (fields.length === 0) {
    return (
      <p className="text-sm text-base-content/60">Нет полей шаблона для отображения.</p>
    );
  }

  const spectralRows = fields.filter((row) => row.category === 'spectral');
  const temporalRows = fields.filter((row) => row.category === 'temporal');

  const renderTable = (rows: readonly TemplateMatchFieldRow[], title: string) => (
    <div className="space-y-2">
      <h5 className="text-xs font-semibold text-base-content/70">{title}</h5>
      <div className="overflow-x-auto rounded-lg border border-base-300">
        <table className={`table w-full ${compact ? 'table-xs' : 'table-sm'}`}>
          <thead>
            <tr className="text-base-content/60">
              <th>Метрика</th>
              <th>Факт</th>
              <th>Ожидание</th>
              <th className="text-right">Совпадение</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.category}-${row.field}`}>
                <td className="whitespace-nowrap font-medium">
                  {TEMPLATE_MATCH_FIELD_LABELS[row.field] ?? row.field}
                </td>
                <td className="font-mono text-xs tabular-nums">{row.actual}</td>
                <td className="text-xs text-base-content/70">{row.expected}</td>
                <td className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-base-300">
                      <div
                        className={`h-full ${matchBarTone(row.matchPercent)}`}
                        style={{ width: `${row.matchPercent}%` }}
                      />
                    </div>
                    <span
                      className={`w-8 text-xs font-semibold tabular-nums ${matchTone(row.matchPercent)}`}
                    >
                      {row.matchPercent.toFixed(0)}%
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {spectralRows.length > 0
        ? renderTable(spectralRows, 'Спектральные метрики')
        : null}
      {temporalRows.length > 0
        ? renderTable(temporalRows, 'Временные паттерны')
        : null}
    </div>
  );
};
