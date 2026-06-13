import { NodeAccessKeyDuration } from '@prisma/client';

export { NodeAccessKeyDuration };

export const NODE_ACCESS_KEY_DURATION_VALUES: NodeAccessKeyDuration[] = [
  NodeAccessKeyDuration.hours_4,
  NodeAccessKeyDuration.days_3,
  NodeAccessKeyDuration.weeks_2,
  NodeAccessKeyDuration.month_1,
  NodeAccessKeyDuration.months_3,
];

export const NODE_ACCESS_KEY_DURATION_LABELS: Record<NodeAccessKeyDuration, string> = {
  [NodeAccessKeyDuration.hours_4]: '4 часа',
  [NodeAccessKeyDuration.days_3]: '3 дня',
  [NodeAccessKeyDuration.weeks_2]: '2 недели',
  [NodeAccessKeyDuration.month_1]: '1 месяц',
  [NodeAccessKeyDuration.months_3]: '3 месяца',
};

export function isNodeAccessKeyDuration(value: string): value is NodeAccessKeyDuration {
  return NODE_ACCESS_KEY_DURATION_VALUES.includes(value as NodeAccessKeyDuration);
}

function addCalendarMonths(from: Date, months: number): Date {
  const result = new Date(from.getTime());
  result.setMonth(result.getMonth() + months);
  return result;
}

/** Вычисляет expiresAt по канону MEMBRANE_PLATFORM.md */
export function computeAccessKeyExpiresAt(
  duration: NodeAccessKeyDuration,
  createdAt: Date,
): Date {
  switch (duration) {
    case NodeAccessKeyDuration.hours_4:
      return new Date(createdAt.getTime() + 4 * 60 * 60 * 1000);
    case NodeAccessKeyDuration.days_3:
      return new Date(createdAt.getTime() + 3 * 24 * 60 * 60 * 1000);
    case NodeAccessKeyDuration.weeks_2:
      return new Date(createdAt.getTime() + 14 * 24 * 60 * 60 * 1000);
    case NodeAccessKeyDuration.month_1:
      return addCalendarMonths(createdAt, 1);
    case NodeAccessKeyDuration.months_3:
      return addCalendarMonths(createdAt, 3);
    default: {
      const _exhaustive: never = duration;
      return _exhaustive;
    }
  }
}

export function isAccessKeyActive(expiresAt: Date, revokedAt: Date | null, now = new Date()): boolean {
  return revokedAt === null && expiresAt > now;
}
