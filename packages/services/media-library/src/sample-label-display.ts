import type { SampleLabel } from './types.js';

/** UI options for ground-truth label select (VDR2). */
export const SAMPLE_LABEL_OPTIONS: ReadonlyArray<{ value: SampleLabel; title: string }> = [
  { value: 'unlabeled', title: 'Не установлено' },
  { value: 'drone', title: 'Дрон' },
  { value: 'not-drone', title: 'Не дрон' },
];

/** Prisma/API underscore → UI kebab-case (`not_drone` → `not-drone`). */
export function sampleLabelFromStorage(label: string): SampleLabel {
  if (label === 'not_drone' || label === 'not-drone') return 'not-drone';
  if (label === 'drone') return 'drone';
  return 'unlabeled';
}

/** DaisyUI badge classes per label — see docs/DESIGN.md § Sample ground-truth labels. */
export function sampleLabelBadgeClass(label: string): string {
  switch (sampleLabelFromStorage(label)) {
    case 'drone':
      return 'badge badge-warning badge-sm';
    case 'not-drone':
      return 'badge badge-ghost badge-sm';
    default:
      return 'badge badge-neutral badge-sm';
  }
}

export function sampleLabelTitle(label: string): string {
  const normalized = sampleLabelFromStorage(label);
  return SAMPLE_LABEL_OPTIONS.find((o) => o.value === normalized)?.title ?? normalized;
}
