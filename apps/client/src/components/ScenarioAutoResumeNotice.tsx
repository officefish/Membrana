import React, { useEffect, useState } from 'react';

import type { AutoResumeOutcome } from '../lib/scenario-auto-resume/autoResumeOnStart';
import { subscribeAutoResumeOutcome } from '../lib/scenario-auto-resume/wireAutoResume';

/**
 * Честная строка исхода возобновления сценария при старте (ADR-0033): «возобновлён» или почему нет.
 * Обычный старт (выключено / не шёл) молчит. Закрывается рукой.
 */
export function autoResumeNoticeText(outcome: AutoResumeOutcome | null): { text: string; alert: boolean } | null {
  if (outcome === null) return null;
  if (outcome.kind === 'started') return { text: 'Сценарий доски возобновлён после перезапуска Студии.', alert: false };
  if (outcome.kind === 'skipped' && outcome.silent) return null;
  return { text: outcome.text, alert: true };
}

export const ScenarioAutoResumeNotice: React.FC = () => {
  const [outcome, setOutcome] = useState<AutoResumeOutcome | null>(null);
  const [closed, setClosed] = useState(false);
  useEffect(() => subscribeAutoResumeOutcome(setOutcome), []);
  const view = autoResumeNoticeText(outcome);
  if (!view || closed) return null;
  return (
    <div className="toast toast-end toast-bottom z-[60]">
      <div className={`alert ${view.alert ? 'alert-warning' : 'alert-info'} text-sm`} role={view.alert ? 'alert' : 'status'}>
        <span>{view.text}</span>
        <button type="button" className="btn btn-ghost btn-xs" onClick={() => setClosed(true)} aria-label="Закрыть">
          ✕
        </button>
      </div>
    </div>
  );
};
