#!/usr/bin/env node
/**
 * _ssh-office-exec — выполнить команду ИЛИ локальный скрипт на office-VDS.
 *
 * Закрывает п.1 ретро #485 и п.3 ретро #476. За сессию 2026-07-14 один танец
 * повторён 4 раза (check-code.sh, pu1-smoke.sh, pu2-smoke.sh, send-swallow.sh):
 * написать .sh → `sed -i 's/\r$//'` → scp → chmod +x → запуск → unlink. Плюс
 * 4 одноразовых _tmp-ssh-файла за час, потому что scratchpad не резолвит ssh2.
 *
 * Два режима:
 *   node scripts/_ssh-office-exec.mjs 'docker ps --format "{{.Names}}"'
 *   node scripts/_ssh-office-exec.mjs --script ./local.sh [arg...]
 *
 * Режим --script сам снимает CRLF: файл, написанный из Windows-сессии, иначе
 * приезжает с `\r` и bash падает на `$'\r': command not found` — ровно та
 * ручная `sed`-строка, ради которой писалась обёртка.
 *
 * Пароль/ключ и туннельный endpoint берутся из _ssh-office-config (см. #349).
 * Аналог для media-хоста — _ssh-media-exec (там своя парольная схема).
 */
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { Client } from 'ssh2';

import { getOfficeSshConfig } from './_ssh-office-config.mjs';

/** Одиночная кавычка в POSIX-shell: закрыть строку, вставить '\'', открыть снова. */
function shellQuote(arg) {
  return `'${String(arg).replaceAll("'", `'\\''`)}'`;
}

function connect(config) {
  return new Promise((resolvePromise, rejectPromise) => {
    const conn = new Client();
    conn
      .on('ready', () => resolvePromise(conn))
      .on('error', rejectPromise)
      .connect(config);
  });
}

/**
 * Закрыть соединение и ДОЖДАТЬСЯ события close.
 *
 * Без ожидания `process.exit()` успевает выстрелить, пока ssh2-сокет ещё
 * закрывается, и libuv на Windows роняет процесс ассертом
 * `!(handle->flags & UV_HANDLE_CLOSING)` с кодом 127 — зелёный смоук выглядит
 * упавшим (живой случай при первом прогоне _ssh-panel-smoke).
 */
function endConnection(conn) {
  return new Promise((resolvePromise) => {
    conn.on('close', resolvePromise);
    conn.end();
  });
}

function exec(conn, command) {
  return new Promise((resolvePromise, rejectPromise) => {
    conn.exec(command, (err, stream) => {
      if (err) return rejectPromise(err);
      stream
        .on('close', (code) => resolvePromise(code ?? 0))
        .on('data', (d) => process.stdout.write(d))
        .stderr.on('data', (d) => process.stderr.write(d));
    });
  });
}

function sftpPutText(conn, text, remote) {
  return new Promise((resolvePromise, rejectPromise) => {
    conn.sftp((err, sftp) => {
      if (err) return rejectPromise(err);
      const stream = sftp.createWriteStream(remote, { mode: 0o700 });
      stream.on('close', resolvePromise);
      stream.on('error', rejectPromise);
      stream.end(text);
    });
  });
}

/** Убрать CR из CRLF-переводов строк (Windows-редактор → bash на VDS). */
export function stripCarriageReturns(text) {
  return text.replaceAll('\r\n', '\n');
}

/** Собрать удалённую команду запуска залитого скрипта с аргументами. */
export function buildScriptCommand(remotePath, args = []) {
  return ['bash', remotePath, ...args.map(shellQuote)].join(' ');
}

/** Выполнить команду на office-VDS. → exit-code удалённой команды. */
export async function runOnOffice(command, config = getOfficeSshConfig()) {
  const conn = await connect(config);
  try {
    return await exec(conn, command);
  } finally {
    await endConnection(conn);
  }
}

/**
 * Как runOnOffice, но вывод возвращается строкой, а не льётся в stdout.
 * Нужен, когда с VDS читается секрет (_ssh-panel-smoke): печатать его нельзя.
 */
export async function captureOnOffice(command, config = getOfficeSshConfig()) {
  const conn = await connect(config);
  try {
    return await new Promise((resolvePromise, rejectPromise) => {
      conn.exec(command, (err, stream) => {
        if (err) return rejectPromise(err);
        let stdout = '';
        let stderr = '';
        stream
          .on('close', (code) => resolvePromise({ code: code ?? 0, stdout, stderr }))
          .on('data', (d) => (stdout += d))
          .stderr.on('data', (d) => (stderr += d));
      });
    });
  } finally {
    await endConnection(conn);
  }
}

/**
 * Залить локальный скрипт на office-VDS и выполнить. Временный файл снимается
 * всегда — в том числе когда скрипт упал (иначе /tmp копит мусор от отладки).
 */
export async function runScriptOnOffice(localPath, args = [], config = getOfficeSshConfig()) {
  const body = stripCarriageReturns(readFileSync(localPath, 'utf8'));
  const remotePath = `/tmp/_vds-run-${randomBytes(6).toString('hex')}.sh`;
  const conn = await connect(config);
  try {
    await sftpPutText(conn, body, remotePath);
    return await exec(conn, buildScriptCommand(remotePath, args));
  } finally {
    try {
      await exec(conn, `rm -f ${remotePath}`);
    } catch {
      /* уборка best-effort: код возврата скрипта важнее */
    }
    await endConnection(conn);
  }
}

const USAGE = `Usage:
  node scripts/_ssh-office-exec.mjs '<remote command>'
  node scripts/_ssh-office-exec.mjs --script <local.sh> [arg...]

  yarn office:ssh 'docker ps'                 # БЕЗ '--': yarn 4 съедает его сам
  yarn vds:run ./scratch/check.sh --verbose`;

/**
 * Ведущий одиночный '--' отбрасывается: yarn 4 (berry) забирает его себе, так что
 * `yarn office:ssh -- 'cmd'` доходит сюда уже без него, а `node ... -- 'cmd'` — с
 * ним. Привычная форма из ретро #476 не должна молча терять команду.
 */
export function normalizeArgv(argv) {
  return argv[0] === '--' ? argv.slice(1) : argv;
}

if (process.argv[1]?.endsWith('_ssh-office-exec.mjs')) {
  const argv = normalizeArgv(process.argv.slice(2));
  const scriptMode = argv[0] === '--script';
  const target = scriptMode ? argv[1] : argv[0];
  if (!target) {
    console.error(USAGE);
    process.exit(1);
  }

  const { host, port } = getOfficeSshConfig();
  console.error(`[office-exec] ${host}:${port} ${scriptMode ? `script ${target}` : 'command'}`);

  // exitCode, а не process.exit(): см. коммент в endConnection — обрыв процесса с
  // недописанным pipe-stdout роняет libuv на Windows ассертом (код 127 поверх
  // настоящего кода возврата). Код удалённой команды пробрасывается наружу как есть.
  const run = scriptMode ? runScriptOnOffice(target, argv.slice(2)) : runOnOffice(target);
  run
    .then((code) => {
      process.exitCode = code;
    })
    .catch((e) => {
      console.error('SSH ERR', e.message);
      process.exitCode = 1;
    });
}
