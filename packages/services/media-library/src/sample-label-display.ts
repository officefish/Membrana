import type { SampleLabel } from './types.js';

/** UI options for ground-truth label select (VDR2). */
export const SAMPLE_LABEL_OPTIONS: ReadonlyArray<{ value: SampleLabel; title: string }> = [
  { value: 'unlabeled', title: 'Не установлено' },
  { value: 'drone', title: 'Дрон' },
  { value: 'not-drone', title: 'Не дрон' },
];

/** DaisyUI badge classes per label — see docs/DESIGN.md § Sample ground-truth labels. */
export function sampleLabelBadgeClass(label: SampleLabel): string {
  switch (label) {
    case 'drone':
      return 'badge badge-warning badge-sm';
    case 'not-drone':
      return 'badge badge-ghost badge-sm';
    default:
      return 'badge badge-neutral badge-sm';
  }
}

export function sampleLabelTitle(label: SampleLabel): string {
  return SAMPLE_LABEL_OPTIONS.find((o) => o.value === label)?.title ?? label;
}
