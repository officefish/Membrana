import { loadRagConfig, type RagConfig } from './config.js';
import { runIndexPipeline } from './index/pipeline.js';
import { retrieveOperativeContext } from './operative/keyword-search.js';
import { resolveRepoRoot } from './repo-root.js';
import { createLanceDbArchivePort, type RagArchivePort } from './retriever/archive-port.js';
import {
  mergeRetrievalResults,
  planDualRetrieval,
} from './retriever/dual-retriever.js';
import type {
  RAGFragment,
  RAGOptions,
  RAGQueryResult,
  RagIndexMode,
} from './types.js';

export interface RagServiceDeps {
  config?: RagConfig;
  repoRoot?: string;
  archivePort?: RagArchivePort;
}

/**
 * Dual-circuit RAG service (R3: threshold merge + archive skip).
 */
export class RagService {
  readonly config: RagConfig;
  readonly repoRoot: string;
  private readonly archivePort: RagArchivePort;

  constructor(deps: RagServiceDeps = {}) {
    this.config = deps.config ?? loadRagConfig();
    this.repoRoot = resolveRepoRoot(deps.repoRoot);
    this.archivePort =
      deps.archivePort ?? createLanceDbArchivePort(this.repoRoot, this.config);
  }

  /**
   * Retrieve context — operative BM25 first, archive when plan requires it.
   */
  async retrieveContext(query: string, options: RAGOptions = {}): Promise<RAGQueryResult> {
    const trimmed = query.trim();
    if (!trimmed) {
      return {
        query: '',
        fragments: [],
        usedArchive: false,
        usedOperative: false,
      };
    }

    const mergeTopK = options.topK ?? this.config.topK;
    const operative = await retrieveOperativeContext(
      this.repoRoot,
      trimmed,
      this.config,
      options,
    );

    const hasArchiveIndex = await this.archivePort.hasIndex();
    const plan = planDualRetrieval(
      operative.fragments,
      options,
      this.config,
      hasArchiveIndex,
    );

    if (plan.skipArchive) {
      return {
        query: trimmed,
        fragments: operative.fragments.slice(0, Math.min(this.config.operativeTopK, mergeTopK)),
        usedArchive: false,
        usedOperative: operative.usedOperative,
      };
    }

    let archiveFragments: RAGFragment[] = [];
    let usedArchive = false;
    if (plan.queryArchive) {
      usedArchive = true;
      archiveFragments = await this.archivePort.search(trimmed, this.config.archiveTopK, options, this.config);
    }

    return {
      query: trimmed,
      fragments: mergeRetrievalResults(operative.fragments, archiveFragments, mergeTopK, options),
      usedArchive,
      usedOperative: operative.usedOperative,
    };
  }

  /** Full corpus re-index into LanceDB. */
  async indexFull(): Promise<{ mode: RagIndexMode; indexedChunks: number }> {
    const result = await runIndexPipeline('full', {
      repoRoot: this.repoRoot,
      config: this.config,
    });
    return { mode: result.mode, indexedChunks: result.indexedChunks };
  }

  /** Incremental index for changed files only. */
  async indexIncremental(): Promise<{ mode: RagIndexMode; indexedChunks: number }> {
    const result = await runIndexPipeline('incremental', {
      repoRoot: this.repoRoot,
      config: this.config,
    });
    return { mode: result.mode, indexedChunks: result.indexedChunks };
  }
}

/** Convenience wrapper using default env config. */
export async function retrieveContext(
  query: string,
  options?: RAGOptions,
): Promise<RAGQueryResult> {
  const service = new RagService();
  return service.retrieveContext(query, options);
}

/** Format fragments for prompt injection (rituals / CLI). */
export function formatFragmentsForPrompt(result: RAGQueryResult): string {
  if (result.fragments.length === 0) {
    if (result.usedOperative) {
      return '(no RAG matches in operative docs)';
    }
    if (result.usedArchive) {
      return '(no RAG matches in archive index)';
    }
    return '(no RAG context — operative docs empty or run yarn rag:index --full after setting OPENAI_API_KEY)';
  }

  return result.fragments
    .map((fragment, index) => formatFragmentBlock(fragment, index + 1))
    .join('\n\n');
}

function formatFragmentBlock(fragment: RAGFragment, index: number): string {
  const header = `[${index}] score=${fragment.score.toFixed(3)} circuit=${fragment.circuit} source=${fragment.metadata.source}`;
  return `${header}\n${fragment.text}`;
}
