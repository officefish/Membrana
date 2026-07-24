import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  checkWorkshopDependencies,
  houseFromWorksOn,
  normalizeRepoPath,
} from './lib/workshop-dependencies.mjs';

const semantics = {
  rulesVersion: '1',
  roles: ['primary', 'derivative'],
  dependency: {
    exactlyOnePrimaryPerHouse: true,
    derivativeRequiresDependentOn: true,
    mirrorsFromMismatch: 'warning',
    rulesVersionMismatch: 'warning',
  },
};

function entry(home, manifest) {
  return { path: `${home}/workshop.manifest.json`, home, manifest };
}

const primary = entry('docs/tasks', {
  role: 'primary',
  worksOn: 'docs/tasks/registry.json',
  rulesVersion: '1',
  name: 'tasks-primary',
});

const derivativeOk = entry('docs/audit/tasks', {
  role: 'derivative',
  worksOn: 'docs/audit/tasks/registry/',
  dependentOn: ['docs/tasks'],
  mirrorsFrom: 'docs/tasks/registry.json',
  rulesVersion: '1',
  name: 'tasks-audit',
});

test('normalizeRepoPath / houseFromWorksOn', () => {
  assert.equal(normalizeRepoPath('docs/tasks/'), 'docs/tasks');
  assert.equal(houseFromWorksOn('docs/tasks/registry.json'), 'docs/tasks');
  assert.equal(houseFromWorksOn('docs/audit/tasks/registry/'), 'docs/audit/tasks/registry');
  assert.equal(houseFromWorksOn('docs/audit/git'), 'docs/audit/git');
});

test('пара primary+derivative — ok', () => {
  const r = checkWorkshopDependencies([primary, derivativeOk], semantics);
  assert.equal(r.ok, true, r.violations.map((v) => v.issue).join('; '));
  assert.equal(r.violations.length, 0);
});

test('две первичные мастерские на дом → error', () => {
  const twin = entry('docs/tasks-alt', {
    role: 'primary',
    worksOn: 'docs/tasks/registry.json',
    rulesVersion: '1',
    name: 'dup',
  });
  const r = checkWorkshopDependencies([primary, twin, derivativeOk], semantics);
  assert.equal(r.ok, false);
  assert.ok(r.violations.some((v) => v.issue.includes('две или более role=primary')));
});

test('производная без dependentOn → error', () => {
  const bad = entry('docs/audit/tasks', {
    role: 'derivative',
    worksOn: 'docs/audit/tasks/registry/',
    mirrorsFrom: 'docs/tasks/registry.json',
    rulesVersion: '1',
    name: 'orphan-deriv',
  });
  const r = checkWorkshopDependencies([primary, bad], semantics);
  assert.equal(r.ok, false);
  assert.ok(r.violations.some((v) => v.issue.includes('dependentOn')));
});

test('mirrorsFrom расходится с worksOn опекуна → warning, не error', () => {
  const stale = entry('docs/audit/tasks', {
    role: 'derivative',
    worksOn: 'docs/audit/tasks/registry/',
    dependentOn: ['docs/tasks'],
    mirrorsFrom: 'docs/tasks/OLD.json',
    rulesVersion: '1',
    name: 'stale',
  });
  const r = checkWorkshopDependencies([primary, stale], semantics);
  assert.equal(r.ok, true, r.violations.map((v) => v.issue).join('; '));
  assert.ok(r.warnings.some((w) => w.issue.includes('mirrorsFrom')));
});

test('standalone без role — не ломает проверку', () => {
  const git = entry('docs/audit/git', {
    worksOn: 'docs/audit/git',
    name: 'git',
  });
  const r = checkWorkshopDependencies([primary, derivativeOk, git], semantics);
  assert.equal(r.ok, true);
});
