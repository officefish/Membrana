/**
 * Баннер хранилища при загрузке (#2570). Инвариант резчика I2: пока снимок `loading`, баннер не
 * говорит «Media-server недоступен» и не печатает чисел (0.0 / 100.0 MB начального снимка).
 * Предупреждение — только по факту отказа: запасной локальный сервис, поставленный и прочитанный.
 */
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  createBrowserLimitedStorageBackend,
  createMediaLibraryService,
  createServerStorageBackend,
} from '@membrana/media-library-service';

import { MediaLibraryQuotaBanner } from './MediaLibraryQuotaBanner';

const UNAVAILABLE = 'Media-server недоступен';

function render(props: React.ComponentProps<typeof MediaLibraryQuotaBanner>): string {
  return renderToStaticMarkup(<MediaLibraryQuotaBanner {...props} />);
}

describe('MediaLibraryQuotaBanner (#2570)', () => {
  it('P4b: связанный режим до первого ответа сервера — «Загрузка коллекций…», без предупреждения и чисел', () => {
    const svc = createMediaLibraryService(
      createServerStorageBackend({ baseUrl: 'https://media.test', deviceId: 'd', mediaToken: 't' }),
    );
    const snap = svc.getSnapshot();
    const html = render({ quota: snap.quota, loadState: snap.loadState });
    expect(html).not.toContain(UNAVAILABLE);
    expect(html).not.toContain('100.0 MB');
    expect(html).not.toContain('alert-warning');
    expect(html).toContain('Загрузка коллекций…');
  });

  it('P8: реальный отказ — запасной локальный сервис после init: предупреждение есть', async () => {
    const svc = createMediaLibraryService(createBrowserLimitedStorageBackend(100 * 1024 * 1024));
    await svc.init();
    const snap = svc.getSnapshot();
    const html = render({ quota: snap.quota, loadState: snap.loadState });
    expect(html).toContain(UNAVAILABLE);
    expect(html).toContain('alert-warning');
  });

  it('серверная деградация после чтения — прежняя подсказка, не загрузка', () => {
    const html = render({
      quota: { usedBytes: 1, limitBytes: 2, backend: 'server', serverReachable: false, readAt: '2026-10-03T00:00:00.000Z' },
      loadState: 'ready',
    });
    expect(html).toContain('Связь с media-server нестабильна');
    expect(html).not.toContain('Загрузка коллекций…');
  });
});
