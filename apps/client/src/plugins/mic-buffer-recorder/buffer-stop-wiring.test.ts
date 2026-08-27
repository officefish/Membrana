/**
 * Зубы подключения говорящего слова к записи в буфер (#2204, режим 1).
 *
 * Предмет — НЕ логика порога (она проверена у ядра, в media-library), а то, что панель
 * действительно ею пользуется и не завела свою. Класс, от которого стережём: предикат
 * написан, зубы у него зелёные, а на экране по-прежнему старый ярлык — мёртвый регулятор.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { stopDecision } from '@membrana/media-library-service';

const HERE = fileURLToPath(new URL('./', import.meta.url));
const PANEL = readFileSync(join(HERE, 'MicBufferRecorderPanel.tsx'), 'utf8');
const STATE = readFileSync(join(HERE, 'micBufferRecorderPluginState.ts'), 'utf8');
const PLUGIN = readFileSync(join(HERE, 'micBufferRecorderPlugin.ts'), 'utf8');

const MB = 1048576;

describe('слово и остановка — из ОДНОГО вердикта (BLOCK ревью #2214)', () => {
  it('вердикт считает состояние, а не панель: своей копии расчёта в панели нет', () => {
    // Найденная ложь: панель считала вердикт сама и говорила «остановлено» на пороге ядра,
    // а гасило запись только по recordingBlocked, то есть у самого края. В окне между ними
    // оператор на дежурстве читал «остановлено», пока запись шла.
    expect(PANEL).toContain('snapshot.bufferVerdict');
    expect(PANEL).not.toContain('stopDecision(');
    expect(STATE).toContain('stopDecision(');
  });

  it('запись гасится ПО ВЕРДИКТУ, а не только по исчерпанной квоте', () => {
    expect(PLUGIN).toContain("verdict.action === 'stop'");
    expect(PLUGIN).toContain('payload.recordingBlocked || ');
  });

  it('вердикт пересчитывается при каждом обновлении квоты, а не один раз на старте', () => {
    const setQuota = STATE.slice(STATE.indexOf('setQuota('), STATE.indexOf('setError('));
    expect(setQuota).toContain('this.bufferVerdict = stopDecision(');
  });

  it('имя того, что пишет, — одно на слово и на решение', () => {
    expect(STATE).toContain('RECORDING_WHAT');
    expect(PANEL).not.toContain("what: '");
  });

  it('судит ядром, а не своим порогом: локальных долей и процентов в панели нет', () => {
    expect(PANEL).not.toMatch(/0\.9[0-9]?\s*\*\s*limitBytes/u);
    expect(STATE).toContain("from '@membrana/media-library-service'");
  });

  it('на экран идёт СЛОВО вердикта, а не пересказ панели', () => {
    expect(PANEL).toContain('bufferVerdict.say');
  });

  it('предупреждение и остановка различимы: разный вид, одна и та же речь', () => {
    expect(PANEL).toContain("bufferVerdict.action !== 'run'");
    expect(PANEL).toContain("bufferVerdict.action === 'stop'");
  });

  it('лимит ПО ЧИСЛУ проб остался своей причиной — смешать её с байтами значило бы соврать', () => {
    expect(PANEL).toContain('достигнут лимит числа проб');
    expect(PANEL).toContain("snapshot.recordingBlocked && bufferVerdict.action !== 'stop'");
  });
});

describe('удержание и возобновление (второй BLOCK ревью #2214)', () => {
  it('старт записи отбивается вердиктом, а не только исчерпанной квотой', () => {
    // Без этого гейта авторежим стартовал бы новый сегмент сразу после того, как вердикт
    // погасил предыдущий: порог ядра срабатывает РАНЬШЕ края, и recordingBlocked ещё ложь.
    // Получился бы цикл «остановлено → пишем → остановлено».
    expect(PLUGIN).toContain("if (snap.bufferVerdict.action === 'stop') {");
    expect(PLUGIN).toContain('micBufferRecorderPluginState.setError(snap.bufferVerdict.say)');
  });

  it('удержание СНИМАЕТСЯ, и в авторежиме запись идёт дальше сама', () => {
    // Слово обещает «станет возможна снова» — обещание без исполнителя было бы второй ложью.
    expect(PLUGIN).toContain('if (bufferHold && !holding)');
    expect(PLUGIN).toContain("if (runtimeMode === 'auto' && !activeRecorder) schedulePauseThenNextSegment()");
  });

  it('ядро обещает ВОЗМОЖНОСТЬ, а не чужое поведение: «продолжится сама» из слова убрано', () => {
    const v = stopDecision({ usedBytes: 1020 * MB, limitBytes: 1024 * MB });
    expect(v.say).toMatch(/станет возможна снова/u);
    expect(v.say).not.toMatch(/продолжится сама/u);
    // Политика «до освобождения, не насовсем» осталась полем — это вопрос 2 постулирования.
    expect(v.resumable).toBe(true);
  });
});

describe('минуты берутся из наблюдаемого темпа, а не из догадки', () => {
  it('темп считается по приросту квоты между замерами', () => {
    expect(STATE).toContain('observeRate(');
    expect(STATE).toContain('this.observedBytesPerMinute = grew / minutes;');
  });

  it('темпа нет — в ядро он не передаётся, и минут в слове не будет', () => {
    expect(STATE).toContain('this.observedBytesPerMinute === null ? {} : { bytesPerMinute:');
  });

  it('убывание темпом не считается: после уборки буфер падает, это не скорость записи', () => {
    expect(STATE).toContain('!(grew > 0)');
  });
});

describe('слово, которое увидит человек на живых числах прода 27.08', () => {
  it('806 из 1024 (79%) — запись идёт, паники нет', () => {
    const v = stopDecision({ usedBytes: 806 * MB, limitBytes: 1024 * MB }, { what: 'Запись в буфер' });
    expect(v.action).toBe('run');
  });

  it('на подходе к пределу человек предупреждён ЗАРАНЕЕ, а не по факту остановки', () => {
    const v = stopDecision(
      { usedBytes: 950 * MB, limitBytes: 1024 * MB },
      { what: 'запись в буфер', bytesPerMinute: 5.3 * MB },
    );
    expect(v.action).toBe('warn');
    expect(v.say).toMatch(/около 13 мин записи/u);
    expect(v.say).toMatch(/пора убрать лишнее/u);
  });

  it('остановка называет что, почему, сколько и куда идти', () => {
    const v = stopDecision({ usedBytes: 1020 * MB, limitBytes: 1024 * MB }, { what: 'сценарий дежурства' });
    expect(v.action).toBe('stop');
    // Имя стоит ПОСЛЕ глагола: род подставленного имени заранее неизвестен, и «сценарий
    // дежурства остановлена» было бы браком, который зуб бы закрепил (P2 ревью #2214).
    expect(v.say).toMatch(/^Остановлено: сценарий дежурства\./u);
    expect(v.say).toMatch(/заполнен на 100%|заполнен на 99%/u);
    expect(v.say).toMatch(/Управлении буфером/u);
  });
});
