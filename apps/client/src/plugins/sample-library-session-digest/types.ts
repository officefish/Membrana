/** Плагин «Разбор сеанса» в библиотеке (#2039) — двадцать опорных звуков ночи, лицом. */

export const SAMPLE_LIBRARY_SESSION_DIGEST_PLUGIN_ID = 'sample-library-session-digest';

export interface SampleLibrarySessionDigestPluginConfig {
  /** Пусто намеренно: окно ночи — состояние ПАНЕЛИ на один прогон; пороги — рабочая точка ядра отчёта. */
  readonly [key: string]: never;
}

export const defaultSampleLibrarySessionDigestConfig: SampleLibrarySessionDigestPluginConfig = {};
