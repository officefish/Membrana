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

/**
 * Метки `[…]:` в начале строк, НЕ совпавшие ни с одной известной ролью.
 *
 * rt-6: инцидент 16.07 — протокол пришёл в формате `[Имя · Роль]:` вместо
 * `[Роль — Имя]:`. countRoleReplies никого не распознал → «роль не высказалась»
 * ×5, что уводило от корня (роли ГОВОРИЛИ, формат метки другой). Эта функция даёт
 * гейту материал для внятной подсказки вместо ложного «все молчат».
 */
export function unknownBracketLabels(md, roleLabels = MEMBRANA_ROLE_LABELS) {
  const known = new Set(roleLabels);
  const out = [];
  for (const line of md.split(/\r?\n/)) {
    const m = line.match(/^\s*\[([^\]]+?)\]\s*:/u);
    if (!m) continue;
    const label = m[1].trim();
    // `[Роль — Имя]` — известная форма: сверяем ЛЕВУЮ часть до тире.
    const roleHead = label.split(/\s+—/u)[0].trim();
    if (!known.has(roleHead) && !out.includes(label)) out.push(label);
  }
  return out;
}

/**
 * ID вопросов повестки из topic-файла: жирные метки `**A1`, `**B2`, `**Q3`.
 *
 * Конвенция rt-6: вопрос повестки помечается ID вида «буква(ы)+цифры», жирным.
 * Сегодня повестки уже так и размечались (A1/A2/A3, B1–B3, C1, Q1–Q6).
 */
export function extractAgendaIds(topicMd) {
  const ids = [];
  for (const m of String(topicMd ?? '').matchAll(/\*\*([A-ZА-Я]{1,2}\d+)\b/gu)) {
    if (!ids.includes(m[1])) ids.push(m[1]);
  }
  return ids;
}

/**
 * Тело протокола — реплики и итог, БЕЗ эхо-заголовка с вопросом.
 *
 * Ключ детектора: ID повестки встречаются в эхе `**Вопрос:**` (его вставляет сам
 * прогон), и наивный grep дал бы ложное «покрыто». Реальное покрытие — только если
 * ID назван в РЕПЛИКЕ или ИТОГЕ. Отсекаем всё до первой реплики `[Роль]:`.
 */
export function protocolBody(protocolMd) {
  const lines = String(protocolMd ?? '').split(/\r?\n/);
  const firstReply = lines.findIndex((l) => /^\s*\[[^\]]+\]\s*:/u.test(l));
  return firstReply === -1 ? '' : lines.slice(firstReply).join('\n');
}

/**
 * Вопросы повестки, НЕ покрытые протоколом (ID есть в topic, нет в теле протокола).
 *
 * Ровно тот сбой, что повторился ТРИЖДЫ за 16.07: консилиум расходился на первых
 * вопросах и молча ронял остальные. Здесь он становится машинным вердиктом.
 */
export function findUncoveredAgendaItems(topicMd, protocolMd) {
  const ids = extractAgendaIds(topicMd);
  const body = protocolBody(protocolMd);
  return ids.filter((id) => !new RegExp(`\\b${id}\\b`, 'u').test(body));
}

/**
 * Нарушение повестки ЗАСЕДАНИЯ: она обязана нести ровно ОДИН ID-вопрос (S-M1).
 *
 * Регламент: `docs/MEETING_REGULATION.md`. Почему отказ, а не предупреждение —
 * три ступени эскалации: промпт-дисциплина (урок 11.07 «пронумеруй точки, требуй эхо
 * с вердиктом») 17.07 была ИСПОЛНЕНА и всё равно не удержала; детекция
 * `findUncoveredAgendaItems` ловит уже по сожжённому прогону. При одном вопросе ронять
 * нечего: вердикт либо есть, либо заседания не было (S-M2).
 *
 * M0 (установочное) — не исключение: его единственный вопрос «какой порядок
 * зависимостей?», а кандидаты лежат в теле простым текстом без жирных ID и сюда не
 * попадают. Поэтому правило единообразно и флаг-исключение не нужен.
 *
 * Ноль вопросов — тоже нарушение: вердикту не на чем встать.
 *
 * @returns {string} пустая строка = повестка годна для заседания
 */
export function meetingAgendaProblem(topicMd) {
  const ids = extractAgendaIds(topicMd);
  if (ids.length === 1) return '';
  if (ids.length === 0) return 'повестка без ID-вопроса — вердикту не на чем встать';
  return `повестка несёт ${ids.length} вопрос(ов) (${ids.join(', ')}) — заседание разбирает ровно один`;
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
export function validateProtocol(
  md,
  { kind = 'consilium', minReplies = 20, roleLabels = MEMBRANA_ROLE_LABELS, agenda = null } = {},
) {
  const problems = [];
  const counts = countRoleReplies(md, roleLabels);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  // (3) каждая роль ≥1 реплики (обе формы протокола)
  const silent = Object.entries(counts).filter(([, n]) => n === 0);
  const unknown = unknownBracketLabels(md, roleLabels);
  for (const [role] of silent) {
    problems.push(`роль «${role}» не высказалась ни разу`);
  }
  // rt-6 подсказка: если роли «молчат», но есть нераспознанные метки — корень в
  // ФОРМАТЕ, а не в молчании (инцидент 16.07: `[Имя · Роль]` вместо `[Роль — Имя]`).
  if (silent.length > 0 && unknown.length > 0) {
    problems.push(
      `возможно, формат меток неверный — не распознаны: ${unknown.slice(0, 3).map((l) => `[${l}]`).join(', ')}. ` +
        'Канон: `[Роль — Имя]:` в начале строки',
    );
  }

  // rt-6 полнота повестки: каждый ID вопроса обязан быть назван в реплике/итоге.
  // Ловит сбой, повторившийся трижды 16.07 — консилиум молча ронял часть повестки.
  if (agenda) {
    const uncovered = findUncoveredAgendaItems(agenda, md);
    if (uncovered.length > 0) {
      problems.push(`повестка не покрыта: ${uncovered.join(', ')} — ни одной реплики/строки итога`);
    }
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
