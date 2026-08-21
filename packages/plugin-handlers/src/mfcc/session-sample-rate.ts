export type SessionSampleRateStatus = 'empty' | 'homogeneous' | 'mixed' | 'missing';

export interface SessionSampleRateInput {
  readonly sampleId: string;
  readonly title?: string;
  readonly sampleRate: number | null | undefined;
}

export interface SessionSampleRateGroup {
  readonly sampleRate: number | null;
  readonly sampleIds: readonly string[];
}

export interface SessionSampleRateConsistency {
  readonly status: SessionSampleRateStatus;
  readonly expectedSampleRate: number;
  readonly judgeable: boolean;
  readonly groups: readonly SessionSampleRateGroup[];
  readonly reason: string | null;
}

const sampleLabel = (sample: SessionSampleRateInput): string => sample.title?.trim() || sample.sampleId;

const formatGroup = (group: SessionSampleRateGroup): string => {
  const rate = group.sampleRate === null ? 'unknown' : String(group.sampleRate);
  return `${rate} Hz: ${group.sampleIds.join(', ')}`;
};

export function summarizeSessionSampleRates(
  samples: readonly SessionSampleRateInput[],
  expectedSampleRate: number,
): SessionSampleRateConsistency {
  const groupsByRate = new Map<number | null, string[]>();
  for (const sample of samples) {
    const sampleRate = typeof sample.sampleRate === 'number' && Number.isFinite(sample.sampleRate)
      ? Math.round(sample.sampleRate)
      : null;
    const group = groupsByRate.get(sampleRate) ?? [];
    group.push(sampleLabel(sample));
    groupsByRate.set(sampleRate, group);
  }

  const groups = [...groupsByRate.entries()]
    .sort(([a], [b]) => {
      if (a === b) return 0;
      if (a === null) return 1;
      if (b === null) return -1;
      return a - b;
    })
    .map(([sampleRate, sampleIds]) => ({ sampleRate, sampleIds: [...sampleIds].sort() }));

  if (groups.length === 0) {
    return { status: 'empty', expectedSampleRate, judgeable: false, groups, reason: 'пустой набор проб — нечего судить' };
  }

  if (groups.some((group) => group.sampleRate === null)) {
    return {
      status: 'missing',
      expectedSampleRate,
      judgeable: false,
      groups,
      reason: `в наборе есть пробы без sampleRate: ${groups.map(formatGroup).join('; ')}`,
    };
  }

  if (groups.length > 1) {
    return {
      status: 'mixed',
      expectedSampleRate,
      judgeable: false,
      groups,
      reason: `разнородная частота в одном наборе: ${groups.map(formatGroup).join('; ')}; ворота MFCC настроены на ${expectedSampleRate} Hz`,
    };
  }

  const [only] = groups;
  if (only!.sampleRate !== expectedSampleRate) {
    return {
      status: 'homogeneous',
      expectedSampleRate,
      judgeable: false,
      groups,
      reason: `частота набора ${only!.sampleRate} Hz ≠ ${expectedSampleRate} Hz, на которой сняты ворота MFCC`,
    };
  }

  return { status: 'homogeneous', expectedSampleRate, judgeable: true, groups, reason: null };
}
