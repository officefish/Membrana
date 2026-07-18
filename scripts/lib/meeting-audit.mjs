/**
 * meeting:audit — пять проверок аудитора заседания (`docs/MEETING_REGULATION.md`).
 *
 * Регламент объявлял эти команды в § «Реестр и команды», но файла не существовало —
 * ровно тот же класс, что пропавший `tasks-audit.mjs`. Дефект `Db` заседания
 * `meeting-evening-auditor`: канон описывает тулинг, которого нет.
 *
 * ЧЕСТНО О ЗУБАХ. Регламент сам признаёт: «одна проверка из пяти» имела зубы.
 * Здесь их четыре с половиной:
 *   1 — машинная (`meetingAgendaProblem`, отказ до прогона);
 *   2 — полумашинная: наличие секции вердикта проверяется, СЕМАНТИКА — нет (#558);
 *   3 — машинная: порядок по датам протоколов;
 *   4 — машинная в структурной части (`meetingVerdictProblems`), семантика — нет;
 *   5 — машинная при условии, что артефакты в git (иначе «доказать нечем», а не PASS).
 *
 * Что НЕ проверяется и проверено быть не может: семантическая колонизация без
 * называния ID, спрятанная посылка, качество разбора фактуры. Это работа
 * агента-аудитора. Пустой выход = «структурных нарушений нет», НЕ «процедура чиста».
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  extractAgendaIds,
  findUncoveredAgendaItems,
  hasVerdictSection,
  meetingAgendaProblem,
  meetingVerdictProblems,
} from './protocol-validator.mjs';

/** Повестки заседания: `docs/meeting/<id>/M*-topic.md` → [{file, name, md}]. */
export function readTopics(repoRoot, id) {
  const dir = join(repoRoot, 'docs', 'meeting', id);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => /-topic\.md$/u.test(f))
    .sort()
    .map((f) => ({ file: f, name: f.replace(/-topic\.md$/u, ''), md: readFileSync(join(dir, f), 'utf8') }));
}

/** Протоколы заседания: `docs/seanses/<id>-*.md` → [{file, md}]. */
export function readProtocols(repoRoot, id) {
  const dir = join(repoRoot, 'docs', 'seanses');
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.startsWith(`${id}-`) && f.endsWith('.md'))
    .sort()
    .map((f) => ({ file: f, md: readFileSync(join(dir, f), 'utf8') }));
}

/** Отслеживается ли файл в git (для проверки 5 — иначе «доказать нечем»). */
export function isTracked(repoRoot, relPath) {
  try {
    execFileSync('git', ['ls-files', '--error-unmatch', relPath], {
      cwd: repoRoot,
      stdio: 'pipe',
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Пять проверок. Чистая функция от собранного состояния — шов для тестов.
 *
 * @param {{topics: object[], protocols: object[], untracked: string[]}} state
 * @returns {{checks: object[], violations: number}}
 */
export function auditMeeting(state) {
  const checks = [];
  const allIds = state.topics.flatMap((t) => extractAgendaIds(t.md));

  // 1 — повестка = ровно один ID-вопрос.
  for (const t of state.topics) {
    const problem = meetingAgendaProblem(t.md);
    checks.push({
      n: 1,
      subject: t.file,
      status: problem === '' ? 'PASS' : 'FAIL',
      note: problem || `один вопрос: ${extractAgendaIds(t.md).join(', ')}`,
    });
  }

  // 2 — вердикт есть в теле (полумашинно: секция да, семантика нет).
  for (const p of state.protocols) {
    const verdict = hasVerdictSection(p.md);
    checks.push({
      n: 2,
      subject: p.file,
      status: verdict ? 'PASS' : 'FAIL',
      note: verdict
        ? 'секция вердикта есть (семантику машина не судит — #558)'
        : 'секции вердикта нет — вероятно, заседание не состоялось (S-M2)',
    });
  }

  // 3 — порядок: протоколы не датированы вразрез с сортировкой имён.
  const dates = state.protocols.map((p) => p.md.match(/\d{4}-\d{2}-\d{2}T[\d:.]+Z/u)?.[0] ?? '');
  const outOfOrder = dates.some((d, i) => i > 0 && d !== '' && dates[i - 1] !== '' && d < dates[i - 1]);
  checks.push({
    n: 3,
    subject: 'порядок протоколов',
    status: outOfOrder ? 'FAIL' : 'PASS',
    note: outOfOrder ? 'протокол датирован раньше предшественника' : `${state.protocols.length} протокол(ов) по возрастанию`,
  });

  // 4 — структура вердикта (зубы: вывод-в-посылках, колонизация по ID).
  for (const p of state.protocols) {
    const own = extractAgendaIds(p.md);
    const siblings = [...new Set(allIds)].filter((id) => !own.includes(id));
    const problems = meetingVerdictProblems(p.md, siblings);
    checks.push({
      n: 4,
      subject: p.file,
      status: problems.length === 0 ? 'PASS' : 'FAIL',
      note: problems.length === 0 ? 'структурных дефектов не найдено (НЕ «чист»)' : problems.join('; '),
    });
  }

  // 5 — задание не поехало: доказуемо только если артефакты в git.
  checks.push({
    n: 5,
    subject: 'артефакты в git',
    status: state.untracked.length === 0 ? 'PASS' : 'НЕЧЕМ',
    note:
      state.untracked.length === 0
        ? 'история есть — правку после ратификации видно'
        : `вне git: ${state.untracked.join(', ')} — проверка без зубов`,
  });

  return { checks, violations: checks.filter((c) => c.status === 'FAIL').length };
}

/** Полный сбор + аудит (единственная IO-точка). */
export function runMeetingAudit(repoRoot, id) {
  const topics = readTopics(repoRoot, id);
  const protocols = readProtocols(repoRoot, id);
  const candidates = [
    ...topics.map((t) => `docs/meeting/${id}/${t.file}`),
    ...protocols.map((p) => `docs/seanses/${p.file}`),
    `docs/meeting/${id}/MEETING_BRIEF.md`,
    `docs/meeting/${id}/MEETING_ACTIVE.md`,
  ];
  const untracked = candidates.filter(
    (rel) => existsSync(join(repoRoot, rel)) && !isTracked(repoRoot, rel),
  );
  return { topics, protocols, ...auditMeeting({ topics, protocols, untracked }) };
}
