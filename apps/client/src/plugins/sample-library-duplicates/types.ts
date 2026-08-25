/** Плагин «Дубли набора» в библиотеке (#2109) — пятая панель ряда. Показывает пары, ждёт слова. */

export const SAMPLE_LIBRARY_DUPLICATES_PLUGIN_ID = 'sample-library-duplicates';

export interface SampleLibraryDuplicatesPluginConfig {
  /** Пусто намеренно: окно дат — состояние ПАНЕЛИ на один прогон; порога у человека нет (унаследован). */
  readonly [key: string]: never;
}

export const defaultSampleLibraryDuplicatesConfig: SampleLibraryDuplicatesPluginConfig = {};
