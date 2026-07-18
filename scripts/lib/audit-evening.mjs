/**
 * Вечерний аудит дня — что РЕАЛЬНО происходило в трёх местах, где живёт работа:
 * репозиторий, реестр задач, граф правды.
 *
 * Отвечает на один вопрос: «что случилось за день». Не оценивает, не выносит
 * вердиктов о качестве, не сверяет с планом — только показывает движение по фактам.
 *
 * ЧИСТОЕ ЯДРО: функции принимают уже прочитанные данные (снимок «до» и «после»),
 * не ходят ни в git, ни в fs, ни в сеть. Вся добыча — в обвязке `audit-evening.mjs`.
 * Отсюда воспроизводимость: один и тот же вход даёт один и тот же отчёт.
 */

/** Ключ строки состояния карточки: по нему видно, что именно сдвинулось. */
const cardState = (t) => `${t.status}|${t.githubIssueClosedAt ?? ''}|${t.archivedAt ?? ''}`;

/**
 * Движение реестра задач между двумя снимками.
 *
 * @param {{tasks: object[]}} before снимок на начало дня
 * @param {{tasks: object[]}} after текущий
 * @returns {{added: object[], archived: object[], statusChanged: object[], counts: object}}
 */
export function registryMovement(before, after) {
  const prev = new Map((before?.tasks ?? []).map((t) => [t.id, t]));
  const added = [];
  const archived = [];
  const statusChanged = [];

  for (const t of after?.tasks ?? []) {
    const old = prev.get(t.id);
    if (!old) {
      added.push({ id: t.id, title: t.title ?? '', status: t.status, issue: t.githubIssue ?? null });
      continue;
    }
    if (old.status !== t.status) {
      const move = { id: t.id, title: t.title ?? '', from: old.status, to: t.status, issue: t.githubIssue ?? null };
      if (t.status === 'archived') archived.push(move);
      else statusChanged.push(move);
    } else if (cardState(old) !== cardState(t)) {
      // Статус тот же, но поля движения изменились (напр. проставлена дата закрытия).
      statusChanged.push({ id: t.id, title: t.title ?? '', from: old.status, to: t.status, issue: t.githubIssue ?? null, fieldsOnly: true });
    }
  }

  const active = (after?.tasks ?? []).filter((t) => t.status === 'active').length;
  return {
    added,
    archived,
    statusChanged,
    counts: { total: (after?.tasks ?? []).length, active, wasTotal: (before?.tasks ?? []).length },
  };
}

/**
 * Движение графа правды между двумя снимками.
 *
 * Отозванный токен — не удалённый: `status` меняется на `revoked`, запись остаётся.
 * Поэтому отзыв ловим сравнением статусов, а не отсутствием в новом снимке.
 */
export function truthMovement(before, after) {
  const prev = new Map((before?.tokens ?? []).map((t) => [t.id, t]));
  const added = [];
  const revoked = [];
  const changed = [];

  for (const t of after?.tokens ?? []) {
    const old = prev.get(t.id);
    const claim = String(t.claim ?? '').trim();
    if (!old) {
      added.push({ id: t.id, class: t.class ?? '', status: t.status ?? '', claim });
      continue;
    }
    if (old.status !== t.status) {
      const move = { id: t.id, from: old.status, to: t.status, claim };
      if (t.status === 'revoked') revoked.push(move);
      else changed.push(move);
    }
  }

  const tokens = after?.tokens ?? [];
  return {
    added,
    revoked,
    changed,
    counts: {
      total: tokens.length,
      active: tokens.filter((t) => t.status === 'active').length,
      owner: tokens.filter((t) => t.class === 'owner').length,
      derived: tokens.filter((t) => t.class === 'derived').length,
      wasTotal: (before?.tokens ?? []).length,
    },
  };
}

/**
 * Области продукта — куда уходят строки. Порядок важен: первое совпадение выигрывает,
 * поэтому частное (`packages/services/detectors`) стоит выше общего (`packages/`).
 *
 * Смысл разреза — ответить «на что ушёл день», а не «какие файлы тронуты». Поэтому
 * границы продуктовые, а не по языку: тулинг это `scripts/`, даже если там тот же JS,
 * что и в продукте, а регламенты — бизнес-процесс, хотя это markdown.
 */
export const AREAS = [
  {
    key: 'product',
    label: 'Основной продукт',
    hint: 'ядро, детекторы, клиент, устройство',
    match: (p) =>
      /^packages\/(core|device-board|drift-anchor|agenda|libs)\//u.test(p)
      || /^packages\/services\//u.test(p)
      || /^apps\/(client|membrana-device|membrana-studio)\//u.test(p),
  },
  {
    key: 'cabinet',
    label: 'Кабинет',
    hint: 'кабинет и его бэкенд',
    match: (p) => /^apps\/cabinet\//u.test(p) || /^packages\/background-(cabinet|media|office)\//u.test(p),
  },
  {
    key: 'tooling',
    label: 'Тулинг',
    hint: 'скрипты, хуки, скиллы, CI',
    match: (p) =>
      /^scripts\//u.test(p) || /^tools\//u.test(p) || /^\.githooks\//u.test(p)
      || /^\.(github|cursor|claude)\//u.test(p) || /^(package\.json|turbo\.json|yarn\.lock)$/u.test(p),
  },
  {
    key: 'process',
    label: 'Бизнес-процессы',
    hint: 'регламенты, заседания, реестр, граф правды',
    match: (p) =>
      /^docs\/(prompts|seanses|meeting|truth|tasks|insights|virtual-team|actions|handoff|archive|adr|discussions)\//u.test(p)
      || /^docs\/[A-Z_]+\.md$/u.test(p)
      || /^prd\//u.test(p)
      || /^(AGENTS\.md|\.cursorrules|\.markdownlint\.json)$/u.test(p),
  },
  {
    key: 'showcase',
    label: 'Витрина для менеджмента',
    hint: 'панель, доки, демо, коммуникации',
    match: (p) =>
      /^apps\/(panel|docs|demos|comms-studio)\//u.test(p)
      || /^docs\/(comms|design)\//u.test(p)
      || /^deploy\//u.test(p),
  },
];

/**
 * Строки по областям: сколько кода ушло на продукт, кабинет, тулинг, процессы, витрину.
 *
 * `added`/`removed` разделены сознательно: 500 добавленных и 500 удалённых — это не
 * «ничего не делали», а переписывание, и по одной сумме это неотличимо.
 *
 * @param {{path: string, added: number, removed: number}[]} fileStats
 */
export function linesByArea(fileStats) {
  const acc = new Map(AREAS.map((a) => [a.key, { ...a, added: 0, removed: 0, files: 0 }]));
  acc.set('other', { key: 'other', label: 'Прочее', hint: 'вне классификации', added: 0, removed: 0, files: 0 });

  for (const f of fileStats ?? []) {
    const area = AREAS.find((a) => a.match(f.path))?.key ?? 'other';
    const slot = acc.get(area);
    slot.added += f.added;
    slot.removed += f.removed;
    slot.files += 1;
  }

  const rows = [...acc.values()]
    .filter((r) => r.files > 0)
    .map(({ match, ...r }) => ({ ...r, net: r.added - r.removed }))
    .sort((a, b) => b.added + b.removed - (a.added + a.removed));

  const totals = rows.reduce(
    (t, r) => ({ added: t.added + r.added, removed: t.removed + r.removed, files: t.files + r.files }),
    { added: 0, removed: 0, files: 0 },
  );
  return { rows, totals };
}

/**
 * Движение репозитория: коммиты дня, сгруппированные по типу conventional-commit.
 *
 * Тип несёт смысл для отчёта: `feat`/`fix` — продукт и починки, `docs` — канон,
 * `chore` — обвязка. Группировка показывает, куда ушёл день, без чтения кода.
 *
 * @param {{sha: string, subject: string, files: number}[]} commits
 */
export function repoMovement(commits) {
  const byType = new Map();
  const merged = [];

  for (const c of commits ?? []) {
    const type = c.subject.match(/^(\w+)(?:\([^)]*\))?!?:/u)?.[1] ?? 'прочее';
    if (!byType.has(type)) byType.set(type, []);
    byType.get(type).push(c);
    const pr = c.subject.match(/\(#(\d+)\)\s*$/u)?.[1];
    if (pr) merged.push({ pr: Number(pr), subject: c.subject.replace(/\s*\(#\d+\)\s*$/u, '') });
  }

  return {
    total: (commits ?? []).length,
    byType: [...byType.entries()].map(([type, list]) => ({ type, count: list.length, commits: list }))
      .sort((a, b) => b.count - a.count || a.type.localeCompare(b.type)),
    merged,
    files: (commits ?? []).reduce((sum, c) => sum + (c.files ?? 0), 0),
  };
}

/** Строка «N карточек» / «N токенов» с правильным окончанием — отчёт читает человек. */
function plural(n, one, few, many) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return `${n} ${one}`;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return `${n} ${few}`;
  return `${n} ${many}`;
}

/**
 * Отрендерить отчёт. Детерминированная проекция данных в markdown — при одном входе
 * даёт побайтово один выход, поэтому пригодна для сравнения между днями.
 *
 * @param {{date: string, base: string, head: string, repo: object, lines: object, registry: object, truth: object}} data
 */
export function renderReport(data) {
  const { date, base, head, repo, registry, truth, lines } = data;
  const out = [];

  out.push(`# Что происходило — ${date}`);
  out.push('');
  out.push(`> Механическая выжимка из трёх источников. Никаких оценок: только движение.`);
  out.push(`> База \`${base.slice(0, 8)}\` → \`${head.slice(0, 8)}\`.`);
  out.push('');
  out.push(
    `**Коротко:** ${plural(repo.total, 'коммит', 'коммита', 'коммитов')}, ` +
      `${plural(repo.merged.length, 'PR', 'PR', 'PR')} влито · ` +
      `реестр ${registry.counts.wasTotal} → ${registry.counts.total} ` +
      `(${plural(registry.archived.length, 'карточка', 'карточки', 'карточек')} в архив) · ` +
      `граф правды ${truth.counts.wasTotal} → ${truth.counts.total} ` +
      `(+${plural(truth.added.length, 'токен', 'токена', 'токенов')})`,
  );
  out.push('');

  // ── 1. Репозиторий ───────────────────────────────────────────────────────────
  out.push('## 1. Репозиторий');
  out.push('');
  if (repo.total === 0) {
    out.push('_Коммитов за день нет._');
    out.push('');
  } else {
    const { rows, totals } = lines;
    out.push(
      `Коммитов: **${repo.total}** · файлов: **${totals.files}** · ` +
        `строк: **+${totals.added} / −${totals.removed}**.`,
    );
    out.push('');
    out.push('### Куда ушли строки');
    out.push('');
    out.push('| Область | Строк (+/−) | Доля | Файлов | Что это |');
    out.push('|---|---:|---:|---:|---|');
    const volume = totals.added + totals.removed;
    for (const r of rows) {
      const share = volume === 0 ? 0 : Math.round(((r.added + r.removed) / volume) * 100);
      const bar = '█'.repeat(Math.max(0, Math.round(share / 5)));
      out.push(
        `| **${r.label}** | +${r.added} / −${r.removed} | ${share}% ${bar} | ${r.files} | ${r.hint} |`,
      );
    }
    out.push('');
    out.push('_Добавленное и удалённое врозь: переписывание — не «ничего не делали»._');
    out.push('');

    out.push('### О чём коммиты');
    out.push('');
    for (const g of repo.byType) {
      out.push(`**\`${g.type}\` — ${plural(g.count, 'коммит', 'коммита', 'коммитов')}**`);
      out.push('');
      for (const c of g.commits.slice(0, 8)) {
        out.push(`- ${c.subject.replace(/^\w+(?:\([^)]*\))?!?:\s*/u, '')}`);
      }
      if (g.commits.length > 8) out.push(`- _…и ещё ${g.commits.length - 8}_`);
      out.push('');
    }

    if (repo.merged.length > 0) {
      out.push(`**Влито PR: ${repo.merged.length}**`);
      out.push('');
      for (const m of repo.merged) out.push(`- #${m.pr} — ${m.subject}`);
      out.push('');
    }
  }

  // ── 2. Реестр задач ──────────────────────────────────────────────────────────
  out.push('## 2. Реестр задач');
  out.push('');
  out.push(`Всего карточек: **${registry.counts.total}** (было ${registry.counts.wasTotal}), из них active: **${registry.counts.active}**.`);
  out.push('');
  // Правки одних лишь полей (напр. массовый прогон синхронизации) — это не движение
  // работы, а обслуживание данных. Показываем числом, иначе 190 одинаковых строк
  // хоронят две настоящие: живой прогон 18.07 дал ровно такую картину.
  const realMoves = registry.statusChanged.filter((t) => !t.fieldsOnly);
  const fieldOnly = registry.statusChanged.length - realMoves.length;

  const regBlocks = [
    ['Заведено', registry.added, (t) => `\`${t.id}\`${t.issue ? ` (#${t.issue})` : ''} — ${t.title}`],
    ['В архив', registry.archived, (t) => `\`${t.id}\`${t.issue ? ` (#${t.issue})` : ''} — ${t.from} → ${t.to}`],
    ['Сменили статус', realMoves, (t) => `\`${t.id}\`${t.issue ? ` (#${t.issue})` : ''} — ${t.from} → ${t.to}`],
  ];
  let regQuiet = true;
  for (const [title, list, fmt] of regBlocks) {
    if (list.length === 0) continue;
    regQuiet = false;
    out.push(`**${title}: ${list.length}**`);
    out.push('');
    for (const item of list.slice(0, 15)) out.push(`- ${fmt(item)}`);
    if (list.length > 15) out.push(`- _…и ещё ${list.length - 15}_`);
    out.push('');
  }
  if (fieldOnly > 0) {
    out.push(`_Плюс ${plural(fieldOnly, 'карточка', 'карточки', 'карточек')} с обновлёнными полями движения (синхронизация данных, не работа)._`);
    out.push('');
    regQuiet = false;
  }
  if (regQuiet) {
    out.push('_Реестр за день не двигался._');
    out.push('');
  }

  // ── 3. Граф правды ───────────────────────────────────────────────────────────
  out.push('## 3. Граф правды');
  out.push('');
  out.push(
    `Токенов: **${truth.counts.total}** (было ${truth.counts.wasTotal}) · ` +
      `active ${truth.counts.active} · владельческих ${truth.counts.owner} · выведенных ${truth.counts.derived}.`,
  );
  out.push('');
  if (truth.added.length > 0) {
    out.push(`**Закристаллизовано: ${truth.added.length}**`);
    out.push('');
    for (const t of truth.added) {
      out.push(`- \`${t.id}\` (${t.class || '—'}) — ${t.claim.slice(0, 120)}${t.claim.length > 120 ? '…' : ''}`);
    }
    out.push('');
  }
  if (truth.revoked.length > 0) {
    out.push(`**Отозвано: ${truth.revoked.length}**`);
    out.push('');
    for (const t of truth.revoked) out.push(`- \`${t.id}\` — ${t.claim.slice(0, 120)}`);
    out.push('');
  }
  if (truth.changed.length > 0) {
    out.push(`**Сменили статус: ${truth.changed.length}**`);
    out.push('');
    for (const t of truth.changed) out.push(`- \`${t.id}\` — ${t.from} → ${t.to}`);
    out.push('');
  }
  if (truth.added.length + truth.revoked.length + truth.changed.length === 0) {
    out.push('_Граф правды за день не двигался._');
    out.push('');
  }

  return out.join('\n');
}
