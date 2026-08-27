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

const MB = 1048576;

describe('панель записи берёт слово у ядра', () => {
  it('судит ядром, а не своим порогом: локальных долей и процентов в панели нет', () => {
    expect(PANEL).toContain('stopDecision(');
    expect(PANEL).toContain("from '@membrana/media-library-service'");
    // Своего порога быть не должно — разойдётся с ядром и с сервером.
    expect(PANEL).not.toMatch(/0\.9[0-9]?\s*\*\s*limitBytes/u);
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

describe('слово, которое увидит человек на живых числах прода 27.08', () => {
  it('806 из 1024 (79%) — запись идёт, паники нет', () => {
    const v = stopDecision({ usedBytes: 806 * MB, limitBytes: 1024 * MB }, { what: 'Запись в буфер' });
    expect(v.action).toBe('run');
  });

  it('на подходе к пределу человек предупреждён ЗАРАНЕЕ, а не по факту остановки', () => {
    const v = stopDecision(
      { usedBytes: 950 * MB, limitBytes: 1024 * MB },
      { what: 'Запись в буфер', bytesPerMinute: 5.3 * MB },
    );
    expect(v.action).toBe('warn');
    expect(v.say).toMatch(/около 13 мин записи/u);
    expect(v.say).toMatch(/Пора убрать лишнее/u);
  });

  it('остановка называет что, почему, сколько и куда идти', () => {
    const v = stopDecision({ usedBytes: 1020 * MB, limitBytes: 1024 * MB }, { what: 'Запись в буфер' });
    expect(v.action).toBe('stop');
    expect(v.say).toMatch(/^Запись в буфер остановлена/u);
    expect(v.say).toMatch(/заполнен на 100%|заполнен на 99%/u);
    expect(v.say).toMatch(/Управлении буфером/u);
  });
});
