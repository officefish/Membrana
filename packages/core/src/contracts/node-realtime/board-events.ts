/** Кто держит edit lease на сценарий узла (server-first SF1). */
export type BoardEditLeaseHolder = 'cabinet' | 'field' | 'none';

/** Снимок edit lease (канал `board`, событие `board.edit-lease`). */
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

/** Операционный захват runtime (не mic capture). */
export type RuntimeAuthority = 'cabinet' | 'field';

/** Режим follower при authority=cabinet. */
export type RuntimeFollowerMode = 'soft' | 'strict';

/** Broadcast capture authority (канал `board`, событие `board.capture-state`). */
export interface BoardCaptureStatePayload {
  readonly deviceId: string;
  readonly authority: RuntimeAuthority;
  readonly followerMode: RuntimeFollowerMode | null;
  readonly isRunning: boolean;
  readonly isPaused: boolean;
}
