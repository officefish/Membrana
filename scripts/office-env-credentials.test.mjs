// Зуб #2580 (спринт office-mongo-credentials-2580, блок b1): генератор env office и
// compose не расходятся в учётных данных archivarius-mongo, прод без пароля падает громко.
//
// Корень инцидента 24.09–04.10: `deploy/generate-office-env.sh` писал URI базы без
// учётных данных и без пароля, а compose включал auth с публичным умолчанием `change-me`.
// Прод поднимался молча, база 10 дней стояла без пользователя.
//
// Секреты: ни одно значение пароля/URI не попадает в сообщения assert — только булевы
// предикаты и имена ключей. Сравнение паролей — в памяти.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { bashArgv, bashScriptArg, explainBashFailure } from './lib/bash-invoke.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const GENERATOR = join(repoRoot, 'deploy', 'generate-office-env.sh');
const BASE_COMPOSE = join(repoRoot, 'packages', 'background-office', 'docker-compose.yml');
const PROD_COMPOSE = join(repoRoot, 'deploy', 'background-office.prod.compose.yml');

const MONGO_KEYS = Object.freeze([
  'ARCHIVARIUS_MONGO_USERNAME',
  'ARCHIVARIUS_MONGO_PASSWORD',
  'ARCHIVARIUS_MONGO_URI',
  'ARCHIVARIUS_MONGO_DB',
  'TASK_ARCHIVE_MONGO_URI',
  'TASK_ARCHIVE_MONGO_DB',
]);

/** Окружение без ключей базы: значения из оболочки не должны подменять проверяемое. */
function cleanEnv() {
  const env = { ...process.env, LC_ALL: 'C' };
  for (const key of MONGO_KEYS) delete env[key];
  return env;
}

function runGenerator(outPath) {
  const r = spawnSync('bash', bashArgv(GENERATOR, [bashScriptArg(outPath)]), {
    env: cleanEnv(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const why = explainBashFailure(r, GENERATOR);
  if (why) throw new Error(why);
  return { code: r.status ?? 1, stdout: r.stdout ?? '', stderr: r.stderr ?? '' };
}

/** KEY=VALUE построчно; комментарии и пустые строки — мимо. */
function parseEnv(text) {
  const out = new Map();
  for (const line of text.split(/\r?\n/u)) {
    const m = /^([A-Z0-9_]+)=(.*)$/u.exec(line);
    if (m) out.set(m[1], m[2]);
  }
  return out;
}

function withTmp(fn) {
  const dir = mkdtempSync(join(tmpdir(), 'office-env-2580-'));
  try {
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function generateEnv() {
  return withTmp((dir) => {
    const out = join(dir, 'office.env');
    const r = runGenerator(out);
    assert.equal(r.code, 0, 'генератор на пустом месте обязан отработать с exit 0');
    return { env: parseEnv(readFileSync(out, 'utf8')), mode: statSync(out).mode & 0o777, stdout: r.stdout, stderr: r.stderr };
  });
}

/** Учётные данные URI — без печати: только сравнение в памяти. */
function uriCredentials(uri) {
  let parsed;
  try {
    parsed = new URL(uri);
  } catch {
    return null;
  }
  return {
    username: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    host: parsed.hostname,
    authSource: parsed.searchParams.get('authSource'),
    db: parsed.pathname.replace(/^\//u, ''),
  };
}

// ── P1: генератор пишет пароль и оба URI с ним ────────────────────────────────

test('P1: генератор пишет пароль базы и оба URI с теми же учётными данными (#2580)', () => {
  const { env, stdout, stderr } = generateEnv();
  for (const key of MONGO_KEYS) {
    assert.ok(env.has(key) && env.get(key) !== '', `генератор обязан записать непустой ${key}`);
  }
  const user = env.get('ARCHIVARIUS_MONGO_USERNAME');
  const password = env.get('ARCHIVARIUS_MONGO_PASSWORD');
  assert.ok(password.length >= 32, 'пароль базы короче 32 символов');
  assert.ok(!/change-me|REPLACE_BEFORE_PROD|placeholder/iu.test(password), 'пароль базы — публичное умолчание');

  for (const [key, dbKey] of [
    ['ARCHIVARIUS_MONGO_URI', 'ARCHIVARIUS_MONGO_DB'],
    ['TASK_ARCHIVE_MONGO_URI', 'TASK_ARCHIVE_MONGO_DB'],
  ]) {
    const creds = uriCredentials(env.get(key));
    assert.ok(creds, `${key} не разбирается как URL`);
    assert.ok(creds.username === user, `${key}: пользователь не совпадает с ARCHIVARIUS_MONGO_USERNAME`);
    assert.ok(creds.password === password, `${key}: пароль не совпадает с ARCHIVARIUS_MONGO_PASSWORD`);
    assert.ok(creds.host === 'archivarius-mongo', `${key}: хост не archivarius-mongo`);
    assert.ok(creds.authSource === 'admin', `${key}: нет authSource=admin (root-пользователь живёт в admin)`);
    assert.ok(creds.db === env.get(dbKey), `${key}: база в пути не совпадает с ${dbKey}`);
  }
  assert.ok(!stdout.includes(password) && !stderr.includes(password), 'генератор напечатал пароль');
});

test('P1: два прогона генератора дают разные пароли (не зашитая константа)', () => {
  const a = generateEnv().env.get('ARCHIVARIUS_MONGO_PASSWORD');
  const b = generateEnv().env.get('ARCHIVARIUS_MONGO_PASSWORD');
  assert.ok(a && b && a !== b, 'пароль повторился между прогонами');
});

test('P1: env пишется с правами 600', { skip: process.platform === 'win32' ? 'POSIX-права на Windows не проверяемы' : false }, () => {
  assert.equal(generateEnv().mode, 0o600);
});

// ── P1b: существующий env — предупреждение называет все ключи, значений не несёт ──

test('P1b: на существующем env — отказ и предупреждение про пароль, оба URI и непустой том', () => {
  withTmp((dir) => {
    const out = join(dir, 'office.env');
    const sentinel = 'sentinel-secret-2580-must-not-leak';
    writeFileSync(out, `API_INTERNAL_TOKEN=${sentinel}\nARCHIVARIUS_MONGO_PASSWORD=${sentinel}\n`);
    const r = runGenerator(out);
    assert.equal(r.code, 1, 'существующий env не перезаписывается — exit 1');
    for (const key of ['ARCHIVARIUS_MONGO_PASSWORD', 'ARCHIVARIUS_MONGO_URI', 'TASK_ARCHIVE_MONGO_URI']) {
      assert.ok(r.stderr.includes(key), `предупреждение не называет ${key}`);
    }
    assert.match(r.stderr, /непуст\S* том/iu, 'предупреждение молчит, что на непустом томе пароль сам не применится');
    assert.ok(!r.stderr.includes(sentinel) && !r.stdout.includes(sentinel), 'генератор напечатал значение из существующего env');
    assert.equal(readFileSync(out, 'utf8').includes(sentinel), true, 'существующий env испорчен');
  });
});

// ── P2: прод-оверлей требует пароль и URI, базовый compose держит локальный запуск ──

const prodText = () => readFileSync(PROD_COMPOSE, 'utf8');
const baseText = () => readFileSync(BASE_COMPOSE, 'utf8');

test('P2: прод-оверлей требует пароль базы и оба URI формой ${…:?…} (#2580)', () => {
  const text = prodText();
  const required = [
    [/^\s+MONGO_INITDB_ROOT_PASSWORD:\s*\$\{ARCHIVARIUS_MONGO_PASSWORD:\?/mu, 'MONGO_INITDB_ROOT_PASSWORD ← ARCHIVARIUS_MONGO_PASSWORD'],
    [/^\s+ARCHIVARIUS_MONGO_URI:\s*\$\{ARCHIVARIUS_MONGO_URI:\?/mu, 'office-api ARCHIVARIUS_MONGO_URI'],
    [/^\s+TASK_ARCHIVE_MONGO_URI:\s*\$\{TASK_ARCHIVE_MONGO_URI:\?/mu, 'office-api TASK_ARCHIVE_MONGO_URI'],
  ];
  for (const [re, what] of required) {
    assert.match(text, re, `прод-оверлей не требует ${what} — прод поднимется на умолчании`);
  }
});

test('P2b: прод-оверлей без change-me; healthcheck базы берёт пароль из окружения контейнера', () => {
  const text = prodText();
  assert.ok(!/change-me/u.test(text), 'в прод-оверлее осталось публичное умолчание change-me');
  const hc = /archivarius-mongo:[\s\S]*?healthcheck:[\s\S]*?test:([\s\S]*?)(?:\n\s+interval:|\n\S)/u.exec(text);
  assert.ok(hc, 'прод-оверлей не переопределяет healthcheck archivarius-mongo');
  assert.ok(hc[1].includes('$$MONGO_INITDB_ROOT_PASSWORD'), 'healthcheck не берёт пароль из окружения контейнера ($$)');
  assert.ok(!hc[1].includes('${ARCHIVARIUS_MONGO_PASSWORD'), 'healthcheck интерполирует секрет в конфиг compose');
});

function hasDocker() {
  const r = spawnSync('docker', ['compose', 'version'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  return r.status === 0;
}

/**
 * `docker compose config` над КОПИЯМИ файлов во временном дереве: базовый compose ссылается
 * на `env_file: .env.docker`, которого в чистом дереве нет (он в .gitignore) — без копии
 * отказ был бы про отсутствующий файл, а не про пароль (ложный красный на стволе).
 * На раннере без docker в PATH P2c уходит в skip — интеграционная часть держится Linux-CI и ручным прогоном.
 */
function composeConfig(envLines) {
  return withTmp((dir) => {
    const pkg = join(dir, 'packages', 'background-office');
    const dep = join(dir, 'deploy');
    for (const d of [pkg, dep]) mkdirSync(d, { recursive: true });
    writeFileSync(join(pkg, 'docker-compose.yml'), baseText());
    writeFileSync(join(pkg, '.env.docker'), '');
    writeFileSync(join(dep, 'background-office.prod.compose.yml'), prodText());
    const envFile = join(dir, 'office.env');
    writeFileSync(envFile, `${envLines.join('\n')}\n`);
    const r = spawnSync(
      'docker',
      [
        'compose',
        '-f', join(pkg, 'docker-compose.yml'),
        '-f', join(dep, 'background-office.prod.compose.yml'),
        '--env-file', envFile,
        'config', '--quiet',
      ],
      { env: cleanEnv(), encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    );
    return { code: r.status ?? 1, stderr: r.stderr ?? '' };
  });
}

const DOCKER_SKIP = hasDocker() ? false : 'docker compose недоступен';

test('P2c: docker compose config (база + прод) без пароля в env-file падает громко', { skip: DOCKER_SKIP }, () => {
  const r = composeConfig(['API_INTERNAL_TOKEN=test-token-not-secret', 'OFFICE_PORT=3000']);
  assert.notEqual(r.code, 0, 'прод-конфиг без пароля собрался — отказ не громкий');
  assert.match(r.stderr, /required variable (ARCHIVARIUS_MONGO_PASSWORD|ARCHIVARIUS_MONGO_URI|TASK_ARCHIVE_MONGO_URI)/u, 'отказ не назван переменной базы');
});

test('P2c-сторож: с паролем и обоими URI прод-конфиг собирается', { skip: DOCKER_SKIP }, () => {
  const pw = 'test-password-not-secret-2580';
  const r = composeConfig([
    'API_INTERNAL_TOKEN=test-token-not-secret',
    `ARCHIVARIUS_MONGO_PASSWORD=${pw}`,
    `ARCHIVARIUS_MONGO_URI=mongodb://archivarius:${pw}@archivarius-mongo:27017/membrana_archivarius?authSource=admin`,
    `TASK_ARCHIVE_MONGO_URI=mongodb://archivarius:${pw}@archivarius-mongo:27017/membrana_task_archive?authSource=admin`,
  ]);
  assert.equal(r.code, 0, `прод-конфиг с полным env не собрался: ${r.stderr.split('\n')[0]}`);
});

test('P2d: базовый compose сохраняет локальные умолчания (локальный/тестовый запуск жив)', () => {
  const text = baseText();
  assert.ok(!/:\?/u.test(text), 'в базовом compose появилось обязательное значение — локальный запуск сломан');
  assert.match(text, /MONGO_INITDB_ROOT_PASSWORD:\s*\$\{ARCHIVARIUS_MONGO_PASSWORD:-/u);
  assert.match(text, /ARCHIVARIUS_MONGO_URI:\s*\$\{ARCHIVARIUS_MONGO_URI:-/u);
  assert.match(text, /TASK_ARCHIVE_MONGO_URI:\s*\$\{TASK_ARCHIVE_MONGO_URI:-/u);
});

test('P2e: yarn office:docker:prod:build и :prod:up зовут оверлей с --env-file', () => {
  const scripts = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8')).scripts ?? {};
  const envFileOf = (cmd) => /--env-file\s+(\S+)/u.exec(cmd)?.[1] ?? null;
  const paths = {};
  for (const name of ['office:docker:prod:build', 'office:docker:prod:up']) {
    const cmd = scripts[name] ?? '';
    assert.ok(cmd.includes('background-office.prod.compose.yml'), `${name} не зовёт прод-оверлей`);
    assert.ok(cmd.includes('--env-file'), `${name} без --env-file — оверлей с :? упадёт на интерполяции`);
    paths[name] = envFileOf(cmd);
  }
  // Сборка и подъём обязаны читать ОДИН env: иначе build пройдёт интерполяцию по одному
  // файлу, а up — по другому (ревью Teamlead PR #2582).
  assert.ok(
    paths['office:docker:prod:build'] !== null && paths['office:docker:prod:build'] === paths['office:docker:prod:up'],
    '--env-file у office:docker:prod:build и office:docker:prod:up расходятся',
  );
});
