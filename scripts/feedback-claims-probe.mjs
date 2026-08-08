#!/usr/bin/env node
/**
 * feedback-claims-probe — сверка утверждений вечернего протокола с деревом.
 *
 * Блок b2 плана `docs/sprint/cut/feedback-claims-code-probe.json` (карточка
 * `feedback-claims-code-probe`, #1795, долг попугая `#team-feedback-claims-code-unverified`).
 *
 * ПОВОД. 07.08 протокол `team-evening-feedback` заявил «`decideTransition` вызван из
 * серверного роута» (роута нет), попросил ревью клиентской части #1776 (клиентских файлов
 * в PR нет), назвал тип `PromoDeclineReason` (его нет нигде) и предложил реализовать
 * ADR-0024, влитый в тот же день. Поймала ведущая глазом — уже после генерации, и только
 * потому, что села перепроверять. На этом протоколе строится доклад союзникам.
 *
 * READ-ONLY и НЕ ЧИНИТ — прямой запрет консилиума `main-day-issue-accuracy-2026-07-16`,
 * унаследованный вместе с раскроем: автопочинка (стереть строку, переписать протокол)
 * скрыла бы находку, ради которой гейт и строится. Отчёт печатается, секция дописывается
 * (`--append`), ничего не стирается.
 *
 * Usage: node scripts/feedback-claims-probe.mjs [--protocol <path>] [--json] [--append]
 *                                               [--include-holds] [--strict]
 * Exit:  0 — по умолчанию ВСЕГДА, даже при hard-нарушении: шаг обязателен в хвосте вечера
 *            по CLAUDE.md, и красный probe не отменяет сам протокол. Ласточку держит не
 *            exit-код, а предикат вечернего гейта (блок b3).
 *        1 — только с `--strict`: hard-нарушение для ручного прогона и CI.
 *        2 — probe не смог работать (нет протокола, нет git, битый реестр). Это отказ
 *            инструмента, а не вердикт о коде — путать их нельзя.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { ATOM_CLASSES, dedupeAtoms, extractAtoms } from './lib/feedback-claims/atoms.mjs';
import {
  formatClaimsReport,
  hasHardViolation,
  OUTCOMES,
  verdictsFor,
} from './lib/feedback-claims/verdict.mjs';

export const SEANCES_REL = 'docs/seanses';
export const PROTOCOL_PREFIX = 'team-evening-feedback-';
export const REGISTRY_REL = 'docs/tasks/registry.json';

/**
 * Исходники, где ищется символ.
 *
 * Префикс `:(glob)` обязателен: pathspec без него git трактует НЕ как shell-glob и молча
 * находит ноль — на этом первый прогон утреннего гейта 16.07 объявил существующий символ
 * отсутствующим, то есть соврал ровно в том кейсе, против которого построен.
 *
 * `scripts/**` ВХОДИТ в охват, и это поправка по живому прогону 08.08, а не расширение из
 * вкуса. Первая версия брала только `src` пакетов и приложений — прямой перенос
 * адреса утреннего гейта, который судит о продуктовом коде. Но вечерний протокол говорит
 * прежде всего о тулинге: прогон на протоколе 07.08 объявил ненайденными `state.day`,
 * `leadPersona`, `supportPersonas`, `sprintKind` — всё это живёт в `scripts/**`. Ровно класс
 * 03.08: маркер проверял НЕ ТОТ файл. Чужой адрес в гейте правдивости опаснее пропуска.
 *
 * `docs/**` в охват НЕ входит: упоминание символа в документе не доказывает, что код есть,
 * а сам протокол лежит в `docs/**` и находил бы собственные слова — то есть подтверждал бы
 * утверждение его же текстом.
 */
export const SOURCE_PATHSPECS = [
  ':(glob)packages/**/src/**',
  ':(glob)apps/**/src/**',
  ':(glob)scripts/**',
  // Семья самого гейта ИСКЛЮЧЕНА. Вещдок 08.08: после расширения охвата на `scripts/**`
  // символ `PromoDeclineReason` стал подтверждаться девятью вхождениями — все девять в
  // комментариях и зубах ЭТОГО прибора, где он назван как пример ложного утверждения.
  // Гейт подтверждал бы утверждения собственными словами о них; это второй вид той же
  // самореференции, что и разбор своей секции в протоколе.
  ':(glob,exclude)scripts/lib/feedback-claims/**',
  ':(exclude)scripts/feedback-claims-probe.mjs',
  ':(exclude)scripts/feedback-claims-probe.test.mjs',
];

/** @param {string[]} argv */
export function parseArgs(argv) {
  const o = {
    protocol: null,
    json: false,
    append: false,
    includeHolds: false,
    strict: false,
    state: false,
    ack: false,
    note: null,
    help: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--protocol') o.protocol = argv[i + 1] ?? null;
    else if (a === '--json') o.json = true;
    else if (a === '--append') o.append = true;
    else if (a === '--include-holds') o.includeHolds = true;
    else if (a === '--strict') o.strict = true;
    else if (a === '--state') o.state = true;
    else if (a === '--ack') o.ack = true;
    else if (a === '--note') o.note = argv[i + 1] ?? null;
    else if (a === '--help' || a === '-h') o.help = true;
  }
  return o;
}

/** Состояние вечера — тот же носитель, что у гейта ласточки. */
export const GATES_STATE_REL = 'docs/tasks/morning-gates-state.json';

function readState(cwd) {
  const p = resolve(cwd, GATES_STATE_REL);
  if (!existsSync(p)) return {};
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

function writeState(cwd, state) {
  writeFileSync(resolve(cwd, GATES_STATE_REL), `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

/**
 * Квитанция владельца на hard-нарушение.
 *
 * Гейт обязан быть проходимым: ложная тревога не должна вставать поперёк доклада партнёрам
 * на всю ночь. Но проход — СО СЛЕДОМ и с причиной, и привязан к дереву: сменилось дерево —
 * квитанция сгорела, вердикт снова свежий. Молчаливого обхода нет.
 */
export function ackClaimsProbe(state, { note, sha, at }) {
  const prev = state ?? {};
  const swallow = prev.swallow ?? {};
  const probe = swallow.claimsProbe ?? {};
  return {
    ...prev,
    swallow: {
      ...swallow,
      claimsProbe: {
        ...probe,
        override: { by: 'owner', note: note ?? null, sha: probe.sha ?? (sha ? String(sha).slice(0, 12) : null), at },
      },
    },
  };
}

/**
 * Прогон git. Возвращает `{ok, value}`: `ok: false` — «узнать не удалось», и только оно
 * даёт `null` в фактах. Пустой результат при exit 1 — это ФАКТ «не найдено», а не отказ:
 * подмена одного другим и есть то вранье, которое гейт ловит.
 */
function git(args, cwd) {
  try {
    const out = execFileSync('git', args, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 32 * 1024 * 1024,
    });
    return { ok: true, value: String(out) };
  } catch (error) {
    if (error?.status === 1) return { ok: true, value: '' };
    return { ok: false, value: '' };
  }
}

const lines = (s) => String(s ?? '').split('\n').map((l) => l.trim()).filter(Boolean);

/** Есть ли git вообще. Один раз на прогон: без него все факты честно `null`. */
function gitAvailable(cwd) {
  return git(['--version'], cwd).ok;
}

/** Текущий SHA — провенанс каждой строки отчёта. */
function headSha(cwd) {
  const r = git(['rev-parse', 'HEAD'], cwd);
  return r.ok ? r.value.trim() || undefined : undefined;
}

/**
 * Число строк-вхождений символа в исходниках.
 *
 * `--fixed-strings` без границ слова — осознанный выбор в пользу ПРОПУСКА, а не ложной
 * тревоги: подстрочное совпадение сделает вердикт `holds` там, где строгая граница дала бы
 * `hard`. Для гейта правдивости это верный перекос — ложный красный учит команду не верить
 * гейту, а пропуск оставляет ровно то состояние, что было до гейта. Тот же выбор у
 * `main-day-probe`.
 */
export function symbolDecls(token, cwd) {
  const r = git(['grep', '-c', '--fixed-strings', token, '--', ...SOURCE_PATHSPECS], cwd);
  if (!r.ok) return null;
  return lines(r.value).reduce((sum, l) => {
    const n = Number(l.slice(l.lastIndexOf(':') + 1));
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);
}

/**
 * Отслеживаемый файл. `git ls-files`, а не `existsSync`: сборочный мусор — не факт дерева.
 *
 * Имя БЕЗ каталога ищется по всему дереву (`:(glob)** /<имя>`). Поправка по живому прогону
 * 08.08: точный путь объявлял отсутствующими `ritual-deliver-to-main.mjs`, `tariff.module.ts`,
 * `schema.prisma`, `assertions.json` — все они существуют, просто протокол называет их
 * коротким именем, как и говорит человек. Требовать от протокола полный путь значит вменять
 * ему форму, которой он не обязан, и получать красное на правде.
 */
export function trackedPath(token, cwd) {
  const bare = String(token).replace(/:\d+(-\d+)?$/, '');
  // Два адреса сразу: точный путь И путь-ХВОСТ. Протокол называет файл так, как о нём
  // говорят вслух — `procedure-runs/trail/2026-08-03.jsonl` при живом
  // `docs/procedure-runs/trail/2026-08-03.jsonl`, `archive/archivarius-live-wiring.md` при
  // живом `docs/tasks/archive/…`. Поправка по прогону пяти протоколов 08.08: точный путь
  // давал на обоих hard, то есть красное на правде.
  const pathspecs = bare.includes('/') ? [bare, `:(glob)**/${bare}`] : [`:(glob)**/${bare}`];
  const r = git(['ls-files', '--', ...pathspecs], cwd);
  if (!r.ok) return null;
  return lines(r.value).length > 0;
}

/** Документ репозитория: файл с таким именем где-то в `docs/**`, с `.md` или без. */
export function trackedDoc(token, cwd) {
  const bare = String(token).replace(/:\d+(-\d+)?$/, '');
  const patterns = bare.includes('.')
    ? [`:(glob)docs/**/${bare}`]
    : [`:(glob)docs/**/${bare}.md`, `:(glob)docs/**/${bare}/*.md`, `:(glob)docs/**/${bare}.mdx`];
  const r = git(['ls-files', '--', ...patterns], cwd);
  if (!r.ok) return null;
  return lines(r.value).length > 0;
}

/** Реестр задач как ДАННЫЕ. Битый реестр — отказ инструмента, а не «карточки нет». */
export function readRegistry(cwd) {
  const p = resolve(cwd, REGISTRY_REL);
  if (!existsSync(p)) return null;
  try {
    const parsed = JSON.parse(readFileSync(p, 'utf8'));
    const list = Array.isArray(parsed) ? parsed : parsed?.tasks;
    return Array.isArray(list) ? list : null;
  } catch {
    return null;
  }
}

/**
 * Сквош-коммит ствола, ДОСТАВИВШИЙ номер. Оффлайн, без gh и сети.
 *
 * Номер обязан стоять В КОНЦЕ заголовка: `(#N)` в хвосте ставит сам сквош при мердже, а
 * `(#N)` посреди сообщения — это ссылка на иссью, и доставкой она не является. Поправка по
 * живому прогону 08.08: первая версия брала любое вхождение и объявила карточку
 * `archivarius-sessions-container` доставленной коммитом «feat(archivarius): ingest читает
 * Codex rollout … (#1330) (#1357)» — там #1330 лишь упомянут, доставлен же #1357. Гейт,
 * который врёт про вранье, хуже отсутствующего гейта.
 */
export function squashOf(number, cwd) {
  const tail = `(#${number})`;
  const r = git(['log', '--format=%H %s', '--grep', tail, '-n', '20'], cwd);
  if (!r.ok) return null;
  return pickDeliverySha(r.value, number);
}

/**
 * Выбрать из `git log --format=%H %s` коммит, чей ЗАГОЛОВОК заканчивается на `(#N)`.
 *
 * Вынесено чистой функцией, чтобы правило «упоминание ≠ доставка» держалось зубом, а не
 * живой историей репозитория: история переписывается, а правило остаётся.
 *
 * @returns {string | false} sha либо `false` — «доставки нет»
 */
export function pickDeliverySha(logOutput, number) {
  const tail = `(#${number})`;
  for (const line of lines(logOutput)) {
    const sha = line.slice(0, 40);
    const subject = line.slice(41);
    if (subject.trim().endsWith(tail)) return sha;
  }
  return false;
}

/** Состав сквош-коммита. */
export function commitFiles(sha, cwd) {
  const r = git(['show', '--name-only', '--format=', sha], cwd);
  if (!r.ok) return null;
  return lines(r.value);
}

/**
 * Факты по одному атому — каждый по адресу СВОЕГО класса.
 *
 * @param {{token: string, classes: readonly string[], clientSide?: boolean}} atom
 */
export function collectEvidence(atom, ctx) {
  const { cwd, sha, registry, scripts, hasGit } = ctx;
  const token = atom?.token ?? '';
  const classes = atom?.classes ?? [];
  /** @type {Record<string, unknown>} */
  const e = { sha };

  for (const klass of classes) {
    switch (klass) {
      case ATOM_CLASSES.SYMBOL:
        e.symbolDecls = hasGit ? symbolDecls(token, cwd) : null;
        break;
      case ATOM_CLASSES.PATH:
        e.pathExists = hasGit ? trackedPath(token, cwd) : null;
        break;
      case ATOM_CLASSES.DOC:
        e.docExists = hasGit ? trackedDoc(token, cwd) : null;
        break;
      case ATOM_CLASSES.VERB: {
        if (!scripts) {
          e.verbExists = null;
          break;
        }
        // Из «yarn code-review:pr 1765» глагол — второе слово: остальное аргументы.
        const name = String(token).split(/\s+/)[1] ?? '';
        e.verbExists = name ? Object.prototype.hasOwnProperty.call(scripts, name) : null;
        break;
      }
      case ATOM_CLASSES.CARD: {
        if (!registry) {
          e.cardFound = null;
          break;
        }
        const card = registry.find((t) => t?.id === token);
        e.cardFound = Boolean(card);
        if (card) {
          e.cardStatus = card.status === 'archived' ? 'archived' : 'active';
          // Находка «реестр протух» добывается ТОЛЬКО через иссью карточки: сквош с «(#N)»
          // в стволе доказывает доставку оффлайн. Для карточки БЕЗ иссью оффлайн-признака
          // доставки нет — проверено 08.08 на `morning-gates-two-moments`: её реализация
          // влита PR #1766, но id карточки в сообщении коммита не назван, а привязать её к
          // #1764 запрещает сама карточка (иссью занята соседом). Здесь честный `null`, а не
          // догадка по совпадению слов в заголовке.
          const issue = Number(card.githubIssue);
          if (card.status !== 'archived' && Number.isFinite(issue) && hasGit) {
            const squash = squashOf(issue, cwd);
            e.cardDeliveredPr = squash ? issue : null;
          }
        }
        break;
      }
      case ATOM_CLASSES.PR: {
        if (!hasGit) {
          e.prMerged = null;
          break;
        }
        const number = String(token).replace(/^#/, '');
        const squash = squashOf(number, cwd);
        if (squash === null) {
          e.prMerged = null;
          break;
        }
        if (squash === false) {
          e.prMerged = false;
          break;
        }
        e.prMerged = true;
        e.prFiles = commitFiles(squash, cwd);
        break;
      }
      default:
        break;
    }
  }
  return e;
}

/** Последний протокол вечернего фидбека. Имя несёт дату — сортировка по имени и есть хронология. */
export function latestProtocol(cwd) {
  const dir = resolve(cwd, SEANCES_REL);
  if (!existsSync(dir)) return null;
  const files = readdirSync(dir)
    .filter((f) => f.startsWith(PROTOCOL_PREFIX) && f.endsWith('.md'))
    .sort();
  const last = files[files.length - 1];
  return last ? `${SEANCES_REL}/${last}` : null;
}

/** Якорь секции: по нему повторный прогон узнаёт СВОЮ секцию и не плодит вторую. */
export const SECTION_ANCHOR = 'feedback-claims-probe';

/** Секция для тела протокола. Дописывается, ничего не стирает — форма ручной поправки 07.08. */
export function claimsSection(report, { protocolRel, sha, checkedAt }) {
  return [
    '',
    '---',
    '',
    `<!-- ${SECTION_ANCHOR}: ${sha ? String(sha).slice(0, 12) : 'no-sha'} -->`,
    `## Проверка утверждений — ${checkedAt} (yarn feedback:claims)`,
    '',
    'Сверено с деревом инструментом, не глазом. Текст выше не тронут: он остаётся следом того,',
    'что сказала команда. Гейт ничего не чинит — он только называет расхождение.',
    '',
    `Протокол: \`${protocolRel}\`${sha ? ` · дерево: \`${String(sha).slice(0, 12)}\`` : ''}`,
    '',
    report,
    '',
  ].join('\n');
}

/**
 * Отрезать свои прежние секции перед разбором.
 *
 * Вещдок 08.08: повторный прогон разбирал СВОЮ секцию как голос команды — путь протокола и
 * `yarn feedback:claims` из её шапки становились новыми атомами, и таблица росла с каждым
 * прогоном. Гейт не проверяет собственные слова: предмет сверки — то, что сказала команда.
 */
export function withoutClaimsSections(markdown) {
  const src = typeof markdown === 'string' ? markdown : '';
  const at = src.indexOf(`<!-- ${SECTION_ANCHOR}: `);
  if (at === -1) return src;
  const before = src.lastIndexOf('\n---\n', at);
  return before === -1 ? src.slice(0, at) : src.slice(0, before);
}

/**
 * Вписать секцию в тело протокола идемпотентно.
 *
 * Повторный прогон на ТОМ ЖЕ дереве заменяет свою прежнюю секцию (узнаёт по якорю с sha),
 * прогон на другом дереве дописывает новую: вердикт привязан к состоянию кода, и две разные
 * сверки — два разных факта, стирать прежний нельзя. Чужой текст не трогается никогда:
 * протокол остаётся следом того, что сказала команда.
 *
 * @param {string} body текущее тело протокола
 * @param {string} section готовая секция
 * @param {string|undefined} sha
 * @returns {string}
 */
export function withClaimsSection(body, section, sha) {
  const src = typeof body === 'string' ? body : '';
  const anchor = `<!-- ${SECTION_ANCHOR}: ${sha ? String(sha).slice(0, 12) : 'no-sha'} -->`;
  // Хвост нормализуется в обоих случаях — иначе первый прогон и повторный дают разную
  // длину файла, и вечная секция «то же самое» выглядела бы правкой в git diff.
  const glue = (head) => `${head.replace(/\s+$/u, '')}\n${section}`;
  const at = src.indexOf(anchor);
  if (at === -1) return glue(src);
  // Своя прежняя секция: от разделителя перед якорем до конца файла либо до следующего якоря.
  const before = src.lastIndexOf('\n---\n', at);
  const head = before === -1 ? src.slice(0, at) : src.slice(0, before);
  const nextAnchor = src.indexOf(`<!-- ${SECTION_ANCHOR}: `, at + anchor.length);
  const tail = nextAnchor === -1 ? '' : src.slice(src.lastIndexOf('\n---\n', nextAnchor));
  return glue(head) + tail;
}

/** Состояние вечера: только своё поле. `state.day` НЕ трогается — он принадлежит соседней карточке. */
export function withClaimsProbeState(state, { verdict, protocolRel, sha, at }) {
  const prev = state ?? {};
  const swallow = prev.swallow ?? {};
  const override = swallow.claimsProbe?.override;
  return {
    ...prev,
    swallow: {
      ...swallow,
      claimsProbe: {
        verdict,
        protocol: protocolRel,
        sha: sha ? String(sha).slice(0, 12) : null,
        at,
        // Квитанция владельца привязана к дереву: сменилось дерево — сгорела.
        ...(override && override.sha === (sha ? String(sha).slice(0, 12) : null) ? { override } : {}),
      },
    },
  };
}

function main() {
  const cli = parseArgs(process.argv.slice(2));
  if (cli.help) {
    console.log(
      [
        'Usage: yarn feedback:claims [--protocol <path>] [--json] [--append] [--include-holds] [--strict]',
        '',
        'Сверяет утверждения вечернего протокола с деревом по адресу класса каждого атома.',
        'Read-only: ничего не чинит, не стирает и не закрывает.',
        '',
        '  --protocol <path>  протокол (по умолчанию — последний в docs/seanses)',
        '  --append           дописать секцию «Проверка утверждений» в тело протокола',
        '  --json             машиночитаемый вывод',
        '  --include-holds    печатать и подтверждённые утверждения',
        '  --strict           вернуть 1 при hard-нарушении (для ручного прогона и CI)',
        '  --state            записать вердикт в состояние вечера (держит ласточку на hard)',
        '  --ack --note "…"   квитанция владельца: пройти hard со следом и причиной',
        '',
        'Exit: 0 — всегда, кроме --strict и отказа инструмента; 1 — hard при --strict;',
        '      2 — probe не смог работать (нет протокола, нет git, битый реестр).',
      ].join('\n'),
    );
    return 0;
  }

  const cwd = process.cwd();

  if (cli.ack) {
    if (!cli.note) {
      console.error('feedback:claims --ack — нужна причина: --note "почему проходим hard".');
      return 2;
    }
    const state = readState(cwd);
    if (state === null) {
      console.error(`feedback:claims — состояние не читается: ${GATES_STATE_REL}`);
      return 2;
    }
    const next = ackClaimsProbe(state, { note: cli.note, sha: headSha(cwd), at: new Date().toISOString() });
    writeState(cwd, next);
    console.log(
      `feedback:claims — квитанция владельца записана под дерево ${next.swallow.claimsProbe.override.sha ?? '—'}.` +
        '\n  Сменится дерево — квитанция сгорит, вердикт снова будет свежим.',
    );
    return 0;
  }
  const protocolRel = cli.protocol ?? latestProtocol(cwd);
  if (!protocolRel) {
    console.error(
      `feedback:claims — протокола нет: ни --protocol, ни файлов ${PROTOCOL_PREFIX}*.md в ${SEANCES_REL}.`,
    );
    return 2;
  }
  const protocolPath = resolve(cwd, protocolRel);
  if (!existsSync(protocolPath)) {
    console.error(`feedback:claims — протокол не найден: ${protocolRel}`);
    return 2;
  }

  const hasGit = gitAvailable(cwd);
  if (!hasGit) {
    // Не молчаливый зелёный: без git все факты `null`, и отчёт скажет «не проверено» —
    // но сказать об этом обязан сам инструмент, иначе «ноль находок» читается как «чисто».
    console.error('feedback:claims — git недоступен: все факты будут «не проверено».');
  }

  const registry = readRegistry(cwd);
  if (registry === null) {
    console.error(`feedback:claims — реестр не читается: ${REGISTRY_REL}`);
    return 2;
  }

  let scripts = null;
  try {
    scripts = JSON.parse(readFileSync(resolve(cwd, 'package.json'), 'utf8'))?.scripts ?? null;
  } catch {
    scripts = null;
  }

  const markdown = readFileSync(protocolPath, 'utf8');
  const atoms = dedupeAtoms(extractAtoms(withoutClaimsSections(markdown)));
  const sha = headSha(cwd);
  const ctx = { cwd, sha, registry, scripts, hasGit };

  const verdicts = verdictsFor(
    atoms.map((atom) => ({ atom, evidence: collectEvidence(atom, ctx) })),
  );
  const report = formatClaimsReport(verdicts, { includeHolds: cli.includeHolds });
  const hard = hasHardViolation(verdicts);

  if (cli.json) {
    console.log(JSON.stringify({ protocol: protocolRel, sha, hard, verdicts }, null, 2));
  } else {
    console.log(`\n--- утверждения протокола ${protocolRel} ---\n`);
    console.log(report);
    if (hard) {
      console.log(
        '\n⚠ Есть утверждения, НЕ ПОДТВЕРЖДЁННЫЕ деревом. Это находка, а не поломка:' +
          '\n  правь протокол поправкой (не стирая сказанного) — и не отправляй ласточку,' +
          '\n  пока в ней держится то же утверждение.',
      );
    }
  }

  const nowIso = new Date().toISOString();

  if (cli.append) {
    const checkedAt = nowIso.replace('T', ' ').slice(0, 16);
    const section = claimsSection(report, { protocolRel, sha, checkedAt });
    writeFileSync(protocolPath, withClaimsSection(markdown, section, sha), 'utf8');
    console.error(`feedback:claims — секция вписана в ${protocolRel}`);
  }

  if (cli.state) {
    const state = readState(cwd);
    if (state === null) {
      console.error(`feedback:claims — состояние не читается: ${GATES_STATE_REL}`);
      return 2;
    }
    const verdict = hard ? 'hard' : verdicts.some((v) => v.outcome === OUTCOMES.SOFT) ? 'soft' : 'ok';
    writeState(cwd, withClaimsProbeState(state, { verdict, protocolRel, sha, at: nowIso }));
    console.error(`feedback:claims — вердикт «${verdict}» записан в ${GATES_STATE_REL}`);
  }

  return cli.strict && hard ? 1 : 0;
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('feedback-claims-probe.mjs')) {
  process.exitCode = main();
}
