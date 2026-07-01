import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

import {
  findBomFiles,
  hasBom,
  listTrackedPackageJson,
  stripBom,
} from './check-package-json-bom.mjs';

test('hasBom detects a leading UTF-8 BOM', () => {
  assert.equal(hasBom('﻿{"name":"x"}'), true);
  assert.equal(hasBom('{"name":"x"}'), false);
  assert.equal(hasBom(''), false);
});

test('stripBom removes only a leading BOM, idempotent otherwise', () => {
  assert.equal(stripBom('﻿{"a":1}'), '{"a":1}');
  assert.equal(stripBom('{"a":1}'), '{"a":1}');
  // a BOM mid-string is left untouched (only the leading one breaks JSON.parse)
  assert.equal(stripBom('{"a":"﻿"}'), '{"a":"﻿"}');
});

// The real CI gate: no tracked package.json may carry a BOM, or `yarn dev`
// breaks with an opaque PostCSS JSON parse error. See check-package-json-bom.mjs.
test('no tracked package.json contains a BOM', () => {
  const files = listTrackedPackageJson();
  assert.ok(files.length > 0, 'expected at least one tracked package.json');
  const offenders = findBomFiles(files);
  assert.deepEqual(
    offenders,
    [],
    `BOM found in package.json (run \`yarn bom:fix\`): ${offenders.join(', ')}`,
  );
});

// Sanity: the repo root package.json is real JSON once any BOM is stripped.
test('root package.json parses after stripBom', () => {
  const raw = readFileSync(resolve(process.cwd(), 'package.json'), 'utf8');
  assert.doesNotThrow(() => JSON.parse(stripBom(raw)));
});
