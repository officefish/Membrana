import type { RagConfig } from '../config.js';
import { createEmbedder } from '../embed/factory.js';
import { createLanceDbStore } from '../store/lancedb-store.js';
import type { RAGFragment, RAGOptions } from '../types.js';
import { scoreArchiveFragment } from './dual-retriever.js';

/** Pluggable archive circuit (LanceDB default; keyword corpus in tests). */
export interface RagArchivePort {
  hasIndex(): Promise<boolean>;
  search(
    query: string,
    topK: number,
    options: RAGOptions,
    config: RagConfig,
  ): Promise<RAGFragment[]>;
}

export function createLanceDbArchivePort(repoRoot: string, config: RagConfig): RagArchivePort {
  const store = createLanceDbStore(repoRoot, config.lanceDbPath);

  return {
    async hasIndex(): Promise<boolean> {
      return store.hasIndex();
    },

    async search(
      query: string,
      topK: number,
      options: RAGOptions,
      cfg: RagConfig,
    ): Promise<RAGFragment[]> {
      const embedder = createEmbedder(cfg);
      const [queryVector] = await embedder.embedTexts([query]);
      if (!queryVector) {
        throw new Error('Failed to embed query');
      }

      const hits = await store.query(queryVector, topK);
      return hits.map((hit) => scoreArchiveFragment(hit, cfg, options));
    },
  };
}
