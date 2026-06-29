/**
 * RAG configuration from environment (local-first defaults).
 * See docs/CRITICAL_RAG_AUDIT.md §9.
 */

export type RagEmbeddingProvider = 'openai' | 'voyage';
export type RagVectorStoreKind = 'lancedb' | 'pinecone' | 'pgvector';

export interface RagConfig {
  embeddingProvider: RagEmbeddingProvider;
  embeddingModel: string;
  openaiBaseUrl: string;
  vectorStore: RagVectorStoreKind;
  lanceDbPath: string;
  operativeDays: number;
  operativeRelevanceThreshold: number;
  minOperativeCount: number;
  longTermPenalty: number;
  topK: number;
  operativeTopK: number;
  archiveTopK: number;
  obsidianEnabled: boolean;
  obsidianVaultPath: string | null;
}

const DEFAULTS: RagConfig = {
  embeddingProvider: 'openai',
  embeddingModel: 'text-embedding-3-small',
  openaiBaseUrl: 'https://api.openai.com/v1',
  vectorStore: 'lancedb',
  lanceDbPath: '.membrana/rag/',
  operativeDays: 7,
  operativeRelevanceThreshold: 0.6,
  minOperativeCount: 3,
  longTermPenalty: 0.9,
  topK: 5,
  operativeTopK: 5,
  archiveTopK: 15,
  obsidianEnabled: false,
  obsidianVaultPath: null,
};

function parseFloatEnv(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === '') {
    return fallback;
  }
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseIntEnv(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === '') {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseEmbeddingProvider(value: string | undefined): RagEmbeddingProvider {
  return value === 'voyage' ? 'voyage' : 'openai';
}

function parseVectorStore(value: string | undefined): RagVectorStoreKind {
  if (value === 'pinecone' || value === 'pgvector') {
    return value;
  }
  return 'lancedb';
}

/** Load config from `process.env` with documented defaults. */
export function loadRagConfig(env: NodeJS.ProcessEnv = process.env): RagConfig {
  const legacyOperativeThreshold = env.RAG_OBSIDIAN_RELEVANCE_THRESHOLD;
  const legacyMinCount = env.RAG_MIN_OBSIDIAN_COUNT;

  return {
    embeddingProvider: parseEmbeddingProvider(env.RAG_EMBEDDING_PROVIDER),
    embeddingModel: env.RAG_EMBEDDING_MODEL?.trim() || DEFAULTS.embeddingModel,
    openaiBaseUrl: env.OPENAI_BASE_URL?.trim().replace(/\/$/, '') || DEFAULTS.openaiBaseUrl,
    vectorStore: parseVectorStore(env.RAG_VECTOR_STORE),
    lanceDbPath: env.RAG_LANCEDB_PATH?.trim() || DEFAULTS.lanceDbPath,
    operativeDays: parseIntEnv(env.RAG_OPERATIVE_DAYS, DEFAULTS.operativeDays),
    operativeRelevanceThreshold: parseFloatEnv(
      env.RAG_OPERATIVE_RELEVANCE_THRESHOLD ?? legacyOperativeThreshold,
      DEFAULTS.operativeRelevanceThreshold,
    ),
    minOperativeCount: parseIntEnv(
      env.RAG_MIN_OPERATIVE_COUNT ?? legacyMinCount,
      DEFAULTS.minOperativeCount,
    ),
    longTermPenalty: parseFloatEnv(env.RAG_LONG_TERM_PENALTY, DEFAULTS.longTermPenalty),
    topK: parseIntEnv(env.RAG_TOP_K, DEFAULTS.topK),
    operativeTopK: parseIntEnv(env.RAG_OPERATIVE_TOP_K, DEFAULTS.operativeTopK),
    archiveTopK: parseIntEnv(env.RAG_ARCHIVE_TOP_K, DEFAULTS.archiveTopK),
    obsidianEnabled: env.OBSIDIAN_ENABLED === 'true',
    obsidianVaultPath: env.OBSIDIAN_VAULT_PATH?.trim() || null,
  };
}

export { DEFAULTS as RAG_CONFIG_DEFAULTS };
