/**
 * ritual-deliver-to-main — финальный кадр ритуала: его документы на origin/main.
 * Канон: frame-rails #1016, MANIFEST frames deliver-to-main.
 *
 * ПАРАМЕТРИЗОВАН ПО РИТУАЛУ (спринт `ritual-tails-sprint`, блок
 * `ritual-evening-manifest-and-delivery`, находка Ф2 разбора #1533). Был зашит на утро:
 * путь к утреннему манифесту, утренний список артефактов, подсказка ветки `ritual-day`.
 * У вечера кадра не было вовсе, и вечер СТРУКТУРНО заканчивался на ветке — архив дня 29.07
 * пролежал так двое суток.
 *
 * Умолчание — `day`: утренний вызов работает без единой правки своей цепочки. Это условие
 * перерезки, а не вежливость: чинить вечер ценой утра значит менять один дефект на другой.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { readDated } from './read-dated.mjs';
import {
  EVENING_DELIVER_ARTIFACTS,
  eveningConditionOf,
  eveningDeliverArtifacts,
} from './ritual-evening-artifacts.mjs';
import {
  MORNING_DELIVER_ARTIFACTS,
  morningDeliverPaths,
} from './ritual-morning-artifacts.mjs';

export const DELIVER_FRAME_ID = 'deliver-to-main';

export { MORNING_DELIVER_ARTIFACTS, morningDeliverPaths };

/**
 * Закрытый список ритуалов, у которых есть кадр доставки. Открытый список означал бы, что
 * новый ритуал заводится словом, а не манифестом.
 *
 * `artifacts(date)` — функция, а не массив: у вечера пути датированы, у утра нет, и разница
 * не должна протекать в движок.
 */
export const DELIVER_RITUALS = Object.freeze({
  day: Object.freeze({
    manifest: 'docs/procedures/ritual-day/MANIFEST.json',
    artifacts: () => MORNING_DELIVER_ARTIFACTS.map((a) => ({ rel: a.rel, label: a.label })),
    branchSlug: 'ritual-day',
    done: 'утренние документы на main',
    unfinished: 'утро не завершено для соседей, пока документы не в main (#1016)',
  }),
  evening: Object.freeze({
    manifest: 'docs/procedures/ritual-evening/MANIFEST.json',
    // УСЛОВНОСТЬ ЖИВЁТ ЗДЕСЬ, а не в каталоге артефактов и не в общем движке. Разбор
    // структурщика и архитектора (блоки `deliver-list-flags`, `deliver-engine-conditional`):
    // список — каталог фактов без условий, движок — общий и про мостик знать не должен.
    // Знание «этот артефакт рождается лишь по такому-то условию» принадлежит ПРОЦЕДУРЕ вечера,
    // и вот её конфигурация.
    //
    // Свидетель независимый: `docs/bridge/state.json`, мостик сам говорит, открывали ли его.
    // Спросить «есть ли файл конспекта» значило бы отменять проверку тем же, чего она
    // касается — резчик назвал такую условность затвором.
    //
    //   мостик не открывали → позиция не спрашивается
    //   мостик открывали    → позиция спрашивается наравне со всеми
    //   свидетель нечитаем  → позиция СПРАШИВАЕТСЯ: неизвестность оборачивается проверкой,
    //                         а не поблажкой, иначе битый файл состояния молча гасил бы её
    artifacts: (date, ctx = {}) =>
      eveningDeliverArtifacts(date).filter((a, i) => {
        const template = EVENING_DELIVER_ARTIFACTS[i]?.rel ?? a.rel;
        const condition = eveningConditionOf(template);
        if (condition !== 'bridge-open') return true;
        return bridgeWasOpen(ctx.repoRoot ?? '.', date);
      }),
    branchSlug: 'ritual-evening',
    done: 'артефакты вечера на main',
    unfinished: 'вечер не завершён для соседей, пока артефакты не в main (Ф2 #1533)',
  }),
});

/**
 * @param {string} name
 * @returns {{ manifest: string, artifacts: (date: string) => {rel: string, label: string}[], branchSlug: string, done: string, unfinished: string }}
 */
export function ritualConfig(name = 'day') {
  const cfg = DELIVER_RITUALS[name];
  if (!cfg) {
    // Неизвестный ритуал — ошибка входа, а не тихий откат на утро: молчаливый фолбэк
    // проверил бы чужие артефакты и назвал бы это «доставлено».
    throw new Error(`deliver-to-main: неизвестный ритуал «${name}» (есть: ${Object.keys(DELIVER_RITUALS).join(', ')})`);
  }
  return cfg;
}

/**
 * @param {string} repoRoot
 * @param {string} [ritual]
 * @returns {{ frame: object|null, problems: string[] }}
 */
export function loadDeliverFrame(repoRoot, ritual = 'day') {
  const cfg = ritualConfig(ritual);
  const manifestPath = join(repoRoot, cfg.manifest);
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  } catch (e) {
    return { frame: null, problems: [`MANIFEST ${ritual}: ${e instanceof Error ? e.message : String(e)}`] };
  }
  const frames = Array.isArray(manifest.frames) ? manifest.frames : [];
  const frame = frames.find((f) => f && f.id === DELIVER_FRAME_ID) ?? null;
  if (!frame) {
    return { frame: null, problems: [`frames: нет кадра ${DELIVER_FRAME_ID}`] };
  }
  return { frame, problems: [] };
}

/**
 * Открывали ли мостик в этот день — по его СОБСТВЕННОМУ состоянию, а не по наличию конспекта.
 *
 * Свидетель отдельный от предмета: `docs/bridge/state.json` пишет сам мостик при открытии и
 * запечатывании. Нечитаемое состояние трактуется как «открывали»: неизвестность обязана
 * оборачиваться проверкой, а не поблажкой — иначе битый файл состояния молча отключал бы
 * позицию, и это был бы тот самый затвор, только спрятанный глубже.
 *
 * @param {string} repoRoot
 * @param {string} today ISO date YYYY-MM-DD
 * @returns {boolean}
 */
export function bridgeWasOpen(repoRoot, today) {
  const abs = join(repoRoot, 'docs/bridge/state.json');
  if (!existsSync(abs)) return true;
  try {
    const state = JSON.parse(readFileSync(abs, 'utf8'));
    return String(state?.day ?? '').slice(0, 10) === today;
  } catch {
    return true;
  }
}

/**
 * @typedef {'ok' | 'missing-local' | 'stale' | 'missing-on-main' | 'drift-from-main'} ArtifactDeliverStatus
 */

/**
 * @typedef {{ rel: string, label: string, status: ArtifactDeliverStatus, why?: string }} ArtifactDeliverReport
 */

/**
 * @param {string} repoRoot
 * @param {string} rel
 * @param {string} today ISO date YYYY-MM-DD
 * @param {{ readRemote?: (rel: string) => string|null }} [deps]
 * @returns {ArtifactDeliverReport}
 */
export function checkArtifactDeliver(repoRoot, rel, today, deps = {}) {
  const known = deps.artifacts ?? MORNING_DELIVER_ARTIFACTS;
  const label = known.find((a) => a.rel === rel)?.label ?? rel;
  const fresh = readDated(rel, { today, maxAgeDays: 0, root: repoRoot, label });
  if (!fresh.ok) {
    const status = fresh.content === null ? 'missing-local' : 'stale';
    return { rel, label, status, why: fresh.why ?? undefined };
  }
  const localContent = fresh.content ?? '';
  const readRemote =
    deps.readRemote ??
    (() => {
      return null;
    });
  let remoteContent;
  try {
    remoteContent = readRemote(rel);
  } catch {
    remoteContent = null;
  }
  if (remoteContent === null) {
    return { rel, label, status: 'missing-on-main', why: `${label}: нет на origin/main` };
  }
  if (localContent !== remoteContent) {
    return {
      rel,
      label,
      status: 'drift-from-main',
      why: `${label}: локальная копия ≠ origin/main`,
    };
  }
  return { rel, label, status: 'ok' };
}

/**
 * @param {string} repoRoot
 * @param {{ today?: string, readRemote?: (rel: string) => string|null }} [opts]
 * @returns {{ ok: boolean, reports: ArtifactDeliverReport[], pending: string[] }}
 */
export function verifyDeliverOnMain(repoRoot, opts = {}) {
  const today =
    opts.today ??
    new Date().toISOString().slice(0, 10);
  const artifacts = ritualConfig(opts.ritual ?? 'day').artifacts(today, { repoRoot });
  /** @type {ArtifactDeliverReport[]} */
  const reports = [];
  for (const { rel } of artifacts) {
    reports.push(checkArtifactDeliver(repoRoot, rel, today, { ...opts, artifacts }));
  }
  const pending = reports.filter((r) => r.status !== 'ok').map((r) => r.rel);
  return { ok: pending.length === 0, reports, pending };
}

/**
 * @param {string[]} pending
 * @returns {{ mode: 'noop' | 'pr:ship', paths: string[], branchHint: string }}
 */
export function planDeliver(pending, ritual = 'day') {
  if (!pending.length) {
    return { mode: 'noop', paths: [], branchHint: '' };
  }
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return {
    mode: 'pr:ship',
    paths: [...pending],
    branchHint: `angelina/chore/${ritualConfig(ritual).branchSlug}-${date}`,
  };
}

/**
 * @param {string} repoRoot
 * @param {{ today?: string, readRemote?: (rel: string) => string|null, log?: (s: string) => void }} [opts]
 * @returns {number} exit code
 */
export function runDeliverGate(repoRoot, opts = {}) {
  const log = opts.log ?? console.log;
  const ritual = opts.ritual ?? 'day';
  const cfg = ritualConfig(ritual);
  const { frame, problems } = loadDeliverFrame(repoRoot, ritual);
  log(`→ ${DELIVER_FRAME_ID} (frames${frame ? ` · holder ${frame.holder ?? '?'}` : ''})`);
  if (problems.length) {
    for (const p of problems) log(`  ✗ ${p}`);
    log(`✗ ${DELIVER_FRAME_ID}: STOP — нет кадра в MANIFEST`);
    return 2;
  }
  const v = verifyDeliverOnMain(repoRoot, opts);
  for (const r of v.reports) {
    if (r.status === 'ok') {
      log(`  ✓ ${r.label} — на origin/main`);
    } else {
      log(`  ✗ ${r.label} — ${r.status}${r.why ? `: ${r.why}` : ''}`);
    }
  }
  if (v.ok) {
    log(`✓ ${DELIVER_FRAME_ID}: ${cfg.done}`);
    return 0;
  }
  const plan = planDeliver(v.pending, ritual);
  log(`✗ ${DELIVER_FRAME_ID}: STOP — не на main (${v.pending.join(', ')})`);
  log(`  план: ${plan.mode} paths=[${plan.paths.join(', ')}] branch≈${plan.branchHint}`);
  log(`  ${cfg.unfinished}`);
  return 2;
}
