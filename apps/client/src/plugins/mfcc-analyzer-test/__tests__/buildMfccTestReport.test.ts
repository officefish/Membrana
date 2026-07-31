/**
 * Сателлит отчёта. Спринт `mfcc-plugin-sprint`, блок `mfcc-plugin-tests`.
 *
 * Главное, что здесь проверяется, — прибор НЕ звучит увереннее, чем он есть. Отдельно
 * закреплена развилка, на которой у математика в наброске стояло «или»: при нём провал с
 * чистой тишиной получал бы «среднюю» уверенность.
 */
import { describe, expect, it } from 'vitest';

import { SILENT_RATE_ALARM, TOO_FEW_JUDGED, buildMfccTestReport } from '../buildMfccTestReport';
import { PRESET_CALIBRATED, PRESET_FIRST_CUT, series } from '../__fixtures__/mfccFrameFixtures';

const FLOOR = 0.5;

describe('buildMfccTestReport', () => {
  it('несудимая серия даёт «неопределённо», а не «цели нет»', () => {
    const r = buildMfccTestReport(
      series({ passed: 0, failed: 0, silent: 5, refusal: 'все 5 кадров немые — судить нечем' }),
      PRESET_FIRST_CUT,
      FLOOR,
    );
    // «Судить было нечем» и «цели нет» — разные вещи; слить их значит соврать в пользу прибора.
    expect(r.verdict).toBe('inconclusive');
    expect(r.confidence).toBe('low');
    expect(r.reasoning).toContain('судить не по чему');
  });

  it('высокая уверенность недостижима, пока обстановки не откалиброваны', () => {
    const perfect = series({ passed: 10, failed: 0, silent: 0, detected: true });
    const r = buildMfccTestReport(perfect, PRESET_FIRST_CUT, FLOOR);
    expect(r.verdict).toBe('detected');
    expect(r.confidence).not.toBe('high');
  });

  it('потолок снимается калибровкой пресета, а не правкой отчёта', () => {
    const perfect = series({ passed: 10, failed: 0, silent: 0, detected: true });
    expect(buildMfccTestReport(perfect, PRESET_CALIBRATED, FLOOR).confidence).toBe('high');
  });

  it('провал при чистой тишине остаётся низкой уверенностью, а не средней', () => {
    // Развилка «и» против «или»: доля прохождения 0.1 при полном отсутствии немых кадров.
    const bad = series({ passed: 1, failed: 9, silent: 0, detected: false });
    const r = buildMfccTestReport(bad, PRESET_CALIBRATED, FLOOR);
    expect(r.verdict).toBe('not_detected');
    expect(r.confidence).toBe('low');
  });

  it('незамеренный порог тишины роняет уверенность и говорит об этом вслух', () => {
    const perfect = series({ passed: 10, failed: 0, silent: 0, detected: true });
    const r = buildMfccTestReport(perfect, PRESET_CALIBRATED, 0);
    expect(r.confidence).toBe('low');
    expect(r.warnings.join(' ')).toMatch(/защиты от тишины нет/u);
  });

  it('серия на почти молчащем тракте помечается, даже если вердикт зелёный', () => {
    const r = buildMfccTestReport(
      series({ passed: 6, failed: 0, silent: 4, detected: true }),
      PRESET_CALIBRATED,
      FLOOR,
    );
    expect(r.summary.silentRate).toBeGreaterThan(SILENT_RATE_ALARM);
    expect(r.confidence).toBe('low');
    expect(r.warnings.join(' ')).toMatch(/немых кадров/u);
  });

  it('слишком малая судимая выборка названа случайной', () => {
    const r = buildMfccTestReport(
      series({ passed: TOO_FEW_JUDGED, failed: 0, silent: 0, detected: true }),
      PRESET_CALIBRATED,
      FLOOR,
    );
    expect(r.confidence).toBe('low');
    expect(r.warnings.join(' ')).toMatch(/случайна/u);
  });

  it('зелёный вердикт несёт свои оговорки, а не приходит чистым', () => {
    const r = buildMfccTestReport(
      series({ passed: 10, failed: 0, silent: 0, detected: true }),
      PRESET_FIRST_CUT,
      FLOOR,
    );
    expect(r.verdict).toBe('detected');
    expect(r.warnings.length).toBeGreaterThan(0);
    expect(r.warnings.join(' ')).toMatch(/НЕ откалиброваны/u);
  });

  it('называет, сколько коэффициентов из скольких действительно судятся', () => {
    const r = buildMfccTestReport(
      series({ passed: 5, failed: 0, silent: 0, detected: true }),
      PRESET_FIRST_CUT,
      FLOOR,
    );
    expect(r.warnings.join(' ')).toContain(
      `${PRESET_FIRST_CUT.judgedCoefficients.length} коэффициента из ${PRESET_FIRST_CUT.bounds.length}`,
    );
  });

  it('уверенность выражена словом из закрытого списка, а не числом', () => {
    const r = buildMfccTestReport(
      series({ passed: 5, failed: 5, silent: 0 }),
      PRESET_CALIBRATED,
      FLOOR,
    );
    expect(['high', 'medium', 'low']).toContain(r.confidence);
    expect(typeof r.confidence).toBe('string');
  });

  it('сводка не превращается в NaN на пустой серии', () => {
    const r = buildMfccTestReport(
      series({ passed: 0, failed: 0, silent: 0, refusal: 'серия пуста — кадров не пришло' }),
      PRESET_FIRST_CUT,
      FLOOR,
    );
    expect(r.summary.silentRate).toBe(0);
    expect(Number.isFinite(r.summary.passRate)).toBe(true);
    expect(r.verdict).toBe('inconclusive');
  });

  it('отпечаток и уровень строгости переносятся из серии без подстановки умолчаний', () => {
    const s = series({ passed: 3, failed: 0, silent: 0, strictness: 'strict', configHash: 'mel26-c13-buf2048' });
    const r = buildMfccTestReport(s, PRESET_FIRST_CUT, FLOOR);
    expect(r.configHash).toBe('mel26-c13-buf2048');
    expect(r.strictnessUsed).toBe('strict');
  });
});
