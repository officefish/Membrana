/**
 * Кто держит edit lease на сценарий узла (server-first SF1).
 * @deprecated Tariff v3 — edit lease вне тарифа v2 (канон v2.0 §9). Удаляется в CT7.
 */
export type BoardEditLeaseHolder = 'cabinet' | 'field' | 'none';

/**
 * Снимок edit lease (канал `board`, событие `board.edit-lease`).
 * @deprecated Tariff v3 — edit lease вне тарифа v2 (канон v2.0 §9). Удаляется в CT7.
 */
export interface BoardEditLeasePayload {
  readonly deviceId: string;
  readonly holder: BoardEditLeaseHolder;
  /** Идентификатор сессии кабинета; null при holder !== cabinet. */
  readonly sessionId: string | null;
  /** Версия документа сценария на момент lease. */
  readonly revision: number;
  /** ISO 8601; null = бессрочно (не рекомендуется в prod). */
  readonly expiresAt: string | null;
}

/** Чья команда `run` выполнялась последней (last-write-win, канон v2.0 §3.2). */
export type RuntimeAuthority = 'cabinet' | 'field';

/**
 * Режим follower при authority=cabinet.
 * @deprecated v1 legacy — заменён на `DeviceCaptureMode` (`capture.mode`). Удаляется в CT7.
 */
export type RuntimeFollowerMode = 'soft' | 'strict';

/**
 * Broadcast capture authority (канал `board`, событие `board.capture-state`).
 * @deprecated v1 legacy — заменён парой `board.capture` / `board.release`. Удаляется в CT7.
 */
export interface BoardCaptureStatePayload {
  readonly deviceId: string;
  readonly authority: RuntimeAuthority;
  readonly followerMode: RuntimeFollowerMode | null;
  readonly isRunning: boolean;
  readonly isPaused: boolean;
}
