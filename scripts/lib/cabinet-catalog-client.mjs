/**
 * Fetch paginated tariff catalog from cabinet API (admin session).
 */

const DEFAULT_API = 'https://cabinet.membrana.space';
const PAGE_SIZE = 40;

/**
 * @param {string} apiBase
 * @param {string} login
 * @param {string} password
 */
export async function loginCabinet(apiBase, login, password) {
  const res = await fetch(`${apiBase.replace(/\/$/, '')}/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login, password }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new Error(`Cabinet login failed (${res.status}): ${detail}`);
  }
  const body = /** @type {{ token: string }} */ (await res.json());
  if (!body.token) throw new Error('Cabinet login: missing token');
  return body.token;
}

/**
 * @param {string} apiBase
 * @param {string} token
 */
export async function fetchMembraneId(apiBase, token) {
  const res = await fetch(`${apiBase.replace(/\/$/, '')}/v1/membranes/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new Error(`Cabinet /membranes/me failed (${res.status}): ${detail}`);
  }
  const body = /** @type {{ membrane: { id: string } }} */ (await res.json());
  return body.membrane.id;
}

/**
 * @param {string} apiBase
 * @param {string} token
 * @param {string} membraneId
 * @param {number} [pageSize]
 */
export async function fetchCatalogAllPages(apiBase, token, membraneId, pageSize = PAGE_SIZE) {
  const base = apiBase.replace(/\/$/, '');
  /** @type {import('./ground-truth-export.mjs').CatalogSampleRef[]} */
  const samples = [];
  let page = 1;
  let totalPages = 1;
  let sampleCount = 0;
  let catalogId = '';

  while (page <= totalPages) {
    const url = `${base}/v1/membranes/${encodeURIComponent(membraneId)}/catalog?page=${page}&limit=${pageSize}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => res.statusText);
      throw new Error(`Cabinet catalog page ${page} failed (${res.status}): ${detail}`);
    }
    const data = /** @type {{
      samples: import('./ground-truth-export.mjs').CatalogSampleRef[];
      totalPages: number;
      sampleCount: number;
      catalogId: string;
    }} */ (await res.json());
    totalPages = data.totalPages;
    sampleCount = data.sampleCount;
    catalogId = data.catalogId;
    samples.push(...data.samples);
    page += 1;
  }

  return { samples, sampleCount, catalogId, totalPages, membraneId };
}

/**
 * @param {{ apiBase?: string; login: string; password: string; membraneId?: string }} opts
 */
export async function fetchGroundTruthFromCabinet(opts) {
  const apiBase = opts.apiBase ?? DEFAULT_API;
  const token = await loginCabinet(apiBase, opts.login, opts.password);
  const membraneId = opts.membraneId ?? (await fetchMembraneId(apiBase, token));
  const catalog = await fetchCatalogAllPages(apiBase, token, membraneId);
  return {
    ...catalog,
    apiBase,
    fetchedAt: new Date().toISOString(),
  };
}
