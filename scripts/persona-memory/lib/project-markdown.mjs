/**
 * Проекция оперативной памяти в md — P3 стройки (C1: md = view; C2: состав задаёт
 * selectOperational). Путь и читаемая структура текущих журналов СОХРАНЯЮТСЯ —
 * потребители (team-memory-report, day-memo persona-trace, консилиум-память)
 * продолжают читать без правок (C6: смоук, правки только при красном).
 *
 * Чистая функция: fs у вызывающего.
 */

/**
 * Собрать md-проекцию персоны из retained-записей.
 * Формат записей повторяет живые журналы: `### <дата> · <тип> · <slug>` + цитата.
 * @param {{personaId: string, personaTitle?: string, retained: object[], report: object, archiveRel: string}} a
 * @returns {string}
 */
export function projectMarkdown(a) {
  const lines = [];
  lines.push(`# Журнал субъектного опыта — ${a.personaId}${a.personaTitle ? ` (${a.personaTitle})` : ''}`);
  lines.push('');
  lines.push('> Проекция оперативной памяти (O) из архива подсознания — руками не редактировать.');
  lines.push('> Источник истины: ' + a.archiveRel + ' (append-only). Состав задаёт политика C2');
  lines.push('> (pinned вне бюджета — importance.json ПРОВОДИТСЯ в отбор; comparator ординалами,');
  lines.push('> recency — последний ключ). Полная лента и вытесненное — в архиве, не потеряно.');
  lines.push('');
  lines.push(`Записей: ${a.retained.length} · бюджет ${a.report?.budget?.used ?? '?'}/${a.report?.budget?.limit ?? '?'} · статус ${a.report?.status ?? '?'}`);
  lines.push(`<!-- archive_from: ${a.archiveRel} · transferred: ${a.report?.transferred?.length ?? 0} (причины в op-log) -->`);
  lines.push('');
  for (const r of a.retained) {
    const date = String(r.ts ?? '').slice(0, 10);
    const slug = r.id.replace(new RegExp(`^${a.personaId}-`), '').replace(/^\d{4}-\d{2}-\d{2}-/, '');
    const pin = r._pinned ? ' · 📌 pinned' : '';
    lines.push(`### ${date} · ${r.class} · ${slug}${pin}`);
    lines.push('');
    lines.push(`> ${String(r.text).split(/\r?\n/).join(' ')}`);
    lines.push('');
    lines.push(`— источник: \`${r.provenance}\``);
    lines.push('');
  }
  if (a.retained.length === 0) {
    lines.push('_оперативная проекция пуста — полная лента в архиве_');
    lines.push('');
  }
  return lines.join('\n');
}
