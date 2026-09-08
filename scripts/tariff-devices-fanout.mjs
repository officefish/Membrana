#!/usr/bin/env node
/**
 * Rollout fanout: refresh tariff context on every paired media device.
 */
import { PrismaClient } from '../packages/background-cabinet/generated/prisma/index.js';
import { contextsForAllMembranes, sendContextsToMedia } from './lib/tariff-devices-fanout.mjs';

const prisma = new PrismaClient({ datasourceUrl: process.env.CABINET_DATABASE_URL ?? process.env.DATABASE_URL });
const mediaBase = (process.env.MEDIA_API_URL ?? '').replace(/\/$/, '');
const token = process.env.MEDIA_API_TOKEN ?? '';

async function send(context) {
  const res = await fetch(`${mediaBase}/v1/devices/${encodeURIComponent(context.deviceId)}/membrane`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'X-Membrana-Token': token },
    body: JSON.stringify({ membrane: context.membrane }),
  });
  if (!res.ok) return { ok: false };
  const body = await res.json().catch(() => ({ ok: true }));
  return body?.ok === false ? { ok: false } : { ok: true };
}

async function main() {
  if (!mediaBase || !token) {
    console.error('tariff:devices-fanout — MEDIA_API_URL and MEDIA_API_TOKEN are required');
    return 2;
  }
  const membranes = await prisma.membrane.findMany({
    include: {
      tariff: true,
      nodes: { include: { device: true } },
    },
  });
  const contexts = contextsForAllMembranes(membranes);
  const result = await sendContextsToMedia(contexts, send);
  console.log(
    `tariff:devices-fanout — мембран ${membranes.length} · приборов ${result.attempted} · ` +
      `updated ${result.updated} · failed ${result.failed}`,
  );
  return result.failed === 0 ? 0 : 1;
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((err) => {
    console.error(`tariff:devices-fanout — ошибка: ${err instanceof Error ? err.message : String(err)}`);
    process.exitCode = 2;
  })
  .finally(() => void prisma.$disconnect());
