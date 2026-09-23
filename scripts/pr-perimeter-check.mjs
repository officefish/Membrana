#!/usr/bin/env node
/**
 * pr:perimeter — проверка файлов PR по объявленному в его теле allowlist-периметру.
 *
 *   yarn pr:perimeter --pr <N>
 *   yarn pr:perimeter --pr <N> --perimeter-file <file>
 *   yarn pr:perimeter --base origin/main --perimeter-file <file>
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

import picomatch from 'picomatch';

const PERIMETER_BLOCK_RE = /<!--\s*perimeter(?=\s|-->)([\s\S]*?)-->/iu;
const EXTERNAL_CALL_TIMEOUT_MS = 30_000;

/** @param {string} body */
export function parsePerimeterBlock(body = '') {
  const match = String(body).match(PERIMETER_BLOCK_RE);
  if (!match) return { status: 'missing', rules: [] };

  const rules = match[1]
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean);
  return { status: rules.length > 0 ? 'declared' : 'empty', rules };
}

/** @param {string} value */
function posixPath(value) {
  return String(value).replace(/\\/gu, '/');
}

/**
 * @param {string[]} files
 * @param {string[]} rules
 */
export function matchFilesToRules(files, rules) {
  const compiled = rules.map((rule) => ({
    rule,
    matches: picomatch(rule, { dot: true, nonegate: true }),
  }));
  const matches = [];
  const outside = [];

  for (const rawFile of files) {
    const file = posixPath(rawFile);
    const matched = compiled.find((entry) => entry.matches(file));
    if (matched) matches.push({ file, rule: matched.rule });
    else outside.push(file);
  }

  return { matches, outside };
}

/** @param {string} value */
function tableCell(value) {
  return value.replace(/\|/gu, '\\|');
}

/** @param {{matches: Array<{file: string, rule: string}>, outside: string[]}} checked */
function renderChecked(checked) {
  if (checked.outside.length > 0) {
    return `pr:perimeter: ✗ файлы вне периметра:\n${checked.outside.map((file) => `  - ${file}`).join('\n')}`;
  }

  const rows = checked.matches.map(
    ({ file, rule }) => `| ${tableCell(file)} | ${tableCell(rule)} |`,
  );
  return [
    `pr:perimeter: ✓ проверено файлов: ${checked.matches.length}`,
    '',
    '| файл | правило периметра |',
    '| --- | --- |',
    ...rows,
  ].join('\n');
}

/**
 * @param {{body: string, files: string[]}} input
 * @returns {{exitCode: number, output: string}}
 */
export function evaluatePerimeter({ body, files }) {
  const parsed = parsePerimeterBlock(body);
  if (parsed.status === 'missing') {
    return { exitCode: 0, output: 'pr:perimeter: ✓ периметр не объявлен — проверка пропущена' };
  }
  if (parsed.status === 'empty') {
    return { exitCode: 1, output: 'pr:perimeter: ✗ периметр объявлен, но пуст' };
  }

  const checked = matchFilesToRules(files, parsed.rules);
  return { exitCode: checked.outside.length > 0 ? 1 : 0, output: renderChecked(checked) };
}

/** @param {string} source */
function parsePerimeterFile(source) {
  const parsedBlock = parsePerimeterBlock(source);
  if (parsedBlock.status !== 'missing') return parsedBlock;
  const rules = source
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean);
  return { status: rules.length > 0 ? 'declared' : 'empty', rules };
}

/** @param {string[]} argv */
export function parseArgs(argv) {
  const options = { pr: null, base: null, perimeterFile: null };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--pr') options.pr = argv[(index += 1)] ?? null;
    else if (arg === '--base') options.base = argv[(index += 1)] ?? null;
    else if (arg === '--perimeter-file') options.perimeterFile = argv[(index += 1)] ?? null;
    else throw new Error(`неизвестный аргумент: ${arg}`);
  }
  return options;
}

function perimeterFileInput(perimeterFile) {
  const source = readFileSync(perimeterFile, 'utf8');
  const parsed = parsePerimeterFile(source);
  return {
    body: `<!-- perimeter\n${parsed.rules.join('\n')}\n-->`,
    empty: parsed.status === 'empty',
  };
}

function readPr(pr, perimeterFile = null) {
  const raw = execFileSync('gh', ['pr', 'view', pr, '--json', 'body,files'], {
    encoding: 'utf8',
    timeout: EXTERNAL_CALL_TIMEOUT_MS,
  });
  const parsed = JSON.parse(raw);
  const perimeter = perimeterFile
    ? perimeterFileInput(perimeterFile)
    : { body: parsed.body ?? '', empty: false };
  return {
    ...perimeter,
    files: (parsed.files ?? []).map((file) => (typeof file === 'string' ? file : file.path)),
  };
}

function readLocal(base, perimeterFile) {
  const perimeter = perimeterFileInput(perimeterFile);
  const rawFiles = execFileSync('git', ['diff', '--name-only', `${base}...HEAD`], {
    encoding: 'utf8',
    timeout: EXTERNAL_CALL_TIMEOUT_MS,
  });
  return {
    ...perimeter,
    files: rawFiles.split(/\r?\n/u).filter(Boolean),
  };
}

export function main(argv = process.argv) {
  try {
    const options = parseArgs(argv);
    const prMode = options.pr != null && options.base == null;
    const localMode = options.pr == null && options.base != null && options.perimeterFile != null;
    if (!prMode && !localMode) {
      throw new Error('укажи либо --pr <N>, либо пару --base <ref> --perimeter-file <file>');
    }

    const input = prMode
      ? readPr(options.pr, options.perimeterFile)
      : readLocal(options.base, options.perimeterFile);
    const result = input.empty
      ? { exitCode: 1, output: 'pr:perimeter: ✗ периметр объявлен, но пуст' }
      : evaluatePerimeter(input);
    const writer = result.exitCode === 0 ? console.log : console.error;
    writer(result.output);
    return result.exitCode;
  } catch (error) {
    console.error(`pr:perimeter: ошибка: ${error?.message ?? error}`);
    return 2;
  }
}

const isMain = process.argv[1]?.endsWith('pr-perimeter-check.mjs');
if (isMain) process.exitCode = main();
