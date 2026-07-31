/**
 * Единственная публичная дверь прибора тембрового теста. Всё, чего здесь нет, — внутренность.
 *
 * Решение структурщика в блоке включения: наружу выходят фабрика, идентификатор, панель и
 * считалка (её подаёт модуль). `installMfccAnalyzerTest`, судейство кадра и серии, состояние,
 * отчёт и пресет остаются внутри — потребителю они не нужны, а вынесенные наружу они стали бы
 * частью договора, который никто не собирался заключать.
 */
export { createMfccAnalyzerTestPlugin } from './mfccAnalyzerTestPlugin';
export { MFCC_ANALYZER_TEST_PLUGIN_ID } from './mfccAnalyzerPlugin';
export { MfccTestPanel } from './MfccTestPanel';
export { getMfccExtractor } from './mfccExtractor';
export { MFCC_PRESET_FIRST_CUT } from './presets';
