#!/usr/bin/env node
/**
 * CI-safe checks for Mintlify docs workspaces without running Mintlify CLI
 * (avoids React hoisting conflicts in the monorepo).
 *
 * Usage:
 *   node scripts/verify-mintlify-docs.mjs
 *   node scripts/verify-mintlify-docs.mjs --links
 *   node scripts/verify-mintlify-docs.mjs --root apps/docs-harness
 *   node scripts/verify-mintlify-docs.mjs --all
 *
 * Navigation must be a Mintlify **object** (`{ groups: [...] }` and/or `{ pages: [...] }`).
 * Legacy array navigation fails verify (publish schema error).
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const checkLinks = process.argv.includes('--links');
const checkAll = process.argv.includes('--all');

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  if (i < 0) return null;
  const v = process.argv[i + 1];
  return v && !v.startsWith('--') ? v : null;
}

function fail(label, message) {
  console.error(`${label} — ${message}`);
  process.exitCode = 1;
}

/**
 * Collect page ids from Mintlify navigation.
 * Accepts object form (`groups` / nested groups / top-level `pages`) or legacy array
 * of `{ group, pages }` — but object form is required for publish.
 */
function collectPages(navigation) {
  const pages = [];

  function walkGroups(groups) {
    for (const group of groups ?? []) {
      for (const page of group.pages ?? []) {
        if (typeof page === 'string') {
          pages.push(page);
        } else if (page && typeof page === 'object' && typeof page.group === 'string') {
          walkGroups([page]);
        }
      }
    }
  }

  if (Array.isArray(navigation)) {
    walkGroups(navigation);
    return pages;
  }

  if (navigation && typeof navigation === 'object') {
    if (Array.isArray(navigation.groups)) {
      walkGroups(navigation.groups);
    }
    for (const page of navigation.pages ?? []) {
      if (typeof page === 'string') {
        pages.push(page);
      } else if (page && typeof page === 'object' && typeof page.group === 'string') {
        walkGroups([page]);
      }
    }
  }

  return pages;
}

function verifyDocsRoot(docsRootRel) {
  const label = `docs:verify(${docsRootRel})`;
  const docsRoot = resolve(root, docsRootRel);
  const docsJsonPath = resolve(docsRoot, 'docs.json');

  if (!existsSync(docsJsonPath)) {
    fail(label, `missing ${join(docsRootRel, 'docs.json')}`);
    return;
  }

  const docsJson = JSON.parse(readFileSync(docsJsonPath, 'utf8'));
  const navigation = docsJson.navigation;

  if (Array.isArray(navigation)) {
    fail(
      label,
      'navigation must be an object ({ "groups": [...] }), not a legacy array — Mintlify publish rejects array schema',
    );
  } else if (!navigation || typeof navigation !== 'object') {
    fail(label, 'docs.json navigation missing or not an object');
  } else if (!Array.isArray(navigation.groups) && !Array.isArray(navigation.pages)) {
    fail(label, 'navigation object needs "groups" and/or "pages"');
  }

  const pages = collectPages(navigation);

  if (pages.length === 0) {
    fail(label, 'docs.json navigation has no pages');
  }

  const pagePath = (page) => resolve(docsRoot, `${page}.mdx`);

  for (const page of pages) {
    const path = pagePath(page);
    if (!existsSync(path)) {
      fail(label, `missing MDX for navigation page "${page}": ${path}`);
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
            fail(label, `broken internal link in ${page}.mdx: ${target}`);
          }
          continue;
        }
        const resolved = resolve(dirname(path), target);
        if (!existsSync(resolved)) {
          fail(label, `broken relative link in ${page}.mdx: ${target}`);
        }
      }
    }
  }

  if (process.exitCode !== 1) {
    console.log(`${label} — OK (${pages.length} pages${checkLinks ? ', links checked' : ''})`);
  }
}

const roots = checkAll
  ? ['apps/docs', 'apps/docs-harness']
  : [argValue('--root') ?? 'apps/docs'];

for (const docsRootRel of roots) {
  verifyDocsRoot(docsRootRel);
}

if (process.exitCode === 1) {
  process.exit(1);
}
