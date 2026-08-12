/**
 * corpus-track-acceptance — приёмный предикат корпуса «один тракт — два класса».
 *
 * Кристалл `reader-before-next-carrier` (owner, 01.08): приёмник строится ДО
 * записи корпуса (600 звуков, август). Критерии НЕ выдуманы — чеканят спеку
 * инсайта insight-own-field-corpus-single-spec (adopted 7.0, 18.07): семь полей,
 * каждое обосновано конкретными граблями внешнего массива DADS.
 *
 * Форма — по образцу one-shot-s-predicate: детерминированный вход → вердикт с
 * НАЗВАННЫМИ основаниями (problems[]), не булев провал. Чистые функции: ноль
 * ФС и сети (урок #537).
 */

/** Два класса корпуса. */
export const TRACK_CLASSES = Object.freeze(['drone', 'negative']);

/**
 * Слепота предиката — ПОЛЕМ, не примечанием: судим провенанс (семь полей спеки),
 * НЕ качество звука. SNR/клиппинг — отдельная работа после первого сбора.
 */
export const ACCEPTANCE_BLIND = 'provenance-only: качество звука (SNR, клиппинг) не судится';

const isNonEmptyString = (v) => typeof v === 'string' && v.trim() !== '';
const isPositiveNumber = (v) => typeof v === 'number' && Number.isFinite(v) && v > 0;

/**
 * @typedef {object} CorpusTrack
 * @property {string} id
 * @property {'drone'|'negative'} class
 * @property {string} sourceRecordingId поле 1: id записи-источника (куски одного полёта!)
 * @property {{place: string, time: string, weather: string, wind: string}} scene поле 2
 * @property {{distanceM: number, altitudeM: number, model: string, flightMode: string} | null} drone поле 3; у негатива null с причиной
 * @property {string} [droneAbsenceReason] причина null-дрона у негатива
 * @property {string | null} pairedNegativeId поле 4: парный негатив той же сцены (у позитива)
 * @property {{microphone: string, chainId: string}} mic поле 5: микрофон и тракт
 * @property {{durationSec: number, sampleRateHz: number}} audio поле 6
 * @property {boolean} operatorConfirmed поле 7
 */

/**
 * Годность одного трека: присутствие и форма семи полей спеки.
 *
 * @param {unknown} track
 * @returns {{ ok: boolean, problems: string[], blind: string }}
 */
export function acceptCorpusTrack(track) {
  /** @type {string[]} */
  const problems = [];
  if (!track || typeof track !== 'object' || Array.isArray(track)) {
    return { ok: false, problems: ['track: не объект'], blind: ACCEPTANCE_BLIND };
  }
  const t = /** @type {Record<string, any>} */ (track);
  const label = isNonEmptyString(t.id) ? t.id : '(без id)';
  if (!isNonEmptyString(t.id)) problems.push('id: не непустая строка');

  if (!TRACK_CLASSES.includes(t.class)) {
    problems.push(`${label}: class ∉ {${TRACK_CLASSES.join(', ')}}`);
  }

  // Поле 1 — id записи-источника: без него кросс-валидация врёт в нашу пользу
  // (18.07: три файла оказались кусками одного полёта).
  if (!isNonEmptyString(t.sourceRecordingId)) {
    problems.push(`${label}: sourceRecordingId отсутствует — куски одного полёта неразличимы, кросс-валидация врёт`);
  }

  // Поле 2 — сцена: иначе разнообразие фона декларируется, а не измеряется.
  for (const key of ['place', 'time', 'weather', 'wind']) {
    if (!isNonEmptyString(t.scene?.[key])) {
      problems.push(`${label}: scene.${key} отсутствует — разнообразие фона не измеряется`);
    }
  }

  // Поле 3 — параметры дрона: «берёт с 200 м, с 400 нет» вместо «точность 91 %».
  if (t.class === 'drone') {
    if (!t.drone || typeof t.drone !== 'object') {
      problems.push(`${label}: drone-параметры отсутствуют у класса drone`);
    } else {
      if (!isPositiveNumber(t.drone.distanceM)) problems.push(`${label}: drone.distanceM — не положительное число`);
      if (typeof t.drone.altitudeM !== 'number' || !Number.isFinite(t.drone.altitudeM) || t.drone.altitudeM < 0) {
        problems.push(`${label}: drone.altitudeM — не число ≥ 0`);
      }
      if (!isNonEmptyString(t.drone.model)) problems.push(`${label}: drone.model отсутствует`);
      if (!isNonEmptyString(t.drone.flightMode)) problems.push(`${label}: drone.flightMode отсутствует`);
    }
  } else if (t.class === 'negative') {
    if (t.drone !== null && t.drone !== undefined) {
      problems.push(`${label}: у негатива drone-параметры обязаны быть null`);
    }
    if (!isNonEmptyString(t.droneAbsenceReason)) {
      problems.push(`${label}: droneAbsenceReason отсутствует — null у негатива обязан нести причину`);
    }
  }

  // Поле 4 — парный негатив той же сцены: тяжёлый конфьюзер, которого нет
  // ни в одном публичном массиве. Существование пары судит батч.
  if (t.class === 'drone' && !isNonEmptyString(t.pairedNegativeId)) {
    problems.push(`${label}: pairedNegativeId отсутствует — позитив без парного негатива той же сцены`);
  }

  // Поле 5 — микрофон и тракт: иначе детектор учится различать технику, а не цель.
  if (!isNonEmptyString(t.mic?.microphone)) problems.push(`${label}: mic.microphone отсутствует`);
  if (!isNonEmptyString(t.mic?.chainId)) problems.push(`${label}: mic.chainId отсутствует — «один тракт» непроверяем`);

  // Поле 6 — длительность и частота: смешение 48/16 kHz стоило отдельного разбора.
  if (!isPositiveNumber(t.audio?.durationSec)) problems.push(`${label}: audio.durationSec — не положительное число`);
  if (!Number.isInteger(t.audio?.sampleRateHz) || t.audio.sampleRateHz <= 0) {
    problems.push(`${label}: audio.sampleRateHz — не положительное целое`);
  }

  // Поле 7 — подтверждение оператора: метка без подтверждения — декларация.
  if (t.operatorConfirmed !== true) {
    problems.push(`${label}: operatorConfirmed ≠ true — метка не подтверждена оператором`);
  }

  return { ok: problems.length === 0, problems, blind: ACCEPTANCE_BLIND };
}

/** Ключ сцены для парности: та же сцена = равенство всех четырёх полей. */
function sceneKey(scene) {
  return ['place', 'time', 'weather', 'wind'].map((k) => String(scene?.[k] ?? '').trim()).join('|');
}

/**
 * Батч-инварианты корпуса: один тракт, единая частота, оба класса, парность
 * позитивов негативами ТОЙ ЖЕ сцены.
 *
 * @param {unknown[]} tracks
 * @returns {{
 *   ok: boolean,
 *   problems: string[],
 *   perTrack: { id: string, ok: boolean, problems: string[] }[],
 *   details: { chainIds: string[], sampleRates: number[], classes: Record<string, number> },
 *   blind: string,
 * }}
 */
export function acceptCorpusBatch(tracks) {
  /** @type {string[]} */
  const problems = [];
  if (!Array.isArray(tracks)) {
    return {
      ok: false,
      problems: ['batch: не массив'],
      perTrack: [],
      details: { chainIds: [], sampleRates: [], classes: {} },
      blind: ACCEPTANCE_BLIND,
    };
  }
  if (tracks.length === 0) problems.push('batch: пуст — принимать нечего');

  const perTrack = tracks.map((tr) => {
    const r = acceptCorpusTrack(tr);
    return { id: String(/** @type {any} */ (tr)?.id ?? '(без id)'), ok: r.ok, problems: r.problems };
  });
  for (const r of perTrack) {
    if (!r.ok) problems.push(`трек ${r.id}: ${r.problems.length} problem(s) — см. perTrack`);
  }

  const list = /** @type {Record<string, any>[]} */ (tracks.filter((t) => t && typeof t === 'object'));

  // Один тракт: единый chainId на корпус.
  const chainIds = [...new Set(list.map((t) => t.mic?.chainId).filter(isNonEmptyString))].sort();
  if (chainIds.length > 1) {
    problems.push(`один тракт нарушен: chainId в батче ${chainIds.length} — ${chainIds.join(', ')}`);
  }

  // Единая частота дискретизации (18.07: смешение 48/16 kHz).
  const sampleRates = [...new Set(list.map((t) => t.audio?.sampleRateHz).filter((v) => Number.isInteger(v)))].sort((a, b) => a - b);
  if (sampleRates.length > 1) {
    problems.push(`единая частота нарушена: в батче ${sampleRates.join(' и ')} Hz`);
  }

  // Оба класса присутствуют.
  /** @type {Record<string, number>} */
  const classes = {};
  for (const t of list) {
    if (TRACK_CLASSES.includes(t.class)) classes[t.class] = (classes[t.class] ?? 0) + 1;
  }
  for (const cls of TRACK_CLASSES) {
    if (!classes[cls]) problems.push(`класс «${cls}» в батче отсутствует — корпус «два класса» не собран`);
  }

  // Парность: у каждого позитива — существующий негатив ТОЙ ЖЕ сцены.
  const negatives = new Map(list.filter((t) => t.class === 'negative' && isNonEmptyString(t.id)).map((t) => [t.id, t]));
  for (const t of list) {
    if (t.class !== 'drone') continue;
    const pairId = t.pairedNegativeId;
    if (!isNonEmptyString(pairId)) continue; // named на уровне трека
    const pair = negatives.get(pairId);
    const label = t.id ?? '(без id)';
    if (!pair) {
      problems.push(`${label}: парный негатив «${pairId}» в батче не найден`);
    } else if (sceneKey(pair.scene) !== sceneKey(t.scene)) {
      problems.push(`${label}: негатив «${pairId}» из другой сцены — пара обязана делить сцену`);
    }
  }

  return {
    ok: problems.length === 0,
    problems,
    perTrack,
    details: { chainIds, sampleRates, classes },
    blind: ACCEPTANCE_BLIND,
  };
}
