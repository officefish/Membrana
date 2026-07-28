#!/usr/bin/env node
/**
 * yarn evidence — обвязка индекса вещдоков (#1303). Глаголы:
 *   add <file> --id <slug> --source "…" [--about "…"] [--store local|affine|archivarius --ref <adr>]
 *   verify        — сверка индекса с фактом (local считает хеш; affine/url → unknown)
 *   list [--json] — реестр на экран
 * Реестр: docs/evidence/registry.jsonl (append-only; правки строк запрещены).
 */
import { createHash } from 'node:crypto';
import { appendFileSync, existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

import { findDuplicates, parseRegistry, recordProblems, verifyRecords } from './lib/evidence-index.mjs';

const REGISTRY = resolve(process.cwd(), 'docs/evidence/registry.jsonl');
const argv = process.argv.slice(2);
const cmd = argv[0];
const flag = (n) => { const i = argv.indexOf(`--${n}`); return i > -1 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : null; };

/**
 * P2 (ревью 27.07): абсолютный Windows-путь в ref привязывает вещдок к одной машине.
 * Файл ВНУТРИ репозитория — repo-relative ref (переносимо между машинами и деревьями);
 * внешний файл — абсолютный как был (честно: он и правда живёт только там).
 */
function toPortableRef(abs) {
  const root = process.cwd().replaceAll('\\', '/');
  const norm = abs.replaceAll('\\', '/');
  return norm.startsWith(`${root}/`) ? norm.slice(root.length + 1) : norm;
}

function loadRegistry() {
  const text = existsSync(REGISTRY) ? readFileSync(REGISTRY, 'utf8') : '';
  const { records, broken } = parseRegistry(text);
  for (const b of broken) console.error(`  ✗ registry строка ${b.line}: ${b.error}`);
  return { records, broken };
}

if (cmd === 'add') {
  const file = argv[1] && !argv[1].startsWith('--') ? argv[1] : null;
  if (!file || !flag('id') || !flag('source')) {
    console.error('usage: yarn evidence add <file> --id <slug> --source "…" [--about "…"] [--store affine|archivarius --ref <adr>]');
    process.exit(1);
  }
  const abs = resolve(process.cwd(), file);
  if (!existsSync(abs)) { console.error(`evidence: файл не найден: ${abs}`); process.exit(1); }
  const buf = readFileSync(abs);
  const record = {
    id: flag('id'),
    sha256: createHash('sha256').update(buf).digest('hex'),
    bytes: statSync(abs).size,
    addedAt: new Date().toISOString().slice(0, 10),
    source: flag('source'),
    location: flag('store') ? { kind: flag('store'), ref: flag('ref') ?? '' } : { kind: 'local', ref: toPortableRef(abs) },
    ...(flag('about') ? { about: flag('about') } : {}),
  };
  const problems = recordProblems(record);
  if (problems.length) { for (const p of problems) console.error(`  ✗ ${p}`); process.exit(1); }
  const { records } = loadRegistry();
  const dup = records.find((r) => r.sha256 === record.sha256);
  if (dup) console.error(`  ⚠ тот же sha256 уже в индексе как «${dup.id}» — дубль по содержимому (решает человек)`);
  if (records.some((r) => r.id === record.id)) { console.error(`  ✗ id «${record.id}» занят`); process.exit(1); }
  appendFileSync(REGISTRY, JSON.stringify(record) + '\n', 'utf8');
  console.log(`evidence: принят «${record.id}» (${record.bytes} байт, sha ${record.sha256.slice(0, 12)}…, склад: ${record.location.kind})`);
  process.exit(0);
}

if (cmd === 'verify') {
  const { records, broken } = loadRegistry();
  const rows = verifyRecords(records, (loc) => {
    if (loc.kind !== 'local') return 'skip';
    if (!existsSync(loc.ref)) return null;
    const buf = readFileSync(loc.ref);
    return { sha256: createHash('sha256').update(buf).digest('hex'), bytes: buf.length };
  });
  for (const r of rows) {
    const mark = r.status === 'ok' ? '✓' : r.status === 'unknown' ? '?' : '✗';
    console.log(`  ${mark} ${r.id} — ${r.status}${r.detail ? ` (${r.detail})` : ''}`);
  }
  for (const d of findDuplicates(records)) console.log(`  ⚠ дубль содержимого: ${d.ids.join(' = ')}`);
  const bad = rows.filter((r) => r.status === 'hash-mismatch' || r.status === 'unreachable').length + broken.length;
  console.log(`evidence: записей ${records.length} · битых строк ${broken.length} · расхождений ${bad}`);
  process.exit(bad > 0 ? 1 : 0);
}

if (cmd === 'list') {
  const { records } = loadRegistry();
  if (argv.includes('--json')) { console.log(JSON.stringify(records, null, 2)); process.exit(0); }
  for (const r of records) console.log(`  ${r.id} · ${r.addedAt} · ${r.location.kind} · ${r.source}${r.about ? ` — ${r.about}` : ''}`);
  console.log(`evidence: ${records.length} записей`);
  process.exit(0);
}

if (cmd === 'inspect') {
  const id = argv[1] && !argv[1].startsWith('--') ? argv[1] : null;
  if (!id) { console.error('usage: yarn evidence inspect <id>'); process.exit(1); }
  const { records } = loadRegistry();
  const r = records.find((x) => x.id === id);
  if (!r) { console.error(`evidence: id «${id}» не найден`); process.exit(1); }
  console.log(JSON.stringify(r, null, 2));
  const [row] = verifyRecords([r], (loc) => {
    if (loc.kind !== 'local') return 'skip';
    if (!existsSync(loc.ref)) return null;
    const buf = readFileSync(loc.ref);
    return { sha256: createHash('sha256').update(buf).digest('hex'), bytes: buf.length };
  });
  console.log(`достижимость: ${row.status}${row.detail ? ` (${row.detail})` : ''}`);
  process.exit(row.status === 'hash-mismatch' || row.status === 'unreachable' ? 1 : 0);
}

if (cmd === 'decompose') {
  const by = flag('by') ?? 'store';
  const axes = {
    store: (r) => r.location.kind,
    date: (r) => r.addedAt,
    source: (r) => r.source.split(',')[0],
  };
  if (!axes[by]) { console.error('usage: yarn evidence decompose --by store|date|source'); process.exit(1); }
  const { records } = loadRegistry();
  const groups = new Map();
  for (const r of records) {
    const k = axes[by](r);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(r.id);
  }
  for (const [k, ids] of [...groups.entries()].sort()) console.log(`  ${k} (${ids.length}): ${ids.join(', ')}`);
  console.log(`evidence: ось ${by} · групп ${groups.size} · записей ${records.length}`);
  process.exit(0);
}

console.error('usage: yarn evidence add|verify|list|inspect|decompose');
process.exit(1);
