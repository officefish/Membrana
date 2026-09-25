import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import {
  assertOfficeProdUpTarCoversDockerfileCopies,
  officeProdUpTarSources,
  officeTarCoverageFindings,
} from './_ssh-office-prod-up.mjs';

test('office prod-up tar-list краснеет, если Dockerfile COPY не покрыт выгрузкой (#2427)', () => {
  const dockerfile = [
    'FROM node:20-alpine AS build',
    'COPY package.json yarn.lock ./',
    'COPY packages/core packages/core',
    'COPY packages/plugin-contracts packages/plugin-contracts',
    'COPY docs/evidence/registry.jsonl docs/evidence/registry.jsonl',
  ].join('\n');
  const tarSources = ['package.json', 'yarn.lock', 'packages/core'];

  assert.deepEqual(officeTarCoverageFindings({ dockerfileText: dockerfile, tarSources }), [
    'packages/plugin-contracts',
    'docs/evidence/registry.jsonl',
  ]);
});

test('office prod-up tar-list покрывает живой Dockerfile офиса (#2427)', () => {
  assertOfficeProdUpTarCoversDockerfileCopies();
  assert.ok(officeProdUpTarSources.includes('packages/plugin-contracts'));
  assert.ok(officeProdUpTarSources.includes('packages/core'));
  assert.ok(officeProdUpTarSources.includes('packages/services/static-registry'));
  assert.ok(officeProdUpTarSources.includes('docs/evidence/registry.jsonl'));
});

test('office prod-up tar-list отказывает внятно, если Dockerfile не прочитан (#2427)', () => {
  const root = mkdtempSync(join(tmpdir(), 'office-prod-up-missing-dockerfile-'));
  mkdirSync(join(root, 'packages/background-office'), { recursive: true });
  writeFileSync(join(root, 'package.json'), '{}\n');

  assert.throws(
    () => assertOfficeProdUpTarCoversDockerfileCopies({ root }),
    /office-prod-up: нет packages\/background-office\/Dockerfile/u,
  );
});
