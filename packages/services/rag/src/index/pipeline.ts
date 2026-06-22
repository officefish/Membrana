import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import type { RagConfig } from '../config.js';
import { createOpenAiEmbedder, embedInBatches } from '../embed/openai-embedder.js';
import { OPENAI_EMBEDDING_BATCH_SIZE } from '../embed/types.js';
import { buildChunksForSource } from './build-chunks.js';
import { collectSourceFiles } from './collect-sources.js';
import {
  hashFileContent,
  loadHashManifest,
  saveHashManifest,
  type FileHashManifest,
} from './hash-manifest.js';
import type { RagIndexMode } from '../types.js';
import {
  createLanceDbStore,
  resolveManifestPath,
  toLanceDbRow,
} from '../store/lancedb-store.js';

export interface IndexPipelineResult {
  mode: RagIndexMode;
  indexedChunks: number;
  indexedFiles: number;
  skippedFiles: number;
  totalSources: number;
}

export interface IndexPipelineOptions {
  repoRoot?: string;
  config: RagConfig;
  env?: NodeJS.ProcessEnv;
}

export async function runIndexPipeline(
  mode: RagIndexMode,
  options: IndexPipelineOptions,
): Promise<IndexPipelineResult> {
  const repoRoot = resolve(options.repoRoot ?? options.env?.RAG_REPO_ROOT ?? process.cwd());
  const config = options.config;
  const env = options.env ?? process.env;

  if (config.vectorStore !== 'lancedb') {
    throw new Error(`R1 supports only lancedb store (got ${config.vectorStore})`);
  }

  const embedder = createOpenAiEmbedder(config, env);
  const store = createLanceDbStore(repoRoot, config.lanceDbPath);
  const manifestPath = resolveManifestPath(repoRoot, config.lanceDbPath);
  const sources = await collectSourceFiles(repoRoot);
  const previousManifest = mode === 'incremental' ? await loadHashManifest(manifestPath) : {};
  const nextManifest: FileHashManifest = {};

  const changedSources = [];
  for (const source of sources) {
    const content = await readFile(source.absolutePath, 'utf8');
    const hash = hashFileContent(content);
    nextManifest[source.relativePath] = hash;
    if (mode === 'full' || previousManifest[source.relativePath] !== hash) {
      changedSources.push(source);
    }
  }

  const removedSources =
    mode === 'incremental'
      ? Object.keys(previousManifest).filter(
          (path) => !sources.some((source) => source.relativePath === path),
        )
      : [];

  for (const removed of removedSources) {
    await store.deleteBySource(removed);
    delete nextManifest[removed];
  }

  const allRows = [];
  if (mode === 'full') {
    for (const source of sources) {
      const chunks = await buildChunksForSource(source);
      if (chunks.length === 0) {
        continue;
      }
      const vectors = await embedInBatches(
        embedder,
        chunks.map((chunk) => chunk.text),
        OPENAI_EMBEDDING_BATCH_SIZE,
      );
      for (let i = 0; i < chunks.length; i += 1) {
        const chunk = chunks[i];
        const vector = vectors[i];
        if (!chunk || !vector) {
          continue;
        }
        allRows.push(
          toLanceDbRow({
            id: chunk.id,
            text: chunk.text,
            embedding: vector,
            metadata: chunk.metadata,
          }),
        );
      }
    }
    await store.recreateTable(allRows);
  } else {
    for (const source of changedSources) {
      await store.deleteBySource(source.relativePath);
      const chunks = await buildChunksForSource(source);
      if (chunks.length === 0) {
        continue;
      }
      const vectors = await embedInBatches(
        embedder,
        chunks.map((chunk) => chunk.text),
        OPENAI_EMBEDDING_BATCH_SIZE,
      );
      const rows = chunks.map((chunk, index) => {
        const vector = vectors[index];
        if (!vector) {
          throw new Error(`Missing embedding for ${chunk.id}`);
        }
        return toLanceDbRow({
          id: chunk.id,
          text: chunk.text,
          embedding: vector,
          metadata: chunk.metadata,
        });
      });
      await store.upsertSourceRows(rows);
      allRows.push(...rows);
    }
  }

  await saveHashManifest(manifestPath, nextManifest);

  return {
    mode,
    indexedChunks: mode === 'full' ? allRows.length : allRows.length,
    indexedFiles: mode === 'full' ? sources.length : changedSources.length,
    skippedFiles: mode === 'full' ? 0 : sources.length - changedSources.length,
    totalSources: sources.length,
  };
}
