/**
 * Манифест входа сеанса консилиума (#1465 хвост / топ-10 30.07 п.5).
 *
 * Дважды за 29.07 комната сочинила утверждение о СВОЁМ входе: «M0 ратифицирован» и
 * «бриф не передан» при доехавшем брифе. Проверить было нечем — шапка протокола несла
 * из входа ровно один путь (`| Повестка | docs/.../M1_AGENDA.md |`), без ответа на
 * вопросы «доехало ли» и «целиком ли».
 *
 * Механика, делавшая это возможным:
 *   · `readBounded` режет КАЖДЫЙ вход по своему потолку и оставляет пометку лишь в тексте;
 *   · вся сборка режется по `MAX_ASSEMBLED_CHARS` — и повестка стоит в ХВОСТЕ.
 * Тот же потолок уже съедал вопрос (зверь B1, 27.07) — вопрос после этого продублировали
 * в голову сборки, а повестку и вложения нет. То есть «бриф не передан» могло быть
 * правдой комнаты и ложью человека одновременно, и различить их было нечем.
 *
 * Здесь — чистая арифметика: где во собранном промпте лежит каждый вход и что с ним
 * сделал потолок. Ни ФС, ни сети.
 */

/** Исходы доставки входа. Перечень закрытый. */
export const DELIVERY_STATES = ['полностью', 'обрезан', 'не доехал'];

/**
 * Отпечаток доставленного текста (канон формата хендофа 30.07 требует его в манифесте).
 *
 * Отвечает на вопрос, которого не закрывает ни путь, ни размер: доехала ли ТА САМАЯ
 * версия. Путь совпадает и когда файл переписали между сборкой и чтением протокола.
 *
 * @param {(input: string) => string} sha256hex — инъекция, чтобы модуль остался чистым
 */
export function fingerprintOf(text, sha256hex) {
  return sha256hex(String(text)).slice(0, 12);
}

/** Размер для таблицы: символы, а для повестки — ещё и число пунктов. */
export function formatSize(record) {
  const chars = `${record.chars}`;
  return record.items === null || record.items === undefined
    ? chars
    : `${chars} · ${record.items} п.`;
}

/**
 * Смещения частей в `parts.join('\n')` — по той же арифметике, что и сам join.
 * @param {string[]} parts
 * @returns {number[]} смещение начала каждой части
 */
export function partOffsets(parts) {
  const offsets = [];
  let acc = 0;
  for (const part of parts) {
    offsets.push(acc);
    acc += String(part).length + 1;
  }
  return offsets;
}

/**
 * @param {{start: number, chars: number, truncatedOwn?: boolean}} record
 * @param {number|null} cutAt — граница обрезки сборки; null = сборка не резалась
 * @returns {'полностью'|'обрезан'|'не доехал'}
 */
export function resolveDelivery(record, cutAt) {
  const { start, chars, truncatedOwn = false } = record;
  if (cutAt !== null && cutAt !== undefined) {
    // Вход целиком за границей — комната его НЕ ВИДЕЛА. Это ровно тот случай,
    // который выглядел как «бриф не передан» и не отличался от вранья комнаты.
    if (start >= cutAt) return 'не доехал';
    if (start + chars > cutAt) return 'обрезан';
  }
  return truncatedOwn ? 'обрезан' : 'полностью';
}

/**
 * Проставить доставку каждому входу.
 * @param {Array<{kind: string, path: string|null, chars: number, start: number, truncatedOwn?: boolean}>} records
 * @param {{assembledChars: number, limit: number}} assembly
 */
export function resolveManifest(records, assembly) {
  const cutAt = assembly.assembledChars > assembly.limit ? assembly.limit : null;
  return records.map((r) => ({ ...r, delivery: resolveDelivery(r, cutAt) }));
}

/** Есть ли хоть один вход, которого комната не видела или видела частично. */
export function manifestHasLoss(records) {
  return records.some((r) => r.delivery === 'не доехал' || r.delivery === 'обрезан');
}

/**
 * Шапка протокола: таблица входа. Пустой манифест — не пустая таблица, а честная строка:
 * «нечем подтвердить» лучше, чем отсутствие раздела (его читают как «входа не было»).
 * @param {Array<{kind: string, path: string|null, chars: number, delivery: string}>} records
 */
export function renderInputManifest(records) {
  if (!records || records.length === 0) {
    return ['**Вход сеанса:** манифест не собран — по этому протоколу вход не подтверждается.'];
  }
  const lines = [
    '**Вход сеанса** (что комната действительно получила):',
    '',
    '| Вход | Носитель | Размер | Отпечаток | Доставка |',
    '|------|----------|-------:|-----------|----------|',
  ];
  for (const r of records) {
    const mark = r.delivery === 'полностью' ? r.delivery : `**${r.delivery}**`;
    const carrier = r.path ? `\`${r.path}\`` : '—';
    lines.push(`| ${r.kind} | ${carrier} | ${formatSize(r)} | \`${r.fingerprint ?? '—'}\` | ${mark} |`);
  }
  if (manifestHasLoss(records)) {
    lines.push(
      '',
      '> ⚠ Часть входа не доехала до комнаты целиком. Утверждения протокола о своём входе',
      '> сверять с этой таблицей, а не с текстом реплик.',
    );
  }
  return lines;
}
