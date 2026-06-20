import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const CLIENT_ROOT = fileURLToPath(new URL('..', import.meta.url));

function readClientSource(relativePath: string): string {
  return readFileSync(join(CLIENT_ROOT, relativePath), 'utf8');
}

/**
 * MP4 / CRDC R2: media-library quota (server fetch) must run only after
 * MembranaRegistry.finalizeRegistration() on cold boot.
 *
 * @see apps/client/src/main.tsx bootstrap block
 * @see docs/prompts/CODE_REVIEW_DEBT_CLOSEOUT_JUN2026_EPIC_PROMPT.md (D1)
 */
describe('client bootstrap order (MembraneRegistry before quota)', () => {
  it('main.tsx calls registerClientModules before initMediaLibraryHubBridge', () => {
    const main = readClientSource('src/main.tsx');
    const registerIdx = main.indexOf('registerClientModules()');
    const mediaBridgeIdx = main.indexOf('initMediaLibraryHubBridge()');

    expect(registerIdx).toBeGreaterThanOrEqual(0);
    expect(mediaBridgeIdx).toBeGreaterThan(registerIdx);
  });

  it('registerClientModules finalizes MembranaRegistry before returning', () => {
    const source = readClientSource('src/modules/registerClientModules.ts');
    const finalizeIdx = source.indexOf('MembranaRegistry.finalizeRegistration()');
    const fnStart = source.indexOf('export function registerClientModules');
    const fnBody = source.slice(fnStart);

    expect(finalizeIdx).toBeGreaterThan(fnStart);
    expect(fnBody.lastIndexOf('finalizeRegistration')).toBe(
      fnBody.indexOf('finalizeRegistration'),
    );
  });

  it('initMediaLibraryHubBridge starts quota configure on install', () => {
    const bridge = readFileSync(join(CLIENT_ROOT, 'src/lib/mediaLibraryHubBridge.ts'), 'utf8');
    const initStart = bridge.indexOf('export function initMediaLibraryHubBridge');
    const initBody = bridge.slice(initStart);
    expect(initBody).toContain('reconfigureMediaLibraryFromConnection');
  });
});
