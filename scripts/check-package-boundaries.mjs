#!/usr/bin/env node
/**
 * CRDC D1 — package boundary checks (code-review debt closeout).
 *
 * Usage:
 *   node scripts/check-package-boundaries.mjs
 *   yarn check:boundaries
 *
 * @see docs/prompts/CODE_REVIEW_DEBT_CLOSEOUT_JUN2026_EPIC_PROMPT.md (D1)
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(import.meta.url), '..', '..');

/** @typedef {{ id: string; roots: string[]; patterns: RegExp[]; extensions?: RegExp }} BoundaryRule */

/** @type {BoundaryRule[]} */
const RULES = [
  {
    id: 'cabinet-no-background-server-imports',
    roots: ['apps/cabinet/src'],
    patterns: [
      /@membrana\/background-media/,
      /@membrana\/background-cabinet/,
      /@membrana\/background-office/,
      /packages\/background-media/,
      /packages\/background-cabinet/,
      /packages\/background-office/,
    ],
  },
  {
    id: 'services-no-device-board-imports',
    roots: ['packages/services'],
    patterns: [
      /@membrana\/device-board/,
      /packages\/device-board/,
      /from ['"].*device-board/,
    ],
  },
  {
    id: 'device-board-no-direct-web-audio',
    roots: ['packages/device-board/src'],
    patterns: [
      /\bnew AudioContext\s*\(/,
      /\bnavigator\.mediaDevices\.getUserMedia\s*\(/,
      /\bcreateAnalyser\s*\(/,
      /\bdecodeAudioData\s*\(/,
    ],
  },
  {
    id: 'device-board-no-agenda-or-client-imports',
    roots: ['packages/device-board/src'],
    patterns: [
      /^\s*import\s.*@membrana\/agenda/,
      /^\s*import\s.*apps\/client/,
    ],
  },
];

const SOURCE_EXT = /\.(ts|tsx|mts|cts|js|jsx|mjs|cjs)$/;

/**
 * @param {string} dir
 * @param {string[]} acc
 * @returns {string[]}
 */
function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const abs = join(dir, name);
    let st;
    try {
      st = statSync(abs);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      if (name === 'node_modules' || name === 'dist' || name === '.turbo') continue;
      walk(abs, acc);
      continue;
    }
    if (SOURCE_EXT.test(name) && !/\.(test|spec)\./.test(name)) {
      acc.push(abs);
    }
  }
  return acc;
}

/**
 * @param {BoundaryRule} rule
 * @returns {{ file: string; line: number; text: string; pattern: string }[]}
 */
function scanRule(rule) {
  /** @type {{ file: string; line: number; text: string; pattern: string }[]} */
  const violations = [];

  for (const relRoot of rule.roots) {
    const absRoot = join(root, relRoot);
    let files;
    try {
      files = walk(absRoot);
    } catch {
      continue;
    }

    for (const file of files) {
      const content = readFileSync(file, 'utf8');
      const lines = content.split(/\r?\n/);
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue;
        for (const pattern of rule.patterns) {
          if (pattern.test(line)) {
            violations.push({
              file: relative(root, file),
              line: i + 1,
              text: line.trim(),
              pattern: String(pattern),
            });
          }
        }
      }
    }
  }

  return violations;
}

function main() {
  let failed = false;

  console.log('check-package-boundaries — Membrana package graph (CRDC D1)\n');

  for (const rule of RULES) {
    const violations = scanRule(rule);
    if (violations.length === 0) {
      console.log(`✓ ${rule.id}`);
      continue;
    }
    failed = true;
    console.error(`✗ ${rule.id} — ${violations.length} violation(s)`);
    for (const v of violations) {
      console.error(`  ${v.file}:${v.line}  ${v.text}`);
    }
    console.error('');
  }

  if (failed) {
    process.exitCode = 1;
    console.error('check-package-boundaries — FAILED');
    return;
  }

  console.log('\ncheck-package-boundaries — OK');
}

main();
