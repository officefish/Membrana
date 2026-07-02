/** Контекст сессии device-board (U10 W2-module + tariff v2 CT7). */
export type DeviceBoardSession =
  | {
      readonly kind: 'user-edit';
      readonly workspaceId: string;
      readonly title: string;
    }
  | {
      readonly kind: 'system-preview';
      readonly userCaseId: string;
      readonly title: string;
    }
  | {
      /**
       * CT7 (канон v2.0 §1): кабинетский борд в тарифе v2 — только просмотр.
       * // Tariff v3: редактирование с сервера (edit lease).
       */
      readonly kind: 'cabinet-view';
      readonly title: string;
    };

export function isDeviceBoardSessionReadOnly(session: DeviceBoardSession | null): boolean {
  return session?.kind === 'system-preview' || session?.kind === 'cabinet-view';
}
