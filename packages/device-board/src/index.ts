/**
 * @membrana/device-board — визуальный граф обработки сигнала (нод-доска).
 * См. DEVICE_BOARD_CONCEPT.md. Публичный API в стадии D0; ниже — временный каркас.
 */

export * from './types.js';
export * from './device-board-service.js';

export { DeviceBoardModeProvider, useDeviceBoardMode } from './context/device-board-mode-context.js';
export type { DeviceBoardModeContextValue, DeviceBoardModeProviderProps, DeviceBoardSession } from './context/device-board-mode-context.js';
export { isDeviceBoardSessionReadOnly } from './types/device-board-session.js';
export { DeviceBoardGraphProvider, useDeviceBoardGraph } from './context/device-board-graph-context.js';
export type { DeviceBoardGraphContextValue, DeviceBoardGraphProviderProps, ApplyUserCaseOutcome } from './context/device-board-graph-context.js';
export { DeviceBoardShell } from './components/device-board-shell.js';
export type { DeviceBoardShellProps } from './components/device-board-shell.js';
export { BoardUserCasePickerModal } from './components/board-usercase-picker-modal.js';
export type { DeviceBoardUserCasePickerConfig, UserCasePickerCard } from './types/user-case-picker.js';
export { BoardFlowCanvas } from './components/board-flow-canvas.js';
export { BoardInspector } from './components/board-inspector.js';
export { BoardLeftSidebar } from './components/board-left-sidebar.js';
export { BoardRightSidebar } from './components/board-right-sidebar.js';
export type { BoardLayerTab, ScenarioBranchTab, BranchSidebarSection, NodePaletteCategory, V04PaletteItem, V04PaletteSection } from './types/board-ui.js';
export {
  BRANCH_TAB_LABEL,
  BRANCH_SIDEBAR_SECTIONS,
  SCENARIO_NODE_PALETTE,
  LEGACY_SCENARIO_NODE_PALETTE,
  SCENARIO_V04_PALETTE,
  SCENARIO_V04_PALETTE_SECTIONS,
  isLegacyPaletteEnabled,
  isSignalAdvancedEnabled,
  activeV04PaletteNodeKinds,
} from './types/board-ui.js';
export * from './graph/index.js';
export * from './catalog/index.js';
export * from './runtime/index.js';
export type {
  DeviceBoardPersistAdapter,
  DeviceBoardPersistController,
  DeviceScenarioRemoteRecord,
} from './persist/device-board-persist.js';
export type {
  DeviceBoardWorkspaceHost,
  DeviceBoardWorkspaceListItem,
} from './persist/device-board-workspace-host.js';
export { BoardWorkspacePickerModal } from './components/board-workspace-picker-modal.js';
