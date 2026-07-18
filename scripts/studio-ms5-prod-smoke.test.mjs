import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, utimesSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

import {
  assessInstallerFreshness,
  clientDistFiles,
  findNsisInstaller,
  newestMtimeMs,
} from './lib/studio-ms5-prod-smoke.mjs';

/** Файл с заданной mtime (секунды эпохи) — mtime здесь предмет проверки, не побочность. */
function fileAt(path, atSeconds) {
  writeFileSync(path, 'x');
  utimesSync(path, atSeconds, atSeconds);
  return path;
}

const DAY = 86_400;
const BUILT = 1_700_000_000;

test('assessInstallerFreshness: .exe новее входов — fresh', () => {
  const verdict = assessInstallerFreshness({
    installerMtimeMs: BUILT * 1000,
    inputs: [
      { label: 'dist/main.js', mtimeMs: (BUILT - DAY) * 1000 },
      { label: 'client-dist', mtimeMs: (BUILT - 2 * DAY) * 1000 },
    ],
  });
  assert.equal(verdict.verdict, 'fresh');
  assert.deepEqual(verdict.staleAgainst, []);
});

test('assessInstallerFreshness: пересобрали client-dist без studio:package — stale с виновником', () => {
  const verdict = assessInstallerFreshness({
    installerMtimeMs: (BUILT - 21 * DAY) * 1000,
    inputs: [
      { label: 'dist/main.js', mtimeMs: (BUILT - 21 * DAY - 1) * 1000 },
      { label: 'client-dist', mtimeMs: BUILT * 1000 },
    ],
  });
  assert.equal(verdict.verdict, 'stale');
  assert.deepEqual(verdict.staleAgainst, ['client-dist']);
});

test('assessInstallerFreshness: старее обоих входов — оба в виновниках', () => {
  const verdict = assessInstallerFreshness({
    installerMtimeMs: (BUILT - 21 * DAY) * 1000,
    inputs: [
      { label: 'dist/main.js', mtimeMs: BUILT * 1000 },
      { label: 'client-dist', mtimeMs: BUILT * 1000 },
    ],
  });
  assert.equal(verdict.verdict, 'stale');
  assert.deepEqual(verdict.staleAgainst, ['dist/main.js', 'client-dist']);
});

test('assessInstallerFreshness: ровесник входа — fresh (строгое старше, не >=)', () => {
  const verdict = assessInstallerFreshness({
    installerMtimeMs: BUILT * 1000,
    inputs: [{ label: 'dist/main.js', mtimeMs: BUILT * 1000 }],
  });
  assert.equal(verdict.verdict, 'fresh');
});

test('assessInstallerFreshness: инсталлятора нет — missing, не stale', () => {
  const verdict = assessInstallerFreshness({
    installerMtimeMs: null,
    inputs: [{ label: 'dist/main.js', mtimeMs: BUILT * 1000 }],
  });
  assert.equal(verdict.verdict, 'missing');
  assert.deepEqual(verdict.staleAgainst, []);
});

test('assessInstallerFreshness: отсутствующий вход не делает вердикт stale', () => {
  const verdict = assessInstallerFreshness({
    installerMtimeMs: BUILT * 1000,
    inputs: [{ label: 'client-dist', mtimeMs: null }],
  });
  assert.equal(verdict.verdict, 'fresh');
});

test('assessInstallerFreshness: без входов — fresh (сравнивать не с чем)', () => {
  assert.equal(assessInstallerFreshness({ installerMtimeMs: BUILT * 1000 }).verdict, 'fresh');
});

test('newestMtimeMs: берёт самый свежий, несуществующие пропускает', () => {
  const dir = mkdtempSync(resolve(tmpdir(), 'ms5-newest-'));
  const older = fileAt(resolve(dir, 'older'), BUILT - DAY);
  const newer = fileAt(resolve(dir, 'newer'), BUILT);
  const got = newestMtimeMs([older, newer, resolve(dir, 'нет-такого')]);
  assert.equal(Math.round(got / 1000), BUILT);
});

test('newestMtimeMs: ни одного существующего пути — null', () => {
  assert.equal(newestMtimeMs([resolve(tmpdir(), 'ms5-нет-такого-файла')]), null);
});

test('clientDistFiles: index.html + assets/*; пустой каталог — пусто', () => {
  const dir = mkdtempSync(resolve(tmpdir(), 'ms5-dist-'));
  assert.deepEqual(clientDistFiles(dir), []);
  fileAt(resolve(dir, 'index.html'), BUILT);
  mkdirSync(resolve(dir, 'assets'));
  fileAt(resolve(dir, 'assets', 'app.js'), BUILT);
  const files = clientDistFiles(dir).map((p) => p.replace(dir, '').replace(/\\/gu, '/'));
  assert.deepEqual(files.sort(), ['/assets/app.js', '/index.html']);
});

test('findNsisInstaller: находит Setup .exe, иначе null', () => {
  const dir = mkdtempSync(resolve(tmpdir(), 'ms5-release-'));
  assert.equal(findNsisInstaller(dir), null);
  fileAt(resolve(dir, 'Membrana Studio Setup 0.1.0.exe'), BUILT);
  assert.match(String(findNsisInstaller(dir)), /Setup 0\.1\.0\.exe$/u);
});

test('findNsisInstaller: несуществующий каталог — null, не бросает', () => {
  assert.equal(findNsisInstaller(resolve(tmpdir(), 'ms5-нет-каталога')), null);
});
