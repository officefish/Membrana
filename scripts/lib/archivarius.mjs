import { createHash } from 'node:crypto';

import { redactJsonSensitiveValues, redactSecrets } from './secret-redact.mjs';

const SHA_RE = /^[0-9a-f]{64}$/u;

export function sha256Utf8(text) {
  return createHash('sha256').update(String(text), 'utf8').digest('hex');
}

export function deterministicUuid(seed) {
  const hex = sha256Utf8(seed).slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function getPath(value, path) {
  let cursor = value;
  for (const key of path) {
    if (cursor == null || typeof cursor !== 'object') return undefined;
    cursor = cursor[key];
  }
  return cursor;
}

function firstString(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return null;
}

function parseJson(rawLine) {
  try {
    return JSON.parse(rawLine);
  } catch {
    return null;
  }
}

export function redactTranscriptLine(rawLine) {
  const parsed = parseJson(rawLine);
  if (parsed != null) {
    const redacted = redactJsonSensitiveValues(parsed);
    if (redacted.cuts.length > 0) {
      return { text: JSON.stringify(redacted.value), cuts: redacted.cuts };
    }
  }
  const redacted = redactSecrets(rawLine);
  return { text: redacted.text, cuts: redacted.cuts };
}

export function spanFromTranscriptLine(input) {
  const rawLine = String(input.rawLine ?? '');
  const sourcePath = input.sourcePath ?? null;
  const lineNo = Number(input.lineNo ?? 1);
  const ingestTs = input.ingestTs ?? new Date().toISOString();
  const parsed = parseJson(rawLine);
  const sessionSeed = input.defaultSessionId ?? sourcePath ?? 'local-transcript';
  const sessionId = firstString(
    getPath(parsed, ['sessionId']),
    getPath(parsed, ['session_id']),
    getPath(parsed, ['conversationId']),
    getPath(parsed, ['conversation_id']),
    input.defaultSessionId,
    sourcePath,
  );
  const uuid = firstString(
    getPath(parsed, ['uuid']),
    getPath(parsed, ['id']),
    getPath(parsed, ['message', 'id']),
    getPath(parsed, ['message', 'uuid']),
  ) ?? deterministicUuid(`${sessionSeed}:${lineNo}:${rawLine}`);
  const ts = firstString(
    getPath(parsed, ['ts']),
    getPath(parsed, ['timestamp']),
    getPath(parsed, ['createdAt']),
    getPath(parsed, ['created_at']),
    getPath(parsed, ['message', 'ts']),
    getPath(parsed, ['message', 'timestamp']),
    ingestTs,
  );
  const actor = firstString(
    getPath(parsed, ['actor']),
    getPath(parsed, ['speaker']),
    getPath(parsed, ['role']),
    getPath(parsed, ['message', 'role']),
    getPath(parsed, ['author', 'role']),
  ) ?? 'unknown';
  const replyType = firstString(
    getPath(parsed, ['type']),
    getPath(parsed, ['kind']),
    getPath(parsed, ['message', 'type']),
    getPath(parsed, ['message', 'role']),
  ) ?? 'unknown';
  const redacted = redactTranscriptLine(rawLine);
  const bytes = redacted.text;
  return {
    sessionId: sessionId ?? deterministicUuid(sessionSeed),
    uuid,
    ts,
    actor,
    replyType,
    bytes,
    sha256: sha256Utf8(bytes),
    masked: redacted.cuts.length > 0,
    maskedCuts: redacted.cuts.map((cut) => ({ name: cut.name, line: cut.line, path: cut.path, length: cut.length })),
    sourcePath,
    lineNo,
  };
}

export function ingestJsonlText(text, opts = {}) {
  const ingestTs = opts.ingestTs ?? new Date().toISOString();
  const lines = String(text ?? '').split(/\r?\n/u);
  const spans = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i] === '' && i === lines.length - 1) continue;
    if (!lines[i].trim()) continue;
    spans.push(spanFromTranscriptLine({
      rawLine: lines[i],
      lineNo: i + 1,
      sourcePath: opts.sourcePath ?? null,
      defaultSessionId: opts.defaultSessionId ?? null,
      ingestTs,
    }));
  }
  return {
    spans,
    summary: {
      files: opts.sourcePath ? 1 : 0,
      spans: spans.length,
      maskedLines: spans.filter((span) => span.masked).length,
    },
  };
}

export function parseSpanJsonl(text) {
  const spans = [];
  const broken = [];
  String(text ?? '').split(/\r?\n/u).forEach((line, index) => {
    if (!line.trim()) return;
    try {
      spans.push(JSON.parse(line));
    } catch (error) {
      broken.push({ line: index + 1, error: error.message });
    }
  });
  return { spans, broken };
}

export function auditSpans(spans) {
  const findings = [];
  const seen = new Map();
  for (const span of spans ?? []) {
    const address = `span://${span.sessionId ?? ''}/${span.uuid ?? ''}`;
    if (!span.sessionId) findings.push({ severity: 'error', code: 'missing-sessionId', address });
    if (!span.uuid) findings.push({ severity: 'error', code: 'missing-uuid', address });
    if (!span.ts) findings.push({ severity: 'error', code: 'missing-ts', address });
    if (!SHA_RE.test(String(span.sha256 ?? ''))) findings.push({ severity: 'error', code: 'bad-sha256', address });
    if (typeof span.bytes !== 'string') findings.push({ severity: 'error', code: 'missing-bytes', address });
    else if (span.sha256 && sha256Utf8(span.bytes) !== span.sha256) findings.push({ severity: 'error', code: 'sha256-mismatch', address });
    if (seen.has(address)) findings.push({ severity: 'error', code: 'duplicate-address', address, firstLine: seen.get(address) });
    else seen.set(address, span.lineNo ?? null);
  }
  return {
    spans: spans?.length ?? 0,
    sessions: new Set((spans ?? []).map((span) => span.sessionId)).size,
    maskedLines: (spans ?? []).filter((span) => span.masked).length,
    findings,
    ok: findings.filter((f) => f.severity === 'error').length === 0,
  };
}

export function decomposeSpans(spans, by = 'sessions') {
  const groups = new Map();
  const keyFor = (span) => {
    if (by === 'days') return String(span.ts ?? '').slice(0, 10) || 'unknown-day';
    if (by === 'actors') return span.actor ?? 'unknown';
    return span.sessionId ?? 'unknown-session';
  };
  for (const span of spans ?? []) {
    const key = keyFor(span);
    const row = groups.get(key) ?? { key, spans: 0, sessions: new Set(), maskedLines: 0 };
    row.spans += 1;
    row.sessions.add(span.sessionId);
    if (span.masked) row.maskedLines += 1;
    groups.set(key, row);
  }
  return [...groups.values()]
    .map((row) => ({ key: row.key, spans: row.spans, sessions: row.sessions.size, maskedLines: row.maskedLines }))
    .sort((a, b) => String(a.key).localeCompare(String(b.key)));
}

export function inspectSession(spans, sessionId) {
  const rows = (spans ?? []).filter((span) => span.sessionId === sessionId);
  if (rows.length === 0) return null;
  const sorted = [...rows].sort((a, b) => String(a.ts).localeCompare(String(b.ts)));
  return {
    sessionId,
    spans: sorted.length,
    firstTs: sorted[0]?.ts ?? null,
    lastTs: sorted.at(-1)?.ts ?? null,
    actors: [...new Set(sorted.map((span) => span.actor ?? 'unknown'))].sort(),
    replyTypes: [...new Set(sorted.map((span) => span.replyType ?? 'unknown'))].sort(),
    maskedLines: sorted.filter((span) => span.masked).length,
    sourcePaths: [...new Set(sorted.map((span) => span.sourcePath).filter(Boolean))].sort(),
  };
}

export function searchSpans(spans, query = {}) {
  const text = query.text ? String(query.text).toLowerCase() : null;
  const actor = query.actor ? String(query.actor).toLowerCase() : null;
  const replyType = query.replyType ? String(query.replyType).toLowerCase() : null;
  const from = query.from ? Date.parse(query.from) : null;
  const to = query.to ? Date.parse(query.to) : null;
  return (spans ?? []).filter((span) => {
    if (text && !String(span.bytes ?? '').toLowerCase().includes(text)) return false;
    if (actor && String(span.actor ?? '').toLowerCase() !== actor) return false;
    if (replyType && String(span.replyType ?? '').toLowerCase() !== replyType) return false;
    const t = Date.parse(span.ts);
    if (from != null && Number.isFinite(t) && t < from) return false;
    if (to != null && Number.isFinite(t) && t > to) return false;
    return true;
  });
}

export function spanAddress(span) {
  return `span://${span.sessionId}/${span.uuid}`;
}
