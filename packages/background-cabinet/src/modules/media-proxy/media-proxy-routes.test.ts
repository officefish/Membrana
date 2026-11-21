import { describe, expect, it } from 'vitest';

import {
  MEDIA_PROXY_ROUTES,
  matchMediaProxyRoute,
  mediaProxyRequestHeaders,
  mediaProxyResponseHeaders,
  mediaProxyStatus,
} from './media-proxy-routes';

const S = '7d1c2b8e-1111-4a2b-9c3d-0123456789ab';

describe('закрытый список ручек библиотеки', () => {
  it('ровно ручки трёх потребителей кабинета — список как контракт', () => {
    expect(MEDIA_PROXY_ROUTES.map((r) => `${r.method} ${r.path}`)).toEqual([
      'GET /quota',
      'GET /collections',
      'POST /collections',
      'POST /collections/ensure-reserved',
      'DELETE /collections/:collectionId',
      'GET /collections/:collectionId/samples',
      'POST /collections/:collectionId/samples',
      'GET /collections/:collectionId/plugins',
      'PATCH /collections/:collectionId/plugins/:pluginId',
      'POST /collections/:collectionId/plugins/membrana.report.session-digest/request',
      'POST /collections/:collectionId/plugins/membrana.showcase.library-duplicates/request',
      'POST /collections/:collectionId/plugins/membrana.showcase.library-chart-list/request',
      'POST /collections/:collectionId/plugins/membrana.report.detector-batch/request',
      'POST /collections/:collectionId/buffer-cleanup/plan',
      'POST /collections/:collectionId/buffer-cleanup/execute',
      'POST /samples/move-batch',
      'PATCH /samples/:sampleId',
      'DELETE /samples/:sampleId',
      'POST /samples/:sampleId/move',
      'GET /samples/:sampleId/blob',
      'GET /device-scenario',
      'PUT /device-scenario',
      'GET /track-key-ttl',
      'PUT /track-key-ttl',
    ]);
  });

  it.each([
    ['GET', '/quota'],
    ['GET', '/collections/__buffer__/samples?page=2&limit=50'],
    ['POST', '/collections/__buffer__/samples'],
    ['GET', `/samples/${S}/blob`],
    ['POST', '/collections/__buffer__/plugins/membrana.showcase.library-chart-list/request'],
    ['put', '/track-key-ttl'],
  ])('%s %s — пускается', (method, path) => {
    expect(matchMediaProxyRoute(method, path)).not.toBeNull();
  });

  it.each([
    ['GET', ''],
    ['GET', '/'],
    ['DELETE', '/client-key'],
    ['POST', '/client-key'],
    ['PUT', '/membrane'],
    ['GET', '/downgrade-archive/batches'],
    ['POST', '/downgrade-archive/freeze'],
    ['PUT', '/quota'],
    ['GET', '/samples/../client-key'],
    ['GET', `/samples/${S}%2F..%2Fclient-key/blob`],
    ['GET', '/samples/a/b/blob'],
    ['POST', '/collections/__buffer__/plugins/some.other.plugin/request'],
    ['HEAD', '/quota'],
  ])('%s %s — вне списка → null', (method, path) => {
    expect(matchMediaProxyRoute(method, path)).toBeNull();
  });

  it('строка запроса — только объявленные параметры', () => {
    expect(matchMediaProxyRoute('GET', '/collections/__buffer__/samples?page=2&limit=50&deviceId=x')?.target).toBe(
      '/collections/__buffer__/samples?page=2&limit=50',
    );
    expect(matchMediaProxyRoute('GET', '/quota?anything=1')?.target).toBe('/quota');
  });
});

describe('заголовки', () => {
  const browser = {
    authorization: 'Bearer session',
    cookie: 'c=1',
    'x-membrana-token': 'from-browser',
    'x-membrana-device-id': 'other',
    'content-type': 'multipart/form-data; boundary=x',
    'content-length': '10',
    'x-membrana-trace-id': 't-1',
    range: 'bytes=0-',
  };

  it('учётные данные браузера в media не едут; прибор — из пути', () => {
    const h = mediaProxyRequestHeaders(browser, 'raw', S);
    expect(h).toEqual({
      'content-type': 'multipart/form-data; boundary=x',
      'content-length': '10',
      range: 'bytes=0-',
      'x-membrana-trace-id': 't-1',
      'x-membrana-device-id': S,
    });
  });

  it('json — тип ставится заново, длина не переносится; none — без объявления тела', () => {
    expect(mediaProxyRequestHeaders(browser, 'json', S)['content-type']).toBe('application/json');
    expect(mediaProxyRequestHeaders(browser, 'json', S)['content-length']).toBeUndefined();
    expect(mediaProxyRequestHeaders(browser, 'none', S)['content-type']).toBeUndefined();
  });

  it('ответ браузеру — только заголовки из списка', () => {
    expect(
      mediaProxyResponseHeaders({
        'Content-Type': 'audio/wav',
        'content-length': '3',
        'set-cookie': 'x',
        'x-membrana-token': 'echo',
        'x-powered-by': 'nest',
        'accept-ranges': 'bytes',
      }),
    ).toEqual({ 'content-type': 'audio/wav', 'content-length': '3', 'accept-ranges': 'bytes' });
  });

  it('отказ media в доступе — 502, а не 401 сессии пользователя', () => {
    expect(mediaProxyStatus(401)).toBe(502);
    expect(mediaProxyStatus(403)).toBe(502);
    expect(mediaProxyStatus(404)).toBe(404);
    expect(mediaProxyStatus(200)).toBe(200);
  });
});
