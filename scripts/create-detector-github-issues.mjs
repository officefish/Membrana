/**
 * Создаёт milestones и issues для Single-Node Detection First (#47).
 * Запуск: node scripts/create-detector-github-issues.mjs
 */
import { spawnSync } from 'node:child_process';

const PROMPT = 'docs/prompts/SINGLE_NODE_DETECTION_FIRST_PROMPT.md';

function gh(args) {
  const r = spawnSync('gh', args, { encoding: 'utf8', shell: true });
  if (r.status !== 0) {
    console.error('gh failed:', args.join(' '), r.stderr || r.stdout);
    return null;
  }
  return (r.stdout || '').trim();
}

function milestone(title, desc) {
  const existing = gh(['api', 'repos/{owner}/{repo}/milestones', '--jq', `.[] | select(.title=="${title}") | .number`]);
  if (existing) return Number(existing);
  const num = gh([
    'api',
    'repos/{owner}/{repo}/milestones',
    '-f',
    `title=${title}`,
    '-f',
    `description=${desc}`,
  ]);
  return num ? Number(num) : null;
}

function createIssue(title, body, milestoneNum, labels = ['wish']) {
  const args = ['issue', 'create', '--title', title, '--body', body, ...labels.flatMap((l) => ['--label', l])];
  if (milestoneNum) args.push('--milestone', String(milestoneNum));
  const url = gh(args);
  if (url) console.log('created:', url);
  return url;
}

const mStage1 = milestone(
  'Stage 1: Single-Node Detection',
  'Этапы 1.A/1.B — детекторы на одном узле до stage-gate. Промпт: SINGLE_NODE_DETECTION_FIRST.',
);
const mStage2 = milestone(
  'Stage 2 — Network',
  'TDOA, мультиузел — только после stage-gate 1→2.',
);

const body = (text) =>
  `${text}\n\nTask-промпт: \`${PROMPT}\`\nРодительская задача: #47\n`;

if (mStage1) {
  createIssue(
    'Implement harmonic-detector-service (1.A DSP)',
    body('Реализация @membrana/harmonic-detector-service. Эталон для остальных DSP.'),
    mStage1,
    ['wish', 'stage:1a'],
  );
  createIssue(
    'Implement cepstral-detector-service (1.A DSP)',
    body('Реализация @membrana/cepstral-detector-service.'),
    mStage1,
    ['wish', 'stage:1a'],
  );
  createIssue(
    'Implement spectral-flux-detector-service (1.A DSP)',
    body('Реализация @membrana/spectral-flux-detector-service.'),
    mStage1,
    ['wish', 'stage:1a'],
  );
  createIssue(
    'Implement yamnet-detector-service (1.B Neural)',
    body('Реализация @membrana/yamnet-detector-service. Blocked until 1.A baseline.'),
    mStage1,
    ['wish', 'stage:1b'],
  );
  createIssue(
    'Implement clap-detector-service (1.B Neural)',
    body('Реализация @membrana/clap-detector-service.'),
    mStage1,
    ['wish', 'stage:1b'],
  );
  createIssue(
    'Implement agentic-detector-service (1.B Agentic)',
    body('Реализация @membrana/agentic-detector-service.'),
    mStage1,
    ['wish', 'stage:1b'],
  );
  createIssue(
    'Stage-gate: benchmark protocol (DETECTOR_BENCHMARK)',
    body('Скрипт yarn benchmark:detectors и автогенерация docs/DETECTOR_BENCHMARK.md.'),
    mStage1,
    ['wish', 'task-type:infra'],
  );
  createIssue(
    'Stage-gate: dataset collection (DATASET)',
    body('Bootstrap датасета по docs/DATASET.md.'),
    mStage1,
    ['wish', 'task-type:infra'],
  );
  createIssue(
    'Stage-gate 1→2: formal review criteria',
    body('Precision ≥85%, recall ≥90%. STAGE_GATE_1_TO_2_REVIEW промпт.'),
    mStage1,
    ['wish', 'task-type:infra'],
  );
}

if (mStage2) {
  createIssue(
    'tdoa-service: resume after stage-gate',
    body('Разморозить @membrana/tdoa-service после прохождения stage-gate 1→2.'),
    mStage2,
    ['wish'],
  );
}

console.log('milestones:', { mStage1, mStage2 });
