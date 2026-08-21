import { test } from 'node:test';
import assert from 'node:assert/strict';

import { copiedPackageDirs, serviceFindings, transitiveWorkspaceDeps } from './verify-image-workspace-deps.mjs';

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

test('живой Dockerfile media покрывает свой граф (регресс класса 21.08)', async () => {
  const { readFileSync } = await import('node:fs');
  const { readWorkspaceMap, IMAGE_SERVICES } = await import('./verify-image-workspace-deps.mjs');
  const map = readWorkspaceMap();
  for (const service of IMAGE_SERVICES) {
    const text = readFileSync(new URL(`../${service.dockerfile}`, import.meta.url), 'utf8');
    assert.deepEqual(serviceFindings(service, map, text), [], `${service.id}: образ обязан нести весь граф`);
  }
});
