import { describe, expect, it } from 'vitest';

import { splitMarkdown } from './markdown-splitter.js';

describe('splitMarkdown', () => {
  it('splits by headings and preserves heading path', () => {
    const md = `# Root

## Section A

Paragraph one.

## Section B

Paragraph two.
`;
    const chunks = splitMarkdown(md);
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks.some((chunk) => chunk.headingPath.includes('Section A'))).toBe(true);
  });

  it('returns single chunk for small docs', () => {
    const chunks = splitMarkdown('Hello world');
    expect(chunks).toHaveLength(1);
    expect(chunks[0]?.text).toContain('Hello world');
  });
});
