import { useState } from 'react';

import { setNodeScenarioAutoResume, type SetNodeScenarioAutoResumeOutcome } from '@/api/membrane';

/**
 * Переключатель прибора «Возобновлять сценарий после перезапуска Студии» (ADR-0033). Умолчание ВЫКЛ.
 * Показанное значение — ответ сервера, а не запрос; если до прибора не доехало — честная строка.
 */
export function autoResumeResultText(outcome: SetNodeScenarioAutoResumeOutcome): { text: string; alert: boolean } | null {
  if (!outcome.ok) {
    return outcome.reason === 'node_not_paired'
      ? { text: 'Прибор не сопряжён — настройка недоступна.', alert: true }
      : { text: 'Сервер не принял значение.', alert: true };
  }
  if (outcome.contextSync.failed > 0) {
    return { text: 'Сохранено, но до прибора не доехало — применится при следующей связи.', alert: true };
  }
  return null;
}

export function NodeScenarioAutoResumeToggle({
  nodeId,
  initial,
  setter = setNodeScenarioAutoResume,
}: {
  nodeId: string;
  initial: boolean;
  setter?: typeof setNodeScenarioAutoResume;
}) {
  const [enabled, setEnabled] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ text: string; alert: boolean } | null>(null);

  const toggle = async (next: boolean) => {
    setBusy(true);
    setNote(null);
    try {
      const outcome = await setter(nodeId, next);
      if (outcome.ok) setEnabled(outcome.scenarioAutoResume);
      setNote(autoResumeResultText(outcome));
    } catch (e) {
      setNote({ text: e instanceof Error ? e.message : 'Не удалось сохранить настройку.', alert: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-lg border border-base-content/10 p-3 text-sm" data-testid="node-scenario-auto-resume">
      <label className="flex cursor-pointer items-center justify-between gap-3">
        <span>Возобновлять сценарий после перезапуска Студии</span>
        <input
          type="checkbox"
          className="toggle toggle-sm"
          checked={enabled}
          disabled={busy}
          onChange={(e) => void toggle(e.target.checked)}
        />
      </label>
      <p className="mt-1 text-xs text-base-content/60">
        Только если сценарий шёл в момент выключения или падения прибора. Остановленный вами сценарий не запустится сам.
      </p>
      {note ? (
        <p role={note.alert ? 'alert' : 'status'} className={`mt-1 text-xs ${note.alert ? 'text-warning' : ''}`}>
          {note.text}
        </p>
      ) : null}
    </div>
  );
}
