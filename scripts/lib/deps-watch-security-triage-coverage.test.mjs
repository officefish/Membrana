import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  advisoryKey,
  highFindings,
  missingHighTriageRows,
  triageKeys,
} from './deps-watch-triage-coverage.mjs';

test('advisoryKey prefers GHSA from advisory URL over numeric audit id', () => {
  const finding = {
    pkg: '@fastify/busboy',
    id: '12345',
    severity: 'high',
    url: 'https://github.com/advisories/GHSA-xjh9-v7x6-24jw',
  };

  assert.equal(advisoryKey(finding), 'ghsa-xjh9-v7x6-24jw');
});

test('highFindings selects only high severity entries', () => {
  const snapshot = {
    findings: [
      { pkg: 'a', severity: 'moderate' },
      { pkg: 'b', severity: 'High' },
      { pkg: 'c', severity: 'critical' },
    ],
  };

  assert.deepEqual(highFindings(snapshot).map((finding) => finding.pkg), ['b']);
});

test('triageKeys collects GHSA ids from markdown rows', () => {
  const keys = triageKeys('| x | GHSA-xjh9-v7x6-24jw |\n| y | GHSA-vfj7-8cjw-p6xm |');

  assert.deepEqual([...keys].sort(), ['ghsa-vfj7-8cjw-p6xm', 'ghsa-xjh9-v7x6-24jw']);
});

test('missingHighTriageRows is red when a high snapshot finding has no triage row', () => {
  const snapshot = {
    findings: [
      {
        pkg: '@fastify/busboy',
        severity: 'high',
        url: 'https://github.com/advisories/GHSA-xjh9-v7x6-24jw',
      },
      {
        pkg: 'braces',
        severity: 'high',
        url: 'https://github.com/advisories/GHSA-vfj7-8cjw-p6xm',
      },
      {
        pkg: 'axios',
        severity: 'moderate',
        url: 'https://github.com/advisories/GHSA-not1-not1-not1',
      },
    ],
  };
  const triage = '| vulnerability | verdict |\n| GHSA-xjh9-v7x6-24jw | runtime-exposed |';

  const missing = missingHighTriageRows(snapshot, triage);

  assert.equal(missing.length, 1);
  assert.equal(missing[0].pkg, 'braces');
});

test('missingHighTriageRows passes when every high GHSA appears in triage', () => {
  const snapshot = {
    findings: [
      {
        pkg: '@fastify/busboy',
        severity: 'high',
        url: 'https://github.com/advisories/GHSA-xjh9-v7x6-24jw',
      },
    ],
  };
  const triage = '| vulnerability |\n| GHSA-xjh9-v7x6-24jw |';

  assert.deepEqual(missingHighTriageRows(snapshot, triage), []);
});

test('missingHighTriageRows can cover non-GHSA audit ids by pkg:id', () => {
  const snapshot = {
    findings: [
      {
        pkg: 'local-package',
        id: 'numeric-1',
        severity: 'high',
      },
    ],
  };
  const triage = '| vulnerability |\n| local-package:numeric-1 |';

  assert.deepEqual(missingHighTriageRows(snapshot, triage), []);
});
