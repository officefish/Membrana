/**
 * evidence-inventory — опись вещдоков: живые записи, разрезы, индекс (#1303, №9 хендофа 28.07).
 *
 * Реестр append-only: строки не правятся, поправка — НОВАЯ запись `<id>-rN`,
 * суперсидящая прежнюю (образец: ozon-receipt-3765-field-kit-r2, 27.07). Отсюда
 * ключевое понятие описи: ЖИВАЯ запись — последняя в цепочке поправок; старая
 * остаётся в реестре историей и в опись не идёт.
 *
 * Классификация — проекция уже существующей таксономии README («поступления мира
 * и изъятия из сессий»), не новая сущность: kind выводится из записи, полем не
 * дописывается.
 *
 * Ни fs, ни сети — обвязка снаружи (scripts/evidence.mjs).
 */

const REV_RE = /^(.*)-r(\d+)$/u;

/** Базовый id и номер поправки: `x-r2` → {base: 'x', rev: 2}; без суффикса — rev 1. */
export function revisionOf(id) {
  const m = REV_RE.exec(String(id ?? ''));
  return m ? { base: m[1], rev: Number(m[2]) } : { base: String(id ?? ''), rev: 1 };
}

/**
 * Живые записи: по каждой цепочке поправок — запись с наибольшим rev.
 * @param {object[]} records
 * @returns {{live: object[], superseded: {id: string, by: string}[]}}
 */
export function liveRecords(records) {
  const best = new Map();
  for (const r of records ?? []) {
    const { base, rev } = revisionOf(r.id);
    const cur = best.get(base);
    if (!cur || rev > cur.rev) best.set(base, { rev, record: r });
  }
  const liveIds = new Set([...best.values()].map((v) => v.record.id));
  const superseded = [];
  for (const r of records ?? []) {
    if (liveIds.has(r.id)) continue;
    superseded.push({ id: r.id, by: best.get(revisionOf(r.id).base).record.id });
  }
  return { live: [...best.values()].map((v) => v.record), superseded };
}

/**
 * Вид вывода записи (проекция таксономии README, derived — не поле):
 *  · `изъятие` — материал добыт из наших сессий/дня (архивариус, мемо дня);
 *  · `поступление` — пришло из мира (чек, документ партнёра, фото).
 */
export function kindOf(record) {
  const ref = String(record?.location?.ref ?? '');
  if (record?.location?.kind === 'archivarius' || ref.startsWith('docs/memos/')) return 'изъятие';
  return 'поступление';
}

/** Абсолютный путь (Windows-диск или POSIX-корень) — не переносим между машинами. */
export function isAbsoluteRef(ref) {
  const s = String(ref ?? '');
  return /^[A-Za-z]:[\\/]/u.test(s) || s.startsWith('/') || s.startsWith('\\\\');
}

/**
 * Находки переносимости по ЖИВЫМ записям (история не судится — её править нельзя).
 *
 * ЛЕГАЛЬНОЕ «НЕТ» (норма B10): запись с `sensitive.reason` не краснеет — байты
 * чувствительного внешнего материала в ПУБЛИЧНЫЙ репозиторий не кладутся, значит
 * переносимость невозможна по природе, и это названо причиной, а не замолчано.
 * Такая запись и не «зелёная»: в описи у неё отдельная пометка.
 * @param {object[]} records
 * @returns {string[]}
 */
export function portabilityProblems(records) {
  const { live } = liveRecords(records);
  const problems = [];
  for (const r of live) {
    if (r?.location?.kind !== 'local' || !isAbsoluteRef(r.location.ref)) continue;
    if (isSensitive(r)) continue;
    problems.push(`${r.id}: абсолютный путь «${r.location.ref}» — вещдок привязан к одной машине; поправка новой записью ${revisionOf(r.id).base}-r${revisionOf(r.id).rev + 1} с байтами в docs/evidence/store/ (либо пометка sensitive с причиной, если материал в публичный репозиторий класть нельзя)`);
  }
  return problems;
}

/** Чувствительный материал: байты вне репо по объявленной причине. */
export function isSensitive(record) {
  return typeof record?.sensitive?.reason === 'string' && record.sensitive.reason.trim().length > 0;
}

/** Разрезы описи. @param {'kind'|'source'|'date'} by */
export function groupBy(records, by) {
  const { live } = liveRecords(records);
  const groups = new Map();
  for (const r of live) {
    const key =
      by === 'kind' ? kindOf(r)
        : by === 'date' ? String(r.addedAt ?? 'без даты')
          : String(r.source ?? 'без провенанса').split(',')[0].trim();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }
  return groups;
}

const short = (s, n) => {
  const t = String(s ?? '').replace(/\s+/gu, ' ').trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
};

/** Человекочитаемая опись для терминала. */
export function renderInventory(records, by) {
  const groups = groupBy(records, by);
  const { live, superseded } = liveRecords(records);
  const lines = [`опись вещдоков — ${live.length} живых (разрез: ${by})`];
  for (const [key, rows] of [...groups].sort((a, b) => String(a[0]).localeCompare(String(b[0])))) {
    lines.push(`\n## ${key} (${rows.length})`);
    for (const r of rows) {
      lines.push(`  · ${r.id} — ${short(r.about ?? r.source, 90)}`);
      lines.push(`      sha ${String(r.sha256).slice(0, 12)}… · ${r.bytes} байт · ${isSensitive(r) ? '⚠ ЧУВСТВИТЕЛЬНОЕ, байты вне репо' : `${r.location.kind}:${r.location.ref}`}`);
    }
  }
  if (superseded.length) {
    lines.push(`\nисправлено новыми записями (история, не в описи): ${superseded.map((s) => `${s.id} → ${s.by}`).join(', ')}`);
  }
  return lines.join('\n');
}

/**
 * Индекс docs/evidence/INDEX.md — ПРОИЗВОДНЫЙ снимок реестра: детерминированный
 * (сортировка по id), без даты генерации в теле — перегенерация даёт тот же файл.
 */
export function renderIndex(records) {
  const { live, superseded } = liveRecords(records);
  const sorted = [...live].sort((a, b) => String(a.id).localeCompare(String(b.id)));
  const lines = [
    '# Индекс вещдоков — производный снимок',
    '',
    '> ГЕНЕРИРУЕТСЯ из `registry.jsonl` (`yarn evidence index`). Руками не править —',
    '> правка потеряется при следующей перегенерации; поправка вещдока = НОВАЯ запись',
    '> `<id>-rN` в реестре (append-only). Здесь только ЖИВЫЕ записи; исправленные —',
    '> в хвосте строкой истории.',
    '',
    '| id | вид | что это | адрес | sha256 | байт |',
    '|----|-----|---------|-------|--------|------|',
  ];
  for (const r of sorted) {
    // Адрес чувствительной записи в опись не печатается: путь к материалу вне репо
    // сам по себе — сведение, которому в публичном репозитории не место. Тождество
    // держит sha, смысл — about.
    const addr = isSensitive(r) ? '⚠ чувствительное — байты и адрес вне репо' : `\`${r.location.kind}:${r.location.ref}\``;
    lines.push(`| ${r.id} | ${kindOf(r)} | ${short(r.about ?? r.source, 70)} | ${addr} | \`${String(r.sha256).slice(0, 12)}…\` | ${r.bytes} |`);
  }
  lines.push('');
  if (superseded.length) {
    lines.push(`**Исправлено новыми записями:** ${superseded.map((s) => `\`${s.id}\` → \`${s.by}\``).join(' · ')}`);
    lines.push('');
  }
  return lines.join('\n');
}
