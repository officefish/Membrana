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
    ['DELETE', '/collections/0b9c2d1e-3f4a-4b5c-8d6e-7f8091a2b3c4'],
    ['GET', '/collections/__tariff_dataset__/samples'],
    ['PATCH', '/collections/__buffer__/plugins/membrana.report.session-digest'],
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
    // обход через точечные и кодированные сегменты: после нормализации адреса цель уехала бы на другую ручку
    ['PATCH', '/collections/../plugins/..'],
    ['PATCH', '/collections/__buffer__/plugins/..'],
    ['PATCH', '/collections/__buffer__/plugins/.'],
    ['PATCH', '/collections/__buffer__/plugins/.hidden'],
    ['PATCH', '/collections/__buffer__/plugins/a..b'],
    ['GET', '/samples/%2e%2e/blob'],
    ['GET', '/samples/%2E%2e/blob'],
    ['GET', '/samples/./blob'],
    ['GET', '/samples//blob'],
    ['DELETE', '/collections/%2e%2e'],
    ['DELETE', '/collections/a%2fb'],
    ['DELETE', '/collections/a%5cb'],
    ['DELETE', '/collections/a.b'],
    ['DELETE', '/collections/'],
    ['PATCH', '/samples/not-a-uuid'],
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
