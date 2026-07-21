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

/**
 * Маска файла повестки. В репозитории живут ТРИ соглашения об именах — слепота к
 * двум последним и есть корень #696 (маска ловила только `-topic.md`, а реальные
 * заседания пишут `M*_AGENDA.md`; совпадений ноль → проверки 1 и 4 не запускались):
 *   - `M0-topic.md … M2p-topic.md`  (evening-auditor, night-build-format, …);
 *   - `M0_AGENDA.md … M4_AGENDA.md`  (registry-relocation, team-execution-contour, …);
 *   - `AGENDA_M0.md … AGENDA_M1_RUN2.md`  (dads-integration).
 * `EPIC.md`, `MEETING_ACTIVE.md`, `TOXIC_PILOT_RESULT.md` и прочий обвес — мимо.
 * Переопределяется `MEETING_AGENDA_MASK` (env) для нестандартных заседаний.
 */
export const AGENDA_FILE_MASK = /(?:-topic\.md|_AGENDA\.md)$|^AGENDA_M[^/]*\.md$/u;

function agendaMask() {
  const raw = process.env.MEETING_AGENDA_MASK;
  if (!raw) return AGENDA_FILE_MASK;
  try {
    return new RegExp(raw, 'u');
  } catch {
    return AGENDA_FILE_MASK;
  }
}

/** Повестки заседания: `docs/meeting/<id>/<повестка>.md` → [{file, name, md}]. */
export function readTopics(repoRoot, id) {
  const dir = join(repoRoot, 'docs', 'meeting', id);
  if (!existsSync(dir)) return [];
  const mask = agendaMask();
  return readdirSync(dir)
    .filter((f) => mask.test(f))
    .sort()
    .map((f) => ({ file: f, name: f.replace(/\.md$/u, ''), md: readFileSync(join(dir, f), 'utf8') }));
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
 * С какой даты протокол обязан нести пометку канала (#616, вариант A).
 *
 * Правило вводится 19.07 — со следующего дня после находки, а не задним числом:
 * объявлять несостоявшимися уже написанные протоколы значило бы ровно ту
 * ретроактивность, которую регламент запрещает для посылок.
 */
export const TOOL_CHANNEL_SINCE = '2026-07-19';

/**
 * Ключ комнаты из имени повестки/протокола (#721).
 * `M1b-topic.md` / `…-m1b-sprint-….md` / `AGENDA_M0.md` → `m1b` / `m0`.
 * Длинные суффиксы (m1b, m2p, m4b) важнее коротких (m1, m2, m4).
 *
 * @param {string} filename
 * @returns {string|null}
 */
export function meetingRoomKey(filename) {
  const base = String(filename ?? '').replace(/\.md$/iu, '');
  const agenda = base.match(/^AGENDA_(M\d+[a-z]*)/iu);
  if (agenda) return agenda[1].toLowerCase();
  const matches = [...base.matchAll(/(?:^|[-_])(m\d+[a-z]*)(?=[-_.]|$)/giu)].map((m) => m[1].toLowerCase());
  if (matches.length === 0) return null;
  return matches.reduce((best, cur) => (cur.length > best.length ? cur : best));
}

/**
 * Own-ID комнаты для check4: из topic-файла этой комнаты, не из тела протокола.
 * Иначе DoD с «для E1» без `**E1` даёт ложную колонизацию (#721 / linear-egress).
 *
 * @param {{file: string, md: string}} protocol
 * @param {{file: string, md: string}[]} topics
 * @returns {string[]}
 */
export function ownAgendaIdsForProtocol(protocol, topics) {
  const room = meetingRoomKey(protocol.file);
  if (room) {
    const roomTopics = topics.filter((t) => meetingRoomKey(t.file) === room);
    if (roomTopics.length > 0) {
      const ids = [];
      for (const t of roomTopics) {
        for (const id of extractAgendaIds(t.md)) {
          if (!ids.includes(id)) ids.push(id);
        }
      }
      if (ids.length > 0) return ids;
    }
  }
  if (topics.length === 1) return extractAgendaIds(topics[0].md);
  return extractAgendaIds(protocol.md);
}

/**
 * Шесть проверок. Чистая функция от собранного состояния — шов для тестов.
 *
 * @param {{topics: object[], protocols: object[], untracked: string[]}} state
 * @returns {{checks: object[], violations: number}}
 */
export function auditMeeting(state) {
  const checks = [];
  const allIds = [...new Set(state.topics.flatMap((t) => extractAgendaIds(t.md)))];

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
  // siblings = topic IDs минус ID этой комнаты (topic-файл), не «всё минус grep тела» (#721).
  for (const p of state.protocols) {
    const own = ownAgendaIdsForProtocol(p, state.topics);
    const siblings = allIds.filter((id) => !own.includes(id));
    const problems = meetingVerdictProblems(p.md, siblings);
    checks.push({
      n: 4,
      subject: p.file,
      status: problems.length === 0 ? 'PASS' : 'FAIL',
      note: problems.length === 0 ? 'структурных дефектов не найдено (НЕ «чист»)' : problems.join('; '),
    });
  }

  // 6 — протокол произведён ИНСТРУМЕНТОМ, а не записан в seanses напрямую (#616, A).
  //
  // Находка 18.07: все девять протоколов `evening-auditor` не несут пометки канала —
  // они писались прямо в docs/seanses, минуя consilium.mjs. Значит структурный гейт
  // не «не сработал», он НЕ ВЫЗЫВАЛСЯ. Предотвращение при записи бессмысленно, пока
  // запись можно обойти, поэтому обход становится видимым нарушением.
  //
  // Отсечка по дате: сотни протоколов написаны до введения правила, объявлять их
  // задним числом несостоявшимися — та же ретроактивность, что запрещена для посылок.
  for (const p of state.protocols) {
    const date = p.file.match(/(\d{4}-\d{2}-\d{2})/u)?.[1] ?? '';
    // Даты в имени нет — отнести протокол к периоду правила НЕЧЕМ. Не судим:
    // «нет данных» это не нарушение (тот же принцип, что пустое поле в #620).
    if (date === '' || date < TOOL_CHANNEL_SINCE) continue;
    const stamped = /<!--\s*канал:\s*\w+/u.test(p.md);
    checks.push({
      n: 6,
      subject: p.file,
      status: stamped ? 'PASS' : 'FAIL',
      note: stamped
        ? 'произведён инструментом (канал помечен) — гейт посылок отработал при записи'
        : 'нет пометки канала: протокол записан мимо consilium.mjs, гейт посылок не вызывался',
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
