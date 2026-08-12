#!/usr/bin/env node
/**
 * worktrees:align — массовое выравнивание рабочих деревьев к origin/main
 * (блок `align-cli-report` спринта `worktrees-align`, #1738).
 *
 * Action item прецедента [`2026-07-24-align-all-worktrees-to-main`], открытый с 24.07:
 * «скрипт вместо ручного прохода по десяти деревьям». Повод завести — второй ручной проход
 * за две недели: 06.08 разбор деревьев занял половину дня.
 *
 *   yarn worktrees:align              # СУХОЙ прогон: план и отчёт, ни одной мутации
 *   yarn worktrees:align --apply      # мутирующий прогон — только по слову владельца
 *
 * ПОЧЕМУ СУХОЙ ПО УМОЛЧАНИЮ. Скрипт пишет в ЧУЖИЕ деревья. Молчаливая мутация здесь дороже
 * несделанной работы, поэтому мутирующий прогон требует явного флага, а сухой обязан дать
 * владельцу всё, чтобы дать гейт НЕ ЧИТАЯ КОД (требование Веснина при прогоне контекста):
 * состояние каждого дерева, намеченный исход с причиной, пути будущего снимка и явную строку
 * о том, что мутаций не произведено.
 *
 * ПОЧЕМУ СВОЙ ТОНКИЙ io, А НЕ ИМПОРТ ИЗ `worktree-sync.mjs`. Инвентарь обхода живёт внутри
 * того скрипта, а скрипты — точки входа, не библиотеки: импорт скрипт-к-скрипту у нас
 * запрещён (тот же довод, по которому `acts-trail-reader` выносили из `sprint-cut-check`).
 * Вынести инвентарь в `lib` — работа вне ратифицированной зоны этого блока, поэтому здесь
 * тонкая своя реализация, а вынос записан долгом. Разбор Веснина: «переиспользовать» здесь
 * читается как «не изобретать другую семантику», а не «импортировать .mjs».
 *
 * ЛОВУШКА WINDOWS (прецедент 24.07): node отображает POSIX-путь `/c/...` в `C:\c\...` и даёт
 * ложный ENOENT. Пути сюда приходят от `git worktree list --porcelain` — то есть уже в форме
 * `C:/...`; своих путей строкой мы не собираем.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { parseWorktreeCard } from './lib/classify-worktree.mjs';
import {
  ALIGN_ACTIONS,
  formatAlignReport,
  planAlign,
  recordConflict,
  recordSnapshot,
} from './lib/worktree-align/index.mjs';
import { makeMergeStep, MERGE_RESULTS, formatAbortFailedNotice, isTerminal } from './lib/worktree-align/merge-step.mjs';
import { makeWipSnapshot, undoCommandFor } from './lib/worktree-align/wip-snapshot.mjs';

/** Коды выхода. Находка — не провал, но и не тишина: гейт обязан быть машинно проверяем. */
export const EXIT = Object.freeze({
  OK: 0,
  NEEDS_HUMAN: 3,
  TREE_LEFT_DIRTY: 4,
});

/** Головы незавершённых операций git — те же, что знает ядро. */
const IN_PROGRESS_FILES = Object.freeze([
  ['MERGE_HEAD', 'MERGE_HEAD'],
  ['REBASE_HEAD', 'REBASE_HEAD'],
  ['CHERRY_PICK_HEAD', 'CHERRY_PICK_HEAD'],
  ['REVERT_HEAD', 'REVERT_HEAD'],
  ['BISECT_LOG', 'BISECT_LOG'],
]);

/**
 * Разбор `git worktree list --porcelain`. Чистая функция — зубится без git.
 * @param {string} text
 * @returns {{path: string, branch: string|null}[]}
 */
export function parseWorktreeList(text) {
  const out = [];
  let current = null;
  for (const line of String(text ?? '').split('\n')) {
    if (line.startsWith('worktree ')) {
      if (current) out.push(current);
      current = { path: line.slice('worktree '.length).trim(), branch: null };
    } else if (line.startsWith('branch ') && current) {
      current.branch = line.replace('branch refs/heads/', '').trim();
    }
  }
  if (current) out.push(current);
  return out;
}

/**
 * Код выхода по отчёту. Дерево, брошенное грязным, — худший исход и отдельный код: по нему
 * автоматика соседей обязана остановиться, а не «заметить в логе».
 */
export function decideExitCode(report) {
  if ((report?.leftDirty ?? []).length > 0) return EXIT.TREE_LEFT_DIRTY;
  if ((report?.conflicts ?? []).length > 0) return EXIT.NEEDS_HUMAN;
  const blocking = (report?.skipped ?? []).filter((t) => t.skip !== 'not-behind');
  return blocking.length > 0 ? EXIT.NEEDS_HUMAN : EXIT.OK;
}

/**
 * Строки сухого прогона. Контракт Веснина: владелец даёт гейт по этому тексту, не читая код,
 * поэтому здесь обязаны быть пути будущего снимка и явное слово о том, что мутаций не было.
 */
export function renderDryRun(report) {
  const lines = ['worktrees:align — СУХОЙ прогон, ни одной мутации не произведено', ''];
  lines.push(...formatAlignReport(report));
  const willSnapshot = (report?.planned ?? []).filter((t) => t.actions.includes(ALIGN_ACTIONS.WIP_SNAPSHOT));
  if (willSnapshot.length > 0) {
    lines.push('', 'файлы, которые попадут в защитный снимок:');
    for (const t of willSnapshot) {
      lines.push(`  ${t.tree}`);
      for (const f of t.dirtyFiles ?? []) lines.push(`    · ${f}`);
    }
  }
  lines.push('', 'мутаций не произведено; для прогона повторить с --apply');
  return lines;
}

/** Собрать io поверх настоящих git и fs. Живёт здесь, чтобы ядро и исполнители остались чистыми. */
export function makeIo(repoRoot) {
  const git = (cwd, args) => execFileSync('git', args, { cwd, encoding: 'utf8' });
  return {
    git,
    now: () => new Date().toISOString(),
    listWorktrees: () => parseWorktreeList(git(repoRoot, ['worktree', 'list', '--porcelain'])),
    readCard(wtPath) {
      const file = join(wtPath, 'WORKTREE.md');
      if (!existsSync(file)) return null;
      try {
        return parseWorktreeCard(readFileSync(file, 'utf8'));
      } catch {
        return null;
      }
    },
    readState(wtPath) {
      // -uall обязателен (#1864, дефект 1): без него porcelain сворачивает неотслеживаемый
      // каталог в одну строку `dir/`, план показывает владельцу каталог, а `git add`
      // раскрывает содержимое — согласованный список и фактический охват снимка расходятся
      // по построению (прогон 11.08: docs/archive/daily-day/<date>/).
      const porcelain = safe(() => git(wtPath, ['status', '--porcelain', '-uall']), '');
      // Удаления считаются отдельно от грязи: по инциденту 06.08 они означают не «работу
      // в процессе», а поломанное дерево, и ядро на них останавливается без порога.
      const deletedCount = porcelain
        .split('\n')
        .filter((l) => /^(.D|D.)/.test(l))
        .filter((l) => !/^(DD|DU|UD)/.test(l)).length;
      const dirtyFiles = porcelain
        .split('\n')
        .map((l) => l.slice(3).trim())
        .filter(Boolean);
      const unmergedPaths = porcelain
        .split('\n')
        .filter((l) => /^(DD|AU|UD|UA|DU|AA|UU)/.test(l))
        .map((l) => l.slice(3).trim())
        .filter(Boolean);
      const gitDir = safe(() => git(wtPath, ['rev-parse', '--git-dir']).trim(), '');
      const inProgressHeads = IN_PROGRESS_FILES.filter(([file]) => existsSync(join(wtPath, gitDir, file))).map(
        ([, name]) => name,
      );
      return {
        head: safe(() => git(wtPath, ['rev-parse', 'HEAD']).trim(), null),
        porcelainEmpty: dirtyFiles.length === 0,
        dirtyCount: dirtyFiles.length,
        deletedCount,
        dirtyFiles,
        unmergedPaths,
        mergeHead: inProgressHeads.includes('MERGE_HEAD'),
        inProgressHeads,
      };
    },
    counts(branch) {
      const n = (range) => Number(safe(() => git(repoRoot, ['rev-list', '--count', range]).trim(), '0')) || 0;
      return { behind: n(`${branch}..origin/main`), ahead: n(`origin/main..${branch}`) };
    },
  };
}

const safe = (fn, fallback) => {
  try {
    return fn();
  } catch {
    return fallback;
  }
};

/**
 * Прогон. Ядро решает ЧТО делать, исполнители — КАК, здесь только порядок и отчёт.
 *
 * @param {{io: object, apply?: boolean}} opts
 */
export function runAlign({ io, apply = false }) {
  const states = io.listWorktrees().map((wt) => {
    const measured = wt.branch ? io.readState(wt.path) : { stateUnknown: true };
    const counts = wt.branch ? io.counts(wt.branch) : { behind: 0, ahead: 0 };
    return { tree: wt.path, branch: wt.branch, card: io.readCard(wt.path), ...counts, ...measured };
  });

  // Узел плана несёт решение, но не замер: пути грязных файлов подкладывает провод, иначе
  // сухой прогон не покажет, ЧТО именно попадёт в снимок — а без этого гейт владельца слеп.
  const withFiles = (t) => ({ ...t, dirtyFiles: states.find((s) => s.tree === t.tree)?.dirtyFiles ?? [] });
  const planned = planAlign(states);
  let report = {
    ...planned,
    planned: planned.planned.map(withFiles),
    leftDirty: [],
  };
  if (!apply) return { report, lines: renderDryRun(report), exitCode: decideExitCode(report) };

  const snapshot = makeWipSnapshot(io);
  const merge = makeMergeStep(io);
  const lines = ['worktrees:align — МУТИРУЮЩИЙ прогон', ''];

  for (const t of report.planned) {
    const state = states.find((s) => s.tree === t.tree);
    let receipt = {};
    // Отказ одного дерева не рвёт обход (#1864, дефект 2): прогон 11.08 оборвался на
    // исключении снимка, и хвост парка остался невыровненным молча. Проблемное дерево
    // пропускается с причиной в отчёте; ненулевой код выхода решает decideExitCode по итогу.
    try {
      if (t.actions.includes(ALIGN_ACTIONS.WIP_SNAPSHOT)) {
        receipt = snapshot(t.tree, state.dirtyFiles ?? []);
        report = recordSnapshot(report, { tree: t.tree, files: receipt.committedPaths, commit: receipt.commitSha });
        lines.push(`▣ снимок ${t.tree} → ${receipt.commitSha}`, `    откат: ${undoCommandFor(receipt)}`);
      }
      const result = merge(t.tree, state, receipt);
      if (isTerminal(result)) {
        const notice = formatAbortFailedNotice(result);
        report = { ...report, leftDirty: [...report.leftDirty, result] };
        lines.push(...notice.lines);
        continue; // терминальный класс: стоп ПО ЭТОМУ дереву (повторов не бывает), остальные обходятся
      }
      if (result.kind === MERGE_RESULTS.CONFLICT) {
        report = recordConflict(report, { tree: t.tree, files: result.unmergedPaths, reason: 'merge откачен' });
        lines.push(`✖ конфликт ${t.tree} — merge откачен, разбор человеку`);
      } else {
        lines.push(`↻ ${t.tree} → ${result.kind}`);
      }
    } catch (err) {
      const why = err?.message ?? String(err);
      report = recordConflict(report, { tree: t.tree, files: [], reason: `шаг не выполнен: ${why}` });
      lines.push(`✖ ${t.tree} — шаг не выполнен, дерево пропущено: ${why}`);
    }
  }

  lines.push('', ...formatAlignReport(report));
  return { report, lines, exitCode: decideExitCode(report) };
}

/* c8 ignore start — провод CLI, покрывается прогоном, не зубом */
if (process.argv[1] && process.argv[1].endsWith('worktrees-align.mjs')) {
  const apply = process.argv.includes('--apply');
  const repoRoot = process.cwd();
  const { lines, exitCode } = runAlign({ io: makeIo(repoRoot), apply });
  console.log(lines.join('\n'));
  process.exitCode = exitCode;
}
/* c8 ignore stop */
