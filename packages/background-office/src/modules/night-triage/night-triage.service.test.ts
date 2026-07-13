import { describe, expect, it, vi } from 'vitest';

import type { AppConfig } from '../../config/env.schema';
import { NightTriageService } from './night-triage.service';

const REGISTRY = JSON.stringify({
  tasks: [
    { id: 'ghost-a', status: 'active', githubIssue: 47, createdAt: '2026-05-01' },
    { id: 'arch-sib', status: 'archived', githubIssue: 47 },
    { id: 'orphan-b', status: 'active', githubIssue: null, linearId: null, createdAt: '2026-05-01' },
  ],
});

function makeService(over: {
  enabled?: boolean;
  registry?: string | null;
  llm?: boolean;
  chat?: () => Promise<string>;
  deepseekConfigured?: boolean;
  deepseekChat?: () => Promise<string>;
  createPR?: ReturnType<typeof vi.fn>;
}) {
  const config = {
    NIGHT_TRIAGE_ENABLED: over.enabled ?? true,
    NIGHT_TRIAGE_BASE_BRANCH: 'main',
    NIGHT_TRIAGE_STALE_DAYS: '14',
    // ANTHROPIC_API_KEY присутствует только когда включён нарратив
    ANTHROPIC_API_KEY: over.llm ? 'sk-ant-test' : undefined,
  } as unknown as AppConfig;
  const createPR =
    over.createPR ??
    vi.fn(async () => ({ prUrl: 'https://gh/pr/1', branch: 'claude/night-triage-1', created: true }));
  const github = {
    fetchTextFile: vi.fn(async () => (over.registry === undefined ? REGISTRY : over.registry)),
    createPullRequestWithFile: createPR,
  } as never;
  const chatFn = over.chat ?? (async () => 'нарратив');
  const claudeAsk = vi.fn(async () => ({ text: await chatFn(), model: 'claude', stop_reason: 'end_turn' }));
  const claude = { askWithUserText: claudeAsk } as never;
  const deepseekChat = vi.fn(async () => (over.deepseekChat ? await over.deepseekChat() : 'ds-нарратив'));
  const deepseek = {
    isConfigured: vi.fn(() => over.deepseekConfigured ?? false),
    chat: deepseekChat,
  } as never;
  return { svc: new NightTriageService(config, github, claude, deepseek), createPR, claudeAsk, deepseekChat };
}

const NOW = new Date('2026-07-12T00:00:00Z');

describe('NightTriageService.run', () => {
  it('disabled → skipped, PR не создаётся', async () => {
    const { svc, createPR } = makeService({ enabled: false });
    const r = await svc.run(NOW);
    expect(r.skipped).toBe(true);
    expect(createPR).not.toHaveBeenCalled();
  });

  it('enabled → draft PR с корректными опциями + counts', async () => {
    const { svc, createPR } = makeService({});
    const r = await svc.run(NOW);
    expect(r.ok).toBe(true);
    expect(r.prUrl).toBe('https://gh/pr/1');
    expect(r.counts).toEqual({ ghost: 1, orphan: 1, stale: 2 });
    const opts = createPR.mock.calls[0][0];
    expect(opts).toMatchObject({
      draft: true,
      dedupLabel: 'night-triage',
      baseBranch: 'main',
      branchPrefix: 'claude/night-triage',
      filePath: 'docs/reports/night-triage/NIGHT_TRIAGE_2026-07-12.md',
    });
    expect(opts.content).toContain('# Night Triage 2026-07-12');
    expect(opts.content).toContain('## Ghost (1)');
  });

  it('LLM сконфигурирован → нарратив вставлен с меткой канала claude, deepseek не вызывается', async () => {
    const { svc, createPR, deepseekChat } = makeService({
      llm: true,
      deepseekConfigured: true,
      chat: vi.fn(async () => 'Долг сосредоточен в orphan.'),
    });
    await svc.run(NOW);
    expect(createPR.mock.calls[0][0].content).toContain('## Обзор (LLM-нарратив)');
    expect(createPR.mock.calls[0][0].content).toContain('Долг сосредоточен в orphan.');
    expect(createPR.mock.calls[0][0].content).toContain('(канал: claude)');
    expect(deepseekChat).not.toHaveBeenCalled();
  });

  it('claude падает + deepseek сконфигурирован → нарратив с меткой deepseek (ADR 0005)', async () => {
    const chat = vi.fn(async () => {
      throw new Error('claude down');
    });
    const { svc, createPR } = makeService({
      llm: true,
      chat,
      deepseekConfigured: true,
      deepseekChat: async () => 'Fallback-обзор от DeepSeek.',
    });
    const r = await svc.run(NOW);
    expect(r.ok).toBe(true);
    expect(createPR.mock.calls[0][0].content).toContain('Fallback-обзор от DeepSeek.');
    expect(createPR.mock.calls[0][0].content).toContain('(канал: deepseek)');
  });

  it('оба канала падают → graceful, отчёт всё равно с таблицами', async () => {
    const boom = async (): Promise<string> => {
      throw new Error('llm down');
    };
    const { svc, createPR } = makeService({ llm: true, chat: boom, deepseekConfigured: true, deepseekChat: boom });
    const r = await svc.run(NOW);
    expect(r.ok).toBe(true);
    expect(createPR.mock.calls[0][0].content).not.toContain('## Обзор (LLM-нарратив)');
    expect(createPR.mock.calls[0][0].content).toContain('## Ghost (1)');
  });

  it('claude без ключа + deepseek сконфигурирован → нарратив сразу от deepseek', async () => {
    const { svc, createPR, claudeAsk } = makeService({
      llm: false,
      deepseekConfigured: true,
      deepseekChat: async () => 'Обзор от DeepSeek без Claude.',
    });
    await svc.run(NOW);
    expect(claudeAsk).not.toHaveBeenCalled();
    expect(createPR.mock.calls[0][0].content).toContain('(канал: deepseek)');
  });

  it('секрет в отчёте → блок, PR не создаётся', async () => {
    const { svc, createPR } = makeService({
      llm: true,
      chat: vi.fn(async () => 'ключ ghp_abcdefghijklmnopqrstuvwxyz0123 утёк'),
    });
    const r = await svc.run(NOW);
    expect(r.ok).toBe(false);
    expect(r.reason).toContain('секрет-гейт');
    expect(createPR).not.toHaveBeenCalled();
  });

  it('registry недоступен → skipped', async () => {
    const { svc, createPR } = makeService({ registry: null });
    const r = await svc.run(NOW);
    expect(r.skipped).toBe(true);
    expect(createPR).not.toHaveBeenCalled();
  });
});
