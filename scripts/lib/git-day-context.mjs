/**
 * Общий «git-контекст дня» для ритуальных скриптов (code-review, team-feedback,
 * plan). Централизует логику «работа за сегодня», чтобы класс багов 2026-07-08 не
 * повторялся: (1) НЕ фильтруем по локальному git-автору — squash-мерджи PR имеют
 * автора GitHub-аккаунта, не user.name; (2) файлы — сортировка + щедрый cap, чтобы
 * не отсекать файлы РАННИХ коммитов дня.
 */
import { execFileSync } from 'node:child_process';

function git(args) {
  try {
    return execFileSync('git', args, { encoding: 'utf8' });
  } catch {
    return '';
  }
}

/**
 * Короткая ревизия HEAD — для СТРОКИ ПРОИСХОЖДЕНИЯ в датированных артефактах
 * (DoD M0 спринта ritual-step-manifest-sf: артефакт несёт дату + ревизию).
 *
 * Зачем в артефакте ревизия: дата отвечает «когда», но не «на чём». Два
 * одинаково датированных плана, построенных до и после мёржа, неразличимы без
 * неё — читатель не может понять, устарел ли вывод относительно кода.
 * Вне git-дерева — 'no-git', а не бросок: провенанс не должен ронять генератор.
 */
export function headRevision() {
  return git(['rev-parse', '--short', 'HEAD']).trim() || 'no-git';
}

/** Коммиты за сегодня (since=midnight), БЕЗ --author. Формат настраиваемый. */
export function todaysCommits({ format = '• %h: %s (%an)', limit } = {}) {
  const args = ['log', '--since=midnight', `--pretty=format:${format}`];
  if (limit) args.push(`-${limit}`);
  return git(args).trim();
}

/** Чистая: дедуп + сортировка + cap. Отделена от git ради теста. */
export function dedupeSortCap(lines, cap = 120) {
  const all = [...new Set(lines.map((l) => l.trim()).filter(Boolean))].sort();
  return { files: all.slice(0, cap), more: Math.max(0, all.length - cap) };
}

/** Уникальные затронутые за сегодня файлы (sorted, cap). */
export function todaysChangedFiles(cap = 120) {
  const stat = git(['log', '--since=midnight', '--pretty=format:', '--name-only']);
  return dedupeSortCap(stat.split('\n'), cap);
}
