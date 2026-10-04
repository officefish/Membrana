// Зуб #2580 (спринт office-mongo-credentials-2580, блок b2): выкатка office судит хранилища.
//
// Инцидент 24.09–04.10: база archivarius-mongo 10 дней была unhealthy (пользователя нет),
// office отвечал 500 на запись, а выкатка (`_ssh-office-prod-up.mjs`) видела только
// `curl /health` после `sleep 12` — и рапортовала OK.
//
// P3  — вердикт по закрытому словарю исходов (чистая функция).
// P3b — сбор `deploy/office-stack.sh probe` на подставных docker/curl: секреты из env
//       (пароль в URI, токен) не попадают ни в stdout/stderr, ни в argv curl.
// P3c — prod-up зовёт probe после up, без голого `sleep 12`, и судит тем же предикатом.
// P3d — smoke [7] зовёт тот же probe и тот же предикат.
// Сеть и серверы не трогаются: живой прогон — блок b4, рукой владельца.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { bashArgv, bashScriptArg, explainBashFailure } from './lib/bash-invoke.mjs';
import {
  PROBE_DOORS,
  PROBE_ENV_URIS,
  PROBE_OUTCOMES,
  judgeOfficeStoreProbe,
  worstOutcome,
} from './lib/office-store-probe.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const STACK = join(repoRoot, 'deploy', 'office-stack.sh');
const PROD_UP = join(repoRoot, 'scripts', '_ssh-office-prod-up.mjs');
const SMOKE = join(repoRoot, 'scripts', '_ssh-office-smoke.mjs');

const okOutput = (over = {}) => {
  const v = {
    ARCHIVARIUS_MONGO_URI: 'credentials',
    TASK_ARCHIVE_MONGO_URI: 'credentials',
    db: 'healthy',
    office: 'healthy',
    'plugin-results-runs': '200',
    'archivarius-span': '404',
    'task-archive-closure': '404',
    end: true,
    ...over,
  };
  return [
    'probe version 1',
    `probe env ARCHIVARIUS_MONGO_URI ${v.ARCHIVARIUS_MONGO_URI}`,
    `probe env TASK_ARCHIVE_MONGO_URI ${v.TASK_ARCHIVE_MONGO_URI}`,
    `probe health archivarius-mongo ${v.db}`,
    `probe health office-api ${v.office}`,
    `probe door plugin-results-runs ${v['plugin-results-runs']}`,
    `probe door archivarius-span ${v['archivarius-span']}`,
    `probe door task-archive-closure ${v['task-archive-closure']}`,
    ...(v.end ? ['probe end'] : []),
  ].join('\n');
};

// ── P3: вердикт ─────────────────────────────────────────────────────────────────

test('P3: словарь исходов закрыт и ok — первый', () => {
  assert.deepEqual([...PROBE_OUTCOMES], [
    'ok',
    'env-uri-without-credentials',
    'db-unhealthy',
    'db-timeout',
    'door-5xx',
    'door-unexpected',
  ]);
});

test('P3: healthy база + двери 200/404/404 + оба URI с учётными → ok', () => {
  const v = judgeOfficeStoreProbe(okOutput());
  assert.equal(v.outcome, 'ok');
  assert.equal(v.ok, true);
  assert.deepEqual(v.findings, []);
});

test('P3: чужие строки (ps, баннеры ssh) суд не сбивают', () => {
  const v = judgeOfficeStoreProbe(`NAME STATUS\nmembrana-office-office-api-1 Up (healthy)\n${okOutput()}\n`);
  assert.equal(v.outcome, 'ok');
});

test('P3: инцидент 24.09 — база unhealthy, двери 500 → db-unhealthy (база важнее дверей)', () => {
  const v = judgeOfficeStoreProbe(okOutput({ db: 'unhealthy', 'plugin-results-runs': '500', 'archivarius-span': '503' }));
  assert.equal(v.outcome, 'db-unhealthy');
  assert.ok(v.findings.some((f) => f.outcome === 'door-5xx'), 'двери 5xx тоже названы находками');
});

test('P3: база не дождалась healthy → db-timeout', () => {
  assert.equal(judgeOfficeStoreProbe(okOutput({ db: 'timeout' })).outcome, 'db-timeout');
  assert.equal(judgeOfficeStoreProbe(okOutput({ db: 'missing' })).outcome, 'db-timeout');
});

test('P3: ловушка памяти — URI без учётных или без строки → env-uri-without-credentials, даже при зелёных дверях', () => {
  assert.equal(judgeOfficeStoreProbe(okOutput({ ARCHIVARIUS_MONGO_URI: 'no-credentials' })).outcome, 'env-uri-without-credentials');
  assert.equal(judgeOfficeStoreProbe(okOutput({ TASK_ARCHIVE_MONGO_URI: 'missing' })).outcome, 'env-uri-without-credentials');
  const noLine = okOutput().split('\n').filter((l) => !l.includes('TASK_ARCHIVE_MONGO_URI')).join('\n');
  assert.equal(judgeOfficeStoreProbe(noLine).outcome, 'env-uri-without-credentials');
});

test('P3: дверь 5xx → door-5xx; неожиданный код (200 вместо 404, 000, 401) → door-unexpected', () => {
  assert.equal(judgeOfficeStoreProbe(okOutput({ 'task-archive-closure': '500' })).outcome, 'door-5xx');
  assert.equal(judgeOfficeStoreProbe(okOutput({ 'archivarius-span': '200' })).outcome, 'door-unexpected');
  assert.equal(judgeOfficeStoreProbe(okOutput({ 'plugin-results-runs': '000' })).outcome, 'door-unexpected');
  assert.equal(judgeOfficeStoreProbe(okOutput({ 'plugin-results-runs': '401' })).outcome, 'door-unexpected');
});

test('P3: находка с outcome ok (или вне словаря) в непустом списке не даёт зелёного (ревью #2583)', () => {
  assert.equal(worstOutcome([]), 'ok');
  assert.equal(worstOutcome([{ outcome: 'ok', subject: 'x', detail: 'подстановка' }]), 'door-unexpected');
  assert.equal(worstOutcome([{ outcome: 'ok' }, { outcome: 'door-5xx' }]), 'door-5xx');
  assert.equal(worstOutcome([{ outcome: 'nonsense' }]), 'door-unexpected');
});

test('P3: пустой или оборванный вывод — не ok (молчание пробы не зелёное)', () => {
  assert.equal(judgeOfficeStoreProbe('').ok, false);
  assert.equal(judgeOfficeStoreProbe('Usage: office-stack.sh {build|up}').ok, false);
  assert.equal(judgeOfficeStoreProbe(okOutput({ end: false })).ok, false);
});

// ── P3b: сбор на подставных docker/curl ─────────────────────────────────────────

const PW_SENTINEL = 'pwsentinel2580deadbeefcafe0000';
const TOKEN_SENTINEL = 'tokensentinel2580feedface1111';

function writeExec(path, body) {
  writeFileSync(path, body.replace(/\r\n/gu, '\n'));
  chmodSync(path, 0o755);
}

/**
 * Прогон `office-stack.sh probe` с подставными docker и curl (крючья OFFICE_STACK_DOCKER /
 * OFFICE_STACK_CURL — только для зуба). Подставной curl пишет свой argv и stdin в файлы:
 * так проверяется, что токен идёт конфигом через stdin (`-K -`), а не аргументом.
 */
function runProbe({ envText, dbHealth = 'healthy', officeHealth = 'healthy', codes = {}, timeoutSec = '30' }) {
  const dir = mkdtempSync(join(tmpdir(), 'office-probe-2580-'));
  try {
    const envFile = join(dir, 'office.env');
    writeFileSync(envFile, envText);
    const argvLog = join(dir, 'curl-argv.log');
    const stdinLog = join(dir, 'curl-stdin.log');
    const docker = join(dir, 'fake-docker');
    const curl = join(dir, 'fake-curl');
    writeExec(
      docker,
      `#!/usr/bin/env bash
args="$*"
last="\${@: -1}"
case "$args" in
  *" ps -q "*) echo "id-$last" ;;
  inspect*)
    case "$last" in
      *archivarius-mongo*) echo "${dbHealth}" ;;
      *) echo "${officeHealth}" ;;
    esac ;;
  *) exit 0 ;;
esac
`,
    );
    writeExec(
      curl,
      `#!/usr/bin/env bash
printf '%s\\n' "$@" >> "${bashScriptArg(argvLog)}"
cat >> "${bashScriptArg(stdinLog)}"
url="\${@: -1}"
case "$url" in
  *plugin-results*) printf '%s' "${codes.runs ?? '200'}" ;;
  *archivarius/span*) printf '%s' "${codes.span ?? '404'}" ;;
  *task-archive/closures*) printf '%s' "${codes.closure ?? '404'}" ;;
  *) printf '000' ;;
esac
`,
    );
    const r = spawnSync('bash', bashArgv(STACK, ['probe']), {
      env: {
        ...process.env,
        LC_ALL: 'C',
        OFFICE_ENV_FILE: bashScriptArg(envFile),
        OFFICE_STACK_DOCKER: bashScriptArg(docker),
        OFFICE_STACK_CURL: bashScriptArg(curl),
        PROBE_TIMEOUT_SEC: timeoutSec,
        PROBE_POLL_SEC: '1',
      },
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const why = explainBashFailure(r, STACK);
    if (why) throw new Error(why);
    return {
      code: r.status ?? 1,
      stdout: r.stdout ?? '',
      stderr: r.stderr ?? '',
      argv: existsSync(argvLog) ? readFileSync(argvLog, 'utf8') : '',
      stdin: existsSync(stdinLog) ? readFileSync(stdinLog, 'utf8') : '',
    };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const goodEnv = [
  'OFFICE_PORT=3000',
  `API_INTERNAL_TOKEN=${TOKEN_SENTINEL}`,
  `ARCHIVARIUS_MONGO_PASSWORD=${PW_SENTINEL}`,
  `ARCHIVARIUS_MONGO_URI=mongodb://archivarius:${PW_SENTINEL}@archivarius-mongo:27017/membrana_archivarius?authSource=admin`,
  `TASK_ARCHIVE_MONGO_URI=mongodb://archivarius:${PW_SENTINEL}@archivarius-mongo:27017/membrana_task_archive?authSource=admin`,
  '',
].join('\n');

test('P3b: сбор на здоровом стенде → ok; пароль и токен не утекают ни в вывод, ни в argv curl', () => {
  const r = runProbe({ envText: goodEnv });
  assert.equal(r.code, 0, 'probe — сбор, а не суд: exit 0 при напечатанных строках');
  assert.equal(judgeOfficeStoreProbe(r.stdout).outcome, 'ok');
  for (const s of [PW_SENTINEL, TOKEN_SENTINEL]) {
    assert.ok(!r.stdout.includes(s) && !r.stderr.includes(s), 'проба напечатала секрет из env');
    assert.ok(!r.argv.includes(s), 'секрет ушёл в argv curl (виден в ps на сервере)');
  }
  assert.ok(r.stdin.includes(TOKEN_SENTINEL), 'токен не дошёл до curl конфигом через stdin');
  assert.ok(!r.stdin.includes(PW_SENTINEL), 'пароль базы ушёл в curl');
});

test('P3b: сбор видит URI без учётных → env-uri-without-credentials, значения не печатаются', () => {
  const env = goodEnv.replace(
    /^ARCHIVARIUS_MONGO_URI=.*$/mu,
    'ARCHIVARIUS_MONGO_URI=mongodb://archivarius-mongo:27017/membrana_archivarius',
  );
  const r = runProbe({ envText: env });
  // Строка обязана быть напечатана самим сбором: пустой вывод тоже дал бы этот исход (вакуумно).
  assert.match(r.stdout, /^probe env ARCHIVARIUS_MONGO_URI no-credentials$/mu, 'сбор не назвал форму URI');
  assert.match(r.stdout, /^probe env TASK_ARCHIVE_MONGO_URI credentials$/mu, 'сбор спутал исправный URI');
  assert.equal(judgeOfficeStoreProbe(r.stdout).outcome, 'env-uri-without-credentials');
  assert.ok(!r.stdout.includes('mongodb://'), 'проба напечатала URI');
});

test('P3b: сбор на unhealthy базе и 500 на двери → db-unhealthy', () => {
  const r = runProbe({ envText: goodEnv, dbHealth: 'unhealthy', codes: { runs: '500' } });
  const v = judgeOfficeStoreProbe(r.stdout);
  assert.equal(v.outcome, 'db-unhealthy');
  assert.ok(v.findings.some((f) => f.outcome === 'door-5xx' && f.subject === 'plugin-results-runs'));
});

test('P3b: база застряла в starting → db-timeout по таймауту ожидания', () => {
  const r = runProbe({ envText: goodEnv, dbHealth: 'starting', timeoutSec: '1' });
  assert.equal(judgeOfficeStoreProbe(r.stdout).outcome, 'db-timeout');
});

test('P3b: имена дверей сбора совпадают со словарём суда', () => {
  const text = readFileSync(STACK, 'utf8');
  for (const door of PROBE_DOORS) assert.ok(text.includes(`probe_door ${door.name} `), `office-stack.sh не бьёт дверь ${door.name}`);
  for (const key of PROBE_ENV_URIS) assert.ok(text.includes(key), `office-stack.sh не проверяет ${key}`);
});

// ── P3c / P3d: оба входа зовут один probe и один предикат ───────────────────────

test('P3c: prod-up после up зовёт probe, без голого sleep 12, и судит judgeOfficeStoreProbe', async () => {
  const mod = await import('./_ssh-office-prod-up.mjs');
  const script = mod.officeProdUpRemoteScript;
  assert.equal(typeof script, 'string', '_ssh-office-prod-up.mjs не экспортирует officeProdUpRemoteScript');
  const up = script.indexOf('office-stack.sh up');
  const probe = script.indexOf('office-stack.sh probe');
  assert.ok(up >= 0 && probe > up, 'probe не идёт после up');
  assert.ok(!/^\s*sleep 12\s*$/mu.test(script), 'голый sleep 12 вместо ожидания healthy');
  const src = readFileSync(PROD_UP, 'utf8');
  assert.match(src, /judgeOfficeStoreProbe/u, 'prod-up не судит вывод пробы общим предикатом');
  assert.ok(mod.officeProdUpTarSources.includes('deploy/office-stack.sh'), 'office-stack.sh не уезжает на сервер');
});

test('P3c: prod-up отказывает при не-ok вердикте', async () => {
  const { assertOfficeStoreProbeOk } = await import('./_ssh-office-prod-up.mjs');
  assert.equal(typeof assertOfficeStoreProbeOk, 'function');
  assert.throws(() => assertOfficeStoreProbeOk(okOutput({ db: 'unhealthy' })), /db-unhealthy/u);
  assert.doesNotThrow(() => assertOfficeStoreProbeOk(okOutput()));
});

test('P3d: smoke [7] зовёт тот же probe и тот же предикат', () => {
  const src = readFileSync(SMOKE, 'utf8');
  assert.match(src, /office-stack\.sh probe/u, 'smoke не зовёт office-stack.sh probe');
  assert.match(src, /judgeOfficeStoreProbe/u, 'smoke судит не общим предикатом');
  assert.match(src, /\[7\]/u, 'в smoke нет пункта [7]');
});
