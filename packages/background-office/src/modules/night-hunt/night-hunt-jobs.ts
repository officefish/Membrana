export type NightHuntJobId =
  | 'design-token-drift'
  | 'services-api-contract-drift'
  | 'monorepo-dependency-graph';

export interface NightHuntJobDef {
  id: NightHuntJobId;
  /** Nest cron expression (UTC) */
  cron: string;
  outputSlug: string;
  title: string;
}

export const NIGHT_HUNT_JOBS: NightHuntJobDef[] = [
  {
    id: 'design-token-drift',
    cron: '0 7 * * 3',
    outputSlug: 'design-drift',
    title: 'Night Hunt: design token drift',
  },
  {
    id: 'services-api-contract-drift',
    cron: '0 11 * * 1',
    outputSlug: 'services-api-drift',
    title: 'Night Hunt: services API contract drift',
  },
  {
    id: 'monorepo-dependency-graph',
    cron: '30 8 * * 2',
    outputSlug: 'graph-drift',
    title: 'Night Hunt: monorepo dependency graph',
  },
];

export function getNightHuntJob(id: string): NightHuntJobDef | undefined {
  return NIGHT_HUNT_JOBS.find((j) => j.id === id);
}

export function nightHuntOutputPath(slug: string, weekKey: string): string {
  return `docs/seanses/night-hunt/${slug}-${weekKey}.md`;
}
