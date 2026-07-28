/**
 * honesty-predicates — ОДИН канон анти-подделки второго контура (P4; межа
 * сшивки №4 заседания memory-subconscious).
 *
 * Формулировка одна: «квитанция/метрика не подделывается» — заявленное исполнение
 * обязано быть ПОДКРЕПЛЕНО событиями op-log. forge_done (C4, квитанции цикла) и
 * forge_metrics (C5, счётчики) — два ЛИЦА одного предиката unbackedClaim, не две
 * параллельные нормы: receiptForged и metricsForged оба зовут его и ссылаются
 * друг на друга; расхождение формулировок — дефект этого файла, не «нюанс».
 *
 * Рядом — naVsZero (C5): n/a ≠ 0. Ноль валиден только при СУЩЕСТВУЮЩЕМ логе;
 * без лога честный ответ — «n/a (no log)», нарисованный ноль = подделка пустоты.
 */

/**
 * ЯДРО КАНОНА: заявление без событийной опоры — подделка.
 * @param {number} claimed — сколько заявлено
 * @param {number} backed — сколько подтверждено событиями журнала
 * @returns {boolean} true = forged (заявлено больше, чем прожито)
 */
export function unbackedClaim(claimed, backed) {
  return Number(claimed) > Number(backed);
}

/**
 * forge_done (C4) через ядро канона: квитанция done/degraded обязана иметь
 * опору в op-log. done(E) без transfer_to_archive при transfer_applied:true,
 * done без receipt_close — подделка исполнения такта.
 * Зеркальная норма для счётчиков — {@link metricsForged} (межа №4: канон один).
 *
 * @param {{slot: 'E'|'M', status: string, transfer_applied?: boolean, persona?: string}} receipt
 * @param {object[]} logEvents — события op-log той же persona×date
 * @returns {{forged: boolean, reasons: string[]}}
 */
export function receiptForged(receipt, logEvents) {
  const reasons = [];
  const events = logEvents ?? [];
  const count = (verb) => events.filter((e) => e.verb === verb).length;
  if (!receipt || typeof receipt !== 'object') return { forged: true, reasons: ['квитанция не объект'] };

  if (receipt.status === 'done' || receipt.status === 'degraded' || receipt.status === 'late') {
    if (unbackedClaim(1, count('receipt_close'))) {
      reasons.push(`квитанция ${receipt.slot}:${receipt.status} без события receipt_close в op-log — forge_done (канон: заявление без опоры)`);
    }
    if (receipt.slot === 'E' && receipt.status === 'done') {
      if (receipt.transfer_applied !== true) {
        reasons.push('done(E) требует transfer_applied:true (C4) — done без перетока не done');
      } else if (unbackedClaim(1, count('transfer_to_archive'))) {
        reasons.push('transfer_applied:true без единого transfer_to_archive в op-log — forge_done');
      }
    }
    if (receipt.slot === 'E' && receipt.status === 'done' && unbackedClaim(1, count('evening_compress'))) {
      reasons.push('done(E) без события evening_compress — слот заявлен, не прожит');
    }
    if (receipt.slot === 'M' && receipt.status === 'done' && unbackedClaim(1, count('morning_warmup'))) {
      reasons.push('done(M) без события morning_warmup — слот заявлен, не прожит');
    }
  }
  return { forged: reasons.length > 0, reasons };
}

/**
 * forge_metrics (C5) через то же ядро канона: каждый счётчик metrics обязан
 * сходиться с пересчётом по op-log — нарисованное сверх прожитого = подделка.
 * Зеркальная норма для квитанций — {@link receiptForged} (межа №4: канон один).
 *
 * @param {{ops?: Record<string, number>}} metrics
 * @param {object[]} logEvents
 * @returns {{forged: boolean, reasons: string[]}}
 */
export function metricsForged(metrics, logEvents) {
  const reasons = [];
  const events = logEvents ?? [];
  for (const [verb, claimed] of Object.entries(metrics?.ops ?? {})) {
    const backed = events.filter((e) => e.verb === verb).length;
    if (unbackedClaim(claimed, backed)) {
      reasons.push(`ops.${verb}=${claimed} при ${backed} событиях в op-log — forge_metrics (канон: заявление без опоры)`);
    }
  }
  return { forged: reasons.length > 0, reasons };
}

/**
 * n/a ≠ 0 (C5): без существующего лога счётчики обязаны быть 'n/a (no log)'.
 * @param {{ops?: Record<string, number|string>}} metrics
 * @param {boolean} logExists
 * @returns {{ok: boolean, problems: string[]}}
 */
export function naVsZero(metrics, logExists) {
  const problems = [];
  if (!logExists) {
    for (const [verb, v] of Object.entries(metrics?.ops ?? {})) {
      if (typeof v === 'number') {
        problems.push(`ops.${verb}=${v} при отсутствующем op-log — ноль/число без лога есть подделка пустоты; честно: 'n/a (no log)'`);
      }
    }
  }
  return { ok: problems.length === 0, problems };
}
