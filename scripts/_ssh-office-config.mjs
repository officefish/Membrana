#!/usr/bin/env node
/**
 * SSH config for background-office VPS helpers.
 *
 * office-vds-migration (#349): office живёт на выделенном VDS — fallback на
 * BACKGROUND_MEDIA_* удалён намеренно (молчаливый fallback целился бы в старый
 * общий VPS media). Ключи BACKGROUND_OFFICE_IPV4 / BACKGROUND_OFFICE_PASSWORD
 * и OFFICE_DOMAIN обязательны в корневом .env.
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export function readRootEnv() {
  return readFileSync(resolve(root, '.env'), 'utf8');
}

function envGet(envText, key) {
  return envText.match(new RegExp(`^${key}=(.*)$`, 'm'))?.[1]?.trim() ?? '';
}

export function getOfficeSshConfig(envText = readRootEnv()) {
  const host = envGet(envText, 'BACKGROUND_OFFICE_IPV4');
  const password = envGet(envText, 'BACKGROUND_OFFICE_PASSWORD');
  if (!host || !password) {
    throw new Error(
      'Missing BACKGROUND_OFFICE_IPV4 / BACKGROUND_OFFICE_PASSWORD in .env ' +
        '(fallback на BACKGROUND_MEDIA_* удалён: office на выделенном VDS, см. #349)',
    );
  }
  return { host, port: 22, username: 'root', password, readyTimeout: 20_000 };
}

export function getOfficeDomain(envText = readRootEnv()) {
  const domain = envGet(envText, 'OFFICE_DOMAIN');
  if (!domain) {
    throw new Error(
      'Missing OFFICE_DOMAIN in .env — дефолт удалён намеренно: ' +
        'протухший домен направил бы smoke/TLS на старый прод (см. #349)',
    );
  }
  return domain;
}

/** Подставить домен в шаблон deploy/Caddyfile.office.template. */
export function renderOfficeCaddyfile(templateText, domain) {
  const rendered = templateText.replaceAll('{{OFFICE_DOMAIN}}', domain);
  if (rendered.includes('{{')) {
    throw new Error('Caddyfile template: остался неподставленный плейсхолдер');
  }
  return rendered;
}

export const repoRoot = root;
