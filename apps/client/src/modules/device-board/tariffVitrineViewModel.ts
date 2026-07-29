/**
 * Витрина тарифа — состояние показа права на экране
 * (S7 плана интеграции; заседание `tariff-grid`, ратифицировано владельцем 29.07).
 *
 * Решение владельца об эшелонированной границе (мостик 29.07): клиент ставится
 * инсталлятором, плагины физически лежат у пользователя — **прятать нечего и не
 * нужно**. Недоступное **притемняется с предупреждением**, а не исчезает:
 * пользователь должен видеть, что даёт старший тариф. Это витрина, а не забор.
 *
 * **Мягкость здесь не слабость.** Настоящий запрет живёт на сервере и на входе в
 * борд (шаги S3–S6); экран лишь честно показывает состояние. Поэтому клиент —
 * **читатель проекции, а не источник истины**: он не решает, что можно, и не
 * пересчитывает права сам.
 *
 * Три состояния показа — ровно те же три, что и в решении о праве:
 *  - доступно — обычный вид;
 *  - куплено, но ждёт условия — притемнение и объяснение, что доделать;
 *  - недоступно по тарифу — притемнение и приглашение на старший тариф.
 *
 * Модуль ЧИСТЫЙ: без React, сети и ФС — только превращение данных в состояние вида.
 */

/** Невыполненное условие, как оно пришло с сервера. */
export interface WireUnmetPrecondition {
  readonly preconditionId: string;
  /** `stub_unwired` — контур, считающий условие, ещё не подключён. */
  readonly code: 'unsatisfied' | 'stub_unwired';
}

/** Строка проекции прав с сервера. Клиент её ЧИТАЕТ, не сочиняет. */
export interface WireEntitlement {
  readonly id: string;
  readonly titleKey: string;
  readonly kind: 'quota' | 'catalog' | 'instrument' | 'gated' | 'produce';
  readonly status: 'entitled' | 'not_entitled';
  readonly unmetPreconditions: readonly WireUnmetPrecondition[];
  readonly reason?: string;
}

/** Как право выглядит на экране. */
export type VitrineTone = 'available' | 'awaiting_condition' | 'locked';

/** Что делать по нажатию — намерение, а не маршрут: маршруты знает приложение. */
export type VitrineCallToAction = 'none' | 'build_network' | 'upgrade_tariff';

/** Состояние показа одного права. */
export interface VitrineItem {
  readonly id: string;
  readonly titleKey: string;
  readonly tone: VitrineTone;
  /** Притемнять ли. Никогда не «скрывать» — такого состояния просто нет. */
  readonly dimmed: boolean;
  /** Предупреждение рядом с притемнённым: жёлтое по решению владельца. */
  readonly warning?: string;
  /** Текст для программы чтения с экрана: почему недоступно. */
  readonly a11yReason?: string;
  readonly cta: VitrineCallToAction;
}

const AWAITING_NETWORK = 'Доступно на вашем тарифе, но сеть ещё не построена';
const AWAITING_UNWIRED = 'Доступно на вашем тарифе; проверка готовности сети пока не подключена';
const LOCKED = 'Доступно на старшем тарифе';

/**
 * Состояние показа одного права.
 *
 * Скрытия нет ни в одной ветке — это не упущение, а решение: прятать нечего,
 * плагины и так лежат у пользователя.
 */
export function toVitrineItem(entitlement: WireEntitlement): VitrineItem {
  const base = { id: entitlement.id, titleKey: entitlement.titleKey };

  if (entitlement.status === 'not_entitled') {
    return {
      ...base,
      tone: 'locked',
      dimmed: true,
      warning: LOCKED,
      a11yReason: LOCKED,
      cta: 'upgrade_tariff',
    };
  }

  if (entitlement.unmetPreconditions.length > 0) {
    // Право куплено — зовём достраивать сеть, а не покупать ещё раз.
    const unwired = entitlement.unmetPreconditions.every((p) => p.code === 'stub_unwired');
    const text = unwired ? AWAITING_UNWIRED : AWAITING_NETWORK;
    return {
      ...base,
      tone: 'awaiting_condition',
      dimmed: true,
      warning: text,
      a11yReason: text,
      cta: unwired ? 'none' : 'build_network',
    };
  }

  return { ...base, tone: 'available', dimmed: false, cta: 'none' };
}

/** Состояние показа всей витрины: порядок сервера сохраняется. */
export function toVitrine(entitlements: readonly WireEntitlement[]): readonly VitrineItem[] {
  return entitlements.map(toVitrineItem);
}

/**
 * Права, которые видно, но нельзя — то, ради чего витрина и существует.
 * Пустой список означает «всё доступно», а не «нечего показать».
 */
export function upsellCandidates(items: readonly VitrineItem[]): readonly VitrineItem[] {
  return items.filter((i) => i.tone === 'locked');
}

/**
 * Клиент не источник истины: он не вправе решать, что разрешено. Функция
 * существует, чтобы такая попытка падала громко, а не расползалась по коду.
 */
export function assertClientIsNotSourceOfTruth(callSite: string): never {
  throw new Error(
    `[client_not_source_of_truth] ${callSite}: клиент читает проекцию прав, но не выносит решений — ` +
      'запрет живёт на сервере и на входе в борд (вердикты M1, M3)',
  );
}
