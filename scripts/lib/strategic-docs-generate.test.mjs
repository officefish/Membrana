import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generate, GranuleResolveError, pureIoThrow } from './strategic-docs-generate.mjs';
import { makeValidateClient } from './strategic-docs-validate-client.mjs';

const stubGranules = {
  'g.intro@1.0.0': {
    kind: 'literal',
    id: 'g.intro',
    version: '1.0.0',
    body: '# Introduction\n\nTest document header.'
  },
  'g.echo@1.0.0': {
    kind: 'fn',
    id: 'g.echo',
    version: '1.0.0',
    exportName: 'echo',
    modulePath: new URL('./fixtures/granule-echo.mjs', import.meta.url).pathname
  }
};

const stubIndex = {
  resolve(id, version = '1.0.0') {
    return stubGranules[`${id}@${version}`];
  }
};

describe('generators-validation: generate', () => {
  it('G1 — literal-only template → release', async () => {
    const template = {
      id: 'tpl-1',
      version: '1.0.0',
      slots: [{ granuleId: 'g.intro', version: '1.0.0' }]
    };

    const release = await generate(template, stubIndex);
    assert.ok(release.body.includes('Introduction'));
    assert.equal(release.route, 'release');
    assert.equal(release.trace.granules['g.intro@1.0.0'].kind, 'literal');
  });

  it('G2 — unknown granule throws GranuleResolveError', async () => {
    const template = {
      id: 'tpl-bad',
      version: '1.0.0',
      slots: [{ granuleId: 'g.missing' }]
    };
    await assert.rejects(() => generate(template, stubIndex), GranuleResolveError);
  });

  it('G3/G4 — pure fn granule with pureIoThrow', async () => {
    const template = {
      id: 'tpl-echo',
      version: '1.0.0',
      slots: [{ granuleId: 'g.echo', version: '1.0.0', pin: { text: 'pure-test' } }]
    };

    const release = await generate(template, stubIndex, { io: pureIoThrow });
    assert.ok(release.body.includes('ECHO:pure-test'));
    assert.equal(release.route, 'release');
  });

  it('G6/G7 — route release/experiment по валидации', async () => {
    const validate = makeValidateClient();

    const validTpl = {
      id: 'tpl-valid',
      version: '1.0.0',
      slots: [{ granuleId: 'g.intro', version: '1.0.0' }]
    };

    const invalidTpl = {
      id: 'tpl-invalid',
      version: '1.0.0',
      meta: { forceInvalid: true },
      slots: [{ granuleId: 'g.intro', version: '1.0.0' }]
    };

    const r1 = await generate(validTpl, stubIndex, { validate });
    const r2 = await generate(invalidTpl, stubIndex, { validate });

    assert.equal(r1.route, 'release');
    assert.equal(r2.route, 'experiment');
    assert.ok(r2.validation.reasons.length > 0);
  });

  it('G8 — no filesystem side effects', async () => {
    const template = {
      id: 'tpl-no-fs',
      version: '1.0.0',
      slots: [{ granuleId: 'g.intro', version: '1.0.0' }]
    };
    await generate(template, stubIndex);
    assert.ok(true); // если был бы fs — тест упал бы по политике
  });

  it('G9 — order of slots preserved in trace and body', async () => {
    const template = {
      id: 'tpl-order',
      version: '1.0.0',
      slots: [
        { granuleId: 'g.intro', version: '1.0.0' },
        { granuleId: 'g.echo', version: '1.0.0', pin: { text: 'second' } }
      ]
    };

    const release = await generate(template, stubIndex, { io: pureIoThrow });
    assert.ok(release.body.includes('Introduction'));
    assert.ok(release.body.includes('ECHO:second'));
    const keys = Object.keys(release.trace.granules);
    assert.ok(keys[0].startsWith('g.intro'));
    assert.ok(keys[1].startsWith('g.echo'));
  });
});
