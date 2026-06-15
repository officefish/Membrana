import { describe, expect, it } from 'vitest';

import { LruCache } from './lru-cache';

describe('LruCache', () => {
  it('evicts oldest entry when max size exceeded', () => {
    const cache = new LruCache<string, number>(2);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBe(2);
    expect(cache.get('c')).toBe(3);
  });

  it('get refresifies entry (LRU order)', () => {
    const cache = new LruCache<string, number>(2);
    cache.set('a', 1);
    cache.set('b', 2);
    expect(cache.get('a')).toBe(1);
    cache.set('c', 3);
    expect(cache.get('b')).toBeUndefined();
    expect(cache.get('a')).toBe(1);
  });

  it('set updates existing key without growing size', () => {
    const cache = new LruCache<string, number>(2);
    cache.set('a', 1);
    cache.set('a', 9);
    expect(cache.size).toBe(1);
    expect(cache.get('a')).toBe(9);
  });
});
