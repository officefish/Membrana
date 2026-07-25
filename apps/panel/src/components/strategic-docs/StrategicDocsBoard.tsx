/**
 * Раздел «Стратегия» — тонкая ссылка на Affine self-host (W3 surface).
 * Полный git↔Affine sync вне scope v1 (эпик strategy-affine-routing).
 */

/** Live Affine surface (lock strategy.mmbrn.tech / scope B). */
export const STRATEGY_AFFINE_URL = 'https://strategy.mmbrn.tech';

/** Runbook деплоя и backup volumes. */
export const STRATEGY_AFFINE_RUNBOOK_URL =
  'https://github.com/officefish/Membrana/blob/main/docs/deploy/STRATEGY_AFFINE_DEPLOY.md';

export function StrategicDocsBoard() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-base-content/70">
        Живая поверхность стратегических документов — Affine на{' '}
        <code className="text-xs">strategy.mmbrn.tech</code>. Источник истины в git;
        Affine — рабочее окно, без двустороннего sync в v1.
      </p>

      <div className="flex flex-wrap gap-2">
        <a
          className="btn btn-primary btn-sm"
          href={STRATEGY_AFFINE_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          Открыть strategy.mmbrn.tech
        </a>
        <a
          className="btn btn-ghost btn-sm"
          href={STRATEGY_AFFINE_RUNBOOK_URL}
          target="_blank"
          rel="noopener noreferrer"
          title="Runbook Affine + backup volumes"
        >
          Runbook в git
        </a>
      </div>
    </div>
  );
}
