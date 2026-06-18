import { ipcMain } from 'electron';

import type { JournalFsStore } from './journal-fs';

const PREFIX = 'membrana:journal';

export function registerJournalIpc(store: JournalFsStore): void {
  ipcMain.handle(`${PREFIX}:listItems`, () => store.listItems());
  ipcMain.handle(`${PREFIX}:getItemByClientEntryId`, (_e, clientEntryId: string) =>
    store.getItemByClientEntryId(clientEntryId),
  );
  ipcMain.handle(`${PREFIX}:appendTrack`, (_e, input: Parameters<JournalFsStore['appendTrack']>[0]) =>
    store.appendTrack(input),
  );
  ipcMain.handle(`${PREFIX}:appendReport`, (_e, input: Parameters<JournalFsStore['appendReport']>[0]) =>
    store.appendReport(input),
  );
  ipcMain.handle(`${PREFIX}:clearByFilter`, (_e, filter: Parameters<JournalFsStore['clearByFilter']>[0]) =>
    store.clearByFilter(filter),
  );
}
