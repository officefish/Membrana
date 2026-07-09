import type { ScenarioBlockKind, ScenarioNodeKind } from '@membrana/core';

import {
  V04_PALETTE_NODE_KINDS,
  paletteNodeLabel,
  type V04PaletteNodeKind,
} from '../graph/palette-node.js';

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

export function isScenarioBranchForFunctionInsert(branch: ScenarioBranchTab): boolean {
  return branch !== 'function';
}

/** Ветки, где клик по функции в сайдбаре открывает модалку (6 обработчиков/лупов). */
export const SCENARIO_BRANCHES_FOR_FUNCTION_MODAL: readonly ScenarioBranchTab[] = [
  'onConnect',
  'initial',
  'onStop',
  'onDisconnect',
  'main',
  'alarm',
];

/** Ширина левого сайдбара (совпадает с `BoardLeftSidebar`). */
export const BOARD_LEFT_SIDEBAR_WIDTH_CLASS = 'w-[clamp(14rem,18vw,20rem)]' as const;

/** Отступ шапки от левого края до зоны контента (после сайдбара). */
export const BOARD_HEADER_CONTENT_OFFSET_CLASS = 'pl-[clamp(14rem,18vw,20rem)]' as const;

/** Класс отступа шапки с учётом свёрнутого левого сайдбара. */
export function boardHeaderContentOffsetClass(leftSidebarCollapsed: boolean): string {
  return leftSidebarCollapsed ? '' : BOARD_HEADER_CONTENT_OFFSET_CLASS;
}

/**
 * Презентационные лейблы веток (MP7b RT6). Сериализованный ключ `initial`
 * не переименовывается в схеме документа — здесь только UI-лейбл «On start».
 */
export const BRANCH_TAB_LABEL: Record<ScenarioBranchTab, string> = {
  initial: 'On start',
  onConnect: 'On connect',
  onStop: 'On stop',
  main: 'onMainTick',
  alarm: 'onAlarmTick',
  onDisconnect: 'On disconnect',
  function: 'customFunc',
};

/** Заголовок активного сценария в шапке доски (человекочитаемый). */
export const BRANCH_SCENARIO_TITLE: Record<ScenarioBranchTab, string> = {
  initial: 'Сценарий запуска устройства',
  onConnect: 'Сценарий соединения с устройством',
  onStop: 'Сценарий остановки устройства',
  onDisconnect: 'Сценарий при потере соединения с устройством',
  main: 'Обработчик события кадра в обычном режиме',
  alarm: 'Обработчик события кадра в режиме тревоги',
  function: 'Пользовательская функция',
};

/** Заголовок слоя Signal в шапке. */
export const SIGNAL_LAYER_TITLE = 'Топология сигнала' as const;

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

/** Палитра v0.4 по умолчанию (Print / isValid / mic / streaming / fft). */
export const SCENARIO_V04_PALETTE: readonly V04PaletteItem[] = V04_PALETTE_NODE_KINDS.map((nodeKind) => ({
  nodeKind,
  label: paletteNodeLabel(nodeKind),
}));

/** Секция палитры v0.8 (категория «Конструкторы» — policy + ref constructors). */
export interface V04PaletteSection {
  readonly title: string;
  readonly items: readonly V04PaletteItem[];
}

function paletteSection(
  title: string,
  nodeKinds: readonly V04PaletteNodeKind[],
): V04PaletteSection {
  return {
    title,
    items: nodeKinds.map((nodeKind) => ({
      nodeKind,
      label: paletteNodeLabel(nodeKind),
    })),
  };
}

/** Палитра v0.4/v0.8 по секциям для правого сайдбара (A3). */
export const SCENARIO_V04_PALETTE_SECTIONS: readonly V04PaletteSection[] = [
  paletteSection('Устройство и управление', [
    'device-global',
    'stop-runtime',
    'pause-runtime',
    'sequence',
    'print',
    'is-valid',
    'get-microphone',
    'get-recorder',
    'get-spectral-analyser',
  ]),
  paletteSection('Async pipeline', [
    'start-async-job',
    'await-promise',
    'on-async-resolved',
    'cancel-async-jobs',
  ]),
  paletteSection('Поток и захват', [
    'start-streaming',
    'stop-streaming',
    'get-audio-stream',
    'get-sample',
    'get-fft-frame',
    'flush-spectral-analyser',
    'collect-samples',
    'collect-fft-frames',
  ]),
  paletteSection('Запись (gate)', [
    'start-recording',
    'stop-recording',
    'is-recording-window-full',
  ]),
  paletteSection('Конструкторы', [
    'make-recording-policy',
    'make-fft-trends-policy',
    'make-track',
    'make-fft-trends-analysis',
    'make-detection-fusion',
    'make-report-from-track',
    'make-report-from-analysis',
  ]),
  paletteSection('Журнал', ['get-journal', 'get-reporter', 'publish-report']),
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
