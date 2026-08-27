/**
 * Достоверность архива ночной охоты — предикат `V(s,d)` (вердикт M2 заседания
 * `hunt-and-canon`, 27.08).
 *
 * ЗАЧЕМ. Прежний архиватор копировал `docs/seanses/night-hunt/*.md` в датированную
 * папку и писал манифест с `archivedAt`. Поле было честным — время КОПИРОВАНИЯ, — а
 * датированная папка нет: она читалась как «в эту ночь охота работала». Полтора месяца
 * ритуал каждый вечер чеканил папку из отчёта, рождённого 12.07: файлы за 12.08 и за
 * 23.08 побайтово тождественны. Подмена вещдока копией выглядела убедительнее
 * оригинала — по виду охота была жива, а её не было.
 *
 * ЧЕМ ЛЕЧИТСЯ. Вещдок отличается от копии **маркером рождения источника**, а не фактом
 * копирования. Источник несёт `| Generated (UTC) | <ISO> |`; `V(s,d)` истинно, когда
 * рождение принадлежит окну ночи `d`. Не принадлежит — отказ, а не «ночь жизни».
 *
 * ГРАНИЦА. Здесь только предикат и классификация. Ловля молчания (`S(e)`, вердикт M1) —
 * соседний контур сессии Б, и общего исполнителя у них нет.
 */

/** Маркер рождения в шапке отчёта охоты: `| Generated (UTC) | 2026-07-12T12:47:56.410Z |`. */
const BORN_AT_ROW = /^\|\s*Generated\s*\(UTC\)\s*\|\s*([^|]+?)\s*\|/imu;

/** @typedef {'exhibit'|'copy_not_exhibit'} EvidenceClass */
/** @typedef {'fresh'|'refused_stale'|'missing_marker'|'parse_error'} VerityReason */

/**
 * Достать маркер рождения из тела отчёта.
 *
 * Отличаем ТРИ исхода, а не два: маркера нет вовсе (`missing_marker`) и маркер есть, но
 * нечитаем (`parse_error`). Слипшись в один, они лгут о причине: первое — отчёт другого
 * рода, второе — испорченный отчёт, и чинятся они по-разному.
 *
 * @param {string} content
 * @returns {{ bornAt: string|null, reason: 'fresh'|'missing_marker'|'parse_error' }}
 */
export function parseBornAt(content) {
  const m = BORN_AT_ROW.exec(String(content ?? ''));
  if (!m) return { bornAt: null, reason: 'missing_marker' };
  const raw = m[1].trim();
  const ms = Date.parse(raw);
  if (!Number.isFinite(ms)) return { bornAt: null, reason: 'parse_error' };
  return { bornAt: new Date(ms).toISOString(), reason: 'fresh' };
}

/**
 * Ключ локального дня `YYYY-MM-DD`.
 * @param {Date} date
 * @returns {string}
 */
export function localDayKey(date) {
  const d = date instanceof Date ? date : new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Предикат достоверности `V(s,d)`.
 *
 * Окно по умолчанию — СУТКИ архивации: рождение обязано попасть в тот же локальный день,
 * что и папка. Это не придирка: охота ходит утром буднего дня, архивация — вечером того
 * же дня, и «вчерашний отчёт под сегодняшней датой» — ровно тот случай, который полтора
 * месяца выдавал себя за работу. Выходные при таком окне честно отказывают: охоты в
 * ночь не было, значит и вещдока нет.
 *
 * `windowHours` — осознанное послабление под другой график (например, охота через ночь):
 * тогда судим по возрасту относительно момента архивации.
 *
 * @param {{ bornAt: string|null, reason?: string, day: string, now?: Date, windowHours?: number|null }} input
 * @returns {{ fresh: boolean, reason: VerityReason, ageHours: number|null, bornDay: string|null }}
 */
export function veracity({ bornAt, reason, day, now = new Date(), windowHours = null }) {
  if (!bornAt) {
    const why = reason === 'parse_error' ? 'parse_error' : 'missing_marker';
    return { fresh: false, reason: /** @type {VerityReason} */ (why), ageHours: null, bornDay: null };
  }
  const bornMs = Date.parse(bornAt);
  if (!Number.isFinite(bornMs)) {
    return { fresh: false, reason: 'parse_error', ageHours: null, bornDay: null };
  }
  const bornDay = localDayKey(new Date(bornMs));
  const ageHours = Math.max(0, (now.getTime() - bornMs) / 3_600_000);

  const fresh =
    typeof windowHours === 'number' && Number.isFinite(windowHours)
      ? ageHours <= windowHours
      : bornDay === day;

  return {
    fresh,
    reason: /** @type {VerityReason} */ (fresh ? 'fresh' : 'refused_stale'),
    ageHours,
    bornDay,
  };
}

/**
 * Класс вещдока по итогу предиката. Копия — не вещдок события: она остаётся законным
 * артефактом (её не удаляют), но объявляется тем, чем является.
 * @param {{ fresh: boolean }} v
 * @returns {EvidenceClass}
 */
export function evidenceClassOf(v) {
  return v?.fresh ? 'exhibit' : 'copy_not_exhibit';
}

/**
 * Человеческая строка отказа. По нашей норме отказ обязан называть ТРИ вещи: что
 * протухло, насколько и что делать. Отказ, не называющий выхода, — половина отказа:
 * именно из-за такого в пусковом прогоне охоты полтора месяца никто не знал, куда идти.
 *
 * @param {{ name: string, verity: { reason: VerityReason, ageHours: number|null, bornDay: string|null } }} item
 * @param {string} day
 * @returns {string}
 */
export function refusalLine(item, day) {
  const { name, verity: v } = item;
  if (v.reason === 'missing_marker') {
    return `${name}: маркера рождения «Generated (UTC)» нет — отчёт не может быть вещдоком; проверить генератор охоты`;
  }
  if (v.reason === 'parse_error') {
    return `${name}: маркер рождения нечитаем — отчёт испорчен; перегенерировать источник`;
  }
  const days = v.ageHours === null ? null : Math.floor(v.ageHours / 24);
  const старше =
    days === null
      ? 'неизвестно насколько'
      : days >= 1
        ? `старше на ${days} сут`
        : `старше на ${Math.round(v.ageHours)} ч`;
  return `${name}: рождён ${v.bornDay ?? '—'}, а ночь ${day} — ${старше}; вещдок не чеканится, охота за эту ночь не ходила`;
}

/**
 * Разложить исходники на вещдоки и копии.
 * @param {Array<{ name: string, content: string }>} sources
 * @param {{ day: string, now?: Date, windowHours?: number|null }} ctx
 * @returns {{ exhibits: Array<object>, refused: Array<object> }}
 */
export function classifySources(sources, { day, now = new Date(), windowHours = null }) {
  const exhibits = [];
  const refused = [];
  for (const s of sources) {
    const parsed = parseBornAt(s.content);
    const v = veracity({ bornAt: parsed.bornAt, reason: parsed.reason, day, now, windowHours });
    const item = { name: s.name, content: s.content, bornAt: parsed.bornAt, verity: v };
    (v.fresh ? exhibits : refused).push(item);
  }
  return { exhibits, refused };
}
