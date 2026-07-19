/**
 * artifact-freshness — гейт свежести датированного артефакта (узел F вердикта
 * scripts-boundary-m0-order-2026-07-17, спринт ritual-step-manifest-sf).
 *
 * СУТЬ: инцидент «вчерашний отчёт под сегодняшней датой» — это композиция ДВУХ
 * отказов: шаг упал молча (узел S) И следующий шаг прочитал протухший вход не
 * заметив (узел F). Здесь закрывается второй: ни одно чтение датированного
 * артефакта не проходит без явной проверки, что он от сегодня и что шаг,
 * который его писал, отработал успешно.
 *
 * Без fs и сети: чистые функции над содержимым и явно переданным «сегодня».
 * `today` — ИНЪЕКЦИЕЙ, не `Date.now()` внутри: иначе функцию нельзя проверить
 * перебором, а тест начинает зависеть от часов машины.
 *
 * Дата берётся из ПРОВЕНАНСА В ТЕЛЕ артефакта, не из mtime: mtime
 * недетерминирован при checkout — свежий git checkout проставит текущее время
 * вчерашнему файлу, и гейт пропустит протухшее.
 */

/** Провенанс-строка живых артефактов: `<!-- Сгенерировано: <ISO> (<чем>) -->` */
const GENERATED_RE = /<!--\s*Сгенерировано:\s*(\S+?)\s*(?:\(([^)]*)\))?\s*-->/u;

/** @typedef {'ok'|'failed-critical'|'skipped-noncritical'} UpstreamStatus */
/** @typedef {{generatedAt: string|null, revision: string|null, tool: string|null}} Provenance */

/**
 * Достать провенанс из тела артефакта.
 * Возвращает `generatedAt: null`, если метки нет или она непарсится — отсутствие
 * провенанса это НЕ «свежий по умолчанию», а явное «не знаю» (см. isFresh).
 * @param {string} content
 * @returns {Provenance}
 */
export function parseProvenance(content) {
  const empty = { generatedAt: null, revision: null, tool: null };
  if (typeof content !== 'string') return empty;

  const m = GENERATED_RE.exec(content);
  if (!m) return empty;

  const raw = m[1];
  const ts = Date.parse(raw);
  if (Number.isNaN(ts)) return empty;

  const tool = (m[2] ?? '').trim() || null;
  const revMatch = /@([0-9a-f]{7,40})\b/u.exec(m[2] ?? '');

  return { generatedAt: new Date(ts).toISOString(), revision: revMatch?.[1] ?? null, tool };
}

/**
 * Календарный день в UTC — `YYYY-MM-DD`. Сравниваем ДНИ, а не моменты: артефакт,
 * сгенерированный в 03:07 и прочитанный в 21:40 того же дня, свеж.
 * @param {string|Date} value
 * @returns {string|null}
 */
export function dayOf(value) {
  const ts = value instanceof Date ? value.getTime() : Date.parse(String(value));
  return Number.isNaN(ts) ? null : new Date(ts).toISOString().slice(0, 10);
}

/**
 * Возраст артефакта в календарных днях относительно `today`.
 * Отрицательное значение = артефакт из будущего (тоже дефект, не «очень свежий»).
 * @param {string|null} generatedAt
 * @param {string|Date} today
 * @returns {number|null} null — если дату установить нельзя
 */
export function ageInDays(generatedAt, today) {
  const a = dayOf(generatedAt);
  const b = dayOf(today);
  if (!a || !b) return null;
  return Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
}

/**
 * ГЕЙТ. Свеж ли артефакт для чтения следующим шагом.
 *
 * Свеж ⟺ возраст артефакта в пределах ОЖИДАЕМОГО для этого ребра И upstream-шаг
 * отработал `ok`. Оба условия несущие: артефакт вовремя, но записанный упавшим
 * шагом, — не вход, а обломок; артефакт от честного шага, но просроченный, —
 * протухший.
 *
 * ПОЧЕМУ НЕ ПРОСТО «СЕГОДНЯ». Свежесть — свойство РЕБРА, не артефакта. Вечерний
 * архиватор читает ревью того же вечера (maxAgeDays=0), а утренний планировщик
 * читает ревью ПРОШЛОГО вечера — для него вчерашний файл нормальный вход
 * (maxAgeDays=1), и требование «сегодня» ломало бы каждое утро. Вердикт M0 это
 * и говорил: `dateOf(frontmatter) === expectedDate`, а не `=== today`.
 * Дефолт `maxAgeDays = 0` — строгий: послабление объявляется явно на ребре.
 *
 * КОНСЕРВАТИВНО: нет провенанса ⇒ НЕ свеж. Мы предпочитаем ложный стоп
 * молчаливому проходу — второй и был инцидентом.
 *
 * @param {{content?: string, generatedAt?: string|null}} artifact
 * @param {{today: string|Date, upstreamStatus?: UpstreamStatus, maxAgeDays?: number}} ctx
 * @returns {boolean}
 */
export function isFresh(artifact, ctx) {
  const today = ctx?.today;
  if (!today || !dayOf(today)) return false;

  const upstream = ctx?.upstreamStatus ?? 'ok';
  if (upstream !== 'ok') return false;

  const generatedAt =
    artifact?.generatedAt ?? (typeof artifact?.content === 'string' ? parseProvenance(artifact.content).generatedAt : null);
  if (!generatedAt) return false;

  const age = ageInDays(generatedAt, today);
  if (age === null) return false;

  const maxAge = Number.isInteger(ctx?.maxAgeDays) ? ctx.maxAgeDays : 0;
  // Артефакт из будущего (age < 0) не свеж никогда: это дефект часов или подлог,
  // а не «очень свежий».
  return age >= 0 && age <= maxAge;
}

/**
 * UI-хвост гейта: ЧТО устарело и НА СКОЛЬКО дней — читаемой строкой, не голым
 * exit-кодом. Требование вердикта M0 (реплика Верстальщика): человек должен
 * понимать, почему цепочка встала, без чтения кода.
 *
 * @param {string} name  имя/путь артефакта, как его узнаёт человек
 * @param {{content?: string, generatedAt?: string|null}} artifact
 * @param {{today: string|Date, upstreamStatus?: UpstreamStatus, maxAgeDays?: number}} ctx
 * @returns {string|null} null — если артефакт свеж (объяснять нечего)
 */
export function explainStaleness(name, artifact, ctx) {
  if (isFresh(artifact, ctx)) return null;

  const upstream = ctx?.upstreamStatus ?? 'ok';
  if (upstream !== 'ok') {
    return `${name}: шаг-источник не отработал (${upstream}) — читать его выход нельзя, он обломок, а не вход`;
  }

  const generatedAt =
    artifact?.generatedAt ?? (typeof artifact?.content === 'string' ? parseProvenance(artifact.content).generatedAt : null);
  if (!generatedAt) {
    return `${name}: нет провенанса «Сгенерировано» — дату установить нельзя, свежесть не подтверждена`;
  }

  const age = ageInDays(generatedAt, ctx.today);
  if (age === null) return `${name}: дата провенанса непарсится (${generatedAt})`;
  if (age < 0) return `${name}: провенанс из будущего (${dayOf(generatedAt)}, сегодня ${dayOf(ctx.today)})`;

  const maxAge = Number.isInteger(ctx?.maxAgeDays) ? ctx.maxAgeDays : 0;
  const allowed = maxAge === 0 ? 'ожидался сегодняшний' : `допустимо до ${maxAge} дн.`;
  return `${name}: устарел на ${age} дн., ${allowed} (сгенерирован ${dayOf(generatedAt)}, сегодня ${dayOf(ctx.today)})`;
}

/**
 * Строка происхождения для ЗАПИСИ в артефакт: дата + ревизия. Требование DoD M0 —
 * читатель должен отличать свежий план от вчерашнего, не сверяя файлы.
 * @param {{tool: string, now: string|Date, revision?: string|null}} opts
 * @returns {string}
 */
export function provenanceLine({ tool, now, revision = null }) {
  const ts = now instanceof Date ? now.toISOString() : new Date(Date.parse(String(now))).toISOString();
  const suffix = revision ? `${tool}@${revision}` : tool;
  return `<!-- Сгенерировано: ${ts} (${suffix}) -->`;
}

// --- RT-9 compatibility (morning review age ≤1 day; keep alongside S+F edge gate) ---
export function dateOf(text) {
  if (!text) return null;
  // <!-- Сгенерировано: 2026-07-18T03:23:26.803Z (yarn code-review) -->
  const m = String(text).match(/<!--\s*Сгенерировано:\s*(\d{4}-\d{2}-\d{2})/u);
  return m ? m[1] : null;
}

export function addCalendarDays(isoDate, deltaDays) {
  const [y, mo, d] = isoDate.split('-').map(Number);
  const utc = Date.UTC(y, mo - 1, d) + deltaDays * 86_400_000;
  return new Date(utc).toISOString().slice(0, 10);
}

export function ageDays(text, today) {
  const stamped = dateOf(text);
  if (!stamped) return null;
  const t0 = Date.parse(`${stamped}T00:00:00.000Z`);
  const t1 = Date.parse(`${today}T00:00:00.000Z`);
  if (!Number.isFinite(t0) || !Number.isFinite(t1)) return null;
  return Math.round((t1 - t0) / 86_400_000);
}

export function isAcceptableReviewAge(text, today, maxAgeDays = 1) {
  const age = ageDays(text, today);
  return age != null && age >= 0 && age <= maxAgeDays;
}

export function assertReviewInputFresh(text, opts) {
  const { today, label = 'DAILY_CODE_REVIEW.md', maxAgeDays = 1, exitCode = 2 } = opts;
  const stamped = dateOf(text);
  if (!stamped) {
    const err = new Error(
      `[freshness] ${label}: нет штампа «Сгенерировано:» — нельзя проверить свежесть (RT-9)`,
    );
    err.exitCode = exitCode;
    throw err;
  }
  const age = ageDays(text, today);
  if (age != null && age >= 0 && age <= maxAgeDays) return { stamped, age };
  const human =
    age == null
      ? 'дата неразборчива'
      : age < 0
        ? `штамп в будущем (${stamped} > ${today})`
        : `устарел на ${age} дн. (штамп ${stamped}, сегодня ${today}, допуск ≤${maxAgeDays})`;
  const err = new Error(`[freshness] ${label}: ${human}`);
  err.exitCode = exitCode;
  throw err;
}

export const NON_CRITICAL_EVENING_STEPS = Object.freeze(['insight-drift.mjs']);

