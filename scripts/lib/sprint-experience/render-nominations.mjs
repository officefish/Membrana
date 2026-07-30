/**
 * render-nominations — рендер снимка номинаций по образцу живого
 * `docs/cases/registry/NOMINATIONS.md`: две секции «Готовы» / «Не готовы», у каждого
 * «не готов» — причина (легальное «нет»), в шапке — «Только номинация».
 *
 * Рендер отделён от отбора СПЕЦИАЛЬНО: `nominateRuns` чистая и файлов не пишет, поэтому
 * норма «в канон пишет человек» держится конструкцией, а не обещанием.
 */
import { renderMetricLine } from './absence.mjs';
import { WAITING_REASONS } from './nominate.mjs';

const METRIC_NAME = Object.freeze({ cut: 'точность нарезки', stop: 'доля ложных остановок' });

/**
 * @param {{ ready: object[], waiting: object[], thin: string|null }} nomination
 * @param {{ sprintId: string, generatedAt: string, command: string }} meta
 *        `generatedAt` — ПАРАМЕТР: `Date.now()` в блоке отсутствует, снимок должен быть
 *        воспроизводим бит-в-бит.
 */
export function renderNominations(nomination, meta) {
  const lines = [
    '# Номинации прогонов «предсказание ↔ исход» — производный снимок',
    '',
    `Пересобран: ${meta.generatedAt} · \`${meta.command}\` · окно \`${meta.sprintId}\`.`,
    '**Только номинация** — в канон и в пред-спринтовый фрейм запись делает человек по слову',
    'владельца. **Руками не править:** файл производный, правки затрутся следующим прогоном.',
    '',
    'Порога допуска по доле ложных остановок НЕТ (решение владельца 30.07): отбор номинирует',
    'без отсечки, метрика напечатана рядом с каждой номинацией, порог назначается позже по',
    'накопленным данным.',
    '',
  ];

  if (nomination.thin !== null) {
    lines.push(`> ⚠ **${nomination.thin}.** Добора неточными прогонами до пяти нет: тонкий корпус`,
      '> называется тонким, а не выдаётся за «лучшее».', '');
  }

  lines.push('## Готовы (предсказание до работы ∧ исход по следам ∧ вещдоки живы)', '');
  if (nomination.ready.length === 0) lines.push('_пусто_', '');
  for (const run of nomination.ready) {
    const name = METRIC_NAME[run.subject];
    lines.push(`- \`${run.runId}\` · ${run.subject} · ${run.personaId} · исход ${run.observedAt}`);
    lines.push(`  - ${renderMetricLine(name, run.metric)}`);
  }
  if (nomination.ready.length > 0) lines.push('');

  lines.push('## Не готовы (причина названа — легальное «нет»)', '');
  if (nomination.waiting.length === 0) lines.push('_пусто_', '');
  for (const w of nomination.waiting) {
    const head = Object.hasOwn(WAITING_REASONS, w.reason) ? WAITING_REASONS[w.reason] : w.reason;
    // Уточнение печатается только если оно ДОБАВЛЯЕТ к расшифровке причины: повтор той же
    // фразы в скобках — шум, из которого читатель делает вывод, что подробностей нет.
    const detail = w.why === undefined || w.why === head ? '' : ` (${w.why})`;
    lines.push(`- \`${w.runId}\` · ${w.subject} · \`${w.reason}\` — ${head}${detail}`);
  }
  return `${lines.join('\n').trimEnd()}\n`;
}
