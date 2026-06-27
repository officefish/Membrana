/**
 * @membrana/rag-service — dual-circuit RAG for Membrana rituals.
 *
 * Circuit A: repo-native operative memory (git recency + keyword).
 * Circuit B: LanceDB archive (docs, tasks, code signatures).
 *
 * See docs/CRITICAL_RAG_AUDIT.md and docs/RAG.md.
 */

export { loadRagConfig, RAG_CONFIG_DEFAULTS } from './config.js';
export type { RagConfig, RagEmbeddingProvider, RagVectorStoreKind } from './config.js';

export {
  RagService,
  retrieveContext,
  formatFragmentsForPrompt,
} from './service.js';
export type { RagServiceDeps } from './service.js';

export { runIndexPipeline } from './index/pipeline.js';
export type { IndexPipelineResult } from './index/pipeline.js';

export {
  getRecentDocs,
  type DocRef,
} from './operative/recent-docs.js';
export {
  keywordSearch,
  searchByPathPatterns,
  retrieveOperativeContext,
  countSufficientOperativeHits,
} from './operative/keyword-search.js';
export {
  applyFreshnessDecay,
  bm25LiteScore,
  keywordHitRate,
  operativeBaseScore,
  scoreFragment,
} from './operative/scoring.js';
export {
  classifyOperativePath,
  pathPriorityBoost,
  OPERATIVE_P0_PATHS,
} from './operative/path-filters.js';

export {
  mergeRetrievalResults,
  planDualRetrieval,
  precisionAtK,
  scoreArchiveFragment,
} from './retriever/dual-retriever.js';
export { createLanceDbArchivePort, type RagArchivePort } from './retriever/archive-port.js';
export { createKeywordCorpusArchivePort } from './retriever/keyword-corpus-archive.js';

export { createLanceDbStore, resolveManifestPath } from './store/lancedb-store.js';
export { createOpenAiEmbedder, embedInBatches } from './embed/openai-embedder.js';
export { createVoyageEmbedder } from './embed/voyage-embedder.js';
export { createEmbedder, embeddingFingerprint } from './embed/embedder-factory.js';
export { splitMarkdown } from './chunk/markdown-splitter.js';

export type {
  ChunkMetadata,
  IndexedChunk,
  RAGFragment,
  RAGOptions,
  RAGQueryResult,
  RagChunkStatus,
  RagChunkType,
  RagIndexMode,
  ScoredChunk,
  VectorStore,
} from './types.js';
