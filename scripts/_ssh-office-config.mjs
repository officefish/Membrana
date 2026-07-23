#!/usr/bin/env node
/**
 * SSH config for background-office VPS helpers.
 *
 * office-vds-migration (#349): office живёт на выделенном VDS — fallback на
 * BACKGROUND_MEDIA_* удалён намеренно (молчаливый fallback целился бы в старый
 * общий VPS media). BACKGROUND_OFFICE_IPV4 и OFFICE_DOMAIN обязательны.
 *
 * Аутентификация (приоритет): BACKGROUND_OFFICE_SSH_KEY (путь к приватному
 * ключу) → ~/.ssh/id_ed25519, если существует → BACKGROUND_OFFICE_PASSWORD.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Layered .env for sibling worktrees (#567): MEMBRANA_ENV_PATH → local .env →
 * root via git-common-dir. Never logs values.
 */
export function readRootEnv() {
  const candidates = [];
  if (process.env.MEMBRANA_ENV_PATH?.trim()) {
    candidates.push(resolve(process.env.MEMBRANA_ENV_PATH.trim()));
  }
  candidates.push(resolve(root, '.env'));
  try {
    const common = execFileSync('git', ['rev-parse', '--git-common-dir'], {
      cwd: root,
      encoding: 'utf8',
    }).trim();
    const commonAbs = resolve(root, common);
    // …/repo/.git → repo root; …/repo/.git/worktrees/x → repo root via ../..
    const repoRootGuess = commonAbs.endsWith(`${sep}.git`) || commonAbs.endsWith('/.git') || commonAbs.endsWith('\\.git')
      ? resolve(commonAbs, '..')
      : resolve(commonAbs, '..', '..');
    candidates.push(resolve(repoRootGuess, '.env'));
  } catch {
    /* ignore */
  }
  for (const p of candidates) {
    if (existsSync(p)) return readFileSync(p, 'utf8');
  }
  throw new Error(
    `No .env for office SSH (tried MEMBRANA_ENV_PATH / ${resolve(root, '.env')} / git-common-dir). ` +
      'Copy .env into this worktree or set MEMBRANA_ENV_PATH.',
  );
}

function envGet(envText, key) {
  return envText.match(new RegExp(`^${key}=(.*)$`, 'm'))?.[1]?.trim() ?? '';
}

export function getOfficeSshConfig(envText = readRootEnv(), fsDeps = { existsSync, readFileSync }) {
  const host = envGet(envText, 'BACKGROUND_OFFICE_IPV4');
  if (!host) {
    throw new Error(
      'Missing BACKGROUND_OFFICE_IPV4 in .env ' +
        '(fallback на BACKGROUND_MEDIA_* удалён: office на выделенном VDS, см. #349)',
    );
  }
  // Туннельный endpoint (#349/OM2): маршрут провайдера к MSK-VDS фильтруется,
  // доступ идёт через локальный форвардер → media(NL) → reverse-tunnel → office.
  const sshHost = envGet(envText, 'BACKGROUND_OFFICE_SSH_HOST') || host;
  const sshPortRaw = Number.parseInt(envGet(envText, 'BACKGROUND_OFFICE_SSH_PORT'), 10);
  const sshPort = Number.isInteger(sshPortRaw) && sshPortRaw > 0 ? sshPortRaw : 22;
  const base = { host: sshHost, port: sshPort, username: 'root', readyTimeout: 40_000 };

  const keyPath = envGet(envText, 'BACKGROUND_OFFICE_SSH_KEY') || resolve(homedir(), '.ssh', 'id_ed25519');
  if (fsDeps.existsSync(keyPath)) {
    return { ...base, privateKey: fsDeps.readFileSync(keyPath, 'utf8') };
  }

  const password = envGet(envText, 'BACKGROUND_OFFICE_PASSWORD');
  if (!password) {
    throw new Error(
      'No SSH auth: нет ни ключа (BACKGROUND_OFFICE_SSH_KEY / ~/.ssh/id_ed25519), ' +
        'ни BACKGROUND_OFFICE_PASSWORD в .env (#349)',
    );
  }
  return { ...base, password };
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
