// Тесты сторожа диска (Д1, кусок A #2118) — DoD-предикаты вердикта M1c:
//   A: тревога места уходит direct при мёртвом офисе (и падает на офис при мёртвом direct)
//   B: тишина сторожа поднимает stale не позже T_silence (+ таймер 5 мин ⇒ ≤ 20 мин)
//   C: тишина ≠ «всё хорошо» — stale отдельный сигнал, last_ok_ts сторожем-сторожем не пишется
//   F: формулы T_remain / B_floor / decide — чистые, без UI и без сети
// Сеть не трогается: DW_SEND_MODE=print, часы и df подменены крючьями.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const GUARD = join(repoRoot, 'deploy', 'disk-watchdog', 'disk-watchdog.sh');
const SENTINEL = join(repoRoot, 'deploy', 'disk-watchdog', 'disk-watchdog-sentinel.sh');

const GiB = 1024 ** 3;
const MiB = 1024 ** 2;
const NOW = 1_756_000_000;

function runBash(script, args, env = {}) {
  const r = spawnSync('bash', [script, ...args], {
    env: { ...process.env, DW_ENV_FILE: '/dev/null', LC_ALL: 'C', ...env },
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return { code: r.status ?? 1, stdout: r.stdout ?? '', stderr: r.stderr ?? '' };
}

function runGuard(args, env) {
  const r = runBash(GUARD, args, env);
  return r;
}

const baseEnv = (stateDir, extra = {}) => ({
  DW_STATE_DIR: stateDir,
  DW_SEND_MODE: 'print',
  DW_FAKE_NOW_EPOCH: String(NOW),
  ...extra,
});

// ── F: чистые формулы ─────────────────────────────────────────────────────────

test('F: compute — T_remain = free / rate, целые минуты (floor)', () => {
  // 6 GiB при 100 MiB/мин → 61 мин (61.44 → floor)
  const r = runGuard(['compute', String(6 * GiB), String(100 * MiB)]);
  assert.equal(r.stdout.trim(), '61');
});

test('F: compute — нулевая скорость клампится, деления на ноль нет', () => {
  const r = runGuard(['compute', '1000', '0']);
  assert.equal(r.stdout.trim(), '1000');
});

test('F: b-floor — max(1GiB, 10 мин записи)', () => {
  // 10 МБ/мин: 10·10 МиБ = 100 МиБ < 1 GiB → 1 GiB
  assert.equal(runGuard(['b-floor', String(10 * MiB)]).stdout.trim(), String(GiB));
  // 200 МБ/мин: 2000 МиБ > 1 GiB → 10·rate
  assert.equal(runGuard(['b-floor', String(200 * MiB)]).stdout.trim(), String(10 * 200 * MiB));
});

test('F: decide — crit/warn/ok по порогам, несгораемый остаток сильнее T_remain', () => {
  const floor = String(GiB);
  const free = String(20 * GiB);
  assert.equal(runGuard(['decide', '59', free, floor, '60', '180']).stdout.trim(), 'crit');
  assert.equal(runGuard(['decide', '61', free, floor, '60', '180']).stdout.trim(), 'warn');
  assert.equal(runGuard(['decide', '200', free, floor, '60', '180']).stdout.trim(), 'ok');
  // места меньше несгораемого — crit, каким бы ни был T_remain
  assert.equal(runGuard(['decide', '99999', String(GiB / 2), floor, '60', '180']).stdout.trim(), 'crit');
});

// ── A: доставка тревоги места ────────────────────────────────────────────────

test('A: crit уходит DIRECT (офис не нужен), пишется last_ok_ts и журнал', () => {
  const dir = mkdtempSync(join(tmpdir(), 'dw-'));
  const r = runGuard(['run'], baseEnv(dir, { DW_FAKE_FREE_BYTES: String(100 * MiB) }));
  assert.equal(r.code, 0);
  assert.match(r.stdout, /level=crit/);
  assert.match(r.stdout, /outcome=sent_direct/);
  assert.match(r.stderr, /DIRECT> \[disk-alarm\]\[crit\]/);
  assert.doesNotMatch(r.stderr, /OFFICE>/);
  assert.equal(readFileSync(join(dir, 'last_ok_ts'), 'utf8').trim(), String(NOW));
  assert.match(readFileSync(join(dir, 'journal.log'), 'utf8'), /outcome=sent_direct/);
});

test('A: отказ direct → fallback офис (sent_via_office), офис-first не бывает', () => {
  const dir = mkdtempSync(join(tmpdir(), 'dw-'));
  const r = runGuard(['run'], baseEnv(dir, {
    DW_FAKE_FREE_BYTES: String(100 * MiB),
    DW_FORCE_DIRECT_FAIL: '1',
  }));
  assert.equal(r.code, 0);
  assert.match(r.stdout, /outcome=sent_via_office/);
  // порядок каналов: сперва DIRECT, только потом OFFICE
  const direct = r.stderr.indexOf('DIRECT>');
  const office = r.stderr.indexOf('OFFICE>');
  assert.ok(direct >= 0 && office > direct, `ожидался DIRECT затем OFFICE, stderr: ${r.stderr}`);
});

test('A: оба канала мертвы → failed_both и красный exit-code', () => {
  const dir = mkdtempSync(join(tmpdir(), 'dw-'));
  const r = runGuard(['run'], baseEnv(dir, {
    DW_FAKE_FREE_BYTES: String(100 * MiB),
    DW_FORCE_DIRECT_FAIL: '1',
    DW_FORCE_OFFICE_FAIL: '1',
  }));
  assert.equal(r.code, 1);
  assert.match(r.stdout, /outcome=failed_both/);
  // сторож при этом жив — last_ok_ts записан (мёртв канал, не сторож)
  assert.equal(readFileSync(join(dir, 'last_ok_ts'), 'utf8').trim(), String(NOW));
});

test('A: real-режим без токена → skipped_no_token, сеть не дёргается', () => {
  const dir = mkdtempSync(join(tmpdir(), 'dw-'));
  const r = runGuard(['run'], {
    DW_STATE_DIR: dir,
    DW_FAKE_NOW_EPOCH: String(NOW),
    DW_FAKE_FREE_BYTES: String(100 * MiB),
    DISK_WATCHDOG_TG_TOKEN: '',
    DISK_WATCHDOG_TG_CHAT_ID: '',
  });
  assert.equal(r.code, 0);
  assert.match(r.stdout, /outcome=skipped_no_token/);
});

test('A: ре-тревога троттлится (≤ 1 в 30 мин), но здоровый прогон её не маскирует', () => {
  const dir = mkdtempSync(join(tmpdir(), 'dw-'));
  const env1 = baseEnv(dir, { DW_FAKE_FREE_BYTES: String(100 * MiB) });
  assert.match(runGuard(['run'], env1).stdout, /outcome=sent_direct/);
  const env2 = baseEnv(dir, {
    DW_FAKE_FREE_BYTES: String(100 * MiB),
    DW_FAKE_NOW_EPOCH: String(NOW + 5 * 60),
  });
  assert.match(runGuard(['run'], env2).stdout, /outcome=skipped_throttled/);
  const env3 = baseEnv(dir, {
    DW_FAKE_FREE_BYTES: String(100 * MiB),
    DW_FAKE_NOW_EPOCH: String(NOW + 31 * 60),
  });
  assert.match(runGuard(['run'], env3).stdout, /outcome=sent_direct/);
});

test('здоровый диск → ok_no_alarm, транспорт не зовётся', () => {
  const dir = mkdtempSync(join(tmpdir(), 'dw-'));
  const r = runGuard(['run'], baseEnv(dir, { DW_FAKE_FREE_BYTES: String(40 * GiB) }));
  assert.equal(r.code, 0);
  assert.match(r.stdout, /level=ok/);
  assert.match(r.stdout, /outcome=ok_no_alarm/);
  assert.doesNotMatch(r.stderr, /DIRECT>|OFFICE>/);
});

// ── B + C: сторож сторожа ────────────────────────────────────────────────────

test('B: тишина 16 мин (> T_silence=15) → [disk-watchdog-stale] уходит direct', () => {
  const dir = mkdtempSync(join(tmpdir(), 'dw-'));
  writeFileSync(join(dir, 'last_ok_ts'), String(NOW - 16 * 60));
  const r = runBash(SENTINEL, [], baseEnv(dir));
  assert.equal(r.code, 0);
  assert.match(r.stdout, /age_min=16/);
  assert.match(r.stdout, /outcome=sent_direct/);
  assert.match(r.stderr, /DIRECT> \[disk-watchdog-stale\]/);
});

test('B: свежий last_ok (14 мин) → тревоги нет', () => {
  const dir = mkdtempSync(join(tmpdir(), 'dw-'));
  writeFileSync(join(dir, 'last_ok_ts'), String(NOW - 14 * 60));
  const r = runBash(SENTINEL, [], baseEnv(dir));
  assert.match(r.stdout, /outcome=ok_fresh/);
  assert.doesNotMatch(r.stderr, /stale/);
});

test('B: last_ok_ts отсутствует вовсе → это тоже тишина, тревога уходит', () => {
  const dir = mkdtempSync(join(tmpdir(), 'dw-'));
  const r = runBash(SENTINEL, [], baseEnv(dir));
  assert.match(r.stdout, /outcome=sent_direct/);
  assert.match(r.stderr, /никогда/);
});

test('C: stale — отдельный сигнал с отдельным лицом, и сторож-сторож не пишет last_ok_ts', () => {
  const dir = mkdtempSync(join(tmpdir(), 'dw-'));
  const staleTs = String(NOW - 16 * 60);
  writeFileSync(join(dir, 'last_ok_ts'), staleTs);
  const r = runBash(SENTINEL, [], baseEnv(dir));
  // лицо сигнала отличимо от тревоги места
  assert.match(r.stderr, /\[disk-watchdog-stale\]/);
  assert.doesNotMatch(r.stderr, /\[disk-alarm\]/);
  // и прямо сказано, что тишина не означает «всё хорошо»
  assert.match(r.stderr, /не означает/);
  // last_ok_ts НЕ обновлён — иначе sentinel замаскировал бы ловимую им тишину
  assert.equal(readFileSync(join(dir, 'last_ok_ts'), 'utf8').trim(), staleTs);
  assert.ok(existsSync(join(dir, 'journal-sentinel.log')));
});

test('B: ре-тревога stale тоже троттлится', () => {
  const dir = mkdtempSync(join(tmpdir(), 'dw-'));
  writeFileSync(join(dir, 'last_ok_ts'), String(NOW - 16 * 60));
  assert.match(runBash(SENTINEL, [], baseEnv(dir)).stdout, /outcome=sent_direct/);
  const r2 = runBash(SENTINEL, [], baseEnv(dir, { DW_FAKE_NOW_EPOCH: String(NOW + 5 * 60) }));
  assert.match(r2.stdout, /outcome=skipped_throttled/);
});
