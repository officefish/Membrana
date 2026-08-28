import { test } from 'node:test';
import assert from 'node:assert/strict';

import { copiedLocalBuildSources, copiedPackageDirs, serviceFindings, transitiveWorkspaceDeps } from './verify-image-workspace-deps.mjs';

const MAP = {
  '@membrana/svc': { dir: 'packages/background-svc', deps: ['@membrana/handlers'] },
  '@membrana/handlers': { dir: 'packages/handlers', deps: ['@membrana/fft'] },
  '@membrana/fft': { dir: 'packages/services/fft', deps: [] },
  '@membrana/lonely': { dir: 'packages/lonely', deps: [] },
};

test('транзитивное замыкание идёт вглубь и не тянет чужое', () => {
  assert.deepEqual(transitiveWorkspaceDeps(MAP, '@membrana/svc'), ['@membrana/fft', '@membrana/handlers']);
});

test('copiedPackageDirs читает ТОЛЬКО runtime-стадию: build-стадия не считается покрытием', () => {
  const df = [
    'FROM node:20-alpine AS build',
    'COPY packages/services/fft packages/services/fft',
    'FROM node:20-alpine AS runtime',
    'COPY --from=build /app/packages/handlers/dist /app/packages/handlers/dist',
  ].join('\n');
  const dirs = copiedPackageDirs(df);
  assert.ok(dirs.has('packages/handlers'), 'runtime-копия учтена');
  assert.ok(!dirs.has('packages/services/fft'), 'COPY из build-стадии покрытием НЕ считается — иначе зуб зелёный на дырявом образе');
});

test('непокрытый пакет графа — находка с именем и путём (класс 21.08: ERR_MODULE_NOT_FOUND)', () => {
  const df = 'FROM node:20-alpine AS runtime\nCOPY --from=build /app/packages/handlers/dist /app/packages/handlers/dist\n';
  const findings = serviceFindings({ id: 'svc', pkg: 'packages/background-svc' }, MAP, df);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].kind, 'missing-in-image');
  assert.match(findings[0].detail, /@membrana\/fft → packages\/services\/fft/u);
});

test('полное покрытие графа — находок нет; лишняя копия находкой не считается', () => {
  const df = [
    'FROM node:20-alpine AS runtime',
    'COPY --from=build /app/packages/handlers/dist /app/packages/handlers/dist',
    'COPY --from=build /app/packages/services/fft/dist /app/packages/services/fft/dist',
    'COPY --from=build /app/packages/lonely/dist /app/packages/lonely/dist',
  ].join('\n');
  assert.deepEqual(serviceFindings({ id: 'svc', pkg: 'packages/background-svc' }, MAP, df), []);
});

// ── Охват домов, 28.08. Класс повторился НА ТОМ ЖЕ ПАКЕТЕ, что и 22.08: тогда его закрыли
// внесением одного дома (`packages/background-cabinet`), а `apps/*` в поле зрения зуба не было
// вовсе. Внесение по одному лечит случай, а не класс — эти зубы стерегут именно охват.
test('#2204 дома зуба покрывают ВСЕ Dockerfile репозитория, а не выборочные', async () => {
  const { IMAGE_SERVICES } = await import('./verify-image-workspace-deps.mjs');
  const { execSync } = await import('node:child_process');
  const found = execSync('git ls-files "*Dockerfile"', { encoding: 'utf8' })
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.endsWith('Dockerfile'));
  const watched = new Set(IMAGE_SERVICES.map((s) => s.dockerfile));
  const unwatched = found.filter((f) => !watched.has(f));
  assert.deepEqual(unwatched, [], `Dockerfile вне присмотра зуба: ${unwatched.join(', ')}`);
});

test('#2204 у каждого дома названа проверяемая стадия — иначе веб-образ судился бы не тем местом', async () => {
  const { IMAGE_SERVICES } = await import('./verify-image-workspace-deps.mjs');
  for (const s of IMAGE_SERVICES) {
    assert.ok(s.stage === 'runtime' || s.stage === 'build', `${s.id}: стадия не названа`);
  }
  assert.equal(IMAGE_SERVICES.find((s) => s.id === 'cabinet-web')?.stage, 'build');
});

test('#2204 веб-образ судится СТАДИЕЙ СБОРКИ: пакеты нужны ей, а не nginx-runtime', async () => {
  const { buildStagePackageDirs } = await import('./verify-image-workspace-deps.mjs');
  const df = [
    'FROM node:20-alpine AS build',
    'COPY packages/core packages/core',
    'COPY packages/services/media-library packages/services/media-library',
    'COPY apps/cabinet apps/cabinet',
    'FROM nginx:1.27-alpine AS runtime',
    'COPY --from=build /app/apps/cabinet/dist /usr/share/nginx/html',
  ].join('\n');
  const dirs = buildStagePackageDirs(df);
  assert.ok(dirs.has('packages/core'));
  assert.ok(dirs.has('packages/services/media-library'));
  // Из runtime-стадии ничего не берём: там лежит собранная статика, а не рабочие пакеты.
  assert.ok(!dirs.has('apps/cabinet/dist'));
});

test('#2204 focus — ВТОРОЙ список того же образа, и он отстаёт отдельно от COPY', async () => {
  const { focusedWorkspaces, serviceFindings: findings } = await import('./verify-image-workspace-deps.mjs');
  const df = [
    'FROM node:20-alpine AS build',
    'COPY packages/core packages/core',
    'COPY packages/services/lib packages/services/lib',
    'COPY apps/web apps/web',
    'RUN yarn workspaces focus @membrana/web @membrana/core --all \\',
    '  && yarn workspace @membrana/web build',
  ].join('\n');
  assert.deepEqual([...focusedWorkspaces(df)].sort(), ['@membrana/core', '@membrana/web']);

  const map = {
    '@membrana/web': { dir: 'apps/web', deps: ['@membrana/lib'] },
    '@membrana/lib': { dir: 'packages/services/lib', deps: [] },
    '@membrana/core': { dir: 'packages/core', deps: [] },
  };
  // Каталог скопирован, но имени в focus нет — yarn такой пакет не поставит. Это отдельная находка.
  const out = findings({ id: 'web', pkg: 'apps/web', stage: 'build' }, map, df);
  assert.deepEqual(out.map((f) => f.kind), ['missing-in-focus']);
});

test('#2204 живой веб-образ кабинета: зуб краснеет на дефекте ствола 27.08', async () => {
  const { readFileSync: rf } = await import('node:fs');
  const { readWorkspaceMap, IMAGE_SERVICES } = await import('./verify-image-workspace-deps.mjs');
  const map = readWorkspaceMap();
  const web = IMAGE_SERVICES.find((s) => s.id === 'cabinet-web');
  const text = rf(new URL(`../${web.dockerfile}`, import.meta.url), 'utf8');
  const out = serviceFindings(web, map, text);
  // Этот зуб зелёный ПОСЛЕ починки COPY+focus; до неё он обязан называть plugin-contracts.
  // Если он молчит на непочиненном стволе — предикат не удостоверяет ничего.
  if (out.length > 0) {
    assert.ok(out.every((f) => f.detail.includes('plugin-contracts')), 'ожидалась ровно находка про plugin-contracts');
  }
});

test('живой Dockerfile media покрывает свой граф (регресс класса 21.08)', async () => {
  const { readFileSync } = await import('node:fs');
  const { readWorkspaceMap, IMAGE_SERVICES } = await import('./verify-image-workspace-deps.mjs');
  const map = readWorkspaceMap();
  for (const service of IMAGE_SERVICES) {
    const text = readFileSync(new URL(`../${service.dockerfile}`, import.meta.url), 'utf8');
    assert.deepEqual(serviceFindings(service, map, text), [], `${service.id}: образ обязан нести весь граф`);
  }
});

test('ОДИН package.json покрытием НЕ является — это и есть висячий симлинк', () => {
  // Прежний предикат засчитывал любой путь внутри пакета и пропускал ровно тот дефект, ради
  // которого зуб заведён: символьная ссылка ведёт в каталог, где манифест указывает на dist,
  // которого нет. Сборка зелёная, старт зелёный, ERR_MODULE_NOT_FOUND — на первом импорте в проде.
  const df = [
    'FROM node:20-alpine AS runtime',
    'COPY --from=build /app/packages/handlers/package.json /app/packages/handlers/package.json',
  ].join('\n');
  assert.deepEqual([...copiedPackageDirs(df)], []);
});

test('сборка пакета покрытием является — и каталог целиком тоже', () => {
  const df = [
    'FROM node:20-alpine AS runtime',
    'COPY --from=build /app/packages/handlers/dist /app/packages/handlers/dist',
    'COPY --from=build /app/packages/services/fft /app/packages/services/fft',
  ].join('\n');
  const dirs = copiedPackageDirs(df);
  assert.ok(dirs.has('packages/handlers'));
  assert.ok(dirs.has('packages/services/fft'));
});

test('манифест рядом со сборкой покрытия не отменяет', () => {
  const df = [
    'FROM node:20-alpine AS runtime',
    'COPY --from=build /app/packages/handlers/dist /app/packages/handlers/dist',
    'COPY --from=build /app/packages/handlers/package.json /app/packages/handlers/package.json',
  ].join('\n');
  assert.deepEqual([...copiedPackageDirs(df)], ['packages/handlers']);
});
test('copiedLocalBuildSources берёт только COPY из build context и игнорирует --from', () => {
  const df = [
    'FROM node:20-alpine AS build',
    'COPY package.json yarn.lock .yarnrc.yml ./',
    'COPY packages/background-cabinet packages/background-cabinet',
    'FROM node:20-alpine AS runtime',
    'COPY --from=build /app/packages/background-cabinet/dist ./dist',
    'COPY packages/background-cabinet/docker/entrypoint.sh /entrypoint.sh',
  ].join('\n');
  assert.deepEqual(copiedLocalBuildSources(df), [
    'package.json',
    'yarn.lock',
    '.yarnrc.yml',
    'packages/background-cabinet',
    'packages/background-cabinet/docker/entrypoint.sh',
  ]);
});
