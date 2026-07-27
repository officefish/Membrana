/**
 * Реестр голосов (блок 3, 27.07): файловые инварианты команды из восьми.
 * Закон cast-carrier-contract: за каждым объявленным — резолвимый носитель.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(join(REPO, rel), 'utf8');
const registry = JSON.parse(read('docs/virtual-team/voices.registry.json'));
const voices = registry.voices;

test('команда — ровно 8, id уникальны, kind из закрытого перечня', () => {
  assert.equal(voices.length, 8);
  const ids = voices.map((v) => v.id);
  assert.equal(new Set(ids).size, 8);
  const KINDS = new Set(['teamlead', 'architect', 'lead', 'advisor', 'voice']);
  for (const v of voices) assert.ok(KINDS.has(v.kind), `${v.id}: kind ${v.kind}`);
});

test('ровно один тимлид (Тарасов) и один архитектор (Веснин) — роли развязаны от имён', () => {
  const tl = voices.filter((v) => v.kind === 'teamlead');
  assert.equal(tl.length, 1);
  assert.equal(tl[0].id, 'tarasov');
  assert.equal(tl[0].promptFile, 'docs/virtual-team/PROMPT_TEAMLEAD.md');
  const arch = voices.filter((v) => v.kind === 'architect');
  assert.equal(arch.length, 1);
  assert.equal(arch[0].id, 'vesnin');
});

test('у каждого: промпт существует и несёт секции характера и стиля с капитаном', () => {
  for (const v of voices) {
    assert.ok(existsSync(join(REPO, v.promptFile)), `${v.id}: нет промпта`);
    const p = read(v.promptFile);
    assert.ok(p.includes('## Характер (наблюдаемый)'), `${v.id}: нет секции характера`);
    assert.ok(p.includes('## Стиль общения с капитаном'), `${v.id}: нет секции стиля`);
  }
});

test('у каждого — три склада: память, эрудиция, журнал характера', () => {
  for (const v of voices) {
    for (const store of ['memory', 'erudition', 'character']) {
      assert.ok(
        existsSync(join(REPO, `docs/virtual-team/${store}/${v.id}.md`)),
        `${v.id}: нет ${store}`,
      );
    }
  }
});

test('callable=ask резолвится в карте PERSONAS (Тарасов, Веснин, Ангелина — заведены)', () => {
  const askSrc = read('scripts/ask-persona.mjs');
  for (const v of voices) {
    if ((v.callable ?? []).includes('ask')) {
      assert.match(askSrc, new RegExp(`^\\s*${v.id}:\\s*\\{`, 'mu'), `${v.id}: ask не резолвится`);
    }
  }
});

test('файл роли тимлида — Тарасов; Веснин — архитектор в своём файле (история не переписана)', () => {
  assert.match(read('docs/virtual-team/PROMPT_TEAMLEAD.md'), /Тарасов/u);
  assert.match(read('docs/virtual-team/PROMPT_ARCHITECT.md'), /Веснин/u);
  assert.match(read('docs/virtual-team/PROMPT_ARCHITECT.md'), /не тимлид/u);
});

test('Фаррелл: контракт свободы записан, гейтом не является', () => {
  const p = read('docs/virtual-team/PROMPT_FARRELL.md');
  assert.match(p, /origin: pet/u);
  assert.match(p, /не гейт/iu);
  assert.match(p, /Право \*\*не отвечать\*\*/u);
  assert.match(p, /никогда не входит в основания/u);
});
