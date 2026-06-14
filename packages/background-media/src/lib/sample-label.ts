import type { SampleLabel } from '../prisma/client';

/** Manifest / API kebab-case → Prisma SampleLabel enum. */
export function normalizeSampleLabel(label: string): SampleLabel {
  if (label === 'not-drone' || label === 'not_drone') return 'not_drone';
  if (label === 'drone') return 'drone';
  return 'unlabeled';
}
