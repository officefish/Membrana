/** Local DTO mirror of `@membrana/rag-service` types (avoid CJS/ESM type import). */

export interface RagQueryOptions {
  useLongTerm?: boolean;
  historical?: boolean;
  topK?: number;
  operativeDays?: number;
  minOperativeCount?: number;
}

export interface RagFragmentDto {
  text: string;
  score: number;
  circuit: 'operative' | 'archive';
  metadata: {
    source: string;
    type: string;
    timestamp: string;
    tags: string[];
    priority: number;
    chunkIndex: number;
    isHistorical: boolean;
    status: string;
    headingPath?: string;
  };
}

export interface RagQueryResultDto {
  query: string;
  fragments: RagFragmentDto[];
  usedArchive: boolean;
  usedOperative: boolean;
}

/** Pluggable RAG gateway (mocked in tests). */
export interface RagGateway {
  retrieveContext(query: string, options?: RagQueryOptions): Promise<RagQueryResultDto>;
}
