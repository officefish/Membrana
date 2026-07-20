/**
 * Р3 формата ШТОРМА — механизм вдоха (SimHash + счётчик).
 * Канон: docs/STORM_REGULATION.md § «Тайминг: механизм вдоха (детерминированный)».
 * Математика ратифицирована M3 с поправкой Дынина (финальный аудит 20.07).
 *
 * Чистое детерминированное ядро (node built-ins). Инвариант тайминга — ЖЁСТКО:
 * без сети, без `Date.now`, без `Math.random`. 64-битная арифметика на BigInt.
 *
 * Вдох — единица прогресса, меряется хешем близости конспекта, без часов и
 * случайности. Косметика (регистр/пробелы/пунктуация) даёт те же токены → тот же
 * SimHash → d = 0 → вдоха НЕ порождает. Событие по существу двигает хеш → d ≥ 1.
 */

/** Маска 64 бит и модуль 2^64 для BigInt-арифметики. */
export const MASK64 = (1n << 64n) - 1n;

/** FNV-1a 64-бит: базовое смещение и простое (канон FNV). */
const FNV_OFFSET = 14695981039346656037n;
const FNV_PRIME = 1099511628211n;

/**
 * МАНДАТ владельца (ратифицирован 20.07, рекомендация Дынина).
 * При K_min = 1 любое существенное событие (d ≥ 1) есть вдох, поэтому
 * ≤ 7 существенных событий гарантированно жгут потолок — увернуться можно
 * лишь косметикой (d = 0). Так неотменяемый потолок держится.
 */
export const KMIN_MANDATE = 1;

/** Потолок счётчика вдохов — неотменяемое закрытие. */
export const BREATH_CEILING = 7;

/**
 * Нормализация конспекта в упорядоченный список токенов.
 * Косметика (регистр, пробелы, пунктуация) даёт ОДИНАКОВЫЕ токены; изменение
 * по существу — разные. lowercase → всё кроме букв/цифр (unicode) в пробел →
 * схлопнуть пробелы → split.
 * @param {string} text
 * @returns {string[]}
 */
export function normalize(text) {
  if (typeof text !== 'string') return [];
  const cleaned = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
  if (cleaned === '') return [];
  return cleaned.split(/\s+/u);
}

/**
 * FNV-1a 64-бит от токена (детерминированно, по UTF-8 байтам).
 * @param {string} token
 * @returns {bigint}
 */
export function hashToken(token) {
  let hash = FNV_OFFSET;
  const bytes = Buffer.from(String(token), 'utf8');
  for (const byte of bytes) {
    hash ^= BigInt(byte);
    hash = (hash * FNV_PRIME) & MASK64;
  }
  return hash;
}

/**
 * SimHash 64 бита упорядоченного списка токенов.
 * 64 счётчика; для каждого токена h=hashToken; бит i: +1 если (h>>i)&1, иначе −1;
 * итоговый бит i = 1 ⟺ счётчик > 0. Пустой вход → 0n.
 * @param {string[]} tokens
 * @returns {bigint}
 */
export function simhash(tokens) {
  if (!Array.isArray(tokens) || tokens.length === 0) return 0n;
  const counters = new Array(64).fill(0);
  for (const token of tokens) {
    const h = hashToken(token);
    for (let i = 0; i < 64; i += 1) {
      if ((h >> BigInt(i)) & 1n) counters[i] += 1;
      else counters[i] -= 1;
    }
  }
  let result = 0n;
  for (let i = 0; i < 64; i += 1) {
    if (counters[i] > 0) result |= 1n << BigInt(i);
  }
  return result;
}

/** SimHash напрямую из сырого конспекта (нормализация + simhash). */
export function hashConspectus(text) {
  return simhash(normalize(text));
}

/**
 * popcount 64-бит: число единичных битов.
 * @param {bigint} x
 * @returns {number}
 */
export function popcount64(x) {
  let v = x & MASK64;
  let count = 0;
  while (v > 0n) {
    count += Number(v & 1n);
    v >>= 1n;
  }
  return count;
}

/**
 * Хэммингово расстояние двух 64-битных хешей = popcount(a XOR b).
 * @param {bigint} a
 * @param {bigint} b
 * @returns {number}
 */
export function hammingDistance(a, b) {
  return popcount64((a ^ b) & MASK64);
}

/**
 * Эффективный порог K_эфф(a) со смягчением артефактами.
 * Форма-гипербола (канон M3, поправка Дынина):
 *   K_эфф(a) = K_min + ⌊(K0 − K_min)·c / (c + a)⌋
 * где `a` — число принятых Ангелиной артефактов; `c > 0` — артефакты «полуспада»
 * (при a=c смягчение половинное). Больше материала → ниже порог → вдох легче.
 *
 * Свойства (тождества формы): a=0 → K0; a→∞ → K_min; монотонно НЕ ВОЗРАСТАЕТ по a;
 * K_эфф ∈ [K_min, K0].
 *
 * Инварианты (контракт, бросают Error): K0 ≥ K_min ≥ 1, c > 0, a ≥ 0.
 * @param {{K0:number, Kmin:number, c:number, a:number}} params
 * @returns {number}
 */
export function kEff({ K0, Kmin, c, a }) {
  if (!Number.isInteger(Kmin) || Kmin < 1) {
    throw new Error(`kEff: нарушен инвариант K_min ≥ 1 (получено Kmin=${Kmin})`);
  }
  if (!Number.isInteger(K0) || K0 < Kmin) {
    throw new Error(`kEff: нарушен инвариант K0 ≥ K_min (получено K0=${K0}, Kmin=${Kmin})`);
  }
  if (!(c > 0)) {
    throw new Error(`kEff: нарушен инвариант c > 0 (получено c=${c})`);
  }
  if (!(a >= 0)) {
    throw new Error(`kEff: нарушен инвариант a ≥ 0 (получено a=${a})`);
  }
  const softening = Math.floor(((K0 - Kmin) * c) / (c + a));
  return Kmin + softening;
}

/**
 * Вдох ⟺ Хэммингово расстояние опорного и текущего хеша достигло порога.
 * Косметика (нормализация даёт те же токены → тот же simhash → d=0) вдоха не даёт.
 * @param {bigint} refHash опорный
 * @param {bigint} curHash текущий
 * @param {number} kEffValue порог
 * @returns {boolean}
 */
export function isBreath(refHash, curHash, kEffValue) {
  return hammingDistance(refHash, curHash) >= kEffValue;
}

/** Начальное состояние счётчика вдохов. */
export function initialState() {
  return { refHash: 0n, count: 0 };
}

/**
 * Чистый редьюсер счётчика вдохов (derived-проекция append-only лога событий).
 * Потолок count=7 — неотменяемое закрытие: дальше no-op.
 *
 * @param {{refHash:bigint, count:number}} state
 * @param {{curHash:bigint, a:number, K0:number, Kmin:number, c:number}} event
 * @returns {{state:{refHash:bigint, count:number}, breath:boolean, evidence:object}}
 */
export function step(state, event) {
  const { refHash, count } = state;
  const { curHash, a, K0, Kmin, c } = event;
  const k = kEff({ K0, Kmin, c, a });
  const d = hammingDistance(refHash, curHash);

  // Потолок сожжён — шторм закрыт, no-op. Вещдок честен: показывает замер, но
  // состояние не двигается.
  if (count >= BREATH_CEILING) {
    return {
      state: { refHash, count },
      breath: false,
      evidence: { refHash, count, kEff: k, d, a, K0, c },
    };
  }

  const breath = d >= k;
  const nextState = breath ? { refHash: curHash, count: count + 1 } : { refHash, count };
  return {
    state: nextState,
    breath,
    evidence: { refHash: nextState.refHash, count: nextState.count, kEff: k, d, a, K0, c },
  };
}

/**
 * Семь вдохов сгенерированы — потолок, неотменяемое закрытие.
 * @param {{count:number}} state
 * @returns {boolean}
 */
export function sevenBreaths(state) {
  return state.count >= BREATH_CEILING;
}
