#!/usr/bin/env node
/**
 * yarn cowork:close [--execute]
 *
 * Закрывает Phase 5 активного коворка по предикату. Носитель, которого не хватало: регламент
 * объявлял команду, файла не существовало, и флаг ACTIVE застрял два коворка подряд
 * (долг `#cowork-phase5-no-autoclose-r2`).
 *
 * По умолчанию — сухой прогон: печатает находки и НЕ пишет. `--execute` переводит флаг в
 * `closed` и дописывает секцию с основанием.
 *
 * Exit: 0 — закрыто/можно закрывать; 3 — есть блокирующие находки (не «сломался инструмент»,
 * а «закрывать нельзя»); 2 — инструментальная ошибка.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  ACTIVE_REL,
  closeFindings,
  collectCloseState,
  mayClose,
  renderClosedActive,
} from './lib/cowork-close.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);

if (argv.includes('--help') || argv.includes('-h')) {
  console.log(`yarn cowork:close [--execute] [--date YYYY-MM-DD]

  Закрывает Phase 5 активного коворка предикатом: контракт и ретроспектива на месте,
  карточка реестра и ветки блоков — названы находками, но закрытие не роняют.
  Без --execute ничего не пишет. Exit 3 = закрывать нельзя (блокирующие находки).`);
  process.exit(0);
}

function localBranches() {
  try {
    return execFileSync('git', ['for-each-ref', '--format=%(refname:short)', 'refs/heads/'], {
      cwd: repoRoot,
      encoding: 'utf8',
      timeout: 15_000,
    })
      .split(/\r?\n/u)
      .filter(Boolean);
  } catch {
    // Без git ветки не перечислить — находка `branches_alive` просто не появится.
    // Молчаливо считать «веток нет» честнее, чем валить закрытие флага из-за отсутствия git.
    return [];
  }
}

function readRegistry() {
  const p = join(repoRoot, 'docs', 'tasks', 'registry.json');
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch (e) {
    console.error(`cowork:close ⚠ реестр не разобран (${e.message.split('\n')[0]}) — находки по карточке пропущены`);
    return null;
  }
}

const dateFlagIdx = argv.indexOf('--date');
const closedAt =
  dateFlagIdx > -1 && argv[dateFlagIdx + 1] && !argv[dateFlagIdx + 1].startsWith('--')
    ? argv[dateFlagIdx + 1]
    : new Date().toISOString().slice(0, 10);

const state = collectCloseState(repoRoot, { branches: localBranches(), registry: readRegistry() });
const findings = closeFindings(state);

console.log(`cowork:close — ${state.sprintId ?? '(спринт не определён)'}\n`);
if (findings.length === 0) {
  console.log('  находок незакрытости нет');
} else {
  for (const f of findings) {
    console.log(`  ${f.blocking ? '✖' : '⚠'} ${f.id}\n      ${f.note}`);
  }
}

if (!mayClose(findings)) {
  console.log('\nЗакрывать НЕЛЬЗЯ: есть блокирующие находки (✖). Флаг оставлен как был.');
  process.exitCode = 3;
} else if (!argv.includes('--execute')) {
  console.log(`\nМожно закрывать. Сухой прогон — файл не тронут. Пиши: yarn cowork:close --execute`);
} else {
  const nonBlocking = findings.filter((f) => !f.blocking);
  writeFileSync(
    join(repoRoot, ACTIVE_REL),
    renderClosedActive(state.activeMd, { sprintId: state.sprintId, closedAt, findings: nonBlocking }),
    'utf8',
  );
  console.log(`\n✓ флаг переведён в \`closed\` (${closedAt}); основание дописано секцией в ${ACTIVE_REL}`);
  console.log('  Качество сведения блоков этим шагом НЕ утверждается — только признаки закрытости.');
  if (state.card && state.card.status !== 'archived') {
    console.log(`  Дальше: yarn task:archive ${state.sprintId}`);
  }
}
