/**
 * Раздел «Контейнеры» — тонкий вход в атлас туллинга (report-plane).
 * Живой индекс сейчас — git (ATLAS.md). Mintlify-витрина в apps/docs есть,
 * но live membrana.mintlify.app смотрит в community-fork без tooling/;
 * docs.mmbrn.tech — custom domain ещё не подключён (CUSTOM_DOMAIN_SETUP).
 */

/** Рабочая ссылка: производный индекс в main. */
export const ATLAS_GIT_URL =
  'https://github.com/officefish/Membrana/blob/main/docs/tooling-atlas/registry/ATLAS.md';

/** Целевая Mintlify-витрина (пока не на live — см. баннер в борде). */
export const ATLAS_DOCS_URL = 'https://docs.mmbrn.tech/tooling/containers';
export const ATLAS_DOCS_FALLBACK_URL = 'https://membrana.mintlify.app/tooling/containers';

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
        них. Истина индекса — git; Mintlify — монитор, когда подключён к{' '}
        <code className="text-xs">apps/docs</code>.
      </p>

      <div
        className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-base-content/80"
        role="status"
      >
        Публичная витрина ещё не на live: <code className="text-xs">membrana.mintlify.app</code>{' '}
        отдаёт старый community-fork (без <code className="text-xs">tooling/containers</code> →
        404), а <code className="text-xs">docs.mmbrn.tech</code> не подключён (DNS/custom
        domain). Пока открывайте индекс в git.
      </div>

      <div className="flex flex-wrap gap-2">
        <a
          className="btn btn-primary btn-sm"
          href={ATLAS_GIT_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          Открыть ATLAS.md в git
        </a>
        <a
          className="btn btn-ghost btn-sm btn-disabled pointer-events-none opacity-50"
          href={ATLAS_DOCS_URL}
          aria-disabled="true"
          tabIndex={-1}
          title="docs.mmbrn.tech ещё не подключён"
        >
          docs.mmbrn.tech (скоро)
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
