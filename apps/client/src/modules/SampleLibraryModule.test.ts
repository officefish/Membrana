import { describe, expect, it } from 'vitest';
import type { MediaPluginState } from '@membrana/media-library-service';

import { enabledMediaPluginIdsFromHome } from './SampleLibraryModule';

const state = (id: string, enabled: boolean): MediaPluginState => ({
  manifest: {
    id,
    version: '0.1.0',
    kind: 'showcase',
    mountTarget: 'background-media/collections',
    triggers: ['collections.collection_created'],
  },
  enabled,
});

describe('SampleLibraryModule media plugin visibility', () => {
  it('uses enabled state from media home, not the page registry', () => {
    expect(enabledMediaPluginIdsFromHome([
      state('membrana.showcase.library-chart-list', false),
      state('membrana.showcase.library-duplicates', true),
      state('membrana.showcase.foreign', true),
    ])).toEqual(['membrana.showcase.library-duplicates']);
  });
});
