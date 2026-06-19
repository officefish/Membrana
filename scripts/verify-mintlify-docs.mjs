#!/usr/bin/env node
/**
 * CI-safe checks for apps/docs without running Mintlify CLI (avoids React hoisting conflicts in the monorepo).
 *
 * Usage:
 *   node scripts/verify-mintlify-docs.mjs
 *   node scripts/verify-mintlify-docs.mjs --links
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const docsRoot = resolve(root, 'apps/docs');
const checkLinks = process.argv.includes('--links');

function fail(message) {
  console.error(`docs:verify — ${message}`);
  process.exitCode = 1;
}

function collectPages(navigation) {
  const pages = [];
  for (const group of navigation ?? []) {
    for (const page of group.pages ?? []) {
      if (typeof page === 'string') {
        pages.push(page);
      } else if (page && typeof page === 'object' && typeof page.group === 'string') {
        pages.push(...collectPages([page]));
      }
    }
  }
  return pages;
}

function pagePath(page) {
  return resolve(docsRoot, `${page}.mdx`);
}

const docsJsonPath = resolve(docsRoot, 'docs.json');
if (!existsSync(docsJsonPath)) {
  fail('missing apps/docs/docs.json');
  process.exit(process.exitCode ?? 1);
}

const docsJson = JSON.parse(readFileSync(docsJsonPath, 'utf8'));
const pages = collectPages(docsJson.navigation);

if (pages.length === 0) {
  fail('docs.json navigation has no pages');
}

for (const page of pages) {
  const path = pagePath(page);
  if (!existsSync(path)) {
    fail(`missing MDX for navigation page "${page}": ${path}`);
  }
}

if (checkLinks) {
  const linkPattern = /\[[^\]]+\]\(([^)]+)\)/g;
  for (const page of pages) {
    const path = pagePath(page);
    const source = readFileSync(path, 'utf8');
    let match;
    while ((match = linkPattern.exec(source)) !== null) {
      const target = match[1]?.trim();
      if (!target || target.startsWith('#') || /^https?:\/\//i.test(target) || target.startsWith('mailto:')) {
        continue;
      }
      if (target.startsWith('/')) {
        const internalPage = target.slice(1).split('#')[0];
        if (internalPage && !existsSync(pagePath(internalPage))) {
          fail(`broken internal link in ${page}.mdx: ${target}`);
        }
        continue;
      }
      const resolved = resolve(dirname(path), target);
      if (!existsSync(resolved)) {
        fail(`broken relative link in ${page}.mdx: ${target}`);
      }
    }
  }
}

if (process.exitCode === 1) {
  process.exit(1);
}

console.log(`docs:verify — OK (${pages.length} pages${checkLinks ? ', links checked' : ''})`);
