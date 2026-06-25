/**
 * Shared helpers for `yarn media:diag` (unit-tested).
 */

export const BUFFER_COLLECTION_ID = '__buffer__';

/** Minimal mono PCM16 WAV (~0.05s @ 8kHz) for upload smoke. */
export function buildMinimalWavBlob() {
  const sampleRate = 8000;
  const samples = new Int16Array(400);
  const numChannels = 1;
  const bitsPerSample = 16;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = samples.length * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeAscii = (offset, text) => {
    for (let i = 0; i < text.length; i += 1) {
      view.setUint8(offset + i, text.charCodeAt(i));
    }
  };

  writeAscii(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(8, 'WAVE');
  writeAscii(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeAscii(36, 'data');
  view.setUint32(40, dataSize, true);

  return new Blob([buffer], { type: 'audio/wav' });
}

export function normalizeBaseUrl(baseUrl) {
  return baseUrl.replace(/\/$/, '');
}

export function deviceUrl(baseUrl, deviceId, path) {
  return `${normalizeBaseUrl(baseUrl)}/v1/devices/${encodeURIComponent(deviceId)}${path}`;
}

export function authHeaders(token, deviceId, extra) {
  const headers = new Headers(extra);
  headers.set('X-Membrana-Token', token);
  headers.set('X-Membrana-Device-Id', deviceId);
  return headers;
}

export function bufferQuotaLevel(quota) {
  if (!quota?.buffer) return { level: 'unknown', ratio: null };
  const { usedBytes, limitBytes } = quota.buffer;
  if (!limitBytes || limitBytes <= 0) return { level: 'unknown', ratio: null };
  const ratio = usedBytes / limitBytes;
  if (ratio >= 0.99) return { level: 'full', ratio };
  if (ratio >= 0.9) return { level: 'warning', ratio };
  return { level: 'ok', ratio };
}

/**
 * @param {object} report
 * @returns {string}
 */
export function resolveVerdict(report) {
  if (!report.health?.ok) return 'SERVER_DOWN';
  if (report.quota?.httpStatus === 401 || report.quota?.httpStatus === 403) return 'AUTH';
  if (report.quota?.httpStatus === 404) return 'CLIENT_CONFIG';
  if (report.ensureReserved?.httpStatus && report.ensureReserved.httpStatus >= 400) {
    return 'SERVER_ERROR';
  }
  if (report.bufferQuota?.level === 'full') return 'SERVER_QUOTA';
  if (report.testUpload?.httpStatus === 413) return 'SERVER_QUOTA';
  if (report.testUpload?.httpStatus === 401 || report.testUpload?.httpStatus === 403) {
    return 'AUTH';
  }
  if (report.testUpload?.ok) return 'OK';
  if (report.testUpload?.httpStatus && report.testUpload.httpStatus >= 500) {
    return 'SERVER_ERROR';
  }
  if (report.testUpload && !report.testUpload.ok) return 'SERVER_ERROR';
  if (report.bufferQuota?.level === 'warning') return 'SERVER_QUOTA_WARNING';
  return 'SERVER_ERROR';
}

/**
 * @param {object} report
 * @returns {string[]}
 */
export function formatDiagLines(report) {
  const lines = [];
  const host = report.baseUrl ?? '?';
  lines.push(`media:diag — ${host}`);
  lines.push(
    `  health: ${report.health?.ok ? 'ok' : 'FAIL'}${report.health?.uptime != null ? ` (uptime ${report.health.uptime}s)` : ''}`,
  );
  if (report.deviceId) {
    lines.push(`  deviceId: ${report.deviceId}`);
  }
  if (report.quota?.buffer) {
    const b = report.quota.buffer;
    const pct =
      b.limitBytes > 0 ? `${Math.round((b.usedBytes / b.limitBytes) * 100)}%` : '?';
    const warn = report.bufferQuota?.level === 'warning' || report.bufferQuota?.level === 'full';
    lines.push(
      `  quota.buffer: ${formatBytes(b.usedBytes)} / ${formatBytes(b.limitBytes)} (${pct})${warn ? '  ⚠' : ''}`,
    );
  } else if (report.quota?.error) {
    lines.push(`  quota: FAIL (${report.quota.httpStatus ?? '?'}) ${report.quota.error}`);
  }
  lines.push(
    `  ensure-reserved: ${report.ensureReserved?.ok ? 'ok' : `FAIL (${report.ensureReserved?.httpStatus ?? '?'})`}`,
  );
  if (report.testUpload?.ok) {
    lines.push(`  test-upload: ok (sampleId=${report.testUpload.sampleId ?? '?'})`);
  } else {
    lines.push(
      `  test-upload: FAIL (${report.testUpload?.httpStatus ?? '?'}) ${report.testUpload?.error ?? ''}`.trim(),
    );
  }
  lines.push(`  verdict: ${report.verdict ?? resolveVerdict(report)}`);
  return lines;
}

function formatBytes(bytes) {
  if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(2)}GB`;
  if (bytes >= 1_048_576) return `${Math.round(bytes / 1_048_576)}MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${bytes}B`;
}

async function readBody(res) {
  const text = await res.text();
  try {
    return { text, json: JSON.parse(text) };
  } catch {
    return { text, json: null };
  }
}

async function checkHealth(baseUrl) {
  try {
    const res = await fetch(`${normalizeBaseUrl(baseUrl)}/health`);
    const { json } = await readBody(res);
    return {
      ok: res.ok,
      httpStatus: res.status,
      uptime: json?.uptime ?? null,
      version: json?.version ?? null,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function registerDevice(baseUrl, token) {
  const res = await fetch(`${normalizeBaseUrl(baseUrl)}/v1/devices`, {
    method: 'POST',
    headers: authHeaders(token, 'register', { 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      name: `media-diag-${Date.now()}`,
      kind: 'microphone',
    }),
  });
  const { text, json } = await readBody(res);
  if (!res.ok) {
    throw new Error(`register failed (${res.status}): ${text.slice(0, 200)}`);
  }
  return json?.id ?? null;
}

async function fetchQuota(baseUrl, token, deviceId) {
  const res = await fetch(deviceUrl(baseUrl, deviceId, '/quota'), {
    headers: authHeaders(token, deviceId),
  });
  const { text, json } = await readBody(res);
  if (!res.ok) {
    return {
      ok: false,
      httpStatus: res.status,
      error: text.slice(0, 300),
    };
  }
  return {
    ok: true,
    httpStatus: res.status,
    userStorage: json?.userStorage,
    buffer: json?.buffer,
    dataset: json?.dataset,
  };
}

async function ensureReserved(baseUrl, token, deviceId) {
  const res = await fetch(deviceUrl(baseUrl, deviceId, '/collections/ensure-reserved'), {
    method: 'POST',
    headers: authHeaders(token, deviceId),
  });
  const { text } = await readBody(res);
  return {
    ok: res.ok,
    httpStatus: res.status,
    error: res.ok ? null : text.slice(0, 300),
  };
}

async function testUpload(baseUrl, token, deviceId) {
  const blob = buildMinimalWavBlob();
  const form = new FormData();
  form.append('file', blob, 'media-diag-smoke.wav');
  form.append(
    'meta',
    JSON.stringify({
      title: 'media-diag-smoke',
      class: 'buffer',
      label: 'unlabeled',
      source: 'mic-recording',
      durationSec: 0.05,
      sampleRate: 8000,
      channels: 1,
      notes: 'yarn media:diag',
    }),
  );
  const res = await fetch(
    deviceUrl(baseUrl, deviceId, `/collections/${encodeURIComponent(BUFFER_COLLECTION_ID)}/samples`),
    {
      method: 'POST',
      headers: authHeaders(token, deviceId),
      body: form,
    },
  );
  const { text, json } = await readBody(res);
  if (!res.ok) {
    const message =
      json?.message != null
        ? Array.isArray(json.message)
          ? json.message.join(', ')
          : String(json.message)
        : text.slice(0, 300);
    return {
      ok: false,
      httpStatus: res.status,
      error: message,
    };
  }
  return {
    ok: true,
    httpStatus: res.status,
    sampleId: json?.id ?? null,
  };
}

/** health → quota → ensure-reserved → test WAV upload */
export async function runMediaDiag(options) {
  const baseUrl = options.baseUrl ?? process.env.MEDIA_API_URL ?? 'http://localhost:3010';
  const token =
    options.token ?? process.env.API_INTERNAL_TOKEN ?? process.env.MEDIA_API_TOKEN ?? null;

  const report = {
    baseUrl: normalizeBaseUrl(baseUrl),
    deviceId: options.deviceId,
    registered: false,
  };

  report.health = await checkHealth(baseUrl);
  if (!token) {
    report.verdict = 'CLIENT_CONFIG';
    report.error = 'API_INTERNAL_TOKEN (or --token) is required';
    report.pass = false;
    return report;
  }

  let deviceId = options.deviceId;
  if (!deviceId && options.register) {
    deviceId = await registerDevice(baseUrl, token);
    report.deviceId = deviceId;
    report.registered = true;
  }

  if (!deviceId) {
    report.verdict = 'CLIENT_CONFIG';
    report.error = 'Provide --device-id or --register';
    report.pass = false;
    return report;
  }

  report.quota = await fetchQuota(baseUrl, token, deviceId);
  report.bufferQuota = report.quota.ok ? bufferQuotaLevel(report.quota) : { level: 'unknown' };
  report.ensureReserved = await ensureReserved(baseUrl, token, deviceId);
  report.testUpload = await testUpload(baseUrl, token, deviceId);
  report.verdict = resolveVerdict(report);
  report.pass = report.verdict === 'OK' || report.verdict === 'SERVER_QUOTA_WARNING';
  return report;
}
