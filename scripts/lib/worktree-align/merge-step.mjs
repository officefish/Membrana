/**
 * merge-step — ИСПОЛНИТЕЛЬ слияния с гарантированным откатом
 * (блок `merge-abort-guard` спринта `worktrees-align`, #1738).
 *
 * ОДНО ДЕЙСТВИЕ, ОДИН ИСХОД. Исполнитель зовёт `merge` и возвращает `Result` с родом исхода.
 * Он НЕ различает ff и обычный merge и НЕ разбирает `git status` — оба знания живут в ядре
 * (`isFastForward`, `isWorktreeClean`). Разбор Ожегова при прогоне контекста блока: иначе
 * появятся два фасада-синонима на одну лемму «слияние», а следующий исполнитель (rebase,
 * cherry-pick) заведёт свой диалект чтения состояния.
 *
 * КОНФЛИКТ — НЕ ПРОВАЛ, А НАХОДКА. Ядро конфликты принципиально не разрешает: в прецеденте
 * 24.07 четыре конфликта разбирались поимённо и с рассуждением (union реестров, `theirs`
 * только в конфликтном хунке, слияние по `id` с проверкой на дубли). Автомат здесь обязан
 * откатиться и позвать человека.
 *
 * ПРОВАЛ САМОГО ОТКАТА — ОТДЕЛЬНЫЙ ТЕРМИНАЛЬНЫЙ КЛАСС, а не «ошибка слияния». Дерево осталось
 * грязным по чужой вине, и это худшее, что умеет сделать этот спринт. Поэтому: никаких
 * повторов, остановка по этому дереву, и уведомление, которое БЕЗ списка unmerged-файлов
 * считается невалидным — человек обязан увидеть, что именно чинить.
 */
import { isFastForward, isWorktreeClean } from './align-plan.mjs';

/** Роды исхода слияния. Список закрыт: род вне списка — ошибка входа, не «прочее». */
export const MERGE_RESULTS = Object.freeze({
  FF: 'ff',
  MERGED: 'merged',
  NOOP: 'noop',
  CONFLICT: 'conflict',
  ABORT_FAILED: 'abort_failed',
});

/**
 * ФОРМА io БЛОКА. Реализация — в CLI; здесь только форма, потому что живых деревьев для
 * проверки нет (#1738, риск №1), а проверять защиту от «оставили дерево грязным» настоящим
 * деревом значит однажды её и не проверить.
 *
 * @typedef {object} MergeIo
 * @property {(cwd: string, args: string[]) => string} git запуск git массивом аргументов, без shell
 * @property {(cwd: string) => object} readState измеренное состояние дерева для лемм ядра
 */

/**
 * Собрать исполнителя слияния над конкретным io.
 *
 * @param {MergeIo} io
 */
export function makeMergeStep(io) {
  /**
   * @param {string} worktreeDir
   * @param {object} stateBefore снимок состояния ДО слияния (для леммы ff ядра)
   * @param {{parentSha?: string, headRef?: string}} [receipt] квитанция снимка, если он делался
   * @returns {{kind: string, headShaAfter: string|null, worktreeDir: string,
   *            unmergedPaths?: string[], residual?: string[], parentShaExpected?: string|null}}
   */
  return function mergeFromOrigin(worktreeDir, stateBefore, receipt = {}) {
    const headBefore = io.git(worktreeDir, ['rev-parse', 'HEAD']).trim();

    let conflicted = false;
    try {
      io.git(worktreeDir, ['merge', '--no-edit', 'origin/main']);
    } catch {
      conflicted = true;
    }

    if (!conflicted) {
      const headShaAfter = io.git(worktreeDir, ['rev-parse', 'HEAD']).trim();
      if (headShaAfter === headBefore) {
        return { kind: MERGE_RESULTS.NOOP, headShaAfter, worktreeDir };
      }
      // Род исхода называет ЯДРО по состоянию до слияния, а не исполнитель по виду вывода git.
      return {
        kind: isFastForward(stateBefore) ? MERGE_RESULTS.FF : MERGE_RESULTS.MERGED,
        headShaAfter,
        worktreeDir,
      };
    }

    // Конфликт: сперва снять список unmerged — после отката его уже не спросишь.
    const stateAtConflict = io.readState(worktreeDir) ?? {};
    const unmergedPaths = stateAtConflict.unmergedPaths ?? [];

    try {
      io.git(worktreeDir, ['merge', '--abort']);
    } catch {
      // Провал отката проверяется состоянием, а не кодом возврата: git мог упасть, откатив,
      // и мог смолчать, не откатив. Верим только замеру.
    }

    const stateAfterAbort = io.readState(worktreeDir) ?? {};
    const verdict = isWorktreeClean(stateAfterAbort, receipt);
    if (!verdict.clean) {
      return {
        kind: MERGE_RESULTS.ABORT_FAILED,
        headShaAfter: stateAfterAbort.head ?? null,
        worktreeDir,
        unmergedPaths: stateAfterAbort.unmergedPaths ?? unmergedPaths,
        residual: verdict.residual,
        parentShaExpected: receipt?.parentSha ?? null,
      };
    }

    return {
      kind: MERGE_RESULTS.CONFLICT,
      headShaAfter: stateAfterAbort.head ?? headBefore,
      worktreeDir,
      unmergedPaths,
      parentShaExpected: receipt?.parentSha ?? null,
    };
  };
}

/** Терминальный ли исход: дальше по этому дереву спринт не идёт, повторов не бывает. */
export function isTerminal(result) {
  return result?.kind === MERGE_RESULTS.ABORT_FAILED;
}

/**
 * Уведомление о брошенном грязным дереве.
 *
 * Требование Ожегова: БЕЗ списка unmerged уведомление невалидно — человек должен увидеть
 * путь дерева, ожидаемый `parentSha`, фактический `HEAD` и что именно осталось. Поэтому
 * функция отказывается собирать текст без списка, а не печатает бодрое «что-то пошло не так».
 *
 * @returns {{valid: boolean, lines: string[]}}
 */
export function formatAbortFailedNotice(result) {
  if (result?.kind !== MERGE_RESULTS.ABORT_FAILED) {
    return { valid: false, lines: ['уведомление применимо только к исходу abort_failed'] };
  }
  const unmerged = result.unmergedPaths ?? [];
  if (unmerged.length === 0) {
    return {
      valid: false,
      lines: ['уведомление невалидно: нет списка unmerged — человеку нечего чинить'],
    };
  }
  return {
    valid: true,
    lines: [
      `✖ ДЕРЕВО ОСТАВЛЕНО ГРЯЗНЫМ: ${result.worktreeDir}`,
      `    ожидаемый HEAD: ${result.parentShaExpected ?? '—'}`,
      `    фактический HEAD: ${result.headShaAfter ?? '—'}`,
      ...unmerged.map((f) => `    unmerged: ${f}`),
      ...(result.residual ?? []).map((r) => `    остаток: ${r}`),
      '    спринт по этому дереву остановлен — повторов не будет, разбор человеку',
    ],
  };
}
