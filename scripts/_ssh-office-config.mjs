#!/usr/bin/env node
/**
 * SSH config for background-office VPS helpers.
 * Falls back to BACKGROUND_MEDIA_* (same host as media).
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export function readRootEnv() {
  return readFileSync(resolve(root, '.env'), 'utf8');
}

export function getOfficeSshConfig(envText = readRootEnv()) {
  const get = (key) => envText.match(new RegExp(`^${key}=(.*)$`, 'm'))?.[1]?.trim() ?? '';
  const host = get('BACKGROUND_OFFICE_IPV4') || get('BACKGROUND_MEDIA_IPV4');
  const password = get('BACKGROUND_OFFICE_PASSWORD') || get('BACKGROUND_MEDIA_PASSWORD');
  if (!host || !password) {
    throw new Error('Missing BACKGROUND_OFFICE_* or BACKGROUND_MEDIA_* in .env');
  }
  return { host, port: 22, username: 'root', password, readyTimeout: 20_000 };
}

export const repoRoot = root;
