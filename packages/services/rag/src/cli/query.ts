#!/usr/bin/env node
/**
 * CLI: query RAG context (local, no background-office).
 */
import { formatFragmentsForPrompt, retrieveContext } from '../index.js';

function printHelp(): void {
  console.log(`Usage: node dist/cli/query.js "<query>" [options]

Options:
  --full-rag       Force archive circuit (useLongTerm)
  --historical     Boost archive priority
  --top-k <n>      Override fragment count
  --json           Print JSON instead of prompt block
  --help           Show this help
`);
}

function parseArgs(argv: string[]): {
  query: string;
  useLongTerm: boolean;
  historical: boolean;
  topK?: number;
  json: boolean;
} {
  const args = [...argv];
  let useLongTerm = false;
  let historical = false;
  let topK: number | undefined;
  let json = false;
  const queryParts: string[] = [];

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === undefined) {
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
    if (arg === '--full-rag') {
      useLongTerm = true;
      continue;
    }
    if (arg === '--historical') {
      historical = true;
      continue;
    }
    if (arg === '--json') {
      json = true;
      continue;
    }
    if (arg === '--top-k') {
      const next = args[i + 1];
      if (next === undefined) {
        throw new Error('--top-k requires a number');
      }
      topK = Number.parseInt(next, 10);
      i += 1;
      continue;
    }
    queryParts.push(arg);
  }

  const query = queryParts.join(' ').trim();
  if (!query) {
    printHelp();
    process.exit(1);
  }

  return { query, useLongTerm, historical, topK, json };
}

async function main(): Promise<void> {
  const { query, useLongTerm, historical, topK, json } = parseArgs(process.argv.slice(2));
  const result = await retrieveContext(query, { useLongTerm, historical, topK });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(formatFragmentsForPrompt(result));
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`rag query failed: ${message}`);
  process.exit(1);
});
