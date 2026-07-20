/**
 * classify-worktree — чистый предикат lifecycle рабочего дерева (K2, #717).
 *
 * Вердикт заседания worktree-hygiene-gaps M1 (2026-07-20): дерево классифицируется
 * по метке `kind` из карточки WORKTREE.md и состоянию PR — НЕ по возрасту (кандидат
 * «по времени» отвергнут: тихая живая работа даёт ложное срабатывание) и НЕ по
 * `git branch --merged` (squash-мёрж делает его слепым, замер #492).
 *
 * Классы:
 *   canon         — каноническое долгоживущее дерево, сносу не подлежит никогда
 *   sprint-closed — спринт-дерево, работа мертва: PR merged/closed, хвостов нет
 *   sprint-open   — спринт-дерево с живой работой (открытый PR / грязь / незапушенное)
 *   unregistered  — дерево без карточки WORKTREE.md: само по себе хвост, разбор человеку
 *   unknown       — состояние PR недоступно (сеть/gh): НЕ сносить, fail-closed
 *
 * Детерминизм: один снимок входа → бит-в-бит одна разметка. Времени в предикате нет.
 * Здесь только чистые функции (без git/gh/fs) — их гоняют тесты на фикстурах.
 */

/** Закрытое каноническое множество деревьев (консилиум tier2-git-hygiene, M1). */
export const CANON_NAMES = Object.freeze(['main', 'tooling', 'product', 'codex', 'cursor']);

export const WORKTREE_CLASSES = Object.freeze([
  'canon',
  'sprint-closed',
  'sprint-open',
  'unregistered',
  'unknown',
]);

/**
 * Разбор карточки WORKTREE.md. Формат — markdown-таблица `| Поле | Значение |`;
 * терпит и plain-строки `kind: sprint`. Возвращает null, если текст не несёт `kind`
 * (карточка без различителя = отсутствие регистрации, а не «почти карточка»).
 *
 * @param {string|null|undefined} markdown
 * @returns {{kind: string, canonName?: string, base?: string, owner?: string} | null}
 */
export function parseWorktreeCard(markdown) {
  if (!markdown) return null;
  const fields = new Map();
  for (const line of String(markdown).split(/\r?\n/)) {
    const row = line.match(/^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|/);
    if (row) {
      fields.set(row[1].toLowerCase(), row[2].trim());
      continue;
    }
    const plain = line.match(/^\s*(kind|canonName|base|owner)\s*:\s*(\S.*?)\s*$/i);
    if (plain) fields.set(plain[1].toLowerCase(), plain[2].trim());
  }
  const kind = (fields.get('kind') ?? '').toLowerCase();
  if (kind !== 'canon' && kind !== 'sprint') return null;
  const card = { kind };
  const canonName = fields.get('canonname');
  if (canonName) card.canonName = canonName.toLowerCase();
  const base = fields.get('base') ?? fields.get('базовая ветка');
  // Карточка пишется рукой — «main (спринт всегда в свою ветку)» тоже валидная база.
  if (base) card.base = base.split(/\s/)[0];
  const owner = fields.get('owner') ?? fields.get('владелец');
  if (owner) card.owner = owner;
  return card;
}

/** PR мёртв? Право на снос даёт состояние PR, не git-предки (squash, #492). */
export function prClosed(pr) {
  return Boolean(pr && (pr.state === 'MERGED' || pr.state === 'CLOSED'));
}

/**
 * Классификация одного дерева.
 *
 * @param {object} w
 * @param {string} w.path                — путь дерева (в reasons, на решение не влияет)
 * @param {string|null} w.branch        — ветка дерева; null = detached HEAD
 * @param {{kind:string}|null} w.card   — разобранная карточка (parseWorktreeCard)
 * @param {number} w.dirtyCount         — строк `git status --porcelain`
 * @param {number} w.unpushedCount      — локальных коммитов, которых нет на origin
 * @param {{number:number, state:string}|null} w.pr — самый свежий PR ветки
 * @param {boolean} [w.ghUnavailable]   — gh/сеть недоступны: состояние PR неизвестно
 * @returns {{class: string, reasons: string[]}}
 */
export function classifyWorktree(w) {
  const reasons = [];

  if (w.card?.kind === 'canon') {
    reasons.push(
      w.card.canonName
        ? `карточка kind=canon (${w.card.canonName}) — сносу не подлежит`
        : 'карточка kind=canon — сносу не подлежит',
    );
    return { class: 'canon', reasons };
  }

  if (!w.card) {
    reasons.push('нет карточки WORKTREE.md — дерево не зарегистрировано, разбор человеку');
    return { class: 'unregistered', reasons };
  }

  // Дальше kind=sprint (parseWorktreeCard другого не возвращает).
  if (!w.branch) {
    reasons.push('detached HEAD — состояние работы не определить, разбирать вручную');
    return { class: 'unknown', reasons };
  }

  if (w.ghUnavailable) {
    reasons.push('состояние PR недоступно (gh/сеть) — не сносить');
    return { class: 'unknown', reasons };
  }

  const dead = prClosed(w.pr);
  const dirty = (w.dirtyCount ?? 0) > 0;
  const unpushed = (w.unpushedCount ?? 0) > 0;

  if (dead && !dirty && !unpushed) {
    reasons.push(`PR #${w.pr.number} ${w.pr.state}, дерево чистое — кандидат к сносу`);
    return { class: 'sprint-closed', reasons };
  }

  if (dead) {
    reasons.push(`PR #${w.pr.number} ${w.pr.state}, но работа не доехала:`);
    if (dirty) reasons.push(`${w.dirtyCount} незакоммиченных изменений`);
    if (unpushed) reasons.push(`${w.unpushedCount} незапушенных коммитов`);
  } else if (w.pr) {
    reasons.push(`открытый PR #${w.pr.number}`);
  } else {
    reasons.push('PR не заведён — работа ещё локальная');
  }
  if (!dead && dirty) reasons.push(`${w.dirtyCount} незакоммиченных изменений`);
  if (!dead && unpushed) reasons.push(`${w.unpushedCount} незапушенных коммитов`);
  return { class: 'sprint-open', reasons };
}

/**
 * Проекция класса в решение «сносить?» для repo:clean.
 * Гарды процесса (главный checkout, текущая сессия, locked) остаются у вызывающего:
 * они про исполнение, не про lifecycle.
 */
export function shouldTeardown(classification) {
  return classification.class === 'sprint-closed';
}
