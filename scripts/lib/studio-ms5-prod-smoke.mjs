/**
 * MS5 prod-smoke for Membrana Studio: build artifacts + cabinet health + optional MP7.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
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
 * Файлы client-dist, попадающие в инсталлятор (index.html + assets).
 *
 * @param {string} clientDistDir
 */
export function clientDistFiles(clientDistDir) {
  /** @type {string[]} */
  const out = [];
  const index = resolve(clientDistDir, 'index.html');
  if (existsSync(index)) out.push(index);
  const assetsDir = resolve(clientDistDir, 'assets');
  if (existsSync(assetsDir)) {
    for (const name of readdirSync(assetsDir)) out.push(resolve(assetsDir, name));
  }
  return out;
}

/**
 * Самая свежая mtime среди существующих путей, мс. null — если ни одного нет.
 *
 * @param {string[]} paths
 */
export function newestMtimeMs(paths) {
  /** @type {number|null} */
  let newest = null;
  for (const path of paths) {
    if (!existsSync(path)) continue;
    const { mtimeMs } = statSync(path);
    if (newest === null || mtimeMs > newest) newest = mtimeMs;
  }
  return newest;
}

/**
 * Свежесть инсталлятора относительно сборки, которую он упаковывает.
 *
 * Гейт существования (`findNsisInstaller`) зелёный на артефакте любой давности:
 * пересобрали client-dist, забыли `yarn studio:package` — смоук молчит, а прод
 * (`membrana.space/downloads`) раздаёт прошлую сборку. Инвариант: .exe не старше
 * своих входов.
 *
 * Абсолютного порога возраста намеренно НЕТ: инсталлятор, совпадающий со своими
 * входами, актуален независимо от даты — устаревание задаёт сборка, не календарь.
 *
 * @param {{ installerMtimeMs: number|null, inputs?: {label: string, mtimeMs: number|null}[] }} args
 * @returns {{ verdict: 'fresh'|'stale'|'missing', staleAgainst: string[] }}
 */
export function assessInstallerFreshness({ installerMtimeMs, inputs = [] }) {
  if (installerMtimeMs === null || installerMtimeMs === undefined) {
    return { verdict: 'missing', staleAgainst: [] };
  }
  const staleAgainst = inputs
    .filter((input) => input.mtimeMs !== null && input.mtimeMs !== undefined)
    .filter((input) => input.mtimeMs > installerMtimeMs)
    .map((input) => input.label);
  return { verdict: staleAgainst.length > 0 ? 'stale' : 'fresh', staleAgainst };
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

  if (installer === null) {
    // Отсутствие уже провалено выше — не считаем одну поломку дважды.
    console.log('[ms5-smoke] nsis-installer-fresh: SKIP (инсталлятора нет)');
  } else {
    const freshness = assessInstallerFreshness({
      installerMtimeMs: newestMtimeMs([installer]),
      inputs: [
        { label: 'dist/main.js', mtimeMs: newestMtimeMs([paths.mainJs]) },
        { label: 'client-dist', mtimeMs: newestMtimeMs(clientDistFiles(paths.clientDist)) },
      ],
    });
    mark(
      'nsis-installer-fresh',
      freshness.verdict === 'fresh',
      freshness.verdict === 'stale'
        ? `.exe старше входов: ${freshness.staleAgainst.join(', ')} — пересобери yarn studio:package`
        : 'не старше dist/main.js и client-dist',
    );
  }

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
