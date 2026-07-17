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
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(import.meta.url), '..', '..');

/** @typedef {{ id: string; roots: string[]; patterns: RegExp[]; extensions?: RegExp }} BoundaryRule */

/** @type {BoundaryRule[]} */
export const RULES = [
  {
    // CC2 — контур communications: сток, не исток. outdegree(comms → продуктовые) = 0.
    // Канон читается через fs-read (строковые пути), НЕ через import @membrana/* (чтение ≠ импорт).
    id: 'comms-studio-no-product-imports',
    roots: ['apps/comms-studio/src'],
    patterns: [
      /^\s*import\b[^;]*['"]@membrana\//,
      /^\s*export\b[^;]*\bfrom\s+['"]@membrana\//,
      /\brequire\(\s*['"]@membrana\//,
    ],
  },
  {
    // CC2 — контур communications: indegree(comms от продуктовых) = 0. Ни один пакет не импортирует контур.
    id: 'comms-studio-no-inbound-imports',
    roots: ['apps', 'packages'],
    patterns: [
      /^\s*import\b[^;]*['"]@membrana\/comms-studio/,
      /^\s*export\b[^;]*\bfrom\s+['"]@membrana\/comms-studio/,
      /\brequire\(\s*['"]@membrana\/comms-studio/,
    ],
  },
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
  {
    // ADR-0010 Р4 — панель не импортирует исходники блоков: раздел = iframe на
    // маршрут-мост, presentation блока сменный. До 17.07 инвариант держался ТОЛЬКО
    // комментарием в шапке GraphifyBoard/ResearchTreeBoard — P1 ревью 16.07 требовал
    // убедиться, что линт границ реально в CI; его там не было.
    id: 'panel-no-block-source-imports',
    roots: ['apps/panel/src'],
    patterns: [
      /^\s*import\b[^;]*['"][^'"]*@membrana\/research-tree/,
      /^\s*export\b[^;]*\bfrom\s+['"][^'"]*@membrana\/research-tree/,
      /\brequire\(\s*['"][^'"]*@membrana\/research-tree/,
      /^\s*import\b[^;]*['"][^'"]*apps\/demos\//,
      /^\s*export\b[^;]*\bfrom\s+['"][^'"]*apps\/demos\//,
      /\brequire\(\s*['"][^'"]*apps\/demos\//,
    ],
  },
];

const SOURCE_EXT = /\.(ts|tsx|mts|cts|js|jsx|mjs|cjs)$/;

/**
 * @param {string} dir
 * @param {string[]} acc
 * @returns {string[]}
 */
export function walk(dir, acc = []) {
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
 * @param {string} [baseRoot] корень для резолва `rule.roots` (по умолчанию — корень монорепо;
 *   в тестах — временный каталог для изолированного негативного теста).
 * @returns {{ file: string; line: number; text: string; pattern: string }[]}
 */
export function scanRule(rule, baseRoot = root) {
  /** @type {{ file: string; line: number; text: string; pattern: string }[]} */
  const violations = [];

  for (const relRoot of rule.roots) {
    const absRoot = join(baseRoot, relRoot);
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

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  main();
}
