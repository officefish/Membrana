#!/usr/bin/env node
/**
 * CLI: index docs into LanceDB (full or incremental).
 */
import { RagService } from '../service.js';
import type { RagIndexMode } from '../types.js';

function printHelp(): void {
  console.log(`Usage: node dist/cli/index.js [--full | --incremental]

Options:
  --full           Full re-index (default)
  --incremental    Incremental update from hash manifest
  --help           Show this help

Requires OPENAI_API_KEY in environment (.env loaded by caller if configured).
`);
}

function parseMode(argv: string[]): RagIndexMode {
  if (argv.includes('--help') || argv.includes('-h')) {
    printHelp();
    process.exit(0);
  }
  if (argv.includes('--incremental')) {
    return 'incremental';
  }
  return 'full';
}

async function main(): Promise<void> {
  const mode = parseMode(process.argv.slice(2));
  const service = new RagService();
  const result =
    mode === 'incremental' ? await service.indexIncremental() : await service.indexFull();

  console.log(
    JSON.stringify(
      {
        ok: true,
        mode: result.mode,
        indexedChunks: result.indexedChunks,
      },
      null,
      2,
    ),
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`rag index failed: ${message}`);
  process.exit(1);
});
