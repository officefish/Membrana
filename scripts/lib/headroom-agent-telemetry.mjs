const CLIENTS = new Set(['codex', 'claude-code', 'cursor', 'opencode', 'unknown']);
const SECRET_KEY_RE = /(^|[_-])(api[_-]?key|token|secret|authorization|password|credential)([_-]|$)|^\.env$/iu;
const SECRET_VALUE_RE = /(sk-[a-z0-9_-]{12,}|gh[pousr]_[a-z0-9_]{12,}|pplx-[a-z0-9_-]{12,}|Bearer\s+[a-z0-9._-]{12,})/iu;

export function normalizeHeadroomClient(client) {
  const normalized = String(client || 'unknown').trim().toLowerCase();
  return CLIENTS.has(normalized) ? normalized : 'unknown';
}

export function redactHeadroomTelemetry(value) {
  if (Array.isArray(value)) return value.map((item) => redactHeadroomTelemetry(item));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        SECRET_KEY_RE.test(key) ? '<redacted>' : redactHeadroomTelemetry(item),
      ]),
    );
  }
  if (typeof value === 'string') {
    return SECRET_VALUE_RE.test(value) ? value.replace(SECRET_VALUE_RE, '<redacted>') : value;
  }
  return value;
}

function asNonNegativeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export function createHeadroomTelemetryEvent(input) {
  const event = redactHeadroomTelemetry(input ?? {});
  const client = normalizeHeadroomClient(event.client ?? event.agent_runtime);
  return {
    client,
    workflow: String(event.workflow ?? 'unknown'),
    phase: String(event.phase ?? 'unknown'),
    transform: String(event.transform ?? 'unknown'),
    durationMs: asNonNegativeNumber(event.durationMs ?? event.duration_ms),
    cacheHit: Boolean(event.cacheHit ?? event.cache_hit ?? false),
    inputTokens: asNonNegativeNumber(event.inputTokens ?? event.input_tokens ?? event.tokensBefore ?? event.tokens_before),
    outputTokens: asNonNegativeNumber(event.outputTokens ?? event.output_tokens ?? event.tokensAfter ?? event.tokens_after),
    tokensSaved: asNonNegativeNumber(event.tokensSaved ?? event.tokens_saved),
    savingsPct: asNonNegativeNumber(event.savingsPct ?? event.savings_pct),
    metadata: redactHeadroomTelemetry(event.metadata ?? {}),
  };
}

export function eventsFromHeadroomPerfReport(report) {
  const perf = report?.headroom_perf;
  if (!perf) return [];
  const client = normalizeHeadroomClient(report?.meta?.client ?? report?.meta?.agent_runtime);
  const totalRequests = Math.max(1, asNonNegativeNumber(perf.total_requests, 1));
  const transforms = Array.isArray(perf.by_transform) && perf.by_transform.length > 0
    ? perf.by_transform
    : [{ transform: 'unknown', uses: totalRequests, tokens_saved: perf.tokens_saved, savings_pct: perf.savings_pct }];

  return transforms.map((row) =>
    createHeadroomTelemetryEvent({
      client,
      workflow: report?.meta?.workflow ?? 'headroom-perf',
      phase: report?.meta?.phase ?? 'unknown',
      transform: row.transform,
      durationMs: perf.overhead_ms?.average ?? 0,
      cacheHit: asNonNegativeNumber(perf.cache_hit_pct) > 0,
      inputTokens: row.tokens_before ?? perf.total_tokens_before,
      outputTokens: Math.max(0, asNonNegativeNumber(row.tokens_before ?? perf.total_tokens_before) - asNonNegativeNumber(row.tokens_saved ?? perf.tokens_saved)),
      tokensSaved: row.tokens_saved ?? perf.tokens_saved,
      savingsPct: row.savings_pct ?? perf.savings_pct,
      metadata: {
        source: 'headroom_perf',
        totalRequests,
        issue: report?.meta?.issue,
        note: report?.meta?.note,
      },
    }),
  );
}

export function loadHeadroomTelemetryPayload(payload) {
  if (Array.isArray(payload)) return payload.map(createHeadroomTelemetryEvent);
  if (Array.isArray(payload?.events)) return payload.events.map(createHeadroomTelemetryEvent);
  return eventsFromHeadroomPerfReport(payload);
}

function emptyClientSummary(client) {
  return {
    client,
    requests: 0,
    cacheHits: 0,
    durationMs: 0,
    inputTokens: 0,
    outputTokens: 0,
    tokensSaved: 0,
    transforms: new Map(),
  };
}

export function summarizeHeadroomTelemetry(events, operationalWork = []) {
  const clients = new Map();
  for (const event of events.map(createHeadroomTelemetryEvent)) {
    const row = clients.get(event.client) ?? emptyClientSummary(event.client);
    row.requests += 1;
    row.cacheHits += event.cacheHit ? 1 : 0;
    row.durationMs += event.durationMs;
    row.inputTokens += event.inputTokens;
    row.outputTokens += event.outputTokens;
    row.tokensSaved += event.tokensSaved || Math.max(0, event.inputTokens - event.outputTokens);
    row.transforms.set(event.transform, (row.transforms.get(event.transform) ?? 0) + 1);
    clients.set(event.client, row);
  }

  return {
    clients: [...clients.values()]
      .sort((a, b) => a.client.localeCompare(b.client))
      .map((row) => ({
        client: row.client,
        requests: row.requests,
        cacheHitPct: row.requests > 0 ? Number(((row.cacheHits / row.requests) * 100).toFixed(1)) : 0,
        savingsPct: row.inputTokens > 0 ? Number(((row.tokensSaved / row.inputTokens) * 100).toFixed(1)) : 0,
        avgDurationMs: row.requests > 0 ? Number((row.durationMs / row.requests).toFixed(1)) : 0,
        topTransforms: [...row.transforms.entries()]
          .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
          .slice(0, 3)
          .map(([transform, count]) => ({ transform, count })),
      })),
    operationalWork: operationalWork.map((item) => redactHeadroomTelemetry(item)),
  };
}

export function formatHeadroomTelemetryMarkdown(summary) {
  const lines = [
    '# Headroom agent telemetry summary',
    '',
    '| Client | Requests | Cache hit % | Savings % | Avg duration ms | Top transforms |',
    '|---|---:|---:|---:|---:|---|',
  ];
  if (summary.clients.length === 0) {
    lines.push('| _none_ | 0 | 0.0 | 0.0 | 0.0 | — |');
  } else {
    for (const row of summary.clients) {
      const transforms = row.topTransforms.map((item) => `${item.transform} (${item.count})`).join(', ') || '—';
      lines.push(`| ${row.client} | ${row.requests} | ${row.cacheHitPct} | ${row.savingsPct} | ${row.avgDurationMs} | ${transforms} |`);
    }
  }

  if (summary.operationalWork.length > 0) {
    lines.push('', '## Operational work not measured by Headroom', '');
    for (const item of summary.operationalWork) {
      lines.push(`- ${item.client ?? 'unknown'}: ${item.summary ?? item.workflow ?? 'unmeasured work'}`);
    }
  }

  return `${lines.join('\n')}\n`;
}
