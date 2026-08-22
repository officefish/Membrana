/**
 * Имя дома, которым журнал кабинета крепит плагины. Собственное имя модуля, а не копия реестра:
 * реестр домов живёт в `@membrana/plugin-contracts` и здесь только проверяется типом `HomeName`.
 *
 * Заведено на интеграции коворка `cowork-server-plugin-pages` (адаптер И-1) взамен снятого
 * стаба `contracts.stub.ts`: константа принадлежит модулю, а формы контрактов — пакету.
 */
import type { HomeName } from '@membrana/plugin-contracts' with { 'resolution-mode': 'import' };

export const JOURNAL_HOME: HomeName = 'background-cabinet/journal';
