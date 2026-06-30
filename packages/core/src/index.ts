/**
 * @membrana/core — единая точка входа в публичное API ядра.
 *
 * ВАЖНО: всё, что должно быть доступно потребителям пакета,
 * экспортируется отсюда. Любые внутренние модули — приватны.
 */

export * from './types/index.js';
export * from './errors/index.js';
export * from './utils/index.js';
export * from './contracts/index.js';
export * from './secret-patterns.js';
