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
    artifacts: (date, ctx = {}) => {
      // Сопоставление по ЗНАЧЕНИЮ пути, а не по индексу: индексная связь двух списков
      // разъезжается молча при первом же росте каталога, и условие применилось бы не к тому
      // артефакту. Замечание ревью PR #1617, P2.
      const resolve = (t) => (t.dated ? t.rel.replaceAll('<date>', date) : t.rel);
      const conditionByResolved = new Map(
        EVENING_DELIVER_ARTIFACTS.map((t) => [resolve(t), eveningConditionOf(t.rel)]),
      );
      const bridgeOpen = bridgeWasOpen(ctx.repoRoot ?? '.', date);
      return eveningDeliverArtifacts(date).filter(
        (a) => conditionByResolved.get(a.rel) !== 'bridge-open' || bridgeOpen,
      );
    },
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
 * Статусы, которые ЛЕЧАТСЯ доставкой: файл есть, он сегодняшний, ствол его не получил.
 *
 * `missing-local` и `stale` сюда не входят, и это несущее различие. Артефакт, которого нет,
 * или вчерашний — не «недоставлен», а не произведён: лечит его шаг-производитель, а не
 * доставка. Пока разницы не было, план кадра печатал `pr:ship paths=[…]` со всеми четырьмя
 * позициями подряд, включая три отсутствующих файла, — то есть план был неисполним по
 * построению, и каждый стоп доводился руками. Вещдок 07.08: вечерний гейт предлагал
 * доставить `team-evening-feedback`, `workspace-level` и `DAY_MEMO`, которых на диске нет.
 */
export const DELIVERABLE_STATUSES = Object.freeze(['missing-on-main', 'drift-from-main']);

/**
 * Разделить негодные позиции на «доставке подлежит» и «доставкой не лечится».
 *
 * @param {ArtifactDeliverReport[]} reports
 * @returns {{ deliverable: ArtifactDeliverReport[], blocked: ArtifactDeliverReport[] }}
 */
export function splitDeliverable(reports) {
  const bad = (reports ?? []).filter((r) => r && r.status !== 'ok');
  return {
    deliverable: bad.filter((r) => DELIVERABLE_STATUSES.includes(r.status)),
    blocked: bad.filter((r) => !DELIVERABLE_STATUSES.includes(r.status)),
  };
}

/**
 * Что вправе сделать исполнитель по вердикту гейта. Чистое решение; сами команды — в скрипте.
 *
 * `deliver` при непустом `blocked` — СОЗНАТЕЛЬНО. Отказ доставлять готовое из-за того, что
 * соседний артефакт не произведён, сохранил бы ровно тот дефект, против которого заведён долг
 * `#shown-is-not-delivered`: готовое продолжало бы лежать вне ствола. Ложной зелёнки это не
 * даёт — вердикт кадра считается ЗАНОВО после доставки и остаётся красным, пока `blocked`
 * не пуст.
 *
 * @param {ArtifactDeliverReport[]} reports
 * @param {string} [ritual]
 * @returns {{ action: 'noop'|'deliver'|'nothing-to-deliver', paths: string[], blocked: ArtifactDeliverReport[], branchHint: string, reason: string }}
 */
export function planExecute(reports, ritual = 'day') {
  const { deliverable, blocked } = splitDeliverable(reports);
  const branchHint = planDeliver(deliverable.map((r) => r.rel), ritual).branchHint;
  if (!deliverable.length && !blocked.length) {
    return { action: 'noop', paths: [], blocked: [], branchHint: '', reason: 'всё на origin/main — доставлять нечего' };
  }
  if (!deliverable.length) {
    return {
      action: 'nothing-to-deliver',
      paths: [],
      blocked,
      branchHint: '',
      reason: 'доставкой не лечится: артефакты не произведены (нет файла) или не сегодняшние',
    };
  }
  return {
    action: 'deliver',
    paths: deliverable.map((r) => r.rel),
    blocked,
    branchHint,
    reason: `доставить ${deliverable.length}${blocked.length ? `, вне доставки ${blocked.length}` : ''}`,
  };
}

/**
 * Вызов `pr:ship`, которым исполнитель доводит доставку. Чистая сборка — проверяется без сети.
 *
 * `--with-review` (а не обход ревью-гейта): гейт `pr:ship` требует вердикт, привязанный к PR, и
 * без этого флага исполнитель встал бы на нём ровно так же, как встаёт человек. Вердикт
 * по-прежнему выносит ревьюер, BLOCK по-прежнему останавливает — автоматизируется прогон, не
 * решение.
 *
 * `--no-commit` при пустом индексе — НЕ оптимизация. Артефакты могли быть уже закоммичены
 * локально и лежать на ветке: это и есть «показал, но не доставил» в чистом виде. Без флага
 * `pr:ship` падает на «nothing to commit» вхолостую, то есть самый частый случай долга ломал бы
 * исполнителя.
 *
 * @param {{ritual: string, today: string, branch: string, hasStaged: boolean}} input
 * @returns {string[]} аргументы к `scripts/pr-ship.mjs`
 */
export function shipArgsFor({ ritual, today, branch, hasStaged }) {
  const args = [
    'scripts/pr-ship.mjs',
    '--type', 'chore',
    '--scope', 'ritual',
    '--message', `${ritual === 'evening' ? 'вечер' : 'утро'} ${today}: артефакты ритуала в ствол`,
    '--branch', branch,
    '--with-review',
    '--execute',
  ];
  if (!hasStaged) args.push('--no-commit');
  return args;
}

/**
 * Решение исполнителя ПЕРЕД записью: обе защиты одним предикатом, без git.
 *
 * 1. Путь вне манифеста ритуала. По построению такого быть не должно — пути приходят из
 *    `ritualConfig().artifacts()`. Защита стоит потому, что исполнитель кладёт в СТВОЛ:
 *    «по построению не бывает» — рассуждение, а на стволе нужен отказ.
 * 2. Чужое в индексе. `git commit` берёт весь индекс, а не наши пути, поэтому уже
 *    проиндексированная чужая работа уехала бы в ствол под именем артефакта ритуала —
 *    молча и с чужим авторством смысла.
 *
 * @param {{paths: string[], declared: Iterable<string>, staged: string[]}} input
 * @returns {{ok: true} | {ok: false, refusal: string, offenders: string[]}}
 */
export function guardDeliver({ paths, declared, staged }) {
  const declaredSet = new Set(declared);
  const outside = (paths ?? []).filter((p) => !declaredSet.has(p));
  if (outside.length) {
    return { ok: false, refusal: 'путь вне манифеста ритуала', offenders: outside };
  }
  const foreign = (staged ?? []).filter((p) => !(paths ?? []).includes(p));
  if (foreign.length) {
    return { ok: false, refusal: 'в индексе чужое — исполнитель не метёт чужую работу', offenders: foreign };
  }
  return { ok: true };
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
  log(`✗ ${DELIVER_FRAME_ID}: STOP — не на main (${v.pending.join(', ')})`);

  // План печатается РАЗДЕЛЁННЫМ: доставке подлежит одно, доставкой не лечится другое.
  // Единый список путей делал план неисполнимым — он предлагал `pr:ship` по файлам, которых
  // на диске нет, и потому каждый стоп доводился руками вместо одной команды.
  const plan = planExecute(v.reports, ritual);
  if (plan.paths.length) {
    log(`  доставить: pr:ship paths=[${plan.paths.join(', ')}] branch≈${plan.branchHint}`);
    log(`  исполнить: yarn ritual:deliver-to-main --ritual ${ritual} --execute`);
  }
  for (const b of plan.blocked) {
    log(`  вне доставки: ${b.label} — ${b.status}: лечит шаг-производитель, не доставка`);
  }
  log(`  ${cfg.unfinished}`);
  return 2;
}
