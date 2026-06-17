/** Вкладка слоя доски: топология сигнала или сценарий исполнения. */
export type BoardLayerTab = 'signal' | 'scenario';

/** Ветка scenario graph на вкладке Scenario. */
export type ScenarioBranchTab = 'initial' | 'main' | 'alarm' | 'onStop' | 'onDisconnect' | 'function';