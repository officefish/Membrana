/**
 * Ось владения библиотекой (вердикт M1 заседания `library-open-api`).
 *
 * Единица владения — `Device.membraneId`, НЕ `deviceId` (это адресация) и НЕ `collectionId`
 * (это группировка). Кабинет пишет поле однократно при привязке; media в рантайме в кабинет
 * не ходит и читает уже записанный слепок звена. Отсюда — функция чистая и синхронная:
 * «кабинет недоступен» на неё не влияет по построению.
 *
 * Прибор без мембраны — ЗАКОННОЕ состояние (`membraneId` объявлен `String?` осознанно), а не
 * порча данных. Ось об этом честно сообщает разрядом `absent`; что с этим делать дальше —
 * решает вызывающий слой, и решает по-разному: выборка даёт пустое множество, операция,
 * требующая владельца, даёт именованную ошибку (см. `library-ownership.service.ts`).
 */

import { OwnershipProvenanceViolationError } from './ownership-errors';

/** Поле-носитель ответа «чей трек». Ровно одно, и другого не предусмотрено. */
export const OWNERSHIP_AXIS_FIELD = 'membraneId' as const;

/**
 * Происхождение ответа. Едет в каждой оси владения не ради красоты: это исполняемая
 * декларация «откуда взято», которую нельзя забыть обновить при копипасте — `assertOwnershipProvenance`
 * роняет ось с чужим происхождением.
 */
export const OWNERSHIP_AXIS_PROVENANCE = 'device.membraneId' as const;

/**
 * Узкая проекция прибора: два поля и ничего больше.
 *
 * Ширина входа здесь — часть предмета, а не экономия. На реальном вызове
 * `/v1/devices/:deviceId/collections/:collectionId/samples` под рукой лежат оба соблазна;
 * то, чего нет на входе, нельзя использовать по недосмотру.
 */
export interface DeviceOwnershipRow {
  readonly id: string;
  readonly membraneId: string | null | undefined;
}

/** Владелец есть: треки прибора принадлежат этой мембране. */
export interface OwnedAxis {
  readonly kind: 'membrane';
  readonly membraneId: string;
  /** Адрес, по которому владение прочитано. Адресация, не владение. */
  readonly deviceId: string;
  readonly derivedFrom: typeof OWNERSHIP_AXIS_PROVENANCE;
}

/** Владельца нет. Это состояние, а не ошибка; ошибкой его делает только операция. */
export interface UnownedAxis {
  readonly kind: 'absent';
  readonly deviceId: string;
}

export type OwnershipAxis = OwnedAxis | UnownedAxis;

/**
 * Нормализация пустоты — fail-closed.
 *
 * `null`, `undefined`, пустая строка и строка из пробелов — всё это ОТСУТСТВИЕ владельца.
 * Владельца с именем `'   '` не бывает, и подставлять вместо него нечего: ни `deviceId`, ни
 * `collectionId`, ни «единственную мембрану в базе». Угадывать владельца дверь не вправе.
 */
function normalizeMembraneId(raw: string | null | undefined): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Разрешает ось владения по прибору. Единственная законная дорога к ответу «чей трек».
 */
export function resolveDeviceOwnership(device: DeviceOwnershipRow): OwnershipAxis {
  const membraneId = normalizeMembraneId(device.membraneId);
  if (membraneId === null) {
    return Object.freeze({ kind: 'absent', deviceId: device.id } as const);
  }
  return Object.freeze({
    kind: 'membrane',
    membraneId,
    deviceId: device.id,
    derivedFrom: OWNERSHIP_AXIS_PROVENANCE,
  } as const);
}

export function isOwned(axis: OwnershipAxis): axis is OwnedAxis {
  return axis.kind === 'membrane';
}

/**
 * Роняет ось владения, собранную мимо `resolveDeviceOwnership`.
 *
 * Это не подпись и не защита от злого умысла — провенанс можно и подделать. Это защита от
 * механической ошибки: ось, собранная вручную «по образцу» в соседнем слое, обязана назвать
 * своё происхождение, и назвать его она может только правильно.
 */
export function assertOwnershipProvenance(axis: OwnershipAxis): void {
  if (axis.kind !== 'membrane') return;
  if (axis.derivedFrom !== OWNERSHIP_AXIS_PROVENANCE) {
    throw new OwnershipProvenanceViolationError(axis.derivedFrom);
  }
}
