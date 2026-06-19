/**
 * Версия рантайм-контракта node-realtime (сервер↔клиент) — единый источник истины.
 *
 * DR6 (deploy-pipeline-refactor): сервер сообщает свою версию протокола в `/health`,
 * клиент сравнивает её со своей (с которой собран) и показывает индикатор версии /
 * «доступно обновление». Бампать `RUNTIME_PROTOCOL_VERSION` при несовместимом изменении
 * wire-формата (envelope/каналы/события) node-realtime.
 *
 * Совместимость по правилу expand/contract (см. CONTRIBUTING.md): несовместимые изменения
 * протокола повышают версию; одинаковая версия ⇒ сервер и клиент говорят на одном протоколе.
 */

/** Текущая версия рантайм-протокола node-realtime. */
export const RUNTIME_PROTOCOL_VERSION = 1;

/** Результат сверки версий протокола сервера и клиента. */
export interface RuntimeCompatibility {
  /** Версия протокола, заявленная сервером. */
  serverVersion: number;
  /** Версия протокола, с которой собран клиент. */
  clientVersion: number;
  /** Версия сервера известна и валидна. */
  known: boolean;
  /** Сервер и клиент говорят на одной версии протокола. */
  compatible: boolean;
  /** Сервер новее клиента — клиенту стоит обновиться. */
  updateAvailable: boolean;
  /** Клиент новее сервера — устарел сервер. */
  serverOutdated: boolean;
}

/**
 * Сверить версию протокола сервера с версией клиента.
 * Идемпотентна и чиста (без сети/времени) — пригодна для юнит-тестов и индикатора.
 */
export function evaluateRuntimeCompatibility(
  serverVersion: number,
  clientVersion: number = RUNTIME_PROTOCOL_VERSION,
): RuntimeCompatibility {
  const known = Number.isInteger(serverVersion) && serverVersion > 0;
  return {
    serverVersion,
    clientVersion,
    known,
    compatible: known && serverVersion === clientVersion,
    updateAvailable: known && serverVersion > clientVersion,
    serverOutdated: known && serverVersion < clientVersion,
  };
}
