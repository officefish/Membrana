import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  PARSER_VERSION,
  auditProcedureContracts,
  contractsRegistryProblems,
  licenseContract,
  loadContractsRegistry,
  parseContractHeader,
  renderLicensedContract,
  stampContractHeader,
} from './lib/procedure-contract-license.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('штамп ↔ parse: round-trip; legacy читается', () => {
  const h = stampContractHeader({
    generator: 'yarn vocabulary:generate',
    source: 'docs/procedures/vocabulary.json',
  });
  const p = parseContractHeader(`${h}\n\n# body`);
  assert.equal(p?.parserVersion, PARSER_VERSION);
  assert.equal(p?.generator, 'yarn vocabulary:generate');
  assert.equal(p?.source, 'docs/procedures/vocabulary.json');
  assert.equal(p?.legacy, false);

  const legacy = parseContractHeader(
    '<!-- generated: yarn vocabulary:generate из docs/procedures/vocabulary.json — руками не править -->\n',
  );
  assert.equal(legacy?.legacy, true);
  assert.equal(legacy?.generator, 'yarn vocabulary:generate');
  assert.equal(parseContractHeader('# prose without stamp\n'), null);
});

test('реестр лицензий валиден; parserVersion = код', () => {
  const reg = loadContractsRegistry(repoRoot);
  assert.equal(contractsRegistryProblems(reg).length, 0, contractsRegistryProblems(reg).join('; '));
  assert.equal(reg.parserVersion, PARSER_VERSION);
  assert.ok(reg.rootOfTrust.length > 10);
});

test('пересборка vocabulary/registry со штампом parser@', () => {
  const reg = loadContractsRegistry(repoRoot);
  for (const entry of reg.contracts) {
    const out = renderLicensedContract(entry, repoRoot);
    assert.equal(out.ok, true, `${entry.id}: ${out.ok === false ? out.error : ''}`);
    assert.ok(out.text.startsWith('<!-- contract: parser@'));
    assert.ok(parseContractHeader(out.text));
  }
});

test('рукопись без штампа — недействительна; живые пилоты — valid', () => {
  const fake = {
    id: 'ghost',
    path: 'docs/procedures/README.md',
    class: 'contract',
    generator: 'yarn nowhere',
    source: 'docs/procedures/vocabulary.json',
    renderer: 'vocabulary',
  };
  const bad = licenseContract(fake, repoRoot);
  assert.equal(bad.valid, false);
  assert.equal(bad.provenance, 'missing');

  const audit = auditProcedureContracts(repoRoot);
  assert.equal(audit.registryProblems.length, 0, audit.registryProblems.join('; '));
  for (const r of audit.results) {
    assert.equal(r.valid, true, `${r.id}: ${r.problems.join('; ')}`);
  }
  assert.equal(audit.ok, true);

  // файлы на диске уже со штампом (после --write в том же PR)
  const vocab = readFileSync(resolve(repoRoot, 'docs/procedures/VOCABULARY.md'), 'utf8');
  assert.ok(vocab.startsWith('<!-- contract: parser@'));
});
