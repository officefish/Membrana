/**
 * scripts-inventory — чистый инвентарь группы scripts/ (S1, lead dynin).
 *
 * SoT = ФС `scripts/**` (кодовые файлы) ∪ ключи `package.json#scripts`.
 * Реестр — производный снимок; таксономия доменов НЕ вводится (HARD GATE Scenario B):
 * только структурные предикаты yarn↔file.
 */

/** Расширения кодовых файлов группы. */
export const SCRIPT_CODE_EXTS = new Set(['.mjs', '.js', '.cjs']);

/** Каталоги внутри scripts/, которые не входят в SoT кода. */
export const SCRIPT_SKIP_DIRS = new Set(['cache', 'node_modules']);

/**
 * Извлечь пути вида `scripts/...` из команды yarn.
 * @param {string} command
 * @returns {string[]} posix-пути без ведущего `./`
 */
export function extractScriptPaths(command) {
  const text = String(command ?? '');
  const out = [];
  const re = /(?:\.\/)?scripts\/[^\s'"`]+/g;
  for (const m of text.matchAll(re)) {
    let p = m[0].replace(/^\.\//, '').replace(/\\/g, '/');
    // срезать хвостовую пунктуацию от shell
    p = p.replace(/[;,)]+$/u, '');
    if (!out.includes(p)) out.push(p);
  }
  return out;
}

/**
 * @param {string} relPath posix
 * @returns {boolean}
 */
export function isScriptCodePath(relPath) {
  const p = String(relPath).replace(/\\/g, '/');
  if (!p.startsWith('scripts/')) return false;
  const base = p.slice(p.lastIndexOf('/') + 1);
  if (!base.includes('.')) return false;
  const ext = base.slice(base.lastIndexOf('.')).toLowerCase();
  return SCRIPT_CODE_EXTS.has(ext);
}

/**
 * Построить инвентарь из уже собранных входов (чистая функция).
 *
 * @param {{
 *   yarnScripts: Record<string, string>,
 *   files: string[],
 * }} input
 */
export function buildScriptsInventory(input) {
  const yarnScripts = input.yarnScripts ?? {};
  const files = [...new Set((input.files ?? []).map((f) => f.replace(/\\/g, '/')))]
    .filter(isScriptCodePath)
    .sort();

  const fileSet = new Set(files);

  /** @type {{ name: string, command: string, paths: string[], missing: string[] }[]} */
  const yarnTouching = [];
  /** @type {{ name: string, command: string }[]} */
  const yarnOutside = [];
  /** @type {{ name: string, command: string, missing: string[] }[]} */
  const yarnBroken = [];

  for (const name of Object.keys(yarnScripts).sort()) {
    const command = String(yarnScripts[name] ?? '');
    const paths = extractScriptPaths(command);
    if (paths.length === 0) {
      yarnOutside.push({ name, command });
      continue;
    }
    const missing = paths.filter((p) => !fileSet.has(p));
    const entry = { name, command, paths, missing };
    yarnTouching.push(entry);
    if (missing.length > 0) yarnBroken.push({ name, command, missing });
  }

  const referenced = new Set();
  for (const y of yarnTouching) {
    for (const p of y.paths) {
      if (fileSet.has(p)) referenced.add(p);
    }
  }

  const orphanFiles = files.filter((f) => !referenced.has(f));

  return {
    files,
    yarnTouching,
    yarnOutside,
    yarnBroken,
    orphanFiles,
    counts: {
      files: files.length,
      yarnTotal: Object.keys(yarnScripts).length,
      yarnTouching: yarnTouching.length,
      yarnOutside: yarnOutside.length,
      yarnBroken: yarnBroken.length,
      orphanFiles: orphanFiles.length,
    },
  };
}

/**
 * @param {ReturnType<typeof buildScriptsInventory>} inventory
 * @param {Record<string, string>} meta
 */
export function renderScriptsList(inventory, meta) {
  const lines = [
    '# SCRIPTS_LIST — реестр состава scripts/',
    '',
    'Производный снимок. Источник истины — ФС `scripts/**` (код) + `package.json#scripts`.',
    'Таксономия доменов отсутствует (плоский структурный разрез yarn↔file).',
    '',
    '## Meta',
    '',
    '| Field | Value |',
    '|-------|-------|',
  ];
  for (const [k, v] of Object.entries(meta)) {
    lines.push(`| ${k} | ${v} |`);
  }

  const c = inventory.counts;
  lines.push(
    '',
    '## Summary',
    '',
    '| Metric | Count |',
    '|--------|------:|',
    `| Code files under \`scripts/\` | ${c.files} |`,
    `| Yarn scripts (package.json) | ${c.yarnTotal} |`,
    `| Yarn → \`scripts/\` | ${c.yarnTouching} |`,
    `| Yarn без пути \`scripts/\` | ${c.yarnOutside} |`,
    `| Yarn → missing file | ${c.yarnBroken} |`,
    `| Code files without yarn ref | ${c.orphanFiles} |`,
    '',
    '## Yarn → scripts/ (' + c.yarnTouching + ')',
    '',
  );

  for (const y of inventory.yarnTouching) {
    const paths = y.paths.map((p) => `\`${p}\``).join(', ');
    const miss = y.missing.length ? ` ⚠ missing: ${y.missing.map((p) => `\`${p}\``).join(', ')}` : '';
    lines.push(`- \`${y.name}\` → ${paths}${miss}`);
  }

  lines.push('', `## Code files without yarn ref (${c.orphanFiles})`, '');
  if (inventory.orphanFiles.length === 0) {
    lines.push('_нет_');
  } else {
    for (const f of inventory.orphanFiles) {
      lines.push(`- \`${f}\``);
    }
  }

  lines.push('', `## Yarn → missing file (${c.yarnBroken})`, '');
  if (inventory.yarnBroken.length === 0) {
    lines.push('_нет_');
  } else {
    for (const y of inventory.yarnBroken) {
      lines.push(`- \`${y.name}\` → missing ${y.missing.map((p) => `\`${p}\``).join(', ')}`);
    }
  }

  lines.push('', `## All code files (${c.files})`, '');
  for (const f of inventory.files) {
    lines.push(`- \`${f}\``);
  }

  lines.push('', `## Yarn without scripts/ path (${c.yarnOutside})`, '');
  for (const y of inventory.yarnOutside) {
    lines.push(`- \`${y.name}\``);
  }

  lines.push('');
  return lines.join('\n');
}

/**
 * CLI-парсер флагов.
 * @param {string[]} argv
 */
/** Sentinel: `--report` без пути → канон scripts/registry/SCRIPTS_LIST.md */
export const DEFAULT_SCRIPTS_REPORT = 'scripts/registry/SCRIPTS_LIST.md';

export function parseScriptsRegistryCli(argv) {
  const out = {
    help: false,
    json: false,
    dated: false,
    cacheOverview: false,
    report: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') out.help = true;
    else if (a === '--json') out.json = true;
    else if (a === '--dated') out.dated = true;
    else if (a === '--cache-overview') out.cacheOverview = true;
    else if (a === '--report') {
      const next = argv[i + 1];
      if (next && !next.startsWith('-')) {
        out.report = next;
        i++;
      } else {
        out.report = DEFAULT_SCRIPTS_REPORT;
      }
    } else if (a.startsWith('--report=')) {
      out.report = a.slice('--report='.length) || DEFAULT_SCRIPTS_REPORT;
    }
  }
  return out;
}

export const SCRIPTS_REGISTRY_HELP = `Usage: yarn scripts:registry --report [file] [--dated] [--json] [--cache-overview]

  Derived inventory of scripts/ + package.json#scripts → markdown registry.

  --report [file]     write registry (default path: ${DEFAULT_SCRIPTS_REPORT})
  --dated             also write scripts/registry/SCRIPTS_LIST-YYYY-MM-DD.md
  --json              print inventory JSON to stdout (no write unless --report)
  --cache-overview    write yarn tooling:overview --json into scripts/cache/ (not SoT)
`;
