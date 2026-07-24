import { apiPath } from './appMeta';

export type ChainStep = { provider: string; model: string };

export type CatalogModel = { id: string; label: string };

export type CatalogProvider = {
  id: string;
  title: string;
  defaultModel: string;
  models: CatalogModel[];
};

export type ProviderCatalog = {
  ritualEnum: string[];
  providers: CatalogProvider[];
};

export type EffectiveProcedure = {
  procedureId: string;
  chain: ChainStep[];
  source: 'overlay' | 'default';
  meters: boolean;
  title?: string;
  yarnScript?: string;
  group?: string;
};

export type DaySummary = {
  date: string;
  count: number;
  okCount: number;
  failCount: number;
  tokensIn: number | null;
  tokensOut: number | null;
  byProcedure: Record<
    string,
    { count: number; okCount: number; failCount: number; tokensIn: number | null; tokensOut: number | null }
  >;
  byProvider: Record<
    string,
    { count: number; okCount: number; failCount: number; tokensIn: number | null; tokensOut: number | null }
  >;
  recent: Array<{
    eventId: string;
    ts: string;
    procedureId: string;
    provider: string;
    model: string;
    source: string;
    ok: boolean;
    tokensIn?: number | null;
    tokensOut?: number | null;
    errorClass?: string;
  }>;
};

async function ownerFetch(path: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(apiPath(path), { credentials: 'include', ...init });
  if (res.status === 404) throw new Error('Раздел доступен только владельцу — войдите заново.');
  if (!res.ok) throw new Error(`Запрос не прошёл (HTTP ${res.status}) — попробуйте ещё раз.`);
  if (res.status === 204) return null;
  return res.json();
}

export async function fetchEffectiveProcedures(): Promise<EffectiveProcedure[]> {
  const raw = (await ownerFetch('llm-procedure/effective/owner')) as {
    procedures?: EffectiveProcedure[];
  };
  return Array.isArray(raw.procedures) ? raw.procedures : [];
}

export async function fetchProviderCatalog(): Promise<ProviderCatalog> {
  const raw = (await ownerFetch('llm-procedure/catalog')) as ProviderCatalog;
  return {
    ritualEnum: Array.isArray(raw.ritualEnum) ? raw.ritualEnum : [],
    providers: Array.isArray(raw.providers) ? raw.providers : [],
  };
}

export async function fetchOverlay(): Promise<Record<string, { chain: ChainStep[] }>> {
  const raw = (await ownerFetch('llm-procedure/overlay')) as {
    procedures?: Record<string, { chain: ChainStep[] }>;
  };
  return raw.procedures && typeof raw.procedures === 'object' ? raw.procedures : {};
}

export async function putOverlayChain(
  procedureId: string,
  chain: ChainStep[],
): Promise<{ ok: true; chain: ChainStep[] }> {
  const raw = (await ownerFetch(`llm-procedure/overlay/${encodeURIComponent(procedureId)}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chain }),
  })) as { ok?: boolean; chain?: ChainStep[] };
  return { ok: true, chain: Array.isArray(raw.chain) ? raw.chain : chain };
}

export async function deleteOverlayChain(procedureId: string): Promise<void> {
  await ownerFetch(`llm-procedure/overlay/${encodeURIComponent(procedureId)}`, {
    method: 'DELETE',
  });
}

export async function fetchDaySummary(date?: string): Promise<DaySummary> {
  const q = date ? `?date=${encodeURIComponent(date)}` : '';
  return (await ownerFetch(`llm-usage/day${q}`)) as DaySummary;
}

export function formatTokens(n: number | null | undefined): string {
  if (n == null) return '—';
  return String(n);
}
