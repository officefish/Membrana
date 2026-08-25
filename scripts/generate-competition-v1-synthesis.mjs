#!/usr/bin/env node
/**
 * Генерация COMPETITION_V1_DESIGN_SYNTHESIS.md через Anthropic или DeepSeek.
 * Usage: node scripts/generate-competition-v1-synthesis.mjs [--deepseek]
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { invokeProcedureLlm } from './lib/llm-procedure-ritual.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sprintDir = resolve(root, 'docs/competition-sprint/comp-mvp-packaging-2026-06-21');
const outPath = resolve(sprintDir, 'COMPETITION_V1_DESIGN_SYNTHESIS.md');
const useDeepSeek = process.argv.includes('--deepseek');

const sources = [
  'PREP_SYNTHESIS_SOURCE.md',
  'team-alpha/CONCEPT.md',
  'team-beta/CONCEPT.md',
  'team-gamma/CONCEPT.md',
  '../../actions/device-board/USERCASE_COMPETITION_LESSONS.md',
].map((p) => resolve(sprintDir, p));

const prompt = readFileSync(resolve(sprintDir, 'PREP_SYNTHESIS_PROMPT.txt'), 'utf8');
const blocks = sources
  .filter((p) => existsSync(p))
  .map((p) => `### ${p}\n\n${readFileSync(p, 'utf8').slice(0, 60_000)}`);

const userContent = `${blocks.join('\n\n---\n\n')}\n\n---\n\n${prompt}`;
const system =
  'Ты технический писатель Membrana. Пиши по-русски, структурированный markdown, без пафоса.';

let answer;
if (useDeepSeek) {
  // Зуб #2147/№4 (llm-panel-wire): провайдера решает панельная цепочка, флаг оставлен
  // для совместимости вызовов и больше ничего не выбирает.
  console.error('[warn] --deepseek устарел: провайдера решает панель (llm-procedure overlay)');
}
{
  const r = await invokeProcedureLlm({
    procedureId: 'competition-synthesis',
    prompt: `${system}

${userContent}`,
    maxTokens: 8192,
  });
  if (!r.ok) {
    console.error(`[fail] LLM-канал синтеза исчерпан по всей цепочке: ${r.error || (r.status ? `HTTP ${r.status}` : 'нет ответа')}`);
    process.exit(1);
  }
  answer = r.text;
  if (!answer?.trim()) {
    console.error('LLM: пустой ответ');
    process.exit(1);
  }
}
const header = `> **Generated:** ${new Date().toISOString().slice(0, 10)} · provider: llm-panel · sprint \`comp-mvp-packaging-2026-06-21\`\n\n`;
writeFileSync(outPath, `${header}${answer.trim()}\n`, 'utf8');
console.error(`Wrote ${outPath}`);
