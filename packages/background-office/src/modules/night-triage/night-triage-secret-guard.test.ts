import { describe, expect, it } from 'vitest';

import { findSecrets } from './night-triage-secret-guard';

describe('findSecrets', () => {
  it('чистый отчёт → нет находок', () => {
    expect(findSecrets('# Night Triage 2026-07-12\n\nghost 9 · orphan 111\n| `vdr` | #47 |')).toEqual([]);
  });

  it('issue-ссылки github.com НЕ триггерят basic-auth-url', () => {
    expect(findSecrets('[#47](https://github.com/officefish/Membrana/issues/47)')).toEqual([]);
  });

  it('подсаженный anthropic-ключ → блок', () => {
    expect(findSecrets('token=sk-ant-abcdef0123456789xyz')).toContain('anthropic-key');
  });

  it('github-токен и PEM → блок', () => {
    expect(findSecrets('ghp_abcdefghijklmnopqrstuvwxyz0123')).toContain('github-token');
    expect(findSecrets('-----BEGIN RSA PRIVATE KEY-----')).toContain('private-key-pem');
  });
});
