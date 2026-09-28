#!/usr/bin/env node
/**
 * Прибор #2: живой Electron-транспорт сброса scenario trace (#2476 / #2485).
 *
 * Зачем второй прибор. `scripts/measure-scenario-trace-teardown.mjs` мерит ТОЛЬКО renderer-часть
 * разборки (join/slice/splice) и подменяет выход заглушкой-счётчиком. Единственный
 * НЕОГРАНИЧЕННЫЙ вызов на пути остановки записи — `ipcRenderer.sendSync`
 * (apps/membrana-studio/src/preload.ts) — им не измерен ни разу. Этот прибор поднимает
 * настоящий Electron и мерит простой отрисовщика на этом вызове.
 *
 * Границы честности. Это НЕ живая Студия: нет её главного процесса, нет React в отрисовщике,
 * занятость соседа моделируется синхронным блоком. Числа читаются как НИЖНЯЯ оценка простоя.
 * Живое число снимается врезкой MEMBRANA_TRACE_FLUSH_TIMING=1 в самой Студии
 * (apps/membrana-studio/src/logging/trace-flush-timing.ts).
 *
 * Требует установленного бинаря Electron (apps/membrana-studio → node_modules/electron).
 * Запуск: `node scripts/measure-scenario-trace-ipc.mjs [--lines 10000]`.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(SCRIPT_DIR, '..');
const APP_DIR = join(SCRIPT_DIR, 'scenario-trace-ipc-probe');

const ELECTRON_CANDIDATES = [
  join(REPO_ROOT, 'node_modules/electron/dist/electron.exe'),
  join(REPO_ROOT, 'node_modules/electron/dist/electron'),
  join(REPO_ROOT, 'apps/membrana-studio/node_modules/electron/dist/electron.exe'),
  join(REPO_ROOT, 'apps/membrana-studio/node_modules/electron/dist/electron'),
];

function resolveElectron() {
  // Дерево без установленных зависимостей (частый случай параллельных сессий) может взять
  // бинарь соседнего дерева: MEMBRANA_ELECTRON_BIN=<путь к electron>.
  const override = process.env.MEMBRANA_ELECTRON_BIN;
  if (override !== undefined && override.length > 0) {
    if (!existsSync(override)) throw new Error('MEMBRANA_ELECTRON_BIN указывает в пустоту: ' + override);
    return override;
  }
  const found = ELECTRON_CANDIDATES.find((candidate) => existsSync(candidate));
  if (found === undefined) {
    throw new Error(
      'бинарь Electron не найден; поставьте зависимости или задайте MEMBRANA_ELECTRON_BIN (искали: ' + ELECTRON_CANDIDATES.join(', ') + ')',
    );
  }
  return found;
}

function parseArgs(argv) {
  const options = { lines: 10_000 };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--lines') {
      const value = Number.parseInt(argv[i + 1] ?? '', 10);
      if (!Number.isInteger(value) || value <= 0) throw new Error('--lines требует положительное число');
      options.lines = value;
      i += 1;
    } else {
      throw new Error(`неизвестный аргумент: ${argv[i]}`);
    }
  }
  return options;
}

function ms(value) {
  return value.toFixed(1);
}

const MODE_TITLES = {
  noop: 'только транспорт (без записи)',
  single: 'одна запись на диск',
  full: 'продуктовое: две записи + пересчёт строк',
};

function printTable(rows) {
  console.log('| handler | занятость главного процесса | median ms | p95 ms | max ms |');
  console.log('|---|---|--:|--:|--:|');
  for (const row of rows) {
    console.log(
      `| ${MODE_TITLES[row.mode] ?? row.mode} | ${row.load} | ` +
        `${ms(row.medianMs)} | ${ms(row.p95Ms)} | ${ms(row.maxMs)} |`,
    );
  }
}

function main() {
  try {
    const options = parseArgs(process.argv.slice(2));
    const electron = resolveElectron();
    // ELECTRON_RUN_AS_NODE в окружении превращает бинарь в обычный Node: тогда `require('electron')`
    // не разрешается и прибор падает с MODULE_NOT_FOUND. Снимаем явно.
    const env = { ...process.env, PROBE_TRACE_LINES: String(options.lines) };
    delete env.ELECTRON_RUN_AS_NODE;

    const result = spawnSync(electron, [APP_DIR], { env, encoding: 'utf8' });
    const stdout = result.stdout ?? '';
    const error = stdout.match(/###PROBE-ERROR###(.*)/);
    if (error !== null) throw new Error(`прибор упал в отрисовщике: ${error[1]}`);
    const payload = stdout.match(/###PROBE-RESULT###(.*)/);
    if (payload === null) {
      throw new Error(`прибор не отдал результат; stdout: ${stdout.slice(0, 2000)}\n${result.stderr ?? ''}`);
    }
    const rows = JSON.parse(payload[1]);

    console.log('# scenario trace flush — простой отрисовщика на sendSync (живой Electron)');
    console.log(`lines=${rows[0].size}; bytes=${rows[0].bytes}; repeats=25; warmup=3`);
    console.log(`electron=${electron}; platform=${process.platform}/${process.arch}`);
    console.log('');
    printTable(rows);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

if (process.argv[1]?.endsWith('measure-scenario-trace-ipc.mjs')) main();
