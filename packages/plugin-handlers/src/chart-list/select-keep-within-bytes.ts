/**
 * Отбор «оставить, пока хватает байт» — что остаётся живым при понижении тарифа.
 * Блок b1 спринта `tariff-downgrade-freeze-2587`; контракт — ADR-0031, решение 6.
 *
 * ЗАЧЕМ ОТДЕЛЬНЫЙ МОДУЛЬ. Три режима чарт-листа (`selection.ts`) считают ШТУКИ: «лучшие 200/100/
 * 60/20». Квота прибора считается в БАЙТАХ, и у неё нет закрытого списка объёмов. Переписать
 * `selectChartList` под байты значило бы сломать витрину ради архива; расширить список объёмов —
 * выдать бюджет в байтах за число строк. Поэтому режимы остаются АДАПТЕРАМИ ПОРЯДКА: кто-то (b3,
 * media) прогоняет режим и отдаёт сюда ранг каждой записи, а этот модуль решает единственный
 * вопрос — кто влезает в бюджет.
 *
 * ЗВУКА, БАЗЫ И NEST ЗДЕСЬ НЕТ. Вход — числа, выход — два списка. Зубы гоняются без wav.
 *
 * ПРИОРИТЕТ KEEP (вердикт консилиума 05.10, Дынин; решения владельца 3–4):
 *   1. размеченные и «хранить» (`pinned`) — первыми: слово человека весомее меры;
 *   2. порядок режима (`modeRank`, 0 — лучший);
 *   3. при равном ранге — БОЛЕЕ НОВАЯ запись остаётся (старые уходят во freeze раньше);
 *   4. при равном времени — `sampleId` по возрастанию кодовых единиц: стабильный ключ, не зависящий
 *      от порядка входа и от локали.
 *
 * НЕИЗМЕРИМЫЕ (`modeRank === null`: тишина, ниже порога, не декодируется) — целиком во freeze,
 * даже при свободном бюджете (v1, вердикт 6: «чтобы не взорвать диск»). Одно названное
 * исключение: pinned-неизмеримая остаётся — её байты известны (размер блоба всегда есть), а
 * «хранить» сказано человеком, не мерой. Снять исключение — правка контракта, не строки.
 *
 * ЖАДНОСТЬ ПРОДОЛЖАЕТ ПОСЛЕ НЕ ВЛЕЗШЕГО. Запись, которая не помещается в остаток, уходит во
 * freeze, а обход идёт дальше: следующая, меньшая, ещё может остаться. Это priority-greedy
 * (knapsack по приоритету, НЕ 0/1-оптимум по плотности — приоритет важнее заполнения, и «починить»
 * это на оптимум значило бы оставить худшую запись вместо лучшей), а не «стоп на первом отказе»:
 * иначе одна крупная запись в голове списка
 * замораживала бы весь хвост при полупустом бюджете. Следствие: pinned-запись, не влезшая в
 * бюджет, тоже замораживается — защита вещдока не ворует квоту (развилка 5 плана, принято).
 *
 * ОТКАЗ — ВМЕСТО СПИСКОВ, не исключением и не пустым keep: пустой keep законен (лимит 0), а
 * «вход не читается» — другое событие. Пустой вход — не ошибка: нечего морозить.
 *
 * КОНТРАКТ (каждый пункт держит зуб в `select-keep-within-bytes.test.ts`, номер строки — `it`):
 *   · `limitBytes = 0` → весь вход во freeze, keep пуст, отказа нет — :64;
 *   · `sum(keep.bytes) ≤ limitBytes`, keep ∪ freeze = вход без потерь и дублей — :33;
 *   · pinned, не влезший в остаток, → во freeze (защита не ворует квоту) — :106;
 *   · pinned-неизмеримая → в keep и ВХОДИТ в `keepBytes` (лимит один для всего keep) — :150, :226;
 *   · неизмеримая (`modeRank: null`) без pinned → во freeze даже при свободном бюджете — :140;
 *   · повторный прогон на keep ∪ freeze с тем же лимитом даёт тот же ответ (идемпотентность) — :239;
 *   · `modeRank` в публичном типе — `number | null` строго; `undefined`, пришедший мимо типов
 *     (`ranks.get(id)` без `?? null`), нормализуется на входе в `null` — зуб в конце файла.
 */

/** Запись-кандидат. Байты известны всегда (размер блоба); ранг режима — нет. */
export interface KeepCandidate {
  /** Адрес блоба в media. Уникален во входе — повтор есть ошибка входа. */
  readonly sampleId: string;
  /** Размер блоба, байт: целое ≥ 0. */
  readonly bytes: number;
  /** Время записи, epoch ms — ось «новее остаётся». */
  readonly createdAt: number;
  /** Размечена человеком или помечена «хранить» (`isPinnedByHuman` на стороне media). */
  readonly pinned: boolean;
  /**
   * Позиция в порядке выбранного режима chart-list: 0 — лучший. `null` — режим запись не измерил
   * (тишина, ниже порога, не декодируется). См. `modeRanksFromPicks`.
   */
  readonly modeRank: number | null;
}

export type KeepRefusalReason = 'invalid-limit' | 'invalid-candidate' | 'duplicate-sample';

export interface KeepRefusal {
  readonly reason: KeepRefusalReason;
  readonly detail: string;
}

export interface KeepWithinBytesResult {
  /** Остаются живыми — в порядке приоритета keep. */
  readonly keep: readonly KeepCandidate[];
  /** Уходят во freeze — в том же порядке приоритета (предпросмотру есть что показать). */
  readonly freeze: readonly KeepCandidate[];
  readonly keepBytes: number;
  readonly freezeBytes: number;
  readonly limitBytes: number;
  /** Не `null` — списки пусты, вход не читается. */
  readonly refusal: KeepRefusal | null;
}

const isNonNegativeInt = (v: unknown): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= 0;

/** Сравнение строк по кодовым единицам — одинаково на сервере и в браузере, без локали. */
const compareIds = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/**
 * Порядок приоритета keep: pinned → ранг режима (неизмеримые последними) → новее → `sampleId`.
 * Чистый компаратор для `Array.prototype.sort`; антисимметричен, на равных даёт 0.
 */
export function compareKeepPriority(a: KeepCandidate, b: KeepCandidate): number {
  if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
  const ra = a.modeRank ?? Number.POSITIVE_INFINITY;
  const rb = b.modeRank ?? Number.POSITIVE_INFINITY;
  if (ra !== rb) return ra < rb ? -1 : 1;
  if (a.createdAt !== b.createdAt) return b.createdAt - a.createdAt;
  return compareIds(a.sampleId, b.sampleId);
}

function validate(candidates: readonly KeepCandidate[], limitBytes: number): KeepRefusal | null {
  if (!isNonNegativeInt(limitBytes)) {
    return { reason: 'invalid-limit', detail: `лимит байт «${String(limitBytes)}» — не целое ≥ 0` };
  }
  const seen = new Set<string>();
  for (const c of candidates) {
    if (typeof c.sampleId !== 'string' || c.sampleId === '') {
      return { reason: 'invalid-candidate', detail: 'запись без sampleId — заморозить нечего адресовать' };
    }
    if (!isNonNegativeInt(c.bytes)) {
      return { reason: 'invalid-candidate', detail: `${c.sampleId}: bytes «${String(c.bytes)}» — не целое ≥ 0` };
    }
    if (typeof c.createdAt !== 'number' || !Number.isFinite(c.createdAt)) {
      return { reason: 'invalid-candidate', detail: `${c.sampleId}: createdAt «${String(c.createdAt)}» — не число` };
    }
    if (c.modeRank !== null && !isNonNegativeInt(c.modeRank)) {
      return { reason: 'invalid-candidate', detail: `${c.sampleId}: modeRank «${String(c.modeRank)}» — не целое ≥ 0 и не null` };
    }
    if (seen.has(c.sampleId)) {
      return { reason: 'duplicate-sample', detail: `${c.sampleId} встречается дважды — один блоб не бывает и живым, и замороженным` };
    }
    seen.add(c.sampleId);
  }
  return null;
}

/**
 * Разбить кандидатов на keep / freeze под бюджет байт.
 *
 * Инварианты (проверяются зубами): `sum(keep.bytes) ≤ limitBytes`; `keep ∪ freeze` = вход без
 * потерь и дублей; результат не зависит от порядка входа.
 *
 * @param candidates записи одной оси квоты (v1 — буфер прибора)
 * @param limitBytes бюджет живого — лимит оси на НОВОМ тарифе, байт
 */
export function selectKeepWithinBytes(
  candidates: readonly KeepCandidate[],
  limitBytes: number,
): KeepWithinBytesResult {
  // Публичный тип — `number | null` строго; `undefined` сюда попадает только мимо типов (например,
  // `ranks.get(id)` из `modeRanksFromPicks` подставлен без `?? null`). Это не ошибка входа, а
  // «режим запись не измерил» — нормализуем в `null` явно, чтобы один смысл не жил в двух формах.
  const normalized = candidates.map((c) =>
    (c.modeRank as number | null | undefined) === undefined ? { ...c, modeRank: null } : c,
  );
  const refusal = validate(normalized, limitBytes);
  if (refusal) {
    return { keep: [], freeze: [], keepBytes: 0, freezeBytes: 0, limitBytes, refusal };
  }

  const ordered = normalized.sort(compareKeepPriority);
  const keep: KeepCandidate[] = [];
  const freeze: KeepCandidate[] = [];
  let keepBytes = 0;
  let freezeBytes = 0;

  for (const c of ordered) {
    // Неизмеримая без слова человека — во freeze независимо от бюджета (v1).
    const eligible = c.pinned || c.modeRank !== null;
    if (eligible && keepBytes + c.bytes <= limitBytes) {
      keep.push(c);
      keepBytes += c.bytes;
    } else {
      freeze.push(c);
      freezeBytes += c.bytes;
    }
  }

  return { keep, freeze, keepBytes, freezeBytes, limitBytes, refusal: null };
}

/**
 * Ранги режима из строк выборки chart-list (`ChartListPick.rank`, с единицы) → `modeRank` с нуля.
 * Записи, которых в выборке нет, в карте отсутствуют — вызывающий ставит им `modeRank: null`.
 *
 * Бросает на повторе `sampleId`: две строки выборки на один блоб — ошибка строителя выборки, и
 * молча взять последнюю значило бы спрятать её.
 */
export function modeRanksFromPicks(
  picks: readonly { readonly sampleId: string; readonly rank: number }[],
): ReadonlyMap<string, number> {
  const sorted = [...picks].sort((a, b) => a.rank - b.rank);
  const out = new Map<string, number>();
  sorted.forEach((p, i) => {
    if (out.has(p.sampleId)) {
      throw new Error(`modeRanksFromPicks: sampleId «${p.sampleId}» встречается в выборке дважды`);
    }
    out.set(p.sampleId, i);
  });
  return out;
}
