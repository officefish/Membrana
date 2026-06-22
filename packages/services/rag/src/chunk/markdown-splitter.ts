import {
  CHUNK_OVERLAP_CHARS,
  estimateTokens,
  MAX_CHUNK_CHARS,
} from './token-estimate.js';

export interface MarkdownChunk {
  text: string;
  headingPath: string;
  chunkIndex: number;
}

/**
 * Split markdown by headings, then by size with overlap.
 */
export function splitMarkdown(content: string): MarkdownChunk[] {
  const normalized = content.replace(/\r\n/g, '\n');
  const sections = splitByHeadings(normalized);
  const chunks: MarkdownChunk[] = [];
  let globalIndex = 0;

  for (const section of sections) {
    const parts = splitSectionBySize(section.body, section.headingPath);
    for (const part of parts) {
      chunks.push({
        text: part,
        headingPath: section.headingPath,
        chunkIndex: globalIndex,
      });
      globalIndex += 1;
    }
  }

  if (chunks.length === 0 && normalized.trim()) {
    chunks.push({
      text: normalized.trim(),
      headingPath: '',
      chunkIndex: 0,
    });
  }

  return chunks;
}

interface MarkdownSection {
  headingPath: string;
  body: string;
}

function splitByHeadings(content: string): MarkdownSection[] {
  const lines = content.split('\n');
  const sections: MarkdownSection[] = [];
  const headingStack: string[] = [];
  let bodyLines: string[] = [];

  const flush = (): void => {
    const body = bodyLines.join('\n').trim();
    if (body) {
      sections.push({
        headingPath: headingStack.join(' > '),
        body,
      });
    }
    bodyLines = [];
  };

  for (const line of lines) {
    const headingMatch = /^(#{1,6})\s+(.+)$/.exec(line);
    if (headingMatch) {
      flush();
      const level = headingMatch[1]?.length ?? 1;
      const title = headingMatch[2]?.trim() ?? '';
      headingStack.splice(level - 1);
      headingStack[level - 1] = title;
      continue;
    }
    bodyLines.push(line);
  }

  flush();
  return sections;
}

function splitSectionBySize(body: string, headingPath: string): string[] {
  if (estimateTokens(body) <= MAX_CHUNK_CHARS / 4) {
    const prefix = headingPath ? `# ${headingPath}\n\n` : '';
    return [`${prefix}${body}`.trim()];
  }

  const paragraphs = body.split(/\n{2,}/).filter((p) => p.trim());
  const chunks: string[] = [];
  let current = headingPath ? `# ${headingPath}\n\n` : '';

  for (const paragraph of paragraphs) {
    const candidate = current ? `${current}\n\n${paragraph}` : paragraph;
    if (candidate.length > MAX_CHUNK_CHARS && current.trim()) {
      chunks.push(current.trim());
      const overlap = current.slice(-CHUNK_OVERLAP_CHARS);
      current = overlap ? `${overlap}\n\n${paragraph}` : paragraph;
    } else {
      current = candidate;
    }
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks;
}
