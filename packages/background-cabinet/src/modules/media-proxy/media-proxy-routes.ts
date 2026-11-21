/**
 * Закрытый список ручек библиотеки прибора, которые браузер кабинета зовёт через сервер кабинета
 * (`/v1/media/devices/:deviceId/*` → media `/v1/devices/:deviceId/*`).
 *
 * Список — ровно то, что сегодня зовут три потребителя кабинета: слой библиотеки
 * (`packages/services/media-library/src/backends/server-storage-backend.ts`), сценарий доски
 * (`apps/cabinet/src/lib/cabinetDeviceScenario.ts`) и срок ключей треков
 * (`apps/cabinet/src/api/sampleLibrary.ts`). Путь вне списка — 404: прокси не открывает браузеру
 * ничего сверх того, что он уже делает. Новая ручка — новая строка здесь и новый зуб.
 *
 * Чистый модуль без Nest и сети: решения «пускать ли» и «какие заголовки» судятся таблицей в тестах.
 */

export type MediaProxyMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/** Как ехать телу запроса: без тела, JSON (разобран Nest) или сырой поток (multipart). */
export type MediaProxyBody = 'none' | 'json' | 'raw';

export interface MediaProxyRoute {
  readonly method: MediaProxyMethod;
  /** Шаблон относительно `/v1/devices/:deviceId`; `:x` — один сегмент. */
  readonly path: string;
  readonly body: MediaProxyBody;
  /** Разрешённые параметры строки запроса; прочие отбрасываются. */
  readonly query?: readonly string[];
}

/** Плагины, чьи прогоны слой библиотеки заказывает (`.../plugins/<id>/request`). */
export const MEDIA_PROXY_PLUGIN_REQUESTS = [
  'membrana.report.session-digest',
  'membrana.showcase.library-duplicates',
  'membrana.showcase.library-chart-list',
  'membrana.report.detector-batch',
] as const;

export const MEDIA_PROXY_ROUTES: readonly MediaProxyRoute[] = [
  { method: 'GET', path: '/quota', body: 'none' },
  { method: 'GET', path: '/collections', body: 'none' },
  { method: 'POST', path: '/collections', body: 'json' },
  { method: 'POST', path: '/collections/ensure-reserved', body: 'none' },
  { method: 'DELETE', path: '/collections/:collectionId', body: 'none' },
  { method: 'GET', path: '/collections/:collectionId/samples', body: 'none', query: ['page', 'limit'] },
  { method: 'POST', path: '/collections/:collectionId/samples', body: 'raw' },
  { method: 'GET', path: '/collections/:collectionId/plugins', body: 'none' },
  { method: 'PATCH', path: '/collections/:collectionId/plugins/:pluginId', body: 'json' },
  ...MEDIA_PROXY_PLUGIN_REQUESTS.map(
    (id): MediaProxyRoute => ({ method: 'POST', path: `/collections/:collectionId/plugins/${id}/request`, body: 'json' }),
  ),
  { method: 'POST', path: '/collections/:collectionId/buffer-cleanup/plan', body: 'json' },
  { method: 'POST', path: '/collections/:collectionId/buffer-cleanup/execute', body: 'json' },
  { method: 'POST', path: '/samples/move-batch', body: 'json' },
  { method: 'PATCH', path: '/samples/:sampleId', body: 'json' },
  { method: 'DELETE', path: '/samples/:sampleId', body: 'none' },
  { method: 'POST', path: '/samples/:sampleId/move', body: 'json' },
  { method: 'GET', path: '/samples/:sampleId/blob', body: 'none' },
  { method: 'GET', path: '/device-scenario', body: 'none' },
  { method: 'PUT', path: '/device-scenario', body: 'json' },
  { method: 'GET', path: '/track-key-ttl', body: 'none' },
  { method: 'PUT', path: '/track-key-ttl', body: 'json' },
];

/** id прибора media — uuid. */
export const MEDIA_DEVICE_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Белая форма значения каждого параметра пути. Ни одна форма не пропускает `%` (значит, ни
 * кодированных `.`/`..`, ни `%2f`/`%5c`), `/`, `\`, пустой сегмент и сегменты `.`/`..`: после
 * нормализации адреса в `fetch` цель не может уехать на другую ручку внутри прибора.
 *
 * - `collectionId` — uuid или служебный id вида `__buffer__` / `__tariff_dataset__`;
 * - `sampleId` — uuid (media создаёт пробы с `randomUUID`);
 * - `pluginId` — точечный id плагина (`membrana.report.session-digest`): части из `[a-z0-9-]`,
 *   точка только между непустыми частями.
 */
const PARAM_FORMS: Record<string, RegExp> = {
  collectionId: /^[A-Za-z0-9_-]+$/,
  sampleId: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  pluginId: /^[a-z0-9-]+(?:\.[a-z0-9-]+)*$/,
};

function paramOk(name: string, raw: string): boolean {
  const form = PARAM_FORMS[name];
  return form !== undefined && form.test(raw);
}

function matchesPattern(pattern: string, subpath: string): boolean {
  const want = pattern.split('/');
  const got = subpath.split('/');
  if (want.length !== got.length) return false;
  return want.every((w, i) => {
    const g = got[i]!;
    if (w.startsWith(':')) return paramOk(w.slice(1), g);
    return w === g;
  });
}

export interface MediaProxyMatch {
  readonly route: MediaProxyRoute;
  /** Путь для media относительно `/v1/devices/:deviceId`, с отфильтрованной строкой запроса. */
  readonly target: string;
}

/**
 * Решение «пускать ли»: метод и путь (с необязательной строкой запроса) после
 * `/v1/media/devices/:deviceId`. `null` — ручки нет в списке (404).
 */
export function matchMediaProxyRoute(method: string, pathWithQuery: string): MediaProxyMatch | null {
  const upper = method.toUpperCase();
  const q = pathWithQuery.indexOf('?');
  const subpath = q >= 0 ? pathWithQuery.slice(0, q) : pathWithQuery;
  const search = q >= 0 ? pathWithQuery.slice(q + 1) : '';
  if (!subpath.startsWith('/')) return null;
  const route = MEDIA_PROXY_ROUTES.find((r) => r.method === upper && matchesPattern(r.path, subpath));
  if (!route) return null;
  const params = new URLSearchParams(search);
  const kept = new URLSearchParams();
  for (const name of route.query ?? []) {
    const value = params.get(name);
    if (value !== null) kept.set(name, value);
  }
  const qs = kept.toString();
  return { route, target: qs ? `${subpath}?${qs}` : subpath };
}

/** Заголовки запроса браузера, которые едут в media. Учётные данные браузера не едут никогда. */
const FORWARD_REQUEST_HEADERS = ['content-type', 'content-length', 'accept', 'range', 'x-membrana-trace-id'] as const;

/** Заголовки ответа media, которые едут в браузер. */
const FORWARD_RESPONSE_HEADERS = [
  'content-type',
  'content-length',
  'content-disposition',
  'content-range',
  'accept-ranges',
  'cache-control',
  'etag',
  'last-modified',
] as const;

type HeaderBag = Record<string, string | string[] | undefined>;

function pick(source: HeaderBag, names: readonly string[]): Record<string, string> {
  const lower: Record<string, string> = {};
  for (const [k, v] of Object.entries(source)) {
    if (v === undefined) continue;
    lower[k.toLowerCase()] = Array.isArray(v) ? v.join(', ') : v;
  }
  const out: Record<string, string> = {};
  for (const name of names) {
    if (lower[name] !== undefined) out[name] = lower[name]!;
  }
  return out;
}

/**
 * Заголовки запроса к media из браузерных: только список выше, плюс id прибора из пути. Служебный
 * ключ кабинета сюда НЕ входит — его ставит мост (`MediaBridgeService.forwardDeviceRequest`), единственный
 * держатель. `body: 'json'` — тело пересобрано кабинетом, тип ставится заново, длину считает транспорт;
 * `body: 'none'` — без объявления тела.
 */
export function mediaProxyRequestHeaders(
  incoming: HeaderBag,
  body: MediaProxyBody,
  deviceId: string,
): Record<string, string> {
  const out = pick(incoming, FORWARD_REQUEST_HEADERS);
  if (body !== 'raw') {
    delete out['content-type'];
    delete out['content-length'];
  }
  if (body === 'json') out['content-type'] = 'application/json';
  out['x-membrana-device-id'] = deviceId;
  return out;
}

/** Заголовки ответа браузеру — только из списка; служебные заголовки media не едут. */
export function mediaProxyResponseHeaders(incoming: HeaderBag): Record<string, string> {
  return pick(incoming, FORWARD_RESPONSE_HEADERS);
}

/**
 * Статус ответа браузеру. Отказ media в доступе (401/403) — сбой соседа, а не сессии пользователя:
 * браузер не должен принять его за конец своей сессии. Прочее — как есть.
 */
export function mediaProxyStatus(mediaStatus: number): number {
  return mediaStatus === 401 || mediaStatus === 403 ? 502 : mediaStatus;
}
