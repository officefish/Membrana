import test from 'node:test';
import assert from 'node:assert/strict';

import {
  evaluateDutyReady,
  extractSettingIndexes,
  formatReport,
  parseArgs,
} from './node-duty-ready.mjs';

const GOOD_POWERCFG = `
Power Setting GUID: 29f6c1db-86da-48c5-9fdb-f2b67b1f44da  (Sleep after)
  Current AC Power Setting Index: 0x00000000
  Current DC Power Setting Index: 0x00000000
Power Setting GUID: 9d7815a6-7ee4-497e-8888-515a05f02364  (Hibernate after)
  Current AC Power Setting Index: 0x00000000
  Current DC Power Setting Index: 0x00000000
`;

const GOOD_POWERCFG_RU = `
GUID настройки питания: 29f6c1db-86da-48c5-9fdb-f2b67b1f44da  (Сон после)
  Псевдоним GUID: STANDBYIDLE
  Текущий индекс настройки питания от сети: 0x00000000
  Текущий индекс настройки питания от батарей: 0x00000000

GUID настройки питания: 9d7815a6-7ee4-497e-8888-515a05f02364  (Гибернация после)
  Псевдоним GUID: HIBERNATEIDLE
  Текущий индекс настройки питания от сети: 0x00000000
  Текущий индекс настройки питания от батарей: 0x00000000
`;

function snapshot(overrides = {}) {
  return {
    capturedAt: '2026-08-27T18:00:00.000Z',
    taskName: 'MembranaNode',
    powercfg: {
      availability: '',
      sleepSettings: GOOD_POWERCFG,
    },
    autologon: {
      autoAdminLogon: '1',
      defaultUserNamePresent: true,
      defaultDomainNamePresent: true,
      defaultPasswordPresent: true,
    },
    scheduledTask: {
      exists: true,
      state: 'Ready',
    },
    ...overrides,
  };
}

test('node:duty-ready parses fixture and returns all predicates as ready', () => {
  const result = evaluateDutyReady(snapshot());
  assert.equal(result.ok, true);
  assert.deepEqual(result.checks.map((check) => check.ok), [true, true, true, true]);
});

test('node:duty-ready turns hibernation fixture into red predicate', () => {
  const badPower = GOOD_POWERCFG.replace(
    'Power Setting GUID: 9d7815a6-7ee4-497e-8888-515a05f02364  (Hibernate after)\n  Current AC Power Setting Index: 0x00000000',
    'Power Setting GUID: 9d7815a6-7ee4-497e-8888-515a05f02364  (Hibernate after)\n  Current AC Power Setting Index: 0x00000e10',
  );
  const result = evaluateDutyReady(snapshot({ powercfg: { availability: '', sleepSettings: badPower } }));
  assert.equal(result.ok, false);
  assert.equal(result.checks.find((check) => check.id === 'hibernate').ok, false);
  assert.match(formatReport(snapshot(), result), /Hibernate off \| NO/u);
});

test('node:duty-ready rejects disabled task and missing autologon', () => {
  const result = evaluateDutyReady(snapshot({
    autologon: { autoAdminLogon: '0', defaultUserNamePresent: true },
    scheduledTask: { exists: true, state: 'Disabled' },
  }));
  assert.equal(result.ok, false);
  assert.equal(result.checks.find((check) => check.id === 'autologon').ok, false);
  assert.equal(result.checks.find((check) => check.id === 'scheduled-task').ok, false);
});

test('node:duty-ready argument parser supports fixture and task override', () => {
  assert.deepEqual(parseArgs(['--fixture', 'snap.json', '--task-name', 'Node', '--json']), {
    fixture: 'snap.json',
    taskName: 'Node',
    json: true,
    help: false,
  });
});

test('powercfg parser extracts AC/DC hex indexes from localized sections', () => {
  assert.deepEqual(extractSettingIndexes(GOOD_POWERCFG, ['Sleep after']), { ac: 0, dc: 0 });
  assert.deepEqual(extractSettingIndexes(GOOD_POWERCFG_RU, ['STANDBYIDLE', 'Сон после']), { ac: 0, dc: 0 });
});
