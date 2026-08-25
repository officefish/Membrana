#!/usr/bin/env node
/**
 * Package Membrana Studio for Windows (NSIS). Зуб #2147/№5 — классы падений:
 *   1) stale dist зависимостей → сборка идёт turbo-замыканием (--filter=app...),
 *      протухшие пакеты собираются сами;
 *   2) остаток прерванной сборки (release/win-unpacked до запуска) → авточистка
 *      ВЫХОДНОГО каталога до старта (вещдок 21.08);
 *   3) Access is denied в чистом каталоге → классификатор различает запущенную
 *      Studio и внешнего держателя (AV, вещдок Г 25.08): один повтор, затем
 *      честный отказ с именем файла, лекарством и fallback'ом на артефакт CI.
 */
import { spawn, execFileSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { classifyPackageFailure, packageFailureAdvice } from './lib/studio-package-failure.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const WIN_UNPACKED = join(root, 'apps', 'membrana-studio', 'release', 'win-unpacked');

/** @returns {Promise<{ code: number, output: string }>} вывод — на экран И в буфер (для классификатора) */
function run(command, args, options = {}) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { cwd: root, shell: true, ...options, stdio: ['inherit', 'pipe', 'pipe'] });
    let output = '';
    child.stdout.on('data', (d) => {
      output += d.toString();
      process.stdout.write(d);
    });
    child.stderr.on('data', (d) => {
      output += d.toString();
      process.stderr.write(d);
    });
    child.on('error', reject);
    child.on('close', (code) => resolvePromise({ code: code ?? 1, output }));
  });
}

function studioProcessRunning() {
  try {
    const list = execFileSync('tasklist', [], { encoding: 'utf8' });
    return /Membrana Studio/iu.test(list);
  } catch {
    return false; // не Windows / tasklist недоступен — ветка просто не различится
  }
}

async function mustPass(command, args, env) {
  const { code } = await run(command, args, env ? { env: { ...process.env, ...env } } : {});
  if (code !== 0) {
    console.error(`studio:package — шаг «${command} ${args.join(' ')}» упал (exit ${code}), дальше не идём`);
    process.exit(code);
  }
}

// Класс 21.08: остаток прерванной сборки держит d3dcompiler_47.dll — чистим ДО старта.
const leftoverExistedBeforeRun = existsSync(WIN_UNPACKED);
if (leftoverExistedBeforeRun) {
  console.error(`studio:package — остаток прерванной сборки: удаляю ${WIN_UNPACKED} (вещдок 21.08)`);
  rmSync(WIN_UNPACKED, { recursive: true, force: true });
}

// Класс «stale dist»: turbo-замыкание собирает протухшие зависимости само (#2147/№5).
await mustPass('yarn', ['turbo', 'run', 'build', '--filter=@membrana/membrana-studio...']);

await mustPass('yarn', ['studio:build'], { MEMBRANA_STUDIO_PROD: '1' });

const PACKAGE_ARGS = ['workspace', '@membrana/membrana-studio', 'package'];
let attempt = await run('yarn', PACKAGE_ARGS);
if (attempt.code !== 0) {
  const firstClass = classifyPackageFailure({
    output: attempt.output,
    leftoverExistedBeforeRun: false, // остаток вычищен до старта — эта ветка уже исключена
    studioProcessRunning: studioProcessRunning(),
  });
  if (firstClass.kind === 'external-holder') {
    console.error('studio:package — похоже на внешнего держателя (AV): одна повторная попытка через 5 с…');
    await new Promise((r) => setTimeout(r, 5000));
    attempt = await run('yarn', PACKAGE_ARGS);
  }
  if (attempt.code !== 0) {
    const c = classifyPackageFailure({
      output: attempt.output,
      leftoverExistedBeforeRun: false,
      studioProcessRunning: studioProcessRunning(),
    });
    console.error('\nstudio:package — упаковка НЕ собрана:');
    for (const line of packageFailureAdvice(c)) console.error(`  ${line}`);
    process.exit(attempt.code);
  }
}

console.log('Membrana Studio package OK — see apps/membrana-studio/release/');
