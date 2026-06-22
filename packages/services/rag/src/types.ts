/** Chunk category for metadata filtering and ranking. */
export type RagChunkType =
  | 'doc'
  | 'code'
  | 'archive'
  | 'task'
  | 'prompt'
  | 'operative';

/** Lifecycle flag stored with indexed chunks. */
export type RagChunkStatus = 'active' | 'archived';

/** Metadata attached to each indexed or retrieved fragment. */
export interface ChunkMetadata {
  source: string;
  type: RagChunkType;
  timestamp: string;
  tags: string[];
  priority: number;
  chunkIndex: number;
  isHistorical: boolean;
  status: RagChunkStatus;
  headingPath?: string;
}

/** Single retrieved context fragment. */
export interface RAGFragment {
  text: string;
  score: number;
  circuit: 'operative' | 'archive';
  metadata: ChunkMetadata;
}

/** Options for {@link retrieveContext}. */
export interface RAGOptions {
  /** Force archive (LanceDB) circuit even when operative hits are sufficient. */
  useLongTerm?: boolean;
  /** Boost historical archive chunks (consilium / past decisions). */
  historical?: boolean;
  /** Override default top-K (env `RAG_TOP_K`). */
  topK?: number;
  /** Override operative lookback window in days. */
  operativeDays?: number;
  /** Override minimum operative hit count before skipping archive. */
  minOperativeCount?: number;
}

/** Result of a retrieval query. */
export interface RAGQueryResult {
  query: string;
  fragments: RAGFragment[];
  /** True when archive circuit was queried (even if it returned nothing). */
  usedArchive: boolean;
  /** True when operative circuit returned at least one fragment. */
  usedOperative: boolean;
}

/** Pluggable long-term vector backend (LanceDB default in R1). */
export interface VectorStore {
  upsert(chunks: readonly IndexedChunk[]): Promise<void>;
  deleteBySource(source: string): Promise<void>;
  query(embedding: readonly number[], topK: number): Promise<ScoredChunk[]>;
  close(): Promise<void>;
}

/** Chunk ready for vector upsert. */
export interface IndexedChunk {
  id: string;
  text: string;
  embedding: readonly number[];
  metadata: ChunkMetadata;
}

/** Vector search hit before circuit merge. */
export interface ScoredChunk {
  text: string;
  score: number;
  metadata: ChunkMetadata;
}

/** Index mode for CLI and scripts. */
export type RagIndexMode = 'full' | 'incremental';
