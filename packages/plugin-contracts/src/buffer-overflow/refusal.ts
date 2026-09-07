/**
 * Тело доменного отказа загрузки пробы — вердикт M2 (#2307), поля — данность заседания.
 *
 * Транспорт — конвенция кабинета 12.08 (шапка `tariff.controller.ts`): доменный исход уезжает
 * `200 { ok:false, reason, … }`, клиент читает `reason`, не HTTP-код. 413 остаётся только
 * настоящему «тело слишком большое» и этого тела не несёт.
 *
 * Оси `buffer`/`userStorage` — те же, что у `GET /v1/devices/:id/quota`: занято и лимит в
 * байтах, целые ≥ 0. Поле `backend` из `/quota` сюда не переносится — отказ не описывает, где
 * лежит хранилище.
 *
 * `overflowId` — непрозрачный идентификатор ЭПИЗОДА переполнения, стабильный на все отказы одного
 * эпизода (однократность окна оператора против 6500 ретраев ночи). Равенство — только `===`,
 * семантики внутри строки нет. `overflowAt` — время первого отказа эпизода, ISO-8601 UTC,
 * чеканится вместе с id (открытый шов заседания, закрыт по кандидату эпика).
 *
 * `overflowPolicy` — режим прибора, который сервер знает из поля политики (M1); имя поля ответа
 * НЕ равно имени поля политики (`bufferPolicy`) — это разные сущности (аудит M2).
 */
import { isBufferOverflowReason, type BufferOverflowReason } from './reasons.js';

export const OVERFLOW_POLICIES = {
  STOP: 'stop',
  SMART_CLEANUP: 'smart_cleanup',
} as const;

export type OverflowPolicy = (typeof OVERFLOW_POLICIES)[keyof typeof OVERFLOW_POLICIES];

const POLICY_VALUES: ReadonlySet<string> = new Set(Object.values(OVERFLOW_POLICIES));

export function isOverflowPolicy(value: unknown): value is OverflowPolicy {
  return typeof value === 'string' && POLICY_VALUES.has(value);
}

/** Ось квоты: ключи ответа `/quota`, по которым различаются два субъекта отказа. */
export const QUOTA_SUBJECTS = ['buffer', 'userStorage'] as const;
export type QuotaSubject = (typeof QUOTA_SUBJECTS)[number];

export interface QuotaAxis {
  readonly usedBytes: number;
  readonly limitBytes: number;
}

export interface BufferOverflowRefusal {
  readonly ok: false;
  readonly reason: BufferOverflowReason;
  readonly buffer: QuotaAxis;
  readonly userStorage: QuotaAxis;
  readonly overflowPolicy: OverflowPolicy;
  readonly overflowId: string;
  readonly overflowAt: string;
}

function isQuotaAxis(value: unknown): value is QuotaAxis {
  if (typeof value !== 'object' || value === null) return false;
  const axis = value as Record<string, unknown>;
  return (
    Number.isInteger(axis['usedBytes']) &&
    (axis['usedBytes'] as number) >= 0 &&
    Number.isInteger(axis['limitBytes']) &&
    (axis['limitBytes'] as number) >= 0
  );
}

/**
 * Проверка формы для потребителей (прибор, кабинет): разбирать ответ по ней, а не по статусу и
 * не по тексту. Не валидирует формат `overflowAt` глубже «непустая строка» — время читается, не
 * судится.
 */
export function isBufferOverflowRefusal(value: unknown): value is BufferOverflowRefusal {
  if (typeof value !== 'object' || value === null) return false;
  const body = value as Record<string, unknown>;
  return (
    body['ok'] === false &&
    isBufferOverflowReason(body['reason']) &&
    isQuotaAxis(body['buffer']) &&
    isQuotaAxis(body['userStorage']) &&
    isOverflowPolicy(body['overflowPolicy']) &&
    typeof body['overflowId'] === 'string' &&
    body['overflowId'].length > 0 &&
    typeof body['overflowAt'] === 'string' &&
    body['overflowAt'].length > 0
  );
}
