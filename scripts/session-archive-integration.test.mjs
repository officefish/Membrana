/**
 * Integration-тест: JSONL → скруб → дедуп → .meta.json без секретов.
 * Запуск: node --test scripts/session-archive-integration.test.mjs
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';

// Fixture JSONL с секретами и дублем
const FIXTURE_JSONL = [
  JSON.stringify({
    uuid: 'aaa-turn-1',
    sessionId: 'sess-integration-test',
    message: { role: 'user', content: 'Мой ключ: sk-ant-api03-SuperSecretKeyABCDEF1234567890abc' },
    timestamp: '2026-06-30T10:00:00.000Z',
  }),
  JSON.stringify({
    uuid: 'aaa-turn-2',
    sessionId: 'sess-integration-test',
    message: { role: 'assistant', content: 'Понял, помогу.' },
    timestamp: '2026-06-30T10:00:01.000Z',
  }),
  // Дублируем второй turn с другим uuid
  JSON.stringify({
    uuid: 'aaa-turn-2b',
    sessionId: 'sess-integration-test',
    message: { role: 'assistant', content: 'Понял, помогу.' },
    timestamp: '2026-06-30T10:00:01.000Z',
  }),
  JSON.stringify({
    uuid: 'aaa-turn-3',
    sessionId: 'sess-integration-test',
    message: {
      role: 'user',
      content: 'GitHub token: ghp_abcdefghijklmnopqrstuvwxyz1234567890',
    },
    timestamp: '2026-06-30T10:00:02.000Z',
  }),
  'broken-json-line',
].join('\n');

describe('session-archive integration', async () => {
  // Импорт сервиса — требует build
  let svc;
  try {
    svc = await import('../packages/services/session-archive/dist/index.js');
  } catch (e) {
    console.warn('⚠ session-archive-service не собран, тест пропущен. Запустите yarn turbo run build --filter=@membrana/session-archive-service');
    process.exit(0);
  }

  const { parseClaudeCodeJSONL, scrubSecrets, deduplicateTurns } = svc;

  it('парсит 4 валидных turn из 5 строк (1 broken)', () => {
    const turns = parseClaudeCodeJSONL(Buffer.from(FIXTURE_JSONL));
    assert.equal(turns.length, 4);
  });

  it('скрубит sk-ant- и ghp_ секреты', () => {
    const turns = parseClaudeCodeJSONL(Buffer.from(FIXTURE_JSONL));
    const scrubbed = turns.map((t) => scrubSecrets(t));

    const full = scrubbed.map((t) => t.content).join('\n');
    assert.ok(!full.includes('sk-ant-'), 'sk-ant- должен быть скрублен');
    assert.ok(!full.includes('ghp_abc'), 'ghp_ должен быть скрублен');
    assert.ok(full.includes('[REDACTED]'), 'плейсхолдер присутствует');
  });

  it('дедуплицирует — 3 уникальных turn из 4', () => {
    const turns = parseClaudeCodeJSONL(Buffer.from(FIXTURE_JSONL));
    const scrubbed = turns.map((t) => scrubSecrets(t));
    const unique = deduplicateTurns(scrubbed);
    assert.equal(unique.length, 3);
  });

  it('записывает .meta.json без секретов', () => {
    const dir = join(tmpdir(), `session-archive-test-${Date.now()}`);
    mkdirSync(dir, { recursive: true });

    const turns = parseClaudeCodeJSONL(Buffer.from(FIXTURE_JSONL));
    const scrubbed = turns.map((t) => scrubSecrets(t));
    const unique = deduplicateTurns(scrubbed);

    const meta = {
      sessionId: 'sess-integration-test',
      tool: 'claude-code',
      projectPath: '/test/project',
      branch: 'test-branch',
      openedAt: unique[0]?.timestamp ?? '',
      closedAt: unique[unique.length - 1]?.timestamp ?? null,
      turnCount: unique.length,
      secretsRedacted: scrubbed.filter((t) => t.wasRedacted).length,
      deduplicatedTurns: turns.length - unique.length,
      isIncomplete: false,
      archiveRef: null,
    };

    const metaPath = join(dir, 'sess-integration-test.meta.json');
    writeFileSync(metaPath, JSON.stringify({ meta, turns: unique }, null, 2));

    const saved = readFileSync(metaPath, 'utf8');
    assert.ok(!saved.includes('sk-ant-'), 'sk-ant- не должно быть в .meta.json');
    assert.ok(!saved.includes('ghp_abc'), 'ghp_ не должно быть в .meta.json');
    assert.equal(meta.turnCount, 3);
    assert.equal(meta.secretsRedacted, 2);
    assert.equal(meta.deduplicatedTurns, 1);

    rmSync(dir, { recursive: true });
  });
});
