import { readFile } from 'node:fs/promises';

import matter from 'gray-matter';

import { extractCodeSignatures } from '../chunk/code-signature-extractor.js';
import { splitMarkdown } from '../chunk/markdown-splitter.js';
import type { ChunkMetadata } from '../types.js';
import {
  archivePriority,
  classifySourceType,
  isHistoricalArchive,
} from './paths.js';
import type { SourceFileRef } from './collect-sources.js';

export interface ChunkDraft {
  id: string;
  text: string;
  metadata: ChunkMetadata;
}

export async function buildChunksForSource(file: SourceFileRef): Promise<ChunkDraft[]> {
  const content = await readFile(file.absolutePath, 'utf8');
  const type = classifySourceType(file.relativePath);
  const timestamp = new Date(file.mtimeMs).toISOString();
  const tags = extractTags(content, file.relativePath);
  const priority = archivePriority(file.relativePath);
  const isHistorical = isHistoricalArchive(file.relativePath);
  const status = isHistorical ? 'archived' : 'active';

  if (file.relativePath.endsWith('.ts')) {
    return extractCodeSignatures(content, file.relativePath).map((chunk) => ({
      id: `${file.relativePath}#${chunk.chunkIndex}`,
      text: chunk.text,
      metadata: {
        source: file.relativePath,
        type,
        timestamp,
        tags,
        priority,
        chunkIndex: chunk.chunkIndex,
        isHistorical,
        status,
      },
    }));
  }

  return splitMarkdown(content).map((chunk) => ({
    id: `${file.relativePath}#${chunk.chunkIndex}`,
    text: chunk.text,
    metadata: {
      source: file.relativePath,
      type,
      timestamp,
      tags,
      priority,
      chunkIndex: chunk.chunkIndex,
      isHistorical,
      status,
      headingPath: chunk.headingPath || undefined,
    },
  }));
}

function extractTags(content: string, relativePath: string): string[] {
  if (relativePath.endsWith('.md')) {
    try {
      const parsed = matter(content);
      const data = parsed.data as { tags?: unknown };
      if (Array.isArray(data.tags)) {
        return data.tags.filter((tag): tag is string => typeof tag === 'string');
      }
    } catch {
      // ignore frontmatter parse errors
    }
  }
  return [];
}
