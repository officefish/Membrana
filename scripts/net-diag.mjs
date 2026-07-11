#!/usr/bin/env node
/**
 * yarn net:diag <ip> [--port 22] [--out <dir>]
 *
 * Батарея сетевой диагностики «сервер недоступен» → бандл для тикета хостеру.
 * По итогам office-vds 2026-07-11: различает unreachable / tcp-data-filter /
 * pmtu-blackhole / packet-loss / ok. Классификатор — чистый (lib/net-diag.mjs, тест).
 *
 * Пишет в <out> (default: ./net-diag-<ip>): 00-summary.txt, tracert.txt, ssh-vvv.txt.
 */
import { execFile } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { connect } from 'node:net';
import { platform } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';

import { classifyNetDiag, formatNetDiagSummary } from './lib/net-diag.mjs';

const execFileP = promisify(execFile);
const isWin = platform() === 'win32';

function parseArgs(argv) {
  const o = { ip: null, port: 22, out: null };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--port') o.port = Number(argv[(i += 1)]);
    else if (a === '--out') o.out = argv[(i += 1)];
    else if (!a.startsWith('-') && !o.ip) o.ip = a;
  }
  return o;
}

/** TCP connect + первые байты (баннер). */
function tcpBanner(ip, port, timeoutMs = 12_000) {
  return new Promise((res) => {
    const sock = connect(port, ip);
    let connected = false;
    let banner = '';
    const done = (result) => {
      sock.destroy();
      res(result);
    };
    sock.setTimeout(timeoutMs);
    sock.on('connect', () => {
      connected = true;
    });
    sock.on('data', (d) => {
      banner += d.toString('latin1');
      done({ tcpConnect: true, bannerReceived: banner.length > 0, banner: banner.trim().slice(0, 120) });
    });
    sock.on('timeout', () => done({ tcpConnect: connected, bannerReceived: false, banner: '' }));
    sock.on('error', () => done({ tcpConnect: false, bannerReceived: false, banner: '' }));
  });
}

/** ICMP ping с размером и DF. Возвращает { ok, lossPct }. */
async function ping(ip, size, df) {
  const args = isWin
    ? ['-n', '3', '-l', String(size), ...(df ? ['-f'] : []), ip]
    : ['-c', '3', '-s', String(size), ...(df ? ['-M', 'do'] : []), ip];
  try {
    const { stdout } = await execFileP('ping', args, { timeout: 20_000 });
    const lossMatch = stdout.match(/(\d+)%\s*(?:loss|packet loss|потерь)/i);
    const lossPct = lossMatch ? Number(lossMatch[1]) : 0;
    const ok = /ttl=|bytes from|Reply from|Ответ от/i.test(stdout) && lossPct < 100;
    return { ok, lossPct, stdout };
  } catch (e) {
    return { ok: false, lossPct: 100, stdout: String(e?.stdout ?? e?.message ?? e) };
  }
}

async function tracertText(ip) {
  const cmd = isWin ? 'tracert' : 'traceroute';
  const args = isWin ? ['-d', '-w', '800', '-h', '30', ip] : ['-n', '-w', '2', '-m', '30', ip];
  try {
    const { stdout } = await execFileP(cmd, args, { timeout: 90_000 });
    return stdout;
  } catch (e) {
    return String(e?.stdout ?? e?.message ?? e);
  }
}

/** Полный SSH-обмен: проходит ли kex. */
async function sshFullExchange(ip, port) {
  try {
    const { stdout, stderr } = await execFileP(
      'ssh',
      ['-vvv', '-p', String(port), '-o', 'ConnectTimeout=15', '-o', 'StrictHostKeyChecking=no', '-o', 'BatchMode=yes', `root@${ip}`, 'exit'],
      { timeout: 30_000 },
    );
    const text = `${stdout}\n${stderr}`;
    return { full: /Authenticated|Permission denied|password|publickey|Offering/i.test(text), text };
  } catch (e) {
    const text = `${e?.stdout ?? ''}\n${e?.stderr ?? e?.message ?? e}`;
    // Прошёл kex, но упал на auth (BatchMode) — это ПОЛНЫЙ обмен состоялся.
    const full = /Permission denied|publickey|password|Authenticated|Offering/i.test(text);
    return { full, text };
  }
}

async function main() {
  const { ip, port, out } = parseArgs(process.argv);
  if (!ip) {
    console.error('Usage: yarn net:diag <ip> [--port 22] [--out <dir>]');
    process.exit(1);
  }
  const outDir = resolve(out ?? `./net-diag-${ip}`);
  mkdirSync(outDir, { recursive: true });

  console.log(`net:diag ${ip}:${port} → ${outDir}`);
  const banner = await tcpBanner(ip, port);
  const small = await ping(ip, 100, true);
  const large = await ping(ip, 1400, true);
  const tracert = await tracertText(ip);
  const ssh = port === 22 ? await sshFullExchange(ip, port) : { full: banner.bannerReceived, text: '(ssh пропущен: порт != 22)' };

  const probe = {
    tcpConnect: banner.tcpConnect,
    bannerReceived: banner.bannerReceived,
    smallPing: small.ok,
    largePingDF: large.ok,
    icmpLossPct: Math.max(small.lossPct, large.lossPct),
    fullTcpExchange: ssh.full,
  };
  const verdict = classifyNetDiag(probe);
  const summary = formatNetDiagSummary({ ip, port }, probe, verdict);

  writeFileSync(join(outDir, '00-summary.txt'), `${summary}\n`, 'utf8');
  writeFileSync(join(outDir, 'tracert.txt'), tracert, 'utf8');
  writeFileSync(join(outDir, 'ssh-vvv.txt'), ssh.text, 'utf8');
  writeFileSync(join(outDir, 'ping-small.txt'), small.stdout, 'utf8');
  writeFileSync(join(outDir, 'ping-large-1400-DF.txt'), large.stdout, 'utf8');

  console.log(`\n${summary}\n`);
  console.log(`Бандл: ${outDir} (00-summary.txt, tracert.txt, ssh-vvv.txt, ping-*.txt)`);
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('net-diag.mjs')) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
