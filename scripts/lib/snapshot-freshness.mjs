/**
 * Предикат свежести снимка (Р2, вердикт M2).
 *
 * `fresh := sourceCursor == snapshot.header.sourceRevision` — один дешёвый
 * запрос курсора O(1), вызывается ВНЕ тела гейта (в момент производства или
 * отдельной проверкой). Тело вердикта офлайн: свежесть — аннотация, не
 * валидность; `gate(snapshot)` детерминирован на любом снимке, включая протухший.
 *
 * Способ получения курсора ИНЪЕЦИРУЕТСЯ (в тестах — фикстура, сети нет).
 */
import { EXIT_CODES, validateSnapshot } from './snapshot-contract.mjs';

/**
 * Чистый предикат: снимок свеж относительно курсора источника.
 *
 * @param {{ header?: { sourceRevision?: string } } | null | undefined} snapshot
 * @param {string} sourceCursor
 * @returns {boolean}
 */
export function fresh(snapshot, sourceCursor) {
  const revision = snapshot?.header?.sourceRevision;
  return typeof revision === 'string' && revision.length > 0 && revision === sourceCursor;
}

/**
 * Проверка свежести с кодом возврата блока.
 * Битый снимок → SNAPSHOT_NO_INPUT (вход не определён), протухший →
 * SNAPSHOT_STALE (мягкое замечание: вердикт честен на теле снимка, шапка
 * отчёта обязана показать «данные на ревизии X, источник ушёл вперёд»).
 *
 * @param {object} snapshot
 * @param {() => Promise<string> | string} getSourceCursor инъекция единственного
 *   дешёвого запроса; вызывается ровно один раз
 * @returns {Promise<{ code: number, fresh: boolean | null, snapshotRevision: string | null, sourceCursor: string | null }>}
 */
export async function checkFreshness(snapshot, getSourceCursor) {
  const { ok } = validateSnapshot(snapshot);
  if (!ok) {
    return {
      code: EXIT_CODES.SNAPSHOT_NO_INPUT,
      fresh: null,
      snapshotRevision: null,
      sourceCursor: null,
    };
  }
  const sourceCursor = String(await getSourceCursor());
  const isFresh = fresh(snapshot, sourceCursor);
  return {
    code: isFresh ? EXIT_CODES.OK : EXIT_CODES.SNAPSHOT_STALE,
    fresh: isFresh,
    snapshotRevision: snapshot.header.sourceRevision,
    sourceCursor,
  };
}
