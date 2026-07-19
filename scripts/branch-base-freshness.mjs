#!/usr/bin/env node
/**
 * #640 — предупредить, что рабочая ветка отстала от базы `origin/main`, ДО ревью/PR.
 *
 * Usage:
 *   yarn branch:check-base                 # HEAD против origin/main
 *   yarn branch:check-base --base origin/develop --ref my-branch
 *   yarn branch:check-base --strict        # отставание → exit 1 (для хука/CI)
 *
 * Exit: 0 всегда (WARN-семантика), кроме --strict при отставании и внутренних сбоев.
 * Отставание — не нарушение, а риск недостоверного диффа: ронять поток по умолчанию
 * значило бы выдавать риск за дефект (урок «находка ≠ сбой», #622).
 */
import { checkBaseFreshness } from './lib/branch-base-freshness.mjs';

function parseArgs(argv) {
  const o = { base: 'origin/main', ref: 'HEAD', strict: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--base') o.base = argv[i + 1] ?? o.base;
    else if (argv[i] === '--ref') o.ref = argv[i + 1] ?? o.ref;
    else if (argv[i] === '--strict') o.strict = true;
  }
  return o;
}

const isMain = process.argv[1]?.endsWith('branch-base-freshness.mjs');
if (isMain) {
  const cli = parseArgs(process.argv.slice(2));
  try {
    const r = checkBaseFreshness(cli.base, cli.ref);
    if (r.state === 'fresh') {
      console.log(`[branch:check-base] ${r.message}`);
    } else {
      console.error(`[branch:check-base] ⚠ ${r.message}`);
      if (cli.strict) process.exit(1);
    }
  } catch (e) {
    console.error(`[branch:check-base] не удалось проверить: ${e?.message ?? e}`);
    process.exit(1);
  }
}
