import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createRenderAdapter,
  resolveHomeMode,
  mergeSnapshots,
  renderRelease,
  fullSync,
  stubWithLink
} from './strategic-docs-render-adapter.mjs';

describe('engine-renderer / strategic-docs-render-adapter', () => {
  const baseSurface = {
    releaseId: 'rel-test-001',
    version: '0.1.0-test',
    title: 'Test Release',
    markdown: '# Test Release\n\nThis is a deterministic test.',
    meta: { pin: 'git:HEAD' }
  };

  it('resolveHomeMode: affine → live, others → stub', () => {
    assert.strictEqual(resolveHomeMode('affine'), 'live');
    assert.strictEqual(resolveHomeMode('notion'), 'stub');
    assert.strictEqual(resolveHomeMode('coda'), 'stub');
  });

  it('renderRelease: affine + up → rendered', async () => {
    const adapter = createRenderAdapter({
      selectedProvider: 'affine',
      stubs: { affineHealth: async () => 'up' }
    });

    const result = await adapter.renderRelease(baseSurface);
    assert.strictEqual(result.kind, 'rendered');
    assert.strictEqual(result.provider, 'affine');
    assert.ok(result.url.includes('affine.mmbrn.tech'));
    assert.ok(result.localPath.endsWith('.md'));
  });

  it('renderRelease: non-affine → home stub with link', async () => {
    const adapter = createRenderAdapter({ selectedProvider: 'notion' });
    const result = await adapter.renderRelease(baseSurface);

    assert.strictEqual(result.kind, 'stub');
    assert.strictEqual(result.provider, 'notion');
    assert.ok(result.url.includes('notion.so'));
    assert.ok(result.stubMessage.includes('NOTION'));
    assert.ok(result.stubMessage.includes('Локальный Affine-контур'));
  });

  it('renderRelease: affine down → degraded stub', async () => {
    const adapter = createRenderAdapter({
      selectedProvider: 'affine',
      stubs: { affineHealth: async () => 'down' }
    });

    const result = await adapter.renderRelease(baseSurface);
    assert.strictEqual(result.kind, 'stub');
    assert.ok(result.stubMessage.includes('degraded'));
  });

  it('fullSync: git wins on conflict', async () => {
    const providerStore = new Map([['release.md', '# Old provider content']]);

    const adapter = createRenderAdapter({
      selectedProvider: 'affine',
      stubs: {
        affineHealth: async () => 'up',
        providerStore
      }
    });

    const result = await adapter.fullSync(baseSurface);

    assert.strictEqual(result.status, 'ok');
    assert.strictEqual(result.pushed, 1);
    assert.strictEqual(result.conflicts.length, 1);
    assert.strictEqual(result.conflicts[0].winner, 'git');
    assert.strictEqual(providerStore.get('release.md'), baseSurface.markdown);
  });

  it('fullSync: push-only and pull-only', async () => {
    const providerStore = new Map([['draft.md', '# Provider only draft']]);

    const adapter = createRenderAdapter({
      selectedProvider: 'affine',
      stubs: { affineHealth: async () => 'up', providerStore }
    });

    const result = await adapter.fullSync(baseSurface);

    // git-only: release.md + .provider-selection.json (конфиг синкается в Phase 2-стабе;
    // должен ли конфиг ехать в провайдер — вопрос Интерфейс-консилиума, не блока).
    assert.strictEqual(result.pushed, 2);
    assert.strictEqual(result.pulled, 1);
    assert.strictEqual(result.conflicts.length, 0);
  });

  it('fullSync: provider down → degraded', async () => {
    const adapter = createRenderAdapter({
      selectedProvider: 'notion',
      stubs: { notionHealth: async () => 'down' }
    });

    const result = await adapter.fullSync(baseSurface);
    assert.strictEqual(result.status, 'degraded');
    assert.ok(result.degradedReason);
    assert.strictEqual(result.pushed, 0);
    assert.strictEqual(result.pulled, 0);
  });

  it('fullSync is idempotent', async () => {
    const adapter = createRenderAdapter({
      selectedProvider: 'affine',
      stubs: { affineHealth: async () => 'up' }
    });

    const r1 = await adapter.fullSync(baseSurface);
    const r2 = await adapter.fullSync(baseSurface);

    assert.strictEqual(r1.pushed + r1.pulled + r1.conflicts.length, 2);
    assert.strictEqual(r2.pushed + r2.pulled + r2.conflicts.length, 0);
  });

  it('stubWithLink contract', async () => {
    const result = await stubWithLink(baseSurface, { selectedProvider: 'coda' });
    assert.strictEqual(result.kind, 'stub');
    assert.strictEqual(result.provider, 'coda');
    assert.ok(result.url.includes('coda.io'));
    assert.ok(result.stubMessage.includes('CODA'));
  });

  it('status() returns consistent state', async () => {
    const adapter = createRenderAdapter({ selectedProvider: 'notion' });
    const status = await adapter.status();

    assert.strictEqual(status.provider, 'notion');
    assert.strictEqual(status.homeMode, 'stub');
    assert.ok(['up','down','auth-error'].includes(status.health));
  });

  it('throws TypeError on invalid surface', async () => {
    const adapter = createRenderAdapter({ selectedProvider: 'affine' });
    await assert.rejects(
      () => adapter.renderRelease({ releaseId: 'x' }),
      /TypeError.*markdown/
    );
  });

  it('smoke: renderRelease and fullSync are exported and work standalone', async () => {
    const r = await renderRelease(baseSurface, { selectedProvider: 'affine' });
    assert.strictEqual(r.kind, 'rendered');

    const s = await fullSync(baseSurface, { selectedProvider: 'affine' });
    assert.strictEqual(s.status, 'ok');
  });
});
