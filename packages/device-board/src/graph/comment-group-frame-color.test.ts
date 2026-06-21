import { describe, expect, it } from 'vitest';

import {
  parseCommentGroupRgbInput,
  resolveCommentGroupFrameVisual,
} from './comment-group-frame-color.js';

describe('comment-group-frame-color', () => {
  it('parseCommentGroupRgbInput accepts hex and rgb()', () => {
    expect(parseCommentGroupRgbInput('#7C3AED')).toBe('#7c3aed');
    expect(parseCommentGroupRgbInput('#abc')).toBe('#aabbcc');
    expect(parseCommentGroupRgbInput('rgb(124, 58, 237)')).toBe('#7c3aed');
  });

  it('resolveCommentGroupFrameVisual uses tailwind for theme preset', () => {
    const visual = resolveCommentGroupFrameVisual({ preset: 'primary' });
    expect(visual.frameClassName).toContain('border-primary');
    expect(visual.frameStyle).toBeUndefined();
  });

  it('resolveCommentGroupFrameVisual uses inline styles for custom', () => {
    const visual = resolveCommentGroupFrameVisual({ preset: 'custom', rgb: '#ff0000' });
    expect(visual.frameStyle?.borderColor).toContain('255');
    expect(visual.headerStyle?.color).toBe('#ff0000');
  });
});
