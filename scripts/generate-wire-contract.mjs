#!/usr/bin/env node
/**
 * yarn wire:generate — генерирует CJS-копию wire-контракта node-realtime для
 * background-cabinet из канона @membrana/core (Задача 3 плана 2026-07-09, #320).
 *
 * Корень проблемы: core ESM-only, NestJS-кабинет CJS — прямой импорт невозможен,
 * копия правилась руками и дважды разошлась (2026-07-08). Теперь копия —
 * ГЕНЕРИРУЕМЫЙ артефакт: конкат core-файлов в порядке зависимостей, strip
 * внутренних импортов, дедуп ИДЕНТИЧНЫХ приватных хелперов (неидентичные — fail,
 * никакого молчаливого выбора).
 *
 * Freshness-гейт: scripts/verify-wire-sync.mjs генерирует в память и байтово
 * сравнивает с checked-in файлом (запускается в pre-push).
 *
 * Usage:
 *   node scripts/generate-wire-contract.mjs          # перегенерировать файл
 *   yarn wire:generate
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export const CORE_DIR = 'packages/core/src/contracts/node-realtime';

/** Порядок зависимостей: envelope → board-events → capture-events → events → parse → validate-payloads. */
export const WIRE_SOURCE_FILES = [
  'envelope.ts',
  'board-events.ts',
  'capture-events.ts',
  'events.ts',
  'parse.ts',
  'validate-payloads.ts',
];

export const WIRE_TARGET = 'packages/background-cabinet/src/domain/node-realtime-wire.ts';

export const BANNER = `/**
 * GENERATED FROM ${CORE_DIR}/ — DO NOT EDIT.
 *
 * Wire-контракт node-realtime для background-cabinet (CJS runtime). Источник
 * истины — @membrana/core; этот файл собирается генератором и сверяется
 * freshness-гейтом (yarn verify:wire-sync, pre-push).
 *
 * Перегенерация: yarn wire:generate
 */
`;

/**
 * Удалить import-стейтменты. Внешний (не './x.js') импорт — ошибка: контрактная
 * директория обязана быть самодостаточной, иначе конкат не образует валидный CJS-файл.
 *
 * @param {string} src
 * @param {string} fileName для сообщения об ошибке
 * @returns {string}
 */
export function stripInternalImports(src, fileName) {
  const importRe = /^import[\s\S]*?from\s+['"]([^'"]+)['"];?\s*$/gm;
  let m;
  while ((m = importRe.exec(src)) !== null) {
    if (!/^\.\/[A-Za-z0-9-]+\.js$/.test(m[1])) {
      throw new Error(
        `wire:generate: внешний импорт '${m[1]}' в ${fileName} — контрактная директория должна быть самодостаточной`,
      );
    }
  }
  return src.replace(importRe, '').replace(/^\s*\n/, '');
}

/** Нормализовать текст декларации для сравнения (whitespace-insensitive). */
export function normalizeDeclaration(text) {
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Найти top-level декларации вида `function NAME(...) {...}` / `const NAME = ...;`
 * (включая export-варианты). Возвращает [{ name, exported, start, end, text }].
 * Скобочная глубина считается по строкам; контрактные файлы простые (без
 * template-строк с фигурными скобками на верхнем уровне).
 *
 * @param {string} src
 */
export function extractTopLevelDeclarations(src) {
  const lines = src.split('\n');
  const decls = [];
  let depth = 0;
  let current = null;

  const startRe =
    /^(export\s+)?(function|const|interface|type)\s+([A-Za-z0-9_]+)/;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (depth === 0 && current === null) {
      const m = startRe.exec(line);
      if (m) {
        current = { name: m[3], exported: Boolean(m[1]), kind: m[2], startLine: i };
      }
    }
    // Грубый скобочный счётчик: строки контрактов не содержат небалансных скобок в строках-литералах.
    for (const ch of line) {
      if (ch === '{') depth += 1;
      else if (ch === '}') depth -= 1;
    }
    const terminated =
      current !== null &&
      depth === 0 &&
      (line.includes('}') || /;\s*$/.test(line) || /^type\s|^export\s+type\s/.test(lines[current.startLine]));
    if (terminated) {
      decls.push({
        name: current.name,
        exported: current.exported,
        kind: current.kind,
        startLine: current.startLine,
        endLine: i,
        text: lines.slice(current.startLine, i + 1).join('\n'),
      });
      current = null;
    }
  }
  return decls;
}

/**
 * Дедуп повторных деклараций между файлами: идентичные (после нормализации) —
 * выбрасываем повтор; неидентичные — fail с внятной ошибкой.
 *
 * @param {{fileName:string, src:string}[]} parts
 * @returns {string[]} тела файлов с вырезанными повторами
 */
export function dedupeAcrossParts(parts) {
  /** @type {Map<string, {fileName:string, normalized:string}>} */
  const seen = new Map();
  return parts.map(({ fileName, src }) => {
    const decls = extractTopLevelDeclarations(src);
    const dropLines = new Set();
    for (const d of decls) {
      const key = `${d.kind}:${d.name}`;
      const normalized = normalizeDeclaration(d.text);
      const prev = seen.get(key);
      if (!prev) {
        seen.set(key, { fileName, normalized });
        continue;
      }
      if (prev.normalized !== normalized) {
        throw new Error(
          `wire:generate: НЕИДЕНТИЧНЫЙ дубль '${d.name}' (${d.kind}) в ${fileName} и ${prev.fileName} — разреши вручную в core, молчаливый выбор запрещён`,
        );
      }
      for (let i = d.startLine; i <= d.endLine; i += 1) dropLines.add(i);
    }
    if (dropLines.size === 0) return src;
    return src
      .split('\n')
      .filter((_, i) => !dropLines.has(i))
      .join('\n');
  });
}

/**
 * Собрать текст wire-файла из core-исходников.
 *
 * @param {(relPath: string) => string} readFile
 * @returns {string}
 */
export function generateWireSource(readFile = (p) => readFileSync(resolve(root, p), 'utf8')) {
  const parts = WIRE_SOURCE_FILES.map((fileName) => ({
    fileName,
    src: stripInternalImports(readFile(`${CORE_DIR}/${fileName}`), fileName),
  }));
  const deduped = dedupeAcrossParts(parts);
  const sections = deduped.map(
    (src, i) => `// ===== from ${CORE_DIR}/${WIRE_SOURCE_FILES[i]} =====\n\n${src.trim()}\n`,
  );
  return `${BANNER}\n${sections.join('\n')}`;
}

function main() {
  const next = generateWireSource();
  writeFileSync(resolve(root, WIRE_TARGET), next);
  console.log(`wire:generate — OK (${WIRE_TARGET} перегенерирован из ${CORE_DIR}/)`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (e) {
    console.error(String(e?.message ?? e));
    process.exit(1);
  }
}
