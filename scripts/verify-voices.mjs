#!/usr/bin/env node
/**
 * yarn verify:voices — зуб реестра голосов (блок 3 коворка 27.07).
 * Закон: insight-cast-carrier-contract — объявленный участник обязан быть вызываемым.
 *
 * Для каждой записи voices.registry.json:
 *   1) промпт-файл существует;
 *   2) в промпте есть секции «Характер (наблюдаемый)» и «Стиль общения с капитаном»;
 *   3) склады заведены: memory/<id>.md · erudition/<id>.md · character/<id>.md;
 *   4) каждый callable РЕЗОЛВИТСЯ в карте вызовов инструмента:
 *        ask       → id в PERSONAS scripts/ask-persona.mjs
 *        consilium → promptFile в PERSONA_FILES scripts/consilium.mjs
 *        storm     → механизм origin:pet жив в scripts/lib/storm-codex.mjs
 * Пустое поле — легально с причиной в notes; вымышленное — красный по имени.
 * Exit: 0 — все носители резолвятся · 1 — находки.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(join(repoRoot, rel), 'utf8');

const registry = JSON.parse(read('docs/virtual-team/voices.registry.json'));
const askSrc = read('scripts/ask-persona.mjs');
const consiliumSrc = read('scripts/consilium.mjs');
const stormSrc = read('scripts/lib/storm-codex.mjs');

const KINDS = new Set(['teamlead', 'architect', 'lead', 'advisor', 'voice']);
const findings = [];

const voices = registry.voices ?? [];
if (voices.length !== 8) findings.push(`voices: ожидалось 8 членов команды, в реестре ${voices.length}`);

for (const v of voices) {
  const who = v.id ?? '(без id)';
  if (!KINDS.has(v.kind)) findings.push(`${who}: kind «${v.kind}» вне закрытого перечня`);
  if (!v.promptFile || !existsSync(join(repoRoot, v.promptFile))) {
    findings.push(`${who}: промпт не существует (${v.promptFile}) — декларация без носителя`);
    continue;
  }
  const prompt = read(v.promptFile);
  if (!prompt.includes('## Характер (наблюдаемый)')) {
    findings.push(`${who}: в промпте нет секции «Характер (наблюдаемый)»`);
  }
  if (!prompt.includes('## Стиль общения с капитаном')) {
    findings.push(`${who}: в промпте нет секции «Стиль общения с капитаном»`);
  }
  for (const store of ['memory', 'erudition', 'character']) {
    if (!existsSync(join(repoRoot, `docs/virtual-team/${store}/${v.id}.md`))) {
      findings.push(`${who}: склад ${store}/${v.id}.md не заведён`);
    }
  }
  for (const c of v.callable ?? []) {
    if (c === 'ask' && !new RegExp(`^\\s*${v.id}:\\s*\\{`, 'mu').test(askSrc)) {
      findings.push(`${who}: callable=ask, но в карте PERSONAS ask-persona его нет — вызвать нечем`);
    } else if (c === 'consilium' && !consiliumSrc.includes(v.promptFile)) {
      findings.push(`${who}: callable=consilium, но PERSONA_FILES не несёт ${v.promptFile}`);
    } else if (c === 'storm' && !/origin\s*!==\s*'pet'|origin\s*===\s*'pet'/u.test(stormSrc)) {
      findings.push(`${who}: callable=storm, но механизм origin:pet в движке шторма не найден`);
    } else if (c === 'bridge' && !(existsSync(join(repoRoot, 'scripts/bridge-lead-call.mjs')) && read('scripts/bridge-lead-call.mjs').includes(v.promptFile))) {
      findings.push(`${who}: callable=bridge, но scripts/bridge-lead-call.mjs не несёт ${v.promptFile} — вызвать нечем`);
    } else if (!['ask', 'consilium', 'storm', 'bridge'].includes(c)) {
      findings.push(`${who}: callable «${c}» неизвестен зубу — либо заведи резолв, либо не заявляй`);
    }
  }
}

if (findings.length) {
  console.error(`verify:voices — находки (${findings.length}):`);
  for (const f of findings) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`verify:voices — OK: ${voices.length} голосов, каждый носитель резолвится (промпт · характер · стиль · 3 склада · вызовы)`);
process.exit(0);
