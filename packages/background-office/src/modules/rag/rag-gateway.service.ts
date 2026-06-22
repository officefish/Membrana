import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import type { RagGateway, RagQueryOptions, RagQueryResultDto } from './rag-gateway.interface';

interface RagServiceModule {
  RagService: new (deps?: { repoRoot?: string }) => {
    retrieveContext(query: string, options?: RagQueryOptions): Promise<RagQueryResultDto>;
  };
}

/**
 * Delegates to `@membrana/rag-service` (dynamic import — ESM package from CJS office).
 * R4 documented exception in BACKGROUND_SERVERS.md.
 */
@Injectable()
export class RagGatewayService implements RagGateway {
  private ragModule: RagServiceModule | null = null;

  private async loadRagModule(): Promise<RagServiceModule> {
    if (!this.ragModule) {
      this.ragModule = (await import('@membrana/rag-service')) as RagServiceModule;
    }
    return this.ragModule;
  }

  async retrieveContext(query: string, options: RagQueryOptions = {}): Promise<RagQueryResultDto> {
    try {
      const rag = await this.loadRagModule();
      const service = new rag.RagService({
        repoRoot: process.env.RAG_REPO_ROOT?.trim() || undefined,
      });
      return service.retrieveContext(query, options);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('OPENAI_API_KEY') || message.includes('Failed to embed')) {
        throw new ServiceUnavailableException(
          'RAG archive circuit unavailable — set OPENAI_API_KEY and run yarn rag:index --full',
        );
      }
      throw error;
    }
  }
}
