/**
 * Доставка дайджеста снов к ритуалу: markdown read-проекция (линза M4 — снаружи).
 * Три исхода: has-winners · ran-empty · never-ran (#998 / DRU-362).
 */
import { heatOf } from './dreams-select.mjs';

/** @type {Readonly<Record<string, string>>} */
const NEVER_RAN_REASONS = Object.freeze({
  'volume-missing': 'Том снов отсутствует — ночь не могла записаться.',
  'day-log-missing': 'Лога за сутки нет — ночь не запускалась.',
  'day-log-empty': 'Файл лога пуст — слотов нет.',
  'no-events': 'Событий за сутки нет — ночь не запускалась.',
});

/** @type {Readonly<Record<string, string>>} */
const RAN_EMPTY_REASONS = Object.freeze({
  'all-skipped': 'Все слоты пропущены (skipped) — победителя выбрать не из чего.',
  'all-failed-or-skipped': 'Синтез не удался ни в одном слоте — победителей нет.',
  'no-winner-selected': 'Слоты были, но ни один заезд не дал победителя.',
});

/**
 * Прикрепить источник чтения и живость производителя к проекции (не мутирует вход).
 * @param {object} proj
 * @param {{ kind: 'local-volume'|'office', root?: string, producerAlive?: boolean|null }} source
 */
export function attachDigestSource(proj, source) {
  return { ...proj, source: { ...source } };
}

/**
 * @param {object} proj
 * @returns {string}
 */
export function formatDreamDigestMd(proj) {
  const winners = proj.winners ?? [];
  const status = proj.status ?? (winners.length > 0 ? 'has-winners' : 'never-ran');
  const reason = proj.reason ?? null;
  const source = proj.source ?? null;
  const lines = [
    '---',
    `day: ${proj.day}`,
    `status: ${status}`,
    `reason: ${reason ?? ''}`,
    `winners: ${winners.length}`,
    `eventCount: ${proj.eventCount ?? winners.length}`,
    `noWinnerHeats: [${(proj.noWinnerHeats ?? []).join(', ')}]`,
    `source: ${source?.kind ?? 'unknown'}`,
    `sourceRoot: ${source?.root ?? ''}`,
    `producerAlive: ${formatProducerAlive(source?.producerAlive)}`,
    'author: "Мастер снов"',
    '---',
    '',
    `# Дайджест снов · ${proj.day}`,
    '',
  ];

  lines.push(...formatSourceBlock(source), '');

  if (status === 'never-ran') {
    const why = NEVER_RAN_REASONS[reason] ?? NEVER_RAN_REASONS['no-events'];
    lines.push(
      '**Не запускалось.**',
      '',
      why,
      '',
      `_Причина (\`reason\`): \`${reason ?? 'no-events'}\`._`,
      '',
    );
    return lines.join('\n');
  }

  if (status === 'ran-empty') {
    const why = RAN_EMPTY_REASONS[reason] ?? RAN_EMPTY_REASONS['no-winner-selected'];
    lines.push(
      '**Отработало пусто.**',
      '',
      why,
      '',
      `Победителей: **0**/6` +
        ((proj.noWinnerHeats?.length ?? 0) > 0
          ? ` · пустые заезды: ${proj.noWinnerHeats.map((h) => `H${h}`).join(', ')}`
          : ''),
      '',
      `_Причина (\`reason\`): \`${reason ?? 'no-winner-selected'}\` · событий в логе: ${proj.eventCount ?? 0}._`,
      '',
    );
    return lines.join('\n');
  }

  lines.push(
    `Победителей: **${winners.length}**/6` +
      ((proj.noWinnerHeats?.length ?? 0) > 0
        ? ` · пустые заезды: ${proj.noWinnerHeats.map((h) => `H${h}`).join(', ')}`
        : ''),
    '',
  );
  for (const [i, w] of winners.entries()) {
    lines.push(
      `## ${i + 1}. час ${w.hour} · заезд ${heatOf(w.hour)}`,
      '',
      w.text ?? '_(нет текста)_',
      '',
      `<details><summary>провенанс</summary>`,
      '',
      `- author: ${w.author} v${w.version}`,
      `- pair: \`${(w.pair ?? []).join(' + ')}\``,
      `- provider: \`${w.provider}\` · attempts: ${w.attempts?.length ?? 0}`,
      `- seed: \`${w.seed}\``,
      '',
      `</details>`,
      '',
    );
  }
  lines.push(
    '> Полный лог 24 снов — append-only на office-volume (`dreams/<day>.jsonl`).',
    '> Проигравшие не выбрасываются: контент-мейкер / архив.',
    '',
  );
  return lines.join('\n');
}

/**
 * @param {boolean|null|undefined} alive
 * @returns {string}
 */
function formatProducerAlive(alive) {
  if (alive === true) return 'true';
  if (alive === false) return 'false';
  return 'unchecked';
}

/**
 * @param {{ kind?: string, root?: string, producerAlive?: boolean|null }|null} source
 * @returns {string[]}
 */
function formatSourceBlock(source) {
  if (!source?.kind) {
    return ['Источник чтения: **не указан** · живость производителя: **unchecked**'];
  }
  const kindLabel = source.kind === 'office' ? 'сервер (office)' : 'локальный том';
  const alive =
    source.producerAlive === true
      ? 'жива'
      : source.producerAlive === false
        ? 'не отвечает'
        : 'не проверялась';
  const root = source.root ? ` \`${source.root}\`` : '';
  return [`Источник чтения: **${kindLabel}**${root} · живость производителя: **${alive}**`];
}
