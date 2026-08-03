#!/usr/bin/env node
/**
 * kits-prepush-strict — строгая (pinned) сверка описей ТОЛЬКО затронутых пушем китов
 * (карточка kits-pins-prepush-strict, эпик friction-6).
 *
 * Пустой прогон (запиненные файлы не затронуты) — только чтение манифестов и один
 * git diff, аудит не запускается. Режимы latest/pinned и механизм пинов не трогаются:
 * это дополнительный ранний зуб, CI остаётся стеной.
 *
 * Exit: 0 — дрейфа нет / затронутых китов нет / origin/main недоступен (честный пропуск,
 * CI прогонит строго); 1 — дрейф описи (ремонт назван точной командой); 2 — инструментальная
 * ошибка. Работает на голом node — yarn не нужен.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { auditKit, formatKitAuditTable, listKitDirs } from './lib/kit-subgraph-audit.mjs';
import { affectedKits, normalizeRepoPath, repinHint } from './lib/kits-prepush-strict.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const kitsRoot = join(repoRoot, 'kits');
const TAG = 'pre-push [kits-strict]';

/**
 * Шаблон коммита ремонта — вторая половина рецепта (шот H, 03.08). Первая (команда) живёт в
 * ядре (`repinHint`); шаблон — процедура отгрузки, его место в CLI (граница Ожегова:
 * ядро = команда, CLI = процедура). Форма ратифицирована владельцем по трём влитым коммитам
 * ремонта (PR #1642, #1644, #1666): трижды за два дня ремонт делался руками одинаково —
 * рецепт в момент боли дешевле воспоминания. Живое имя кита подставляет CLI из broken;
 * <предмет> остаётся плейсхолдером — предмет догона знает только человек.
 */
const repairCommitHint = (id) =>
  `  влить отдельным ревьюируемым коммитом: chore(kits): опись ${id} догнала <предмет> — пре-пуш зуб, ремонт инструментом`;

/** Тот же приём, что prepush-typecheck-scope: диапазон пуша ≈ origin/main...HEAD. */
function changedVsMain() {
  try {
    execFileSync('git', ['rev-parse', '--verify', '--quiet', 'origin/main'], { stdio: 'ignore', cwd: repoRoot });
  } catch {
    return null;
  }
  const out = execFileSync('git', ['diff', '--name-only', 'origin/main...HEAD'], { encoding: 'utf8', cwd: repoRoot });
  return out.split(/\r?\n/u).filter(Boolean);
}

function main() {
  const changed = changedVsMain();
  if (changed === null) {
    console.log(`${TAG}: origin/main недоступен — строгая сверка не прогонялась (CI прогонит pinned)`);
    return 0;
  }

  if (!existsSync(kitsRoot)) {
    console.log(`${TAG}: каталога kits/ нет — сверять нечего`);
    return 0;
  }
  const kits = listKitDirs(kitsRoot)
    .filter((d) => existsSync(join(d, 'MANIFEST.json')))
    .map((d) => {
      let pins = {};
      try {
        const m = JSON.parse(readFileSync(join(d, 'MANIFEST.json'), 'utf8'));
        if (m.pins && typeof m.pins === 'object' && !Array.isArray(m.pins)) pins = m.pins;
      } catch {
        /* битый манифест: пинов не прочесть, но каталог кита в dir-префиксе — правка кита его вскроет */
      }
      return {
        id: basename(d),
        dir: normalizeRepoPath(relative(repoRoot, d)),
        pinnedPaths: Object.keys(pins),
      };
    });

  const affected = affectedKits({ kits, changedFiles: changed });
  if (affected.length === 0) {
    console.log(`${TAG}: запиненные файлы пушем не затронуты — строгая сверка пропущена (0 из ${kits.length} китов)`);
    return 0;
  }

  const broken = [];
  for (const { id, touched } of affected) {
    console.log(`${TAG}: кит ${id} затронут (${touched.join(', ')}) → kits:audit --mode pinned --id ${id}`);
    const report = auditKit({ repoRoot, kitDir: join(kitsRoot, id), mode: 'pinned' });
    if (report.findings.some((f) => f.blocking)) {
      console.error(formatKitAuditTable(report));
      broken.push(id);
    }
  }

  if (broken.length > 0) {
    console.error(`${TAG}: дрейф описи — ${broken.join(', ')}. Push остановлен ДО CI.`);
    console.error(repinHint(broken));
    for (const id of broken) console.error(repairCommitHint(id));
    return 1;
  }
  console.log(`${TAG}: OK — описи затронутых китов совпадают (${affected.map((a) => a.id).join(', ')})`);
  return 0;
}

if (process.argv[1]?.endsWith('kits-prepush-strict.mjs')) {
  try {
    process.exit(main());
  } catch (e) {
    console.error(`${TAG}: инструментальная ошибка — ${e.message}`);
    process.exit(2);
  }
}
