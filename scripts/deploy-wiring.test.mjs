import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

// Зуб провода деплой-глаголов (спринт deploy-procedures, блок d3; Р3 ADR-0023).
// Сверка ПО ФАКТУ package.json, не по памяти — образец: зуб цепочек ритуалов 03.08.
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const scripts = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8')).scripts;

test('deploy:run — дверь обёртки существует и зовёт scripts/deploy-run.mjs', () => {
  assert.equal(scripts['deploy:run'], 'node scripts/deploy-run.mjs');
});

test('cabinet:deploy:prod идёт через deploy-run: процедура media-VPS, сервис cabinet, прежний исполнитель в хвосте', () => {
  const v = scripts['cabinet:deploy:prod'];
  assert.match(v, /^node scripts\/deploy-run\.mjs deploy-media-vps --service cabinet -- /u);
  assert.match(v, /_ssh-cabinet-deploy\.mjs$/u, 'исполнитель шага остался прежним — процедура лишь рамка');
});

test('vds:run идёт через deploy-run: процедура office-VDS; доклеенный скрипт попадает в команду', () => {
  const v = scripts['vds:run'];
  assert.match(v, /^node scripts\/deploy-run\.mjs deploy-office-vds --service office -- /u);
  assert.match(v, /_ssh-office-exec\.mjs --script$/u, 'yarn доклеивает имя скрипта в хвост команды');
});

test('owner-gate не тронут: deploy:when-green по-прежнему печатает, а не запускает', () => {
  assert.equal(scripts['deploy:when-green'], 'node scripts/deploy-when-green.mjs');
});

test('прочие прод-глаголы деплоя НЕ обёрнуты молча — врезка ровно в два (ратифицированный объём)', () => {
  const wrapped = Object.entries(scripts).filter(([, v]) => String(v).startsWith('node scripts/deploy-run.mjs '));
  assert.deepEqual(
    wrapped.map(([k]) => k).sort(),
    ['cabinet:deploy:prod', 'vds:run'],
    'расширение провода — следующим словом, не тихой правкой',
  );
});
