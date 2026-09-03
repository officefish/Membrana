/**
 * Порядок проверок двери: СУЩЕСТВОВАНИЕ → ВЛАДЕНИЕ (#2271, вердикт M2).
 *
 * ЗАЧЕМ ЧИСТОЙ ФУНКЦИЕЙ, А НЕ ВНУТРИ КОНТРОЛЛЕРА. Блок `contract` коворка показал, что
 * разведённость `403`/`404` держится НЕ его кодом, а порядком у соседа: если спросить владение
 * раньше существования, `403` перестанет доказывать существование ресурса — и разведённость
 * сломается при полностью зелёном зубе формы. Порядок — инвариант, и у инварианта должен быть
 * носитель, умеющий отказать. Вот он.
 *
 * ТРИ ИСХОДА, А НЕ БУЛЕВО. `contract` принимает ровно `allow | forbidden | absent`; сведение к
 * «пустить/не пустить» потеряло бы различие между «такого нет» и «есть, но закрыто», а именно
 * его заседание развело осознанно: партнёр уже опознан, и скрывать от своего факт
 * существования его же ресурса значит дезориентировать.
 */

/** Исход доступа. Имена совпадают с `AccessOutcome` блока `contract` — словарь один. */
export type OpenApiAccess = 'allow' | 'forbidden' | 'absent';

/** Что дверь знает о запрошенном приборе. `null` — прибора нет вовсе. */
export interface DeviceOwnershipFacts {
  readonly membraneId: string | null | undefined;
}

/**
 * Решение по одному ресурсу.
 *
 * Порядок ЗАПИСАН ЯВНО и проверяется зубом: сперва спрашиваем, есть ли прибор, и только потом —
 * чей он. Поменять две строки местами — и `403` начнёт отвечать на несуществующий прибор,
 * рассказывая партнёру о ресурсах, которых нет.
 *
 * @param device факты о приборе; `null` означает «не найден»
 * @param callerMembraneId мембрана обратившегося; `null` — обратившийся без мембраны
 */
export function accessForDevice(
  device: DeviceOwnershipFacts | null,
  callerMembraneId: string | null,
): OpenApiAccess {
  // ШАГ 1 — СУЩЕСТВОВАНИЕ. Обязан быть первым.
  if (device === null) return 'absent';

  // ШАГ 2 — ВЛАДЕНИЕ. Только после того, как существование доказано.
  //
  // Прибор без мембраны закрыт для всех: угадывать владельца дверь не вправе (M1), а «ничей»
  // не значит «общий». Обратившийся без мембраны не получает ничего по той же причине.
  const owner = normalizeMembrane(device.membraneId);
  const caller = normalizeMembrane(callerMembraneId);
  if (owner === null || caller === null) return 'forbidden';
  return owner === caller ? 'allow' : 'forbidden';
}

/**
 * Пустота нормализуется fail-closed: `null`, `undefined`, пустая строка и строка из пробелов —
 * всё это ОТСУТСТВИЕ мембраны, а не мембрана с чудным именем. Правило взято у блока
 * `ownership`, чтобы дверь и ось судили пустоту одинаково.
 */
function normalizeMembrane(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

/** Код ответа по исходу. `allow` кода не имеет — это выдача, а не отказ. */
export function statusForAccess(access: Exclude<OpenApiAccess, 'allow'>): 404 | 403 {
  return access === 'absent' ? 404 : 403;
}
