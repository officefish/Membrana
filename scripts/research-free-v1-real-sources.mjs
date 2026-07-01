#!/usr/bin/env node
/** Real-source discovery for fv1-S2. Owner: Kuryokhin. */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { loadDotEnv } from './_anthropic-env.mjs';
import { perplexityAsk } from './lib/insight-ritual.mjs';

loadDotEnv();

const apiKey = process.env.PERPLEXITY_API_KEY?.trim();
if (!apiKey?.startsWith('pplx-')) {
  throw new Error('PERPLEXITY_API_KEY is required');
}

const shared = `
We are building an open, reproducible environmental-audio benchmark. Only recommend
datasets or individual files that permit redistribution under CC0, CC BY, or public
domain. Exclude CC BY-NC, research-only, custom non-commercial terms, unclear
licenses, login-only pages, and sources without stable programmatic download.
For every candidate provide: exact dataset name, exact license, primary license URL,
direct download/API URL, audio format, sample count, and which requested class it
actually contains. Do not infer a license from the hosting website. Prefer official
dataset pages, repositories, Zenodo/Hugging Face records, and per-file manifests.
`;

const queries = [
  {
    key: 'critical-classes',
    prompt: `${shared}\nFind real recordings for these classes: quiet ambient/silence (20), actual human speech (22), and firearm gunshots (19). The recordings must be downloadable automatically and redistributable in this repository. Distinguish gunshots from fireworks and thunder, and actual speech from cough/laughter/non-speech vocals.`,
  },
  {
    key: 'supporting-classes',
    prompt: `${shared}\nFind real recordings for wind (22), birdsong (22), and continuous machine hum (25: generators, HVAC, idling engines). Avoid rain as wind, generic animal noise as birdsong, and horns/sirens as machine hum.`,
  },
  {
    key: 'license-audit',
    prompt: `${shared}\nAudit likely useful sources including Mozilla Common Voice, LibriSpeech/OpenSLR, FSD50K, AudioSet, Freesound, ESC-10/ESC-50, UrbanSound8K, BBC SFX, and public-domain government firearm recordings. State whether raw audio redistribution in a Git repository is actually allowed and identify the safest automatable sources for each of the six classes.`,
  },
];

const sections = [];
for (const query of queries) {
  console.log(`[perplexity] ${query.key}`);
  const answer = await perplexityAsk(apiKey, query.prompt);
  sections.push(`## ${query.key}\n\n${answer}`);
}

const outDir = join(process.cwd(), 'docs', 'datasets', 'free-v1');
await mkdir(outDir, { recursive: true });
const output = [
  '# Real-source research for free-v1 S2',
  '',
  '**Owner:** Kuryokhin  ',
  '**Provider:** Perplexity Sonar  ',
  '**Policy:** CC0 / CC BY / public domain; primary-source verification required before import.',
  '',
  ...sections,
  '',
].join('\n');
await writeFile(join(outDir, 'REAL_SOURCE_RESEARCH.md'), output, 'utf8');
console.log('Wrote docs/datasets/free-v1/REAL_SOURCE_RESEARCH.md');
