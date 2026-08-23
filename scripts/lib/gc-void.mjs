/**
 * GC — затирание следов альтернативных сценариев (вердикт M5-GC angelina-hostess, 21.07).
 *
 * «Затереть» ≠ «удалить»: история — актив, затирается ЧИТАЕМОСТЬ мёртвого пути живой
 * сессией. Приговор (rejected) выносит только закрытый вердикт с ответственным — GC сам
 * не судит, он детерминированно исполняет: переносит приговорённое в `docs/void/` с
 * YAML-эпитафией. Void растёт монотонно; удаления из него запрещены.
 *
 * Чистое ядро: предикаты и рендер эпитафий; fs — у раннера.
 */

export const VOID_DIR = 'docs/void';

/** Срок старения ШТРАФА (не памяти): после 90 дней запись помечается истёкшей. */
export const STALE_DAYS = 90;

/**
 * Приговорён ли след: rejected И вердикт закрыт. Даты/статусы приходят из реестра
 * следов — не из Date.now (детерминизм).
 * @param {{status?: string, verdictClosed?: boolean}} s
 * @returns {boolean}
 */
export function isDead(s) {
  return s?.status === 'rejected' && s?.verdictClosed === true;
}

/**
 * Истёк ли штраф свежести (для recent_void_penalty): rejectedAt старше STALE_DAYS.
 * `today` подаётся снаружи.
 * @param {{rejectedAt?: string}} s
 * @param {string} today YYYY-MM-DD
 * @returns {boolean}
 */
export function isStale(s, today) {
  if (!s?.rejectedAt) return false;
  const days = (Date.parse(today) - Date.parse(s.rejectedAt)) / 86_400_000;
  return Number.isFinite(days) && days > STALE_DAYS;
}

/**
 * YAML-эпитафия для файла в void: кто приговорил, за что, когда (три барьера, барьер №1 —
 * шапка в самом файле, читается первой строкой).
 * @param {{status?: string, verdict?: string, rejectedReason?: string, rejectedAt?: string, rejectedBy?: string}} s
 * @returns {string}
 */
export function epitaph(s) {
  return [
    '---',
    'status: rejected',
    `verdict: ${s?.verdict ?? '—'}`,
    `rejectedReason: ${s?.rejectedReason ?? '—'}`,
    `rejectedAt: ${s?.rejectedAt ?? '—'}`,
    `rejectedBy: ${s?.rejectedBy ?? '—'}`,
    'void: этот путь МЁРТВ — живым не является; не восстанавливать без нового вердикта',
    '---',
    '',
  ].join('\n');
}

/**
 * recent_void_penalty: свежеотвергнутые id (не истёкшие) — генераторы штрафуют их,
 * чтобы идея не переоткрылась под новым именем.
 * @param {Array<{id: string, rejectedAt?: string}>} voidIndex
 * @param {string} today
 * @returns {Set<string>}
 */
export function recentVoidIds(voidIndex, today) {
  return new Set((voidIndex ?? []).filter((s) => !isStale(s, today)).map((s) => s.id));
}

/**
 * Отчёт-эпитафии прохода (GC обязан быть шумным: «перенесено 0» тоже печатается).
 * @param {Array<{id: string, rejectedAt?: string}>} moved
 * @param {string} today
 * @returns {string}
 */
export function gcReport(moved, today) {
  const lines = [`GC: перенесено ${moved.length}`];
  for (const s of moved) {
    lines.push(`  † ${s.id} (${isStale(s, today) ? 'ghost — штраф истёк' : 'свежий — recent_void_penalty'})`);
  }
  return lines.join('\n');
}

/**
 * План переноса одного приговорённого следа на кладбище (блок b3, DoD вердикта M5:
 * «производные следуют за родителем ОДНОЙ операцией»).
 *
 * ПОЧЕМУ ОДНОЙ. Разорванный перенос оставляет полуживой путь: родитель на кладбище,
 * черновики и прогоны — в живом дереве, и читатель находит их грепом как действующие. Это
 * и есть возрождение, против которого поставлены три барьера. Поэтому план либо целый,
 * либо его нет: частичного переноса не бывает.
 *
 * Ядро НЕ двигает файлы — оно выносит план значением. Двигает порт, и человек видит diff
 * в PR (человек-гейт вердикта M5).
 *
 * @param {{subjectRef?: string, rejectedAt?: string|null}} sentence приговорённый след
 * @param {{parent?: string, derivatives?: string[], homeId?: string}} paths родитель, производные и имя дома
 * @param {string} voidDir корень кладбища
 * @returns {{ok: true, moves: Array<{from: string, to: string, role: string}>} | {ok: false, reason: string}}
 */
export function planVoidMove(sentence, paths, voidDir = VOID_DIR) {
  const id = typeof sentence?.subjectRef === 'string' ? sentence.subjectRef.trim() : '';
  if (id === '') return { ok: false, reason: 'у приговорённого следа нет имени — переносить нечего' };
  const parent = typeof paths?.parent === 'string' && paths.parent.trim() !== '' ? paths.parent.trim() : null;
  if (!parent) return { ok: false, reason: `след «${id}» приговорён, но его путь в дереве не найден — перенос без предмета` };

  // Дом зовётся именем САМОГО следа, а не мандата, которому вынесли приговор: по этому
  // имени кладбище сверяется с реестром, откуда след ушёл, и штраф свежести находит своего
  // адресата. Мандат — форма приговора, имя следа — его личность.
  const homeId = typeof paths?.homeId === 'string' && paths.homeId.trim() !== '' ? paths.homeId.trim() : id;
  const home = `${voidDir}/${homeId}`;
  const moves = [{ from: parent, to: home, role: 'родитель' }];
  const seen = new Set([parent]);
  for (const raw of paths?.derivatives ?? []) {
    const d = typeof raw === 'string' ? raw.trim() : '';
    if (d === '' || seen.has(d)) continue;
    // Производная, лежащая ВНУТРИ родителя, едет вместе с ним и отдельным ходом не является.
    if (d.startsWith(`${parent}/`)) continue;
    seen.add(d);
    moves.push({ from: d, to: `${home}/${d.split('/').pop()}`, role: 'производная' });
  }
  return { ok: true, moves };
}
