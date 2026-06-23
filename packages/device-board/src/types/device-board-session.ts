/** Контекст сессии device-board (U10 W2-module). */
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
    };

export function isDeviceBoardSessionReadOnly(session: DeviceBoardSession | null): boolean {
  return session?.kind === 'system-preview';
}
