import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { scanFileContent, scanTargets } from '../scripts/check-secrets.mjs';

// Секрет собирается из частей, чтобы этот тест-файл сам не матчился при сканах.
const fakeSecret = ['api', '_key = "', 'S3cr3tV4lu', 'e9f8"'].join('');

describe('comms secret-scan (CC4)', () => {
  it('позитив — реальный контур (out/ + src/) без секретов', () => {
    expect(scanTargets()).toEqual([]);
  });

  it('негатив — назначенный секрет ловится в контенте', () => {
    const hits = scanFileContent(fakeSecret);
    expect(hits.map((h) => h.id)).toContain('assigned-secret');
  });

  it('негатив — приватный ключ и AWS-ключ ловятся', () => {
    expect(scanFileContent('-----BEGIN RSA PRIVATE KEY-----').length).toBe(1);
    expect(scanFileContent('AKIA' + 'ABCDEFGHIJKLMNOP').length).toBe(1);
  });

  it('негатив — подложенный секрет в out/ роняет скан (блокирующее условие)', () => {
    const base = mkdtempSync(join(tmpdir(), 'comms-secret-'));
    try {
      const outDir = join(base, 'out');
      mkdirSync(outDir, { recursive: true });
      writeFileSync(join(outDir, 'leak.md'), fakeSecret + '\n', 'utf8');
      const violations = scanTargets(base);
      expect(violations.length).toBe(1);
      expect(violations[0].id).toBe('assigned-secret');
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });

  it('позитив — приватный IP ловится, публичный/пример нет', () => {
    expect(scanFileContent('host = 10.1.2.3').length).toBe(1);
    expect(scanFileContent('пример адреса 8.8.8.8 в тексте').length).toBe(0);
  });
});
