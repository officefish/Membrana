/**
 * Рендер отчёта измерения — вердикт M3, DoD C1.
 *
 * Отчёт несёт honest-шапку (окно, ревизии обоих снимков, множество учтённых
 * артефактов), каждую объёмную величину — рядом с её парой, обязательную подпись
 * «wip = очередь намерений, не производительность» и секцию «намеренно
 * неизмеримое» явным текстом. Чистый рендер: данные → строка, без сети и часов.
 */

export const WIP_DISCLAIMER = 'wip = очередь намерений, не производительность';

export const DELIBERATELY_UNMEASURED = Object.freeze([
  'индивидуальная производительность аватара — нет носителя: субагент обезличен и памяти не персистит (контракт M1)',
  'вклад в строках/коммитах — коммит не носитель следа (вердикт M2, инцидент 19.07)',
  '«качество мышления» персоны — не редуцируется к следу, мерить отказываемся явно',
]);

function pct(x) {
  return `${(x * 100).toFixed(1)}%`;
}

function hours(ms) {
  return `${(ms / 3_600_000).toFixed(1)}ч`;
}

/**
 * @param {ReturnType<import('./measure-metrics.mjs').computeTeamMetrics>} result
 * @returns {string} markdown-отчёт
 */
export function renderTeamMetricsReport(result) {
  const { header, metrics } = result;
  if (!header?.window || !header.prevRevision || !header.currRevision || !Array.isArray(header.artifactsCounted)) {
    throw new Error('renderTeamMetricsReport: результат без honest-шапки не рендерится');
  }

  const lines = [];
  lines.push('# Отчёт измерения работы команды');
  lines.push('');
  lines.push('## Honest-шапка');
  lines.push('');
  lines.push(`- Окно: \`[${header.window.from}, ${header.window.to})\``);
  lines.push(`- Снимок t−1: ревизия \`${header.prevRevision}\` (снят ${header.prevCapturedAt})`);
  lines.push(`- Снимок t: ревизия \`${header.currRevision}\` (снят ${header.currCapturedAt})`);
  lines.push(
    `- Учтённые артефакты закрытия (${header.artifactsCounted.length}): ${
      header.artifactsCounted.length > 0 ? header.artifactsCounted.map((id) => `\`${id}\``).join(', ') : '—'
    }`,
  );
  lines.push('');
  lines.push('## Величины (каждая объёмная — с парой)');
  lines.push('');

  const lt = metrics.leadTime;
  lines.push(`### leadTime · пара: ${lt.pair}`);
  lines.push('');
  if (lt.values.length === 0) {
    lines.push('- закрытых в окне единиц нет — величина честно не считается');
  } else {
    for (const { taskId, ms } of lt.values) lines.push(`- \`${taskId}\`: ${hours(ms)}`);
  }
  lines.push('');

  const ol = metrics.ownerlessRate;
  lines.push(`### ownerlessRate · ${ol.pair}`);
  lines.push('');
  lines.push(`- ${pct(ol.value)} (${ol.ownerless} из ${ol.total} единиц без \`leadPersona\`)`);
  lines.push('');

  const wip = metrics.wip;
  lines.push(`### wip · пара: ${wip.pair}`);
  lines.push('');
  lines.push(`**${WIP_DISCLAIMER}**`);
  lines.push('');
  for (const [persona, count] of Object.entries(wip.byPersona)) lines.push(`- ${persona}: ${count}`);
  if (Object.keys(wip.byPersona).length === 0) lines.push('- движущихся единиц нет');
  lines.push('');

  const tp = metrics.throughput;
  lines.push(`### throughput · пара: ${tp.pair}`);
  lines.push('');
  for (const [persona, count] of Object.entries(tp.byPersona)) lines.push(`- ${persona}: ${count}`);
  if (Object.keys(tp.byPersona).length === 0) lines.push('- закрытых в окне единиц нет');
  lines.push('');

  const esc = metrics.escalationRate;
  lines.push(`### escalationRate · ${esc.pair}`);
  lines.push('');
  lines.push(`- ${pct(esc.value)} (${esc.escalatedIds.length} из ${esc.of} единиц, присутствующих в обоих срезах)`);
  if (esc.escalatedIds.length > 0) lines.push(`- единицы: ${esc.escalatedIds.map((id) => `\`${id}\``).join(', ')}`);
  lines.push('');

  lines.push('## Намеренно неизмеримое');
  lines.push('');
  for (const item of DELIBERATELY_UNMEASURED) lines.push(`- ${item}`);
  lines.push('');
  lines.push('> Доля переделок (reworkRate) — риторическая величина: живёт только в аудите');
  lines.push('> конца дня (`measure-rework-rhetoric.mjs`), хранимым событием не подкрепляется,');
  lines.push('> в этот батч не входит.');
  lines.push('');

  return lines.join('\n');
}
