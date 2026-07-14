/**
 * protocol-validator (#469 ti-2): валидатор канона протокола консилиума /
 * инсайт-ревью для оффлайн-канала (когда LLM недоступен, протокол пишется в
 * IDE-чате). Чистые функции — только парсинг и арифметика, без сети и LLM.
 *
 * Роли Membrana (метки в квадратных скобках). Реплика роли начинается со
 * строки `[Роль]:` или `[Роль — Имя]:` (формат competition-протоколов).
 */
export const MEMBRANA_ROLE_LABELS = ['Teamlead', 'Структурщик', 'Математик', 'Музыкант', 'Верстальщик'];

/** Число реплик каждой роли: `[Роль]:` / `[Роль — Имя]:` в начале строки. */
export function countRoleReplies(md, roleLabels = MEMBRANA_ROLE_LABELS) {
  const counts = Object.fromEntries(roleLabels.map((r) => [r, 0]));
  for (const line of md.split(/\r?\n/)) {
    const m = line.match(/^\s*\[([^\]:]+?)(?:\s+—[^\]]*)?\]\s*:/u);
    if (!m) continue;
    const role = m[1].trim();
    if (role in counts) counts[role] += 1;
  }
  return counts;
}

/** Таблица «Роль | … | /10» инсайт-ревью → {scores[], average, declared}. */
export function parseVotingTable(md) {
  const scores = [];
  for (const line of md.split(/\r?\n/)) {
    const cells = line.split('|').map((c) => c.trim());
    if (cells.length < 3) continue;
    const label = cells[1];
    const last = cells[cells.length - 2]; // последняя непустая колонка (перед хвостовым |)
    if (!MEMBRANA_ROLE_LABELS.includes(label)) continue;
    const n = Number(last);
    if (Number.isFinite(n) && n >= 1 && n <= 10) scores.push(n);
  }
  const declared = md.match(/\*\*Средний балл(?:\s+команды)?:\*\*\s*([\d.]+)/)?.[1];
  const average = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
  return { scores, average, declared: declared != null ? Number(declared) : null };
}

/**
 * Общий валидатор канона. kind: 'consilium' (≥ minReplies суммарно, каждая роль
 * ≥1, секция итога) | 'insight-review' (5 ролей ≥1, таблица голосования, средний
 * балл сходится с заявленным ±0.1).
 * @returns {{ ok: boolean, problems: string[], stats: object }}
 */
export function validateProtocol(md, { kind = 'consilium', minReplies = 20, roleLabels = MEMBRANA_ROLE_LABELS } = {}) {
  const problems = [];
  const counts = countRoleReplies(md, roleLabels);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  // (3) каждая роль ≥1 реплики (обе формы протокола)
  for (const [role, n] of Object.entries(counts)) {
    if (n === 0) problems.push(`роль «${role}» не высказалась ни разу`);
  }

  if (kind === 'insight-review') {
    const vote = parseVotingTable(md);
    if (vote.scores.length < roleLabels.length) {
      problems.push(`таблица голосования: распознано ${vote.scores.length} из ${roleLabels.length} ролей`);
    }
    if (vote.declared == null) {
      problems.push('нет строки «**Средний балл:**»');
    } else if (vote.average != null && Math.abs(vote.average - vote.declared) > 0.1) {
      problems.push(`средний балл не сходится: посчитано ${vote.average.toFixed(2)}, заявлено ${vote.declared}`);
    }
    if (!/рекомендуемый статус/iu.test(md)) {
      problems.push('нет резюме с «Рекомендуемый статус»');
    }
    return { ok: problems.length === 0, problems, stats: { counts, total, vote } };
  }

  // consilium
  // (1) метаданные-таблица
  if (!/^\|\s*Поле\s*\|/mu.test(md) && !/^#\s*Метаданные/mu.test(md)) {
    problems.push('нет таблицы метаданных (| Поле | Значение |)');
  }
  // (2) суммарный порог реплик
  if (total < minReplies) {
    problems.push(`реплик ролей ${total} < минимума ${minReplies}`);
  }
  // (4) секция итога/консенсуса
  if (!/итоговое решение|консенсус|## итог/iu.test(md)) {
    problems.push('нет секции итогового решения / консенсуса');
  }
  return { ok: problems.length === 0, problems, stats: { counts, total } };
}
