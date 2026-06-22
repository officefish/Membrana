import type { RagConfig } from '../config.js';
import { buildChunksForSource, type ChunkDraft } from '../index/build-chunks.js';
import { collectSourceFiles } from '../index/collect-sources.js';
import { operativeBaseScore, uniqueQueryTerms, filenameMatchBoost } from '../operative/scoring.js';
import type { RAGFragment, RAGOptions } from '../types.js';
import type { RagArchivePort } from './archive-port.js';
import { scoreArchiveFragment } from './dual-retriever.js';

/**
 * Keyword search over the full index corpus — CI-safe archive substitute (no embeddings).
 */
export async function createKeywordCorpusArchivePort(
  repoRoot: string,
): Promise<RagArchivePort> {
  const sources = await collectSourceFiles(repoRoot);
  const chunks: ChunkDraft[] = [];
  for (const source of sources) {
    chunks.push(...(await buildChunksForSource(source)));
  }

  return {
    async hasIndex(): Promise<boolean> {
      return chunks.length > 0;
    },

    async search(
      query: string,
      topK: number,
      options: RAGOptions,
      config: RagConfig,
    ): Promise<RAGFragment[]> {
      const terms = uniqueQueryTerms(query);
      if (terms.length === 0) {
        return [];
      }

      const hits = chunks
        .map((chunk) => ({
          text: chunk.text,
          score:
            operativeBaseScore(terms, chunk.text) *
            chunk.metadata.priority *
            filenameMatchBoost(chunk.metadata.source, terms),
          metadata: chunk.metadata,
        }))
        .filter((hit) => hit.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);

      return hits.map((hit) => scoreArchiveFragment(hit, config, options));
    },
  };
}
