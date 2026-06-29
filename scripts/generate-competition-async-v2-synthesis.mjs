#!/usr/bin/env node
/**
 * Генерация COMPETITION_ASYNC_V2_DESIGN_SYNTHESIS.md через Anthropic или DeepSeek.
 * Usage: yarn competition:synthesis-async-v2 [--deepseek]
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  loadDotEnv as loadAnthropicEnv,
  anthropicPost,
  getAnthropicKey,
  defaultModel,
  printAnthropicHttpError,
} from './_anthropic-env.mjs';
import {
  deepseekChat,
  loadDotEnv as loadDeepSeekEnv,
  extractChatCompletionText,
  printDeepSeekHttpError,
  defaultDeepSeekModel,
} from './_deepseek-env.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sprintDir = resolve(root, 'docs/competition-sprint/comp-mvp-async-v2-2026-06-25');
const v1Synthesis = resolve(
  root,
  'docs/competition-sprint/comp-mvp-packaging-2026-06-21/COMPETITION_V1_DESIGN_SYNTHESIS.md',
);
const outPath = resolve(sprintDir, 'COMPETITION_ASYNC_V2_DESIGN_SYNTHESIS.md');
const useDeepSeek = process.argv.includes('--deepseek');

const sources = [
  'COMPETITION_SPRINT_BRIEF.md',
  'team-alpha/CONCEPT.md',
  'team-beta/CONCEPT.md',
  'team-gamma/CONCEPT.md',
  'WINNER.md',
  'SCORECARD.md',
  '../../discussions/competition-sprint-comp-mvp-async-v2-2026-06-25-consilium.md',
].map((p) => resolve(sprintDir, p));

const prompt = readFileSync(resolve(sprintDir, 'PREP_SYNTHESIS_PROMPT.txt'), 'utf8');
const blocks = [
  ...(existsSync(v1Synthesis)
    ? [`### v1 synthesis\n\n${readFileSync(v1Synthesis, 'utf8').slice(0, 40_000)}`]
    : []),
  ...sources
    .filter((p) => existsSync(p))
    .map((p) => `### ${p}\n\n${readFileSync(p, 'utf8').slice(0, 50_000)}`),
];

const userContent = `${blocks.join('\n\n---\n\n')}\n\n---\n\n${prompt}`;
const system =
  'Ты технический писатель Membrana. Пиши по-русски, структурированный markdown, без пафоса.';

let answer;
if (useDeepSeek) {
  loadDeepSeekEnv();
  const { ok, status, text } = await deepseekChat({
    model: defaultDeepSeekModel(),
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: userContent },
    ],
    temperature: 0.4,
    max_tokens: 8192,
  });
  if (!ok) {
    printDeepSeekHttpError(status, text);
    process.exit(1);
  }
  answer = extractChatCompletionText(text);
} else {
  loadAnthropicEnv();
  const key = getAnthropicKey();
  const { ok, status, text } = await anthropicPost('https://api.anthropic.com/v1/messages', {
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    bodyJson: {
      model: defaultModel(),
      max_tokens: 8192,
      system,
      messages: [{ role: 'user', content: userContent }],
    },
  });
  if (!ok) {
    printAnthropicHttpError(status, text);
    process.exit(1);
  }
  const parsed = JSON.parse(text);
  answer = parsed.content?.find((c) => c.type === 'text')?.text;
  if (!answer) {
    console.error('Anthropic: пустой ответ');
    process.exit(1);
  }
}

const header = `> **Generated:** ${new Date().toISOString().slice(0, 10)} · provider: ${useDeepSeek ? 'DeepSeek' : 'Anthropic'} · sprint \`comp-mvp-async-v2-2026-06-25\`\n\n`;
writeFileSync(outPath, `${header}${answer.trim()}\n`, 'utf8');
console.error(`Wrote ${outPath}`);
