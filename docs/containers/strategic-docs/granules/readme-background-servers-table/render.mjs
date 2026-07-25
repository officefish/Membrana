/**
 * Function granule: readme-background-servers-table@1.0.0
 * Pure formatter — канон портов/команд; при изменении BACKGROUND_SERVERS бампить version.
 *
 * @param {{ pin?: { heading?: string }, ctx: { granuleId: string, version: string } }} input
 * @param {{ exec: (req: object) => Promise<unknown> }} _io
 * @returns {Promise<{ body: string }>}
 */
export async function renderBackgroundServersTable({ pin }, _io) {
  const heading = pin?.heading ?? '### Фоновые серверы (опционально)';

  /** @type {Array<{ name: string, command: string, port: number, purpose: string }>} */
  const rows = [
    {
      name: 'office',
      command: '`yarn office:dev`',
      port: 3000,
      purpose: 'Claude, Linear, GitHub',
    },
    {
      name: 'media',
      command: '`yarn media:db:up` → `yarn media:migrate` → `yarn media:dev`',
      port: 3010,
      purpose: 'Sample library, trends',
    },
    {
      name: 'cabinet',
      command: '`yarn cabinet:db:up` → `yarn cabinet:migrate` → `yarn cabinet:dev`',
      port: 3020,
      purpose: 'Auth, мембраны, pairing',
    },
  ];

  const tableHeader =
    '| Сервер  | Команда                                                            | Порт | Назначение              |\n' +
    '| ------- | ------------------------------------------------------------------ | ---- | ----------------------- |';

  const tableBody = rows
    .map((r) => `| ${r.name}  | ${r.command} | ${r.port} | ${r.purpose}  |`)
    .join('\n');

  const footer =
    'Подробнее: [`docs/BACKGROUND_SERVERS.md`](./docs/BACKGROUND_SERVERS.md). Клиент работает без `.env` и без серверов (localStorage / IndexedDB).';

  const body = [heading, '', tableHeader, tableBody, '', footer].join('\n');

  return { body };
}
