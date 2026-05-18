/**
 * Копирует markdown-промпты из репозитория в packages/background-office/prompts/
 * перед сборкой (см. README).
 */
const fs = require('node:fs');
const path = require('node:path');

const pkgRoot = path.join(__dirname, '..');
const repoRoot = path.join(pkgRoot, '..', '..');
const destDir = path.join(pkgRoot, 'prompts');

const FILES = [
  ['docs/virtual-team/PROMPT_TEAMLEAD.md', 'PROMPT_TEAMLEAD.md'],
  ['docs/virtual-team/PROMPT_STRUCTURER.md', 'PROMPT_STRUCTURER.md'],
  ['docs/virtual-team/PROMPT_MATHEMATICIAN.md', 'PROMPT_MATHEMATICIAN.md'],
  ['docs/virtual-team/PROMPT_MUSICIAN.md', 'PROMPT_MUSICIAN.md'],
  ['docs/virtual-team/PROMPT_LAYOUT_DEVELOPER.md', 'PROMPT_LAYOUT_DEVELOPER.md'],
  ['docs/WHITE_PAPER.md', 'WHITE_PAPER.md'],
  ['docs/ARCHITECTURE.md', 'ARCHITECTURE.md'],
  ['docs/SERVICES.md', 'SERVICES.md'],
];

fs.mkdirSync(destDir, { recursive: true });

for (const [srcRel, destName] of FILES) {
  const src = path.join(repoRoot, srcRel);
  const dest = path.join(destDir, destName);
  if (!fs.existsSync(src)) {
    console.error(`copy-prompts: missing source ${src}`);
    process.exit(1);
  }
  fs.copyFileSync(src, dest);
}

console.log('copy-prompts: ok');
