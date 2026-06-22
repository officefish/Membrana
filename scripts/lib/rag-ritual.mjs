/**
 * Shared RAG helpers for Membrana rituals (R5).
 * Operative circuit works without OPENAI_API_KEY; archive needs key + index.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const MAX_RAG_BLOCK_CHARS = 8_000;

export const STANDUP_RAG_QUERY =
  'MAIN_DAY_ISSUE CURRENT_TASK DAILY_CODE_REVIEW strategic plan focus today Membrana';
export const MAIN_DAY_RAG_QUERY =
  'MAIN_DAY_ISSUE CURRENT_TASK primary focus Definition of Done today';
export const CODE_REVIEW_RAG_QUERY =
  'architecture package boundaries services Web Audio tests linter risks review';

/** @param {string} [startDir] */
export function resolveRepoRoot(startDir = process.cwd()) {
  let current = resolve(startDir);
  while (true) {
    if (hasMonorepoRoot(current)) {
      return current;
    }
    const parent = dirname(current);
    if (parent === current) {
      return resolve(startDir);
    }
    current = parent;
  }
}

function hasMonorepoRoot(dir) {
  const packageJsonPath = join(dir, 'package.json');
  if (!existsSync(packageJsonPath)) {
    return false;
  }
  try {
    const parsed = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    if (!parsed?.workspaces) {
      return false;
    }
    return existsSync(join(dir, 'AGENTS.md'));
  } catch {
    return false;
  }
}

export function resolveRagServiceEntry(repoRoot) {
  return resolve(repoRoot, 'packages/services/rag/dist/index.js');
}

export async function loadRagServiceModule(repoRoot = resolveRepoRoot()) {
  const entry = resolveRagServiceEntry(repoRoot);
  if (!existsSync(entry)) {
    return null;
  }
  return import(pathToFileURL(entry).href);
}

/**
 * @param {string} query
 * @param {Record<string, unknown>} [options]
 */
export async function retrieveRagContext(query, options = {}) {
  const trimmed = query.trim();
  if (!trimmed) {
    return { skipped: true, reason: 'empty query' };
  }

  const repoRoot = resolveRepoRoot();
  try {
    const rag = await loadRagServiceModule(repoRoot);
    if (!rag) {
      return {
        skipped: true,
        reason: 'rag-service not built (yarn workspace @membrana/rag-service build)',
      };
    }

    const service = new rag.RagService({ repoRoot });
    const result = await service.retrieveContext(trimmed, options);
    return { skipped: false, result };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { skipped: true, reason: message };
  }
}

/**
 * @param {{ skipped: boolean, reason?: string, result?: { fragments: Array<{ text: string, score: number, circuit: string, metadata: { source: string } }>, usedArchive?: boolean, usedOperative?: boolean } }} retrieval
 * @param {{ maxChars?: number, title?: string }} [opts]
 */
export function formatRagContextBlock(retrieval, opts = {}) {
  const maxChars = opts.maxChars ?? MAX_RAG_BLOCK_CHARS;
  const title = opts.title ?? 'RAG (dual-circuit)';

  if (retrieval.skipped) {
    return `(${title}: пропущен — ${retrieval.reason ?? 'unknown'})\n`;
  }

  const fragments = retrieval.result?.fragments ?? [];
  if (fragments.length === 0) {
    return `(${title}: совпадений не найдено)\n`;
  }

  const meta = `operative=${Boolean(retrieval.result?.usedOperative)} archive=${Boolean(retrieval.result?.usedArchive)}`;
  const body = fragments
    .map((fragment, index) => {
      const header = `[${index + 1}] score=${fragment.score.toFixed(3)} circuit=${fragment.circuit} source=${fragment.metadata.source}`;
      return `${header}\n${fragment.text}`;
    })
    .join('\n\n');

  let block = `<!-- RAG ${meta} -->\n\n${body}\n`;
  if (block.length > maxChars) {
    block = `${block.slice(0, maxChars)}\n\n[… RAG обрезан до ${maxChars} символов …]\n`;
  }

  return block;
}

/** @param {string[]} argv */
export function parseRagCliFlags(argv) {
  return {
    noRag: argv.includes('--no-rag'),
    fullRag: argv.includes('--full-rag'),
    enableRag: argv.includes('--rag'),
  };
}

/** @param {{ persona: string, noRag?: boolean, enableRag?: boolean }} opts */
export function shouldUsePersonaRag({ persona, noRag = false, enableRag = false }) {
  if (noRag) {
    return false;
  }
  if (enableRag) {
    return true;
  }
  return persona === 'vesnin' || persona === 'ozhegov';
}

/**
 * @param {{ skipped: boolean, result?: { fragments: unknown[] } }} retrieval
 * @param {string} label
 */
export function logRagStatus(retrieval, label) {
  if (!process.stderr.isTTY) {
    return;
  }
  if (retrieval.skipped) {
    console.error(`→ RAG [${label}]: skipped (${retrieval.reason ?? 'n/a'})`);
    return;
  }
  const count = retrieval.result?.fragments?.length ?? 0;
  console.error(`→ RAG [${label}]: ${count} fragment(s)`);
}
