/**
 * Provision free-v1 tariff catalog on background-media for a device.
 *
 * Usage:
 *   yarn media:provision-catalog <deviceId>
 *   MEDIA_API_URL=http://localhost:3010 API_INTERNAL_TOKEN=... yarn media:provision-catalog <uuid>
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function loadDotenv() {
  try {
    const envPath = join(ROOT, 'packages', 'background-media', '.env');
    const raw = readFileSync(envPath, 'utf8');
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // optional
  }
}

async function main() {
  loadDotenv();

  const deviceId = process.argv[2]?.trim();
  if (!deviceId) {
    console.error('Usage: yarn media:provision-catalog <deviceId>');
    process.exit(1);
  }

  const base = (process.env.MEDIA_API_URL ?? 'http://localhost:3010').replace(/\/$/, '');
  const token = process.env.API_INTERNAL_TOKEN ?? process.env.MEDIA_API_TOKEN;
  if (!token) {
    console.error('API_INTERNAL_TOKEN (or MEDIA_API_TOKEN) is required');
    process.exit(1);
  }

  const res = await fetch(`${base}/v1/devices/${deviceId}/collections/provision-catalog`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Membrana-Token': token,
    },
  });

  const body = await res.text();
  if (!res.ok) {
    console.error(`Provision failed (${res.status}): ${body}`);
    process.exit(1);
  }

  console.log(body);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
