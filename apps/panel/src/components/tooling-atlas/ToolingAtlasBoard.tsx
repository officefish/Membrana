/**
 * Раздел «Контейнеры» — тонкий вход в атлас туллинга (report-plane).
 * Публичная витрина — harness Mintlify (`apps/docs-harness`), не product docs.
 */

/** Производный индекс в main (agent-truth зеркало). */
export const ATLAS_GIT_URL =
  'https://github.com/officefish/Membrana/blob/main/docs/tooling-atlas/registry/ATLAS.md';

/** Live harness custom domain (W0 lock / W3 surface). */
export const ATLAS_DOCS_URL = 'https://harness.mmbrn.tech/tooling/containers';

/** Fallback harness Mintlify project slug (не product `membrana.mintlify.app`). */
export const ATLAS_DOCS_FALLBACK_URL =
  'https://membrana-harness.mintlify.app/tooling/containers';

type PlaneBlock = {
  plane: 'report' | 'domain' | 'meta';
  title: string;
  blurb: string;
  homes: readonly string[];
};

const PLANES: readonly PlaneBlock[] = [
  {
    plane: 'report',
    title: 'Плоскость отчётов',
    blurb: 'Слоты docs/audit/* — снимки и разборы, не сами предметные группы.',
    homes: [
      'docs/audit/git',
      'docs/audit/tasks',
      'docs/audit/bestiary',
      'docs/audit/llm-calls',
    ],
  },
  {
    plane: 'domain',
    title: 'Предметные дома',
    blurb: 'Где живут сами сущности. Задания — только docs/tasks.',
    homes: ['docs/tasks', 'docs/procedures', 'docs/precedents'],
  },
  {
    plane: 'meta',
    title: 'Мета',
    blurb: 'Атлас контейнеров — производный индекс, без копий README.',
    homes: ['docs/tooling-atlas'],
  },
];

export function ToolingAtlasBoard() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-base-content/70">
        <span className="font-medium text-base-content">docs/tasks</span> — задания ·{' '}
        <span className="font-medium text-base-content">docs/audit/tasks</span> — отчёты про
        них. Публичный монитор — harness{' '}
        <code className="text-xs">apps/docs-harness</code> (
        <code className="text-xs">harness.mmbrn.tech</code>), не product Device Board.
      </p>

      <div className="flex flex-wrap gap-2">
        <a
          className="btn btn-primary btn-sm"
          href={ATLAS_DOCS_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          Открыть атлас (harness)
        </a>
        <a
          className="btn btn-ghost btn-sm"
          href={ATLAS_DOCS_FALLBACK_URL}
          target="_blank"
          rel="noopener noreferrer"
          title="Fallback Mintlify project slug"
        >
          membrana-harness.mintlify.app
        </a>
        <a
          className="btn btn-ghost btn-sm"
          href={ATLAS_GIT_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          ATLAS.md в git
        </a>
      </div>

      <ul className="space-y-3" aria-label="Плоскости атласа">
        {PLANES.map((p) => (
          <li key={p.plane} className="rounded-lg border border-base-content/10 bg-base-200 p-4">
            <h3 className="text-sm font-semibold">
              {p.title}{' '}
              <span className="font-normal text-base-content/50">({p.plane})</span>
            </h3>
            <p className="mt-1 text-sm text-base-content/70">{p.blurb}</p>
            <p className="mt-2 font-mono text-xs text-base-content/60">{p.homes.join(' · ')}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
