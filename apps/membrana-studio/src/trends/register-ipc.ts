import { ipcMain } from 'electron';

import type { TrendsTemplatesFsStore } from './trends-templates-fs';

const PREFIX = 'membrana:trends-templates';

export function registerTrendsTemplatesIpc(store: TrendsTemplatesFsStore): void {
  ipcMain.handle(`${PREFIX}:read`, () => store.read());
  ipcMain.handle(`${PREFIX}:write`, (_e, json: string) => store.write(json));
}
