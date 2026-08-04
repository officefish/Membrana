#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, dirname, extname, join, resolve } from 'node:path';

import {
  auditSpans,
  decomposeSpans,
  ingestJsonlText,
  inspectSession,
  parseSpanJsonl,
  searchSpans,
  sessionIdFromRolloutName,
  spanAddress,
} from './lib/archivarius.mjs';

function flag(argv, name) {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : null;
}

function has(argv, name) {
  return argv.includes(`--${name}`);
}

export function expandHome(p) {
  if (!p) return p;
  if (p === '~') return homedir();
  if (p.startsWith('~/') || p.startsWith('~\\')) return join(homedir(), p.slice(2));
  return p;
}

export async function collectJsonlFiles(root) {
  const abs = resolve(process.cwd(), expandHome(root));
  const out = [];
  async function walk(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const p = join(dir, entry.name);
      if (entry.isDirectory()) await walk(p);
      else if (entry.isFile() && extname(entry.name) === '.jsonl') out.push(p);
    }
  }
  await walk(abs);
  return out.sort();
}

function readIndex(argv) {
  const index = flag(argv, 'index') ?? 'docs/archivarius/cache/spans.jsonl';
  const abs = resolve(process.cwd(), index);
  if (!existsSync(abs)) throw new Error(`archivarius: index не найден: ${index}`);
  const parsed = parseSpanJsonl(readFileSync(abs, 'utf8'));
  if (parsed.broken.length) {
    const first = parsed.broken[0];
    throw new Error(`archivarius: битый index JSONL, строка ${first.line}: ${first.error}`);
  }
  return parsed.spans;
}

function printJson(value) {
  console.log(JSON.stringify(value, null, 2));
}

function printHelp() {
  console.log([
    'archivarius — контейнер сессий (#1330)',
    '',
    '  node scripts/archivarius.mjs ingest --file <transcript.jsonl> [--out spans.jsonl] [--session-id <id>]',
    '  node scripts/archivarius.mjs ingest --from ~/.claude/projects [--out spans.jsonl]',
    '  node scripts/archivarius.mjs ingest --from ~/.codex/sessions [--out spans.jsonl]',
    '  node scripts/archivarius.mjs ingest --from ~/.cursor/projects/<slug>/agent-transcripts [--out spans.jsonl]',
    '  node scripts/archivarius.mjs audit --index spans.jsonl',
    '  node scripts/archivarius.mjs decompose --index spans.jsonl --by sessions|days|actors',
    '  node scripts/archivarius.mjs inspect <sessionId> --index spans.jsonl',
    '  node scripts/archivarius.mjs search --index spans.jsonl [--text q] [--actor user] [--reply-type assistant] [--from ISO] [--to ISO]',
  ].join('\n'));
}

async function ingest(argv) {
  const file = flag(argv, 'file');
  const from = flag(argv, 'from');
  if (!file && !from) throw new Error('archivarius ingest: нужен --file или --from');
  const files = file ? [resolve(process.cwd(), expandHome(file))] : await collectJsonlFiles(from);
  const spans = [];
  let maskedLines = 0;
  for (const p of files) {
    const text = readFileSync(p, 'utf8');
    const base = basename(p, extname(p));
    const defaultSessionId = flag(argv, 'session-id') ?? sessionIdFromRolloutName(base) ?? base;
    const result = ingestJsonlText(text, { sourcePath: p.replaceAll('\\', '/'), defaultSessionId });
    spans.push(...result.spans);
    maskedLines += result.summary.maskedLines;
  }
  const body = spans.map((span) => JSON.stringify(span)).join('\n') + (spans.length ? '\n' : '');
  const out = flag(argv, 'out');
  if (out) {
    const abs = resolve(process.cwd(), out);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, body, 'utf8');
    console.error(`archivarius: записан index ${out} · файлов ${files.length} · spans ${spans.length} · замаскировано ${maskedLines}`);
  } else {
    process.stdout.write(body);
  }
  return { files: files.length, spans: spans.length, maskedLines };
}

async function main() {
  const argv = process.argv.slice(2);
  const cmd = argv[0];
  try {
    if (!cmd || cmd === 'help' || has(argv, 'help')) {
      printHelp();
      return;
    }
    if (cmd === 'ingest') {
      const summary = await ingest(argv.slice(1));
      if (!flag(argv, 'out')) console.error(`archivarius: файлов ${summary.files} · spans ${summary.spans} · замаскировано ${summary.maskedLines}`);
      return;
    }
    if (cmd === 'audit') {
      printJson(auditSpans(readIndex(argv.slice(1))));
      return;
    }
    if (cmd === 'decompose') {
      printJson(decomposeSpans(readIndex(argv.slice(1)), flag(argv, 'by') ?? 'sessions'));
      return;
    }
    if (cmd === 'inspect') {
      const sessionId = argv[1];
      if (!sessionId) throw new Error('archivarius inspect: нужен sessionId');
      const passport = inspectSession(readIndex(argv.slice(2)), sessionId);
      if (!passport) throw new Error(`archivarius inspect: sessionId не найден: ${sessionId}`);
      printJson(passport);
      return;
    }
    if (cmd === 'search') {
      const rows = searchSpans(readIndex(argv.slice(1)), {
        text: flag(argv, 'text'),
        actor: flag(argv, 'actor'),
        replyType: flag(argv, 'reply-type'),
        from: flag(argv, 'from'),
        to: flag(argv, 'to'),
      });
      printJson(rows.map((span) => ({
        address: spanAddress(span),
        ts: span.ts,
        actor: span.actor,
        replyType: span.replyType,
        sha256: span.sha256,
        masked: span.masked,
      })));
      return;
    }
    throw new Error(`archivarius: неизвестная команда ${cmd}`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

if (process.argv[1]?.endsWith('archivarius.mjs')) main();
