import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateViaOffice, makeValidateClient, stubOfficeValidateHandler } from './strategic-docs-validate-client.mjs';
import { generate } from './strategic-docs-generate.mjs';

describe('generators-validation: validate client', () => {
  it('V1 — valid payload through stub', async () => {
    const req = {
      templateId: 't1',
      templateVersion: '1.0',
      templateSnapshot: { id: 't1', slots: [{ granuleId: 'g1' }] },
      draft: { body: '# Test\n---\nContent', trace: {} }
    };

    const res = await validateViaOffice(req);
    assert.equal(res.ok, true);
    assert.deepEqual(res.reasons, []);
  });

  it('V2 — forceInvalid returns ok:false', async () => {
    const req = {
      templateId: 't2',
      templateVersion: '1.0',
      templateSnapshot: {
        id: 't2',
        meta: { forceInvalid: true },
        slots: [{ granuleId: 'g1' }]
      },
      draft: { body: '# Test\n---\nContent', trace: {} }
    };

    const res = await validateViaOffice(req);
    assert.equal(res.ok, false);
    assert.ok(res.reasons.includes('forceInvalid'));
  });

  it('V3 — transport error on non-2xx', async () => {
    const badFetch = async () => ({ ok: false, status: 500 });
    await assert.rejects(
      () => validateViaOffice({}, { fetchImpl: badFetch }),
      /ValidationTransportError/
    );
  });

  it('V5 — integration: makeValidateClient + generate', async () => {
    const validateClient = makeValidateClient();

    const template = {
      id: 'tpl-int',
      version: '1.0.0',
      slots: [{ granuleId: 'g.intro', version: '1.0.0' }]
    };

    const index = {
      resolve: () => ({
        kind: 'literal',
        id: 'g.intro',
        version: '1.0.0',
        body: '# Intro\n---\nBody'
      })
    };

    const release = await generate(template, index, { validate: validateClient });
    assert.equal(release.route, 'release');
  });

  it('stubOfficeValidateHandler works directly', () => {
    const valid = stubOfficeValidateHandler({
      templateSnapshot: { slots: [1] },
      draft: { body: '---' }
    });
    assert.equal(valid.ok, true);

    const invalid = stubOfficeValidateHandler({
      templateSnapshot: { meta: { forceInvalid: true }, slots: [1] },
      draft: { body: '---' }
    });
    assert.equal(invalid.ok, false);
  });
});
