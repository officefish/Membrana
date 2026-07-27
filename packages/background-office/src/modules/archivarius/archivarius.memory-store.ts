import { Injectable } from '@nestjs/common';

import type { ArchivariusSpan, ArchivariusStore } from './archivarius.types';

function keyOf(span: Pick<ArchivariusSpan, 'sessionId' | 'uuid'>): string {
  return `${span.sessionId}\u0000${span.uuid}`;
}

@Injectable()
export class MemoryArchivariusStore implements ArchivariusStore {
  private readonly spans = new Map<string, ArchivariusSpan>();

  async upsertSpans(spans: ArchivariusSpan[]): Promise<{ accepted: number; maskedLines: number }> {
    for (const span of spans) this.spans.set(keyOf(span), span);
    return { accepted: spans.length, maskedLines: spans.filter((span) => span.masked).length };
  }

  async getSpan(sessionId: string, uuid: string): Promise<ArchivariusSpan | null> {
    return this.spans.get(`${sessionId}\u0000${uuid}`) ?? null;
  }

  async listSpans(): Promise<ArchivariusSpan[]> {
    return [...this.spans.values()];
  }
}
