import { describe, expect, it, vi } from 'vitest';

import type { AppConfig } from '../../config/env.schema';
import { NightTriageService, REPORT_DIR } from './night-triage.service';

const REGISTRY = JSON.stringify({
  tasks: [
    { id: 'ghost-a', status: 'active', githubIssue: 47, createdAt: '2026-05-01' },
    { id: 'arch-sib', status: 'archived', githubIssue: 47 },
    { id: 'orphan-b', status: 'active', githubIssue: null, linearId: null, createdAt: '2026-05-01' },
  ],
});

type RecentPr = { number: number; title: string; state: string; merged: boolean; closedAt: string | null };

function makeService(over: {
  enabled?: boolean;
  registry?: string | null;
  llm?: boolean;
  chat?: () => Promise<string>;
  deepseekConfigured?: boolean;
  deepseekChat?: () => Promise<string>;
  createPR?: ReturnType<typeof vi.fn>;
  cooldownNights?: string;
  /** История PR механизма; по умолчанию пусто — свежий механизм обязан публиковать. */
  recentPrs?: RecentPr[];
  /** Файлы каталога отчётов в стволе; `null` — каталога нет. */
  landedFiles?: string[] | null;
  /** Содержимое посаженного отчёта (для отпечатка). */
  landedReport?: string;
}) {
  const config = {
    NIGHT_TRIAGE_ENABLED: over.enabled ?? true,
    NIGHT_TRIAGE_BASE_BRANCH: 'main',
    NIGHT_TRIAGE_STALE_DAYS: '14',
    NIGHT_TRIAGE_REJECT_COOLDOWN_NIGHTS: over.cooldownNights,
    // ANTHROPIC_API_KEY присутствует только когда включён нарратив
    ANTHROPIC_API_KEY: over.llm ? 'sk-ant-test' : undefined,
  } as unknown as AppConfig;
  const createPR =
    over.createPR ??
    vi.fn(async () => ({ prUrl: 'https://gh/pr/1', branch: 'claude/night-triage-1', created: true }));
  const github = {
    fetchTextFile: vi.fn(async (path: string) => {
      if (path.startsWith(`${REPORT_DIR}/`)) return over.landedReport ?? null;
      return over.registry === undefined ? REGISTRY : over.registry;
    }),
    listDirectoryFiles: vi.fn(async () => over.landedFiles ?? null),
    listRecentPullRequestsByLabel: vi.fn(async () => over.recentPrs ?? []),
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

/**
 * Порог публикации — долг `#night-triage-yield-zero`.
 *
 * Вещдок: с 25.07 механизм открыл 13 PR за 13 ночей, ствол не получил ни одного отчёта
 * (последний посаженный — `NIGHT_TRIAGE_2026-07-24.md`); вердикт комнаты 29.07
 * `close_no_card` применили к артефактам, и механизм открыл ещё семь.
 */
describe('NightTriageService.run — порог публикации', () => {
  /** Отчёт с тем же составом, что даст срез на REGISTRY: собирается через сам рендер. */
  const landedSameAs = async () => {
    const { svc, createPR } = makeService({});
    await svc.run(NOW);
    return createPR.mock.calls[0][0].content as string;
  };

  it('состав не изменился с посаженного отчёта → молчит, PR не создаётся', async () => {
    const landedReport = await landedSameAs();
    const { svc, createPR } = makeService({
      landedFiles: ['NIGHT_TRIAGE_2026-07-11.md'],
      landedReport,
    });
    const r = await svc.run(NOW);
    expect(r.skipped).toBe(true);
    expect(r.reason).toContain('не изменился');
    expect(createPR).not.toHaveBeenCalled();
  });

  it('состав изменился → публикует', async () => {
    const landedReport = (await landedSameAs()).replace(/night-triage:fingerprint [0-9a-f]{64}/, `night-triage:fingerprint ${'a'.repeat(64)}`);
    const { svc, createPR } = makeService({
      landedFiles: ['NIGHT_TRIAGE_2026-07-11.md'],
      landedReport,
    });
    const r = await svc.run(NOW);
    expect(r.prUrl).toBe('https://gh/pr/1');
    expect(createPR).toHaveBeenCalled();
  });

  it('посаженного отчёта нет вовсе → публикует: «основания нет» ≠ «дельта нулевая»', async () => {
    const { svc, createPR } = makeService({ landedFiles: null });
    const r = await svc.run(NOW);
    expect(r.prUrl).toBe('https://gh/pr/1');
    expect(createPR).toHaveBeenCalled();
  });

  it('посаженный отчёт старее маркера (без отпечатка) → публикует, а не немеет', async () => {
    const { svc, createPR } = makeService({
      landedFiles: ['NIGHT_TRIAGE_2026-07-11.md'],
      landedReport: '# Night Triage 2026-07-11\n\nстарый отчёт без маркера\n',
    });
    const r = await svc.run(NOW);
    expect(createPR).toHaveBeenCalled();
    expect(r.prUrl).toBe('https://gh/pr/1');
  });

  it('предыдущий PR закрыт без мерджа → карантин, PR не создаётся и LLM не жжётся', async () => {
    const { svc, createPR, claudeAsk } = makeService({
      llm: true,
      recentPrs: [{ number: 1720, title: 'Night triage', state: 'closed', merged: false, closedAt: '2026-07-10T00:00:00Z' }],
    });
    const r = await svc.run(NOW);
    expect(r.skipped).toBe(true);
    expect(r.reason).toContain('карантин');
    expect(r.reason).toContain('#1720');
    expect(createPR).not.toHaveBeenCalled();
    expect(claudeAsk).not.toHaveBeenCalled();
  });

  it('предыдущий PR влит → карантина нет, публикует', async () => {
    const { svc, createPR } = makeService({
      recentPrs: [{ number: 1152, title: 'Night triage', state: 'closed', merged: true, closedAt: '2026-07-10T00:00:00Z' }],
    });
    const r = await svc.run(NOW);
    expect(r.prUrl).toBe('https://gh/pr/1');
    expect(createPR).toHaveBeenCalled();
  });

  it('карантин истёк по времени → механизм размыкается сам, без ручного мерджа', async () => {
    const { svc, createPR } = makeService({
      recentPrs: [{ number: 1720, title: 'Night triage', state: 'closed', merged: false, closedAt: '2026-07-01T00:00:00Z' }],
    });
    const r = await svc.run(NOW); // 11 ночей спустя при карантине 7
    expect(createPR).toHaveBeenCalled();
    expect(r.prUrl).toBe('https://gh/pr/1');
  });

  it('карантин 0 снимает заслонку явно', async () => {
    const { svc, createPR } = makeService({
      cooldownNights: '0',
      recentPrs: [{ number: 1720, title: 'Night triage', state: 'closed', merged: false, closedAt: '2026-07-11T00:00:00Z' }],
    });
    await svc.run(NOW);
    expect(createPR).toHaveBeenCalled();
  });

  it('открытый PR карантина не заводит — это дело дедупа', async () => {
    const { svc, createPR } = makeService({
      recentPrs: [{ number: 1760, title: 'Night triage', state: 'open', merged: false, closedAt: null }],
    });
    await svc.run(NOW);
    expect(createPR).toHaveBeenCalled();
  });
});
