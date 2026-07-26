/**
 * #640 — свежесть рабочей ветки относительно БАЗЫ (`origin/main`).
 *
 * Не путать с `git-check-divergence.mjs`: тот сравнивает локальную ветку с её же
 * origin-двойником (локальный `main` vs `origin/main`) и ловит чужой коммит в общий
 * локальный main. Здесь другое: моя feature-ветка отстала от базы на N коммитов, и
 * потому `git diff origin/main..HEAD` показывает работу ПАРАЛЛЕЛЬНОЙ сессии как
 * «удаления» — ревью такого диффа недостоверно.
 *
 * Живой эпизод 17–18.07 (дважды): ветка ночи и ветка заседания отстали, дифф показал
 * `docs/truth/registry.json | 104 +----------` — ничего из этого ветка не трогала.
 * Ревьюер (и автор) может принять чужую работу за откат.
 *
 * Семантика — WARN, не FAIL: отставание не нарушение, а риск недостоверного диффа.
 */
import { execFileSync } from 'node:child_process';

/**
 * Чистая классификация. Тестируется без git.
 * @param {{behind:number, phantomDeletions:string[]}} o
 *   behind — сколько коммитов базы отсутствуют в ветке;
 *   phantomDeletions — файлы, которые база изменила, а ветка НЕ трогала
 *   (именно они покажутся «удалениями» в дифф-стате).
 * @returns {{state:'fresh'|'behind', trustworthyDiff:boolean, message:string}}
 */
export function classifyBaseFreshness({ behind = 0, phantomDeletions = [] } = {}) {
  if (behind <= 0) {
    return { state: 'fresh', trustworthyDiff: true, message: 'ветка на уровне origin/main — дифф достоверен' };
  }
  const head = `ветка отстала от origin/main на ${behind} коммит(ов) — дифф покажет чужую работу как удаления`;
  const tail = phantomDeletions.length
    ? `\n  Ложные «удаления» (${phantomDeletions.length}): ${phantomDeletions.slice(0, 8).join(', ')}${phantomDeletions.length > 8 ? ' …' : ''}`
    : '';
  return {
    state: 'behind',
    trustworthyDiff: false,
    message: `${head}${tail}\n  Перед ревью/PR: git fetch origin && git merge origin/main`,
  };
}

/**
 * Классификация БАЗЫ ветки: не только «отстала ли», но и «своя ли».
 *
 * Эпизод 26.07 (#1272 Ф2): ветвление шло «от текущей точки» — встать на свежую общую
 * ветку не давало занятое дерево, — и в базу молча попал чужой невлитый коммит. Заявка
 * какое-то время предлагала чужой труд под моим именем; обнаружилось только на конфликте
 * слияния. Коммиты при этом были поимённые и честные: ложь возникла на уровне БАЗЫ,
 * чего не видел ни один зуб.
 *
 * @param {{own: string[], foreign: Array<{sha: string, author: string, subject: string}>}} o
 * @returns {{state:'clean'|'foreign-base', message:string}}
 */
export function classifyBaseOwnership({ own = [], foreign = [] } = {}) {
  if (foreign.length === 0) {
    return {
      state: 'clean',
      message: own.length
        ? `база чиста: ${own.length} свой(их) коммит(ов) поверх origin/main`
        : 'база чиста: своих коммитов поверх origin/main пока нет',
    };
  }
  const lines = foreign
    .slice(0, 5)
    .map((c) => `    · ${c.sha} ${c.author} — ${c.subject}`)
    .join('\n');
  return {
    state: 'foreign-base',
    message:
      `в базе ветки ${foreign.length} ЧУЖОЙ(их) коммит(ов) — заявка предложит чужой труд под вашим именем:\n${lines}` +
      `${foreign.length > 5 ? '\n    …' : ''}\n` +
      '  Выход: собрать ветку начисто от origin/main и перенести только свои коммиты\n' +
      '  (при занятом дереве — в отдельном рабочем дереве, см. эпик гигиены #1232).',
  };
}

/**
 * Коммиты между базой и головой, разделённые на свои и чужие.
 * «Свой» — совпадает с текущим git-автором дерева; сравнение по email, не по имени.
 */
export function baseOwnership(base = 'origin/main', ref = 'HEAD', cwd = process.cwd()) {
  const me = execFileSync('git', ['config', 'user.email'], { cwd, encoding: 'utf8' }).trim().toLowerCase();
  const raw = execFileSync('git', ['log', '--format=%h%x00%ae%x00%an%x00%s', `${base}..${ref}`], {
    cwd,
    encoding: 'utf8',
    maxBuffer: 20e6,
  });
  const own = [];
  const foreign = [];
  for (const line of raw.split(/\r?\n/).filter(Boolean)) {
    const [sha, email, author, subject] = line.split('\0');
    if ((email ?? '').toLowerCase() === me) own.push(sha);
    else foreign.push({ sha, author: author || email || 'неизвестный', subject: subject ?? '' });
  }
  return classifyBaseOwnership({ own, foreign });
}

/** Сколько коммитов базы отсутствуют в ветке. */
export function countBehind(base = 'origin/main', ref = 'HEAD', cwd = process.cwd()) {
  const out = execFileSync('git', ['rev-list', '--count', `${ref}..${base}`], { cwd, encoding: 'utf8' });
  return Number(out.trim()) || 0;
}

/**
 * Файлы, изменённые базой после точки ветвления, которых ветка НЕ касалась.
 * Ровно они и выглядят «удалениями» в `git diff base..HEAD`.
 */
export function phantomDeletions(base = 'origin/main', ref = 'HEAD', cwd = process.cwd()) {
  const mergeBase = execFileSync('git', ['merge-base', ref, base], { cwd, encoding: 'utf8' }).trim();
  const list = (range) =>
    execFileSync('git', ['diff', '--name-only', range], { cwd, encoding: 'utf8' }).split(/\r?\n/).filter(Boolean);
  const changedByBase = new Set(list(`${mergeBase}..${base}`));
  const touchedByBranch = new Set(list(`${mergeBase}..${ref}`));
  return [...changedByBase].filter((f) => !touchedByBranch.has(f));
}

/** Полная проверка с git. Возвращает результат classifyBaseFreshness. */
export function checkBaseFreshness(base = 'origin/main', ref = 'HEAD', cwd = process.cwd()) {
  const behind = countBehind(base, ref, cwd);
  return classifyBaseFreshness({
    behind,
    phantomDeletions: behind > 0 ? phantomDeletions(base, ref, cwd) : [],
  });
}
