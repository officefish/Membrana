/**
 * MS5 prod-smoke for Membrana Studio: build artifacts + cabinet health + optional MP7.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const CABINET_PROD_URL = 'https://cabinet.membrana.space';

/**
 * @param {string} root
 */
export function studioPaths(root) {
  const studioDir = resolve(root, 'apps/membrana-studio');
  return {
    studioDir,
    mainJs: resolve(studioDir, 'dist/main.js'),
    clientDist: resolve(studioDir, 'client-dist'),
    clientIndex: resolve(studioDir, 'client-dist/index.html'),
    releaseDir: resolve(studioDir, 'release'),
  };
}

/**
 * @param {string} clientDistDir
 * @param {string} needle
 */
export function clientDistContains(clientDistDir, needle) {
  if (!existsSync(clientDistDir)) return false;
  const assetsDir = resolve(clientDistDir, 'assets');
  if (!existsSync(assetsDir)) return false;
  for (const name of readdirSync(assetsDir)) {
    if (!name.endsWith('.js')) continue;
    const text = readFileSync(resolve(assetsDir, name), 'utf8');
    if (text.includes(needle)) return true;
  }
  return false;
}

/**
 * @param {string} releaseDir
 */
export function findNsisInstaller(releaseDir) {
  if (!existsSync(releaseDir)) return null;
  const hit = readdirSync(releaseDir).find(
    (name) => name.endsWith('.exe') && name.toLowerCase().includes('setup'),
  );
  return hit ? resolve(releaseDir, hit) : null;
}

/**
 * @param {{ root?: string; runMp7?: boolean; fetchImpl?: typeof fetch }} [options]
 */
export async function runStudioMs5ProdSmoke(options = {}) {
  const root = options.root ?? resolve(dirname(fileURLToPath(import.meta.url)), '../..');
  const fetchImpl = options.fetchImpl ?? fetch;
  const paths = studioPaths(root);
  const checks = [];
  let failed = 0;

  const mark = (id, ok, detail = '') => {
    checks.push({ id, ok, detail });
    if (!ok) failed += 1;
    console.log(`[ms5-smoke] ${id}: ${ok ? 'OK' : 'FAIL'}${detail ? ` (${detail})` : ''}`);
  };

  mark('studio-main-js', existsSync(paths.mainJs), paths.mainJs);
  mark('client-dist-index', existsSync(paths.clientIndex), paths.clientIndex);
  mark(
    'prod-cabinet-url-baked',
    clientDistContains(paths.clientDist, CABINET_PROD_URL),
    CABINET_PROD_URL,
  );

  const installer = findNsisInstaller(paths.releaseDir);
  mark('nsis-installer', installer !== null, installer ?? 'run yarn studio:package first');

  try {
    const res = await fetchImpl(`${CABINET_PROD_URL}/health`);
    const body = await res.json();
    mark('cabinet-health', res.ok && body?.status === 'ok', `status=${body?.status ?? res.status}`);
  } catch (err) {
    mark('cabinet-health', false, err instanceof Error ? err.message : String(err));
  }

  if (options.runMp7) {
    const mp7Ok = await runMp7ProdSmoke(root);
    mark('mp7-ws-smoke', mp7Ok, 'yarn cabinet:mp7:prod');
  } else {
    console.log('[ms5-smoke] mp7-ws-smoke: SKIP (pass runMp7:true or yarn cabinet:mp7:prod)');
  }

  const ok = failed === 0;
  if (ok) {
    console.log('STUDIO MS5 PROD SMOKE OK');
  } else {
    console.error(`STUDIO MS5 PROD SMOKE FAILED (${failed} checks)`);
  }

  return { ok, checks, installerPath: installer };
}

/**
 * @param {string} root
 */
function runMp7ProdSmoke(root) {
  return new Promise((resolvePromise) => {
    const child = spawn('yarn', ['cabinet:mp7:prod'], {
      cwd: root,
      stdio: 'inherit',
      shell: true,
    });
    child.on('close', (code) => resolvePromise(code === 0));
    child.on('error', () => resolvePromise(false));
  });
}
