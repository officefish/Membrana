import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  evaluatePerimeter,
  matchFilesToRules,
  parsePerimeterBlock,
} from './pr-perimeter-check.mjs';

test('file outside perimeter returns 1 and names the file', () => {
  const result = evaluatePerimeter({
    body: '<!-- perimeter\nsrc/**\n-->',
    files: ['src/inside.ts', 'docs/outside.md'],
  });

  assert.equal(result.exitCode, 1);
  assert.match(result.output, /docs\/outside\.md/u);
});

test('all files inside return 0 and a file-to-rule table', () => {
  const result = evaluatePerimeter({
    body: '<!-- perimeter\nsrc/**\npackage.json\n-->',
    files: ['src/nested/inside.ts', 'package.json'],
  });

  assert.equal(result.exitCode, 0);
  assert.match(result.output, /\| файл \| правило периметра \|/u);
  assert.match(result.output, /\| src\/nested\/inside\.ts \| src\/\*\* \|/u);
  assert.match(result.output, /\| package\.json \| package\.json \|/u);
});

test('dir/** covers nested files but not a sibling directory', () => {
  const result = matchFilesToRules(
    ['dir/file.ts', 'dir/nested/file.ts', 'dir-next/file.ts'],
    ['dir/**'],
  );

  assert.deepEqual(result.matches, [
    { file: 'dir/file.ts', rule: 'dir/**' },
    { file: 'dir/nested/file.ts', rule: 'dir/**' },
  ]);
  assert.deepEqual(result.outside, ['dir-next/file.ts']);
});

test('missing perimeter block skips with a visible note', () => {
  const result = evaluatePerimeter({ body: 'Ordinary PR body', files: ['anything.ts'] });

  assert.equal(result.exitCode, 0);
  assert.match(result.output, /периметр не объявлен/u);
});

test('empty perimeter block fails', () => {
  const result = evaluatePerimeter({ body: '<!-- perimeter\r\n  \r\n-->', files: ['anything.ts'] });

  assert.equal(result.exitCode, 1);
  assert.match(result.output, /периметр объявлен, но пуст/u);
});

test('yarn.lock has no implicit exemption', () => {
  const result = evaluatePerimeter({
    body: '<!-- perimeter\napps/cabinet/**\n-->',
    files: ['apps/cabinet/package.json', 'yarn.lock'],
  });

  assert.equal(result.exitCode, 1);
  assert.match(result.output, /yarn\.lock/u);
});

test('parser accepts CRLF and trims surrounding rule whitespace', () => {
  const parsed = parsePerimeterBlock(
    'Before\r\n<!--   perimeter   \r\n  packages/background-cabinet/**  \r\n  package.json\t\r\n-->\r\nAfter',
  );

  assert.deepEqual(parsed, {
    status: 'declared',
    rules: ['packages/background-cabinet/**', 'package.json'],
  });
});
