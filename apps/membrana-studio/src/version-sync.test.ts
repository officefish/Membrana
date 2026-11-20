/**
 * Версия сборки Студии видна в двух местах: подвал окна («сборка …», `apps/client/src/components/AppFooter.tsx`
 * читает `apps/client/package.json`) и рукопожатие WS (`app.getVersion()` → `apps/membrana-studio/package.json`,
 * `studio-<semver>`). Поднимать обе разом — иначе на приборе глаз видит одну версию, а кабинет другую (20.11).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const HERE = dirname(fileURLToPath(import.meta.url));
const versionOf = (rel: string): string => (JSON.parse(readFileSync(join(HERE, rel), 'utf8')) as { version: string }).version;

describe('версия сборки Студии', () => {
  it('package.json Студии и клиента несут одну версию', () => {
    const studio = versionOf('../package.json');
    expect(studio).toMatch(/^\d+\.\d+\.\d+$/);
    expect(versionOf('../../client/package.json')).toBe(studio);
  });
});
