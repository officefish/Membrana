import type { ScenarioBlockKind, ScenarioNodeKind } from '@membrana/core';

import { V04_PALETTE_NODE_KINDS, paletteNodeLabel, type V04PaletteNodeKind } from '../graph/palette-node.js';

/** Вкладка слоя доски: топология сигнала или сценарий исполнения. */
export type BoardLayerTab = 'signal' | 'scenario';

/** Ветка scenario graph на вкладке Scenario. */
export type ScenarioBranchTab =
  | 'initial'
  | 'onConnect'
  | 'main'
  | 'alarm'
  | 'onStop'
  | 'onDisconnect'
  | 'function';

/**
 * Презентационные лейблы веток (MP7b RT6). Сериализованный ключ `initial`
 * не переименовывается в схеме документа — здесь только UI-лейбл «On start».
 */
export const BRANCH_TAB_LABEL: Record<ScenarioBranchTab, string> = {
  initial: 'On start',
  onConnect: 'On connect',
  onStop: 'On stop',
  main: 'Main loop',
  alarm: 'Alarm loop',
  onDisconnect: 'On disconnect',
  function: 'customFunc',
};

/** Секция левого сайдбара доски: заголовок + входящие вкладки веток. */
export interface BranchSidebarSection {
  readonly title: string;
  readonly tabs: readonly ScenarioBranchTab[];
}

/**
 * Порядок и группировка вкладок левого сайдбара (v0.4 DBR3):
 * 4 обработчика событий → лупы → конструктор функций.
 */
export const BRANCH_SIDEBAR_SECTIONS: readonly BranchSidebarSection[] = [
  { title: 'Обработчики событий', tabs: ['onConnect', 'initial', 'onStop', 'onDisconnect'] },
  { title: 'Лупы', tabs: ['main', 'alarm'] },
  { title: 'Конструктор функций', tabs: ['function'] },
];

/** Категория палитры нод сценария (правый сайдбар в режиме сборки). */
export interface NodePaletteCategory {
  readonly title: string;
  readonly blockKinds: readonly ScenarioBlockKind[];
}

/** Legacy-палитра D0 (хакатон) — только под флагом `VITE_DEVICE_BOARD_LEGACY_PALETTE`. */
export const LEGACY_SCENARIO_NODE_PALETTE: readonly NodePaletteCategory[] = [
  { title: 'Триггеры', blockKinds: ['select-microphone', 'stop-scenario', 'handle-disconnect'] },
  { title: 'Поток', blockKinds: ['start-stream', 'record-chunk'] },
  { title: 'Анализ', blockKinds: ['trends-fft-detect', 'evaluate-sound-level', 'branch-on-detection'] },
  { title: 'Журнал', blockKinds: ['write-journal'] },
  { title: 'Функции', blockKinds: ['subgraph', 'custom'] },
];

/** @deprecated Используйте `LEGACY_SCENARIO_NODE_PALETTE` или v0.4 палитру. */
export const SCENARIO_NODE_PALETTE = LEGACY_SCENARIO_NODE_PALETTE;

/** Элемент палитры v0.4 (DBR5): Print / isValid / GetMicrophone. */
export interface V04PaletteItem {
  readonly nodeKind: V04PaletteNodeKind;
  readonly label: string;
}

/** Палитра v0.4 по умолчанию (3 узла). */
export const SCENARIO_V04_PALETTE: readonly V04PaletteItem[] = V04_PALETTE_NODE_KINDS.map((nodeKind) => ({
  nodeKind,
  label: paletteNodeLabel(nodeKind),
}));

/**
 * Слой Signal спрятан за advanced-флагом (MP7b RT6): сериализация сигнала
 * сохраняется в документе, но UI редактора сигнала скрыт без флага.
 */
export function isSignalAdvancedEnabled(): boolean {
  try {
    const env = (import.meta as unknown as { env?: Record<string, unknown> }).env;
    return env?.VITE_DEVICE_BOARD_SIGNAL_ADVANCED === 'true';
  } catch {
    return false;
  }
}

/** Legacy D0-палитра (хакатон) — только при `VITE_DEVICE_BOARD_LEGACY_PALETTE=true`. */
export function isLegacyPaletteEnabled(): boolean {
  try {
    const env = (import.meta as unknown as { env?: Record<string, unknown> }).env;
    return env?.VITE_DEVICE_BOARD_LEGACY_PALETTE === 'true';
  } catch {
    return false;
  }
}

/** Активные nodeKind палитры v0.4 (пусто, если включена legacy-палитра). */
export function activeV04PaletteNodeKinds(): readonly ScenarioNodeKind[] {
  return isLegacyPaletteEnabled() ? [] : SCENARIO_V04_PALETTE.map((item) => item.nodeKind);
}
