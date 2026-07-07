/**
 * Приоритеты планирования детекции после эпика fft-last-chance (#84).
 * Источник истины: docs/prompts/FFT_METRICS_POTENTIAL_AND_LIMITS.md (§0, §6).
 *
 * Подключается к утреннему ритуалу: plan:day, standup, main-day-issue.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export const FFT_METRICS_POTENTIAL_AND_LIMITS_REL =
  'docs/prompts/FFT_METRICS_POTENTIAL_AND_LIMITS.md';

export const MAX_FFT_METRICS_DOC_CHARS = 14_000;

/**
 * @param {string} [cwd]
 * @returns {string | null}
 */
export function readFftMetricsPotentialAndLimits(cwd = process.cwd()) {
  const abs = resolve(cwd, FFT_METRICS_POTENTIAL_AND_LIMITS_REL);
  if (!existsSync(abs)) return null;
  let text = readFileSync(abs, 'utf8');
  if (text.length > MAX_FFT_METRICS_DOC_CHARS) {
    text =
      text.slice(0, MAX_FFT_METRICS_DOC_CHARS) +
      `\n\n[… обрезано до ${MAX_FFT_METRICS_DOC_CHARS} символов; полный текст в ${FFT_METRICS_POTENTIAL_AND_LIMITS_REL} …]\n`;
  }
  return text;
}

/** Краткие правила для промптов plan:day / standup / main-day-issue. */
export function buildDetectionPlanningRulesMarkdown() {
  return [
    'После эпика **fft-last-chance (#84)** потолок **эшелона 0** (чистый DSP/FFT на free-v1) **зафиксирован**.',
    'Полный разбор — в `docs/prompts/FFT_METRICS_POTENTIAL_AND_LIMITS.md` (§0 TL;DR, §6 «куда дальше»).',
    '',
    '**Вердикты (не пересматривать без нового датасета, алгоритма или fusion-стратегии):**',
    '- FFT пороговый тест — **no-go** как детектор (только диагностика / обучение).',
    '- harmonic / cepstral / spectral-flux по отдельности — **no-go** как селекторы дрона (FPR 88–100% на free-v1).',
    '- Live OR по трём DSP — **сигнализатор присутствия**, не автотревога и не stage-gate.',
    '- **Trends FFT + `DRONE_TIGHT` + template-match catalog** — **go** (val ~95% recall / ~30% FPR; лучший FFT-кандидат в prod).',
    '- **yamnet (zero-shot, эшелон 2)** — **go, уже в prod-бенчмарке** (2026-07-06, эпик `neural-drone-plugin` #266/#268): F1 0.803 на free-v1 v0.2 — лучший в таблице (P 71.4 / R 91.7 / FPR 36.7 @порог 0.01); детектор + клиентский плагин `neural-drone-analyzer` merged. «Этап 2 заморожен» де-факто снят через free-tier канал.',
    '',
    '**Продуктовая магистраль (форсайт 2026-07-06, `docs/seanses/foresight-2026-07-06.md` — приоритет над детекционной):**',
    '- финализация FREE-тарифа до ~17.07: **S2 combined UC** (fusion спектр+нейро + alarm-loop «ближе/дальше» по громкости) → **S3 упаковка UserCases** (3+1 в device-board) → **S4 студия к скачиванию** (параллельно) → **S5 лендинг**;',
    '- для fusion — сырой confidence yamnet, не бинарный вердикт (профили ошибок DSP/нейро слабо коррелированы — DETECTOR_BENCHMARK.md, заметка ND3);',
    '- VDR-железо (~17.07) — валидация качества и hard-gate, НЕ блокер выпуска free.',
    '',
    '**НЕ предлагать как магистраль дня / недели:**',
    '- «довести Этап 1.A», «unified benchmark трёх DSP», «stage-gate 85/90 через harmonic/cepstral/flux»;',
    '- повторный тюнинг порогов DSP на free-v1 «ещё раз прогнать бенчмарк» без новых данных или эшелона 2;',
    '- повтор уже сделанного: yamnet-детектор/плагин/бенчмарк реализованы (#266/#268) — не переизобретать.',
    '',
    '**Предлагать как поддерживающие задачи (не магистраль, если нет явного task-промпта выше):**',
    '- долг объяснимости: сравнение trends+`DRONE_TIGHT` vs yamnet одной таблицей на val (кто основной в hard-gate, кто объяснимый бэкап);',
    '- validated dataset / VDR labels, live-калибровка на real data (после ~17.07);',
    '- архитектурные контракты: где живут шаблоны (`template-match` vs `background-media` vs client).',
    '',
    '**Роль DSP-детекторов:** объяснимость в журнале и ранний индикатор — не основной путь роста качества.',
  ].join('\n');
}

/**
 * @param {{ fftMetricsDoc: string | null }} opts
 */
export function buildDetectionPlanningContextSection({ fftMetricsDoc }) {
  const blocks = [
    '---',
    '## Приоритеты детекции (обязательный контекст планирования)',
    '',
    buildDetectionPlanningRulesMarkdown(),
  ];
  if (fftMetricsDoc) {
    blocks.push(
      '',
      '---',
      `## ${FFT_METRICS_POTENTIAL_AND_LIMITS_REL}`,
      '',
      fftMetricsDoc,
    );
  } else {
    blocks.push(
      '',
      `(Файл \`${FFT_METRICS_POTENTIAL_AND_LIMITS_REL}\` не найден — опирайся на правила выше.)`,
    );
  }
  return blocks.join('\n');
}

/** Однострочные ограничения для секции «Ограничения» в промптах. */
export function buildDetectionPlanningConstraintsBullets() {
  return [
    '- **Детекция:** не ставь магистралью «Этап 1.A / benchmark harmonic+cepstral+flux / stage-gate через одиночные DSP» — см. `FFT_METRICS_POTENTIAL_AND_LIMITS.md` §6.',
    '- **Продуктовая магистраль — финализация FREE-тарифа (форсайт 2026-07-06): S2 combined UC → S3 упаковка UserCases → S4 студия-download → S5 лендинг.** Детекционные работы — поддерживающая полоса.',
    '- Эшелон 2 де-факто открыт: yamnet в prod-бенчмарке (F1 0.803, лучший на free-v1); не предлагать его «разведку» или повтор.',
    '- DSP-бенчмарки — только при смене датасета, алгоритма или fusion (например trends + yamnet), не повтор free-v1.',
  ];
}
