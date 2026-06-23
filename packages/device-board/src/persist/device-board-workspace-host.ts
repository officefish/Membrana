import type { DeviceScenarioDocument } from '@membrana/core';

/** Краткая запись user workspace для picker (U10 W2). */
export interface DeviceBoardWorkspaceListItem {
  readonly workspaceId: string;
  readonly title: string;
  readonly updatedAt: string;
}

/** Host CRUD user workspace; реализация в client (IndexedDB). */
export interface DeviceBoardWorkspaceHost {
  readonly maxUserWorkspaces: number;
  listWorkspaces(): Promise<readonly DeviceBoardWorkspaceListItem[]>;
  countWorkspaces(): Promise<number>;
  getActiveWorkspaceId(): Promise<string | null>;
  loadWorkspace(workspaceId: string): Promise<DeviceScenarioDocument | null>;
  createWorkspace(title: string): Promise<{
    readonly workspaceId: string;
    readonly document: DeviceScenarioDocument;
  } | null>;
  renameWorkspace(workspaceId: string, title: string): Promise<boolean>;
  deleteWorkspace(workspaceId: string): Promise<boolean>;
  setActiveWorkspaceId(workspaceId: string): Promise<void>;
}
