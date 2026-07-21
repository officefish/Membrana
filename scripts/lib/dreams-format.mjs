/**
 * Доставка дайджеста снов к ритуалу: markdown read-проекция (линза M4 — снаружи).
 */
import { heatOf } from './dreams-select.mjs';

/**
 * @param {{ day: string, winners: object[], heats: object[], noWinnerHeats: number[] }} proj
 * @returns {string}
 */
export function formatDreamDigestMd(proj) {
  const winners = proj.winners ?? [];
  const lines = [
    '---',
    `day: ${proj.day}`,
    `winners: ${winners.length}`,
    `noWinnerHeats: [${(proj.noWinnerHeats ?? []).join(', ')}]`,
    'author: "Мастер снов"',
    '---',
    '',
    `# Дайджест снов · ${proj.day}`,
    '',
    `Победителей: **${winners.length}**/6` +
      ((proj.noWinnerHeats?.length ?? 0) > 0
        ? ` · пустые заезды: ${proj.noWinnerHeats.map((h) => `H${h}`).join(', ')}`
        : ''),
    '',
  ];
  if (winners.length === 0) {
    lines.push('_Сны не сформированы / нет победителей (empty-state)._', '');
    return lines.join('\n');
  }
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
