/**
 * Function granule: tasks-readme-archive-table@1.0.0
 *
 * Секция «Архив» README реестра. Как и active-таблица — набор из registry.json
 * через io-адаптер, порядок «свежие сверху» по archivedAt (стабильно).
 *
 * @param {{ pin?: { heading?: string }, ctx: { granuleId: string, version: string } }} input
 * @param {{ exec: (req: { op: string, args?: object }) => Promise<any> }} io
 * @returns {Promise<{ body: string }>}
 */
import { selectArchived, renderArchiveTable } from '../_shared/tasks-readme-rows.mjs';

export async function renderTasksArchiveTable({ pin }, io) {
  const heading = pin?.heading ?? '## Архив';
  const registry = await io.exec({ op: 'loadRegistry' });

  const body = [heading, '', renderArchiveTable(selectArchived(registry)), '', '---'].join('\n');
  return { body };
}
