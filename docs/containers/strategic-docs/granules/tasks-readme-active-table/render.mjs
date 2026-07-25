/**
 * Function granule: tasks-readme-active-table@1.0.0
 *
 * Секция «Активные задачи» README реестра. Набор берётся ТОЛЬКО из registry.json
 * (git — SoT) и приходит через io-адаптер: гранула не знает про fs.
 * Без адаптера падает на `pureIoThrow` — это и есть контракт чистоты движка.
 *
 * @param {{ pin?: { heading?: string }, ctx: { granuleId: string, version: string } }} input
 * @param {{ exec: (req: { op: string, args?: object }) => Promise<any> }} io
 * @returns {Promise<{ body: string }>}
 */
import { selectActive, renderActiveTable } from '../_shared/tasks-readme-rows.mjs';

export async function renderTasksActiveTable({ pin }, io) {
  const heading = pin?.heading ?? '## Активные задачи';
  const registry = await io.exec({ op: 'loadRegistry' });

  const body = [heading, '', renderActiveTable(selectActive(registry)), '', '---'].join('\n');
  return { body };
}
