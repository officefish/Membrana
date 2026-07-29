/**
 * Словарь conventional-типов коммита — ОДИН на проект (#1449 хвост, 29.07).
 *
 * Живой укус: ветку зовут `tooling/...` (валидный kind по layer-rules.json), после чего
 * `pr:ship --type tooling` выглядит очевидным — и падает на `commit-msg`, но уже ПОСЛЕ
 * pre-commit со сканом секретов. Словари разные не по недосмотру: kind ветки описывает
 * ХАРАКТЕР РАБОТЫ (meeting, storm, night, sprint), тип коммита — conventional-стандарт.
 * Беда была не в расхождении, а в том, что расхождение нигде не названо.
 *
 * Хук `.githooks/commit-msg` держит те же типы в grep-регулярке (POSIX sh, импортировать
 * не может). Расхождение хука и этого файла ловит зуб в commit-types.test.mjs.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** Порядок значим: им же печатается подсказка. */
export const COMMIT_TYPES = [
  'feat',
  'fix',
  'chore',
  'docs',
  'refactor',
  'test',
  'ci',
  'perf',
  'build',
  'style',
  'revert',
  'comp',
  'cowork',
];

/** Kind ветки → разумный тип коммита. Не автоподстановка: подсказка человеку. */
const KIND_HINT = {
  tooling: 'chore (или fix, если правка чинит поведение)',
  meeting: 'docs',
  storm: 'docs',
  night: 'chore',
  truth: 'docs',
  research: 'docs',
  sprint: 'feat (или chore — по сути правки)',
};

export function readBranchKinds(root = ROOT) {
  try {
    const rules = JSON.parse(readFileSync(join(root, 'docs', 'procedures', 'layer-rules.json'), 'utf8'));
    return rules?.branchGrammar?.kinds ?? [];
  } catch {
    return [];
  }
}

/**
 * @returns {string|null} причина отказа (готовая к печати) либо null, если тип валиден.
 */
export function explainCommitType(type, kinds = readBranchKinds()) {
  if (COMMIT_TYPES.includes(type)) return null;
  const lines = [`pr:ship: тип «${type}» не conventional — commit-msg такой заголовок не пропустит`];
  if (kinds.includes(type)) {
    lines.push(
      `  «${type}» — это kind ВЕТКИ (layer-rules.json), не тип коммита: словари разные намеренно.`,
      `  Ветку звать «${type}/...» можно и нужно; для коммита возьми ${KIND_HINT[type] ?? 'подходящий conventional-тип'}.`,
    );
  }
  lines.push(`  типы: ${COMMIT_TYPES.join('|')}`);
  return lines.join('\n');
}
