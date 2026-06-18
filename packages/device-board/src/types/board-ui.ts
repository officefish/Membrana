import type { ScenarioBlockKind } from '@membrana/core';

/** Вкладка слоя доски: топология сигнала или сценарий исполнения. */
export type BoardLayerTab = 'signal' | 'scenario';

/** Ветка scenario graph на вкладке Scenario. */
export type ScenarioBranchTab = 'initial' | 'main' | 'alarm' | 'onStop' | 'onDisconnect' | 'function';

/**
 * Презентационные лейблы веток (MP7b RT6). Сериализованный ключ `initial`
 * не переименовывается в схеме документа — здесь только UI-лейбл «On start».
 */
export const BRANCH_TAB_LABEL: Record<ScenarioBranchTab, string> = {
  initial: 'On start',
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
 * Порядок и группировка вкладок левого сайдбара (MP7b RT6):
 * системные триггеры → лупы → триггер узла → конструктор функций.
 */
export const BRANCH_SIDEBAR_SECTIONS: readonly BranchSidebarSection[] = [
  { title: 'Системные триггеры', tabs: ['initial', 'onStop'] },
  { title: 'Лупы', tabs: ['main', 'alarm'] },
  { title: 'Триггер узла', tabs: ['onDisconnect'] },
  { title: 'Конструктор функций', tabs: ['function'] },
];

/** Категория палитры нод сценария (правый сайдбар в режиме сборки). */
export interface NodePaletteCategory {
  readonly title: string;
  readonly blockKinds: readonly ScenarioBlockKind[];
}

/** Палитра scenario-нод по категориям (MP7b RT6): добавление в активную ветку. */
export const SCENARIO_NODE_PALETTE: readonly NodePaletteCategory[] = [
  { title: 'Триггеры', blockKinds: ['select-microphone', 'stop-scenario', 'handle-disconnect'] },
  { title: 'Поток', blockKinds: ['start-stream', 'record-chunk'] },
  { title: 'Анализ', blockKinds: ['trends-fft-detect', 'evaluate-sound-level', 'branch-on-detection'] },
  { title: 'Журнал', blockKinds: ['write-journal'] },
  { title: 'Функции', blockKinds: ['subgraph', 'custom'] },
];

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
