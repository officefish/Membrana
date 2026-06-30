#!/usr/bin/env node
/**
 * Membrana Insight CLI — strategic idea capture.
 *
 * yarn insight help
 * yarn insight create my-idea --title "…"
 * yarn insight research insight-my-idea
 * yarn insight review insight-my-idea
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  anthropicPost,
  defaultModel,
  getAnthropicKey,
  loadDotEnv,
  printAnthropicHttpError,
} from './_anthropic-env.mjs';
import {
  REVIEW_PROMPT_PATH,
  VIRTUAL_TEAM_PATH,
  createInsight,
  formatInsightList,
  insightDir,
  normalizeInsightId,
  parseInsightCli,
  printInsightHelp,
  readRegistry,
  runInsightResearch,
  writeRegistry,
} from './lib/insight-ritual.mjs';

loadDotEnv();

const cli = parseInsightCli(process.argv.slice(2));
const repoRoot = process.cwd();

if (cli.command === 'help') {
  printInsightHelp();
  process.exit(0);
}

try {
  if (cli.command === 'create') {
    if (!cli.id || !cli.title) {
      console.error('Usage: yarn insight create <slug> --title "…"');
      process.exit(1);
    }
    const { id, dir } = createInsight(repoRoot, {
      id: cli.id,
      title: cli.title,
      source: cli.source,
    });
    console.log(`Создан инсайт: ${id}`);
    console.log(dir);
    process.exit(0);
  }

  if (cli.command === 'list') {
    console.log(formatInsightList(repoRoot, cli.statusFilter || undefined));
    process.exit(0);
  }

  if (cli.command === 'research') {
    if (!cli.id) {
      console.error('Usage: yarn insight research <id> [--dry-run]');
      process.exit(1);
    }
    const apiKey = process.env.PERPLEXITY_API_KEY?.trim() ?? '';
    const result = await runInsightResearch(repoRoot, cli.id, {
      apiKey: apiKey.startsWith('pplx-') ? apiKey : undefined,
      dryRun: cli.dryRun,
    });
    if (cli.dryRun) {
      console.log('Dry-run queries:');
      for (const q of result.queries) {
        console.log(`\n[${q.key}] ${q.label}\n${q.query}`);
      }
      console.log('\nКаскад: PERPLEXITY_API_KEY → Cursor MCP Perplexity → manual');
      process.exit(0);
    }
    console.log(`RESEARCH.md обновлён (mode: ${result.mode})`);
    if (result.mode !== 'perplexity-api') {
      console.log('Дополни выжимку через MCP Perplexity или вручную, затем yarn insight review');
    }
    process.exit(0);
  }

  if (cli.command === 'review') {
    if (!cli.id) {
      console.error('Usage: yarn insight review <id> [--dry-run]');
      process.exit(1);
    }
    const id = normalizeInsightId(cli.id);
    const dir = insightDir(repoRoot, id);
    const insightPath = join(dir, 'INSIGHT.md');
    const researchPath = join(dir, 'RESEARCH.md');
    if (!existsSync(insightPath)) {
      throw new Error(`Insight not found: ${id}`);
    }
    const insightMd = readFileSync(insightPath, 'utf8');
    const researchMd = existsSync(researchPath) ? readFileSync(researchPath, 'utf8') : '';
    const reviewPrompt = readFileSync(join(repoRoot, REVIEW_PROMPT_PATH), 'utf8');
    const virtualTeam = readFileSync(join(repoRoot, VIRTUAL_TEAM_PATH), 'utf8');
    const userMessage = [
      '# INSIGHT.md',
      insightMd,
      '',
      '# RESEARCH.md',
      researchMd,
      '',
      'Сформируй REVIEW.md по регламенту (5 ролей, таблица /10, резюме Teamlead).',
    ].join('\n');

    if (cli.dryRun) {
      console.log('--- system (truncated) ---');
      console.log(reviewPrompt.slice(0, 500));
      console.log('--- user (truncated) ---');
      console.log(userMessage.slice(0, 2000));
      process.exit(0);
    }

    const key = getAnthropicKey();
    const { ok, status, text: responseText } = await anthropicPost(
      'https://api.anthropic.com/v1/messages',
      {
        headers: {
          'content-type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
        },
        bodyJson: {
          model: defaultModel(),
          max_tokens: 8192,
          system: `${reviewPrompt}\n\n---\n\n${virtualTeam}`,
          messages: [{ role: 'user', content: userMessage }],
        },
      },
    );
    if (!ok) {
      printAnthropicHttpError(status, responseText);
      throw new Error(`Anthropic review failed with HTTP ${status}`);
    }
    const response = JSON.parse(responseText);
    const text = response.content?.find((block) => block.type === 'text')?.text ?? '';
    if (!text.trim()) {
      throw new Error('Empty review from Anthropic');
    }
    writeFileSync(join(dir, 'REVIEW.md'), `${text.trim()}\n`, 'utf8');

    const meta = JSON.parse(readFileSync(join(dir, 'meta.json'), 'utf8'));
    meta.status = 'reviewed';
    meta.reviewedAt = new Date().toISOString().slice(0, 10);
    const avgMatch = text.match(/\*\*Средний балл:\*\*\s*([\d.]+)/);
    if (avgMatch) {
      meta.weight = Number(avgMatch[1]);
    }
    writeFileSync(join(dir, 'meta.json'), `${JSON.stringify(meta, null, 2)}\n`, 'utf8');

    const registry = readRegistry(repoRoot);
    const entry = registry.insights.find((item) => item.id === id);
    if (entry) {
      entry.status = 'reviewed';
      if (meta.weight !== undefined) {
        entry.weight = meta.weight;
      }
    }
    writeRegistry(repoRoot, registry);
    console.log(`REVIEW.md записан: ${join(dir, 'REVIEW.md')}`);
    // Give undici's dispatcher a tick to finish closing on Windows before forcing exit.
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 150));
    process.exit(0);
  }

  if (cli.command === 'close') {
    if (!cli.id || !cli.status) {
      console.error('Usage: yarn insight close <id> --status adopted|deferred|rejected [--weight N]');
      process.exit(1);
    }
    const allowed = new Set(['adopted', 'deferred', 'rejected']);
    if (!allowed.has(cli.status)) {
      throw new Error(`Invalid status: ${cli.status}`);
    }
    const id = normalizeInsightId(cli.id);
    const dir = insightDir(repoRoot, id);
    const metaPath = join(dir, 'meta.json');
    if (!existsSync(metaPath)) {
      throw new Error(`Insight not found: ${id}`);
    }
    const meta = JSON.parse(readFileSync(metaPath, 'utf8'));
    meta.status = cli.status;
    meta.closedAt = new Date().toISOString().slice(0, 10);
    if (cli.weight !== null && Number.isFinite(cli.weight)) {
      meta.weight = cli.weight;
    }
    writeFileSync(metaPath, `${JSON.stringify(meta, null, 2)}\n`, 'utf8');
    const registry = readRegistry(repoRoot);
    const entry = registry.insights.find((item) => item.id === id);
    if (entry) {
      entry.status = cli.status;
      if (meta.weight !== null) {
        entry.weight = meta.weight;
      }
    }
    writeRegistry(repoRoot, registry);
    console.log(`Инсайт ${id} → ${cli.status}`);
    process.exit(0);
  }

  console.error(`Unknown command: ${cli.command}`);
  printInsightHelp();
  process.exit(1);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
