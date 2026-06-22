import { MAX_CHUNK_CHARS } from './token-estimate.js';

export interface CodeSignatureChunk {
  text: string;
  chunkIndex: number;
}

/**
 * Collect export lines/blocks with optional preceding JSDoc from TypeScript sources.
 */
export function extractCodeSignatures(source: string, relativePath: string): CodeSignatureChunk[] {
  if (relativePath.includes('.test.') || relativePath.includes('.generated.')) {
    return [];
  }

  const lines = source.split('\n');
  const blocks: string[] = [];
  let pendingJsDoc: string[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? '';
    const trimmed = line.trim();

    if (trimmed.startsWith('/**')) {
      pendingJsDoc = [line];
      while (i + 1 < lines.length) {
        i += 1;
        const docLine = lines[i] ?? '';
        pendingJsDoc.push(docLine);
        if (docLine.trim().includes('*/')) {
          break;
        }
      }
      continue;
    }

    if (!trimmed.startsWith('export ')) {
      if (!trimmed.startsWith('*') && !trimmed.startsWith('//')) {
        pendingJsDoc = [];
      }
      continue;
    }

    const blockLines = [...pendingJsDoc, line];
    pendingJsDoc = [];

    while (i + 1 < lines.length) {
      const next = lines[i + 1]?.trim() ?? '';
      if (next.startsWith('export ') || next.startsWith('/**')) {
        break;
      }
      if (next === '}' || next.startsWith('}')) {
        i += 1;
        blockLines.push(lines[i] ?? '');
        break;
      }
      if (blockLines.join('\n').length > 800) {
        break;
      }
      i += 1;
      blockLines.push(lines[i] ?? '');
    }

    blocks.push(blockLines.join('\n').trim());
  }

  if (blocks.length === 0) {
    return [];
  }

  const header = `// ${relativePath}\n`;
  const chunks: CodeSignatureChunk[] = [];
  let batch = header;
  let index = 0;

  for (const block of blocks) {
    const piece = `${block}\n`;
    if (batch.length + piece.length > MAX_CHUNK_CHARS && batch.trim().length > header.length) {
      chunks.push({ text: batch.trim(), chunkIndex: index });
      index += 1;
      batch = `${header}${piece}`;
    } else {
      batch += piece;
    }
  }

  if (batch.trim().length > header.length) {
    chunks.push({ text: batch.trim(), chunkIndex: index });
  }

  return chunks;
}
