/**
 * metrics — сводки v1 второго контура (P4; вердикт C5): счётчики и разрезы БЕЗ
 * threshold-констант. Пороги/health — v2 (именованные пустые слоты, не здесь).
 *
 * Правило трёх строк token 121: surfaced_today = только acts **emerge** —
 * cloud_query (машина подала), reject (персона отвергла) и warmup_feed
 * (утренний feed без act-reason) в строку 3 НЕ считаются.
 *
 * Стык со схемой C1 (межа №2): класс перетока живёт в СОБЫТИИ transfer_to_archive
 * op-log'а; ArchiveRecord несёт importanceSnapshot и ts — sunkUnsurfaced джойнит
 * архив с журналом, ничего не дописывая в записи.
 */

/**
 * Снимок метрик за дату по журналам персон.
 * @param {{persona: string, events: object[]}[]} logs
 * @param {string} date — YYYY-MM-DD (метка снимка)
 */
export function metricsSnapshot(logs, date) {
  const ops = {};
  const transferByClass = {};
  const receiptsByStatus = {};
  const byPersona = {};
  let surfaced = 0;

  for (const { persona, events } of logs ?? []) {
    for (const e of events ?? []) {
      ops[e.verb] = (ops[e.verb] ?? 0) + 1;
      if (e.verb === 'transfer_to_archive') {
        const cls = e.class ?? 'unspecified';
        transferByClass[cls] = (transferByClass[cls] ?? 0) + 1;
      }
      if (e.verb === 'receipt_close') {
        const status = e.reason ?? 'unspecified';
        receiptsByStatus[status] = (receiptsByStatus[status] ?? 0) + 1;
      }
      if (e.verb === 'emerge') {
        surfaced += 1;
        byPersona[persona] = (byPersona[persona] ?? 0) + 1;
      }
    }
  }
  return {
    date,
    ops,
    transfer_by_class: transferByClass,
    receipts_by_status: receiptsByStatus,
    surfaced_today: { total: surfaced, byPersona },
  };
}

/**
 * Предикат «утонуло и не всплыло» (C5): (pinned ∨ class ∈ {position, insight})
 * ∧ transferred ∧ age ≥ N ∧ emerge_count = 0. Выход — множество id ПОИМЁННО +
 * count; N — параметр отчёта, alarm-порогов нет (v2).
 *
 * transferred ⇔ запись лежит в архиве (в архив попадают только перетоком, C1);
 * возраст — от ts записи; pinned — importanceSnapshot === 'pinned'; класс —
 * из события transfer_to_archive журнала (ref = id записи, межа №2).
 *
 * @param {{id: string, ts?: string, importanceSnapshot?: string}[]} archive — записи ArchiveRecord
 * @param {object[]} logEvents — события op-log (transfer несёт class; emerge снимает сигнал)
 * @param {number} N — возраст в днях
 * @param {{today?: string}} [opts]
 * @returns {{ids: string[], count: number, N: number}}
 */
export function sunkUnsurfaced(archive, logEvents, N, opts = {}) {
  const today = opts.today ?? new Date().toISOString().slice(0, 10);
  const events = logEvents ?? [];
  const emerged = new Set(events.filter((e) => e.verb === 'emerge' && e.ref).map((e) => String(e.ref)));
  const classByRef = new Map(
    events.filter((e) => e.verb === 'transfer_to_archive' && e.ref && e.class).map((e) => [String(e.ref), e.class]),
  );
  const ids = [];
  for (const r of archive ?? []) {
    if (!r?.id || !r.ts) continue;
    const cls = classByRef.get(String(r.id));
    const important = r.importanceSnapshot === 'pinned' || cls === 'position' || cls === 'insight';
    if (!important) continue;
    const ageDays = (Date.parse(today) - Date.parse(String(r.ts).slice(0, 10))) / 86_400_000;
    if (!(ageDays >= N)) continue;
    if (emerged.has(String(r.id))) continue;
    ids.push(r.id);
  }
  return { ids, count: ids.length, N };
}
