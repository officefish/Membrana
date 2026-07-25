/**
 * Function granule: readme-package-layers-table@1.0.0
 * Pure formatter — канон слоёв/зависимостей; при изменении ARCHITECTURE бампить version.
 *
 * @param {{ pin?: { heading?: string, rows?: Array<{ layer: string, packages: string, deps: string }> }, ctx: { granuleId: string, version: string } }} input
 * @param {{ exec: (req: object) => Promise<unknown> }} _io
 * @returns {Promise<{ body: string }>}
 */
export async function renderPackageLayersTable({ pin }, _io) {
  const heading = pin?.heading ?? '## Структура пакетов';

  /** @type {Array<{ layer: string, packages: string, deps: string }>} */
  const rows = pin?.rows ?? [
    {
      layer: '**Core**',
      packages: '`@membrana/core`',
      deps: '—',
    },
    {
      layer: '**Client libs**',
      packages: '`@membrana/agenda`, `@membrana/device-board`',
      deps: '`@membrana/core`',
    },
    {
      layer: '**Shared libs**',
      packages: '`packages/libs/*` (`audioDataViz`, `detector-report`, `journal-report-views`)',
      deps: 'по пакету',
    },
    {
      layer: '**Services**',
      packages: '`packages/services/*` — foundation + analyzer',
      deps: 'см. [`packages/services/README.md`](./packages/services/README.md)',
    },
    {
      layer: '**Background**',
      packages: '`background-office`, `background-media`, `background-cabinet`',
      deps: 'NestJS, см. [`docs/BACKGROUND_SERVERS.md`](./docs/BACKGROUND_SERVERS.md)',
    },
    {
      layer: '**Apps**',
      packages: '`@membrana/client`, `@membrana/cabinet`, `@membrana/membrana-studio`',
      deps: 'зависят от libs/services по сценарию',
    },
  ];

  const tableHeader =
    '| Слой            | Пакеты                                                                        | Зависимости                                                              |\n' +
    '| --------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------ |';

  const tableBody = rows
    .map((r) => `| ${r.layer}        | ${r.packages} | ${r.deps} |`)
    .join('\n');

  const body = [heading, '', tableHeader, tableBody].join('\n');

  return { body };
}
