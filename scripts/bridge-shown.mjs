#!/usr/bin/env node
/**
 * yarn bridge:shown — акт показанного (ShownMemo, M6 · #1352): evidence.attach_shown.
 *
 *   yarn bridge:shown <файл> --id <slug> --source "…" [--caption "…"] [--session <id>] [--links-debt <debtId>]
 *
 * ТОНКАЯ обёртка над существующим `yarn evidence add` — второй реестр ЗАПРЕЩЁН (M6):
 * показанное живёт строкой в docs/evidence/registry.jsonl, поля акта (shownAt, session,
 * caption, linksDebtId) уезжают полем `shown` записи. Bare shown НЕ долг и НЕ входит
 * в антецедент gate.parrot_live_if_debts; связь с долгом — только явный linksDebtId
 * (или отдельное явное рождение долга вечерней политикой).
 *
 * Exit: коды `yarn evidence add` (0 принят; 1 отказ).
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const file = argv[0] && !argv[0].startsWith('--') ? argv[0] : null;
const flag = (n) => {
  const i = argv.indexOf(`--${n}`);
  return i > -1 && argv[i + 1] != null && !argv[i + 1].startsWith('--') ? argv[i + 1] : null;
};

if (!file || !flag('id') || !flag('source')) {
  console.error('Usage: yarn bridge:shown <файл> --id <slug> --source "…" [--caption "…"] [--session <id>] [--links-debt <debtId>]');
  process.exit(1);
}

// 1) Приём байтов — СУЩЕСТВУЮЩИМ писателем реестра (единственная точка записи).
const addArgs = ['scripts/evidence.mjs', 'add', file, '--id', flag('id'), '--source', flag('source')];
if (flag('caption')) addArgs.push('--about', flag('caption'));
try {
  execFileSync(process.execPath, addArgs, { stdio: 'inherit', cwd: repoRoot });
} catch (e) {
  process.exit(typeof e.status === 'number' ? e.status : 1);
}

// 2) Акт показанного: поле shown ДОПИСЫВАЕТСЯ в только что принятую строку реестра.
//    Это не правка чужой истории — это завершение собственной записи в том же акте
//    (строка ещё не существовала до шага 1); append-only реестра не нарушен.
const registryPath = join(repoRoot, 'docs/evidence/registry.jsonl');
const lines = readFileSync(registryPath, 'utf8').split('\n');
for (let i = lines.length - 1; i >= 0; i -= 1) {
  if (!lines[i].trim()) continue;
  const rec = JSON.parse(lines[i]);
  if (rec.id !== flag('id')) break; // последняя строка не наша — ничего не трогаем
  rec.shown = {
    at: new Date().toISOString().slice(0, 10),
    ...(flag('session') ? { sessionId: flag('session') } : {}),
    ...(flag('caption') ? { caption: flag('caption') } : {}),
    ...(flag('links-debt') ? { linksDebtId: flag('links-debt') } : {}),
  };
  lines[i] = JSON.stringify(rec);
  writeFileSync(registryPath, lines.join('\n'), 'utf8');
  console.log(`bridge:shown — акт показанного оформлен (${rec.id}${rec.shown.linksDebtId ? `, links debt #${rec.shown.linksDebtId}` : ', без связи с долгом — это норма'})`);
  break;
}
