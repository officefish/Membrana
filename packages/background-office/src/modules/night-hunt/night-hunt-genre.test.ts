/**
 * Зуб жанра ночной охоты: задания дел не должны разрешать прозу.
 *
 * Предмет — исходник службы. Два дела из трёх до 25.09 просили «перечислить ТИПИЧНЫЕ
 * нарушения» и разрешали «дать чеклист для ручной проверки», если предмета нет. Модель
 * исполняла задание буквально, отчёт выходил без единого адреса, и опровергнуть его
 * было нечем. Слова вернутся — этот зуб покраснеет раньше, чем очередной пустой отчёт
 * доедет до владельца.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const HERE = dirname(fileURLToPath(import.meta.url));
const SERVICE_SRC = resolve(HERE, 'night-hunt.service.ts');

function serviceSource(): string {
  return readFileSync(SERVICE_SRC, 'utf8');
}

/** Текст заданий: всё, что уезжает модели под заголовком «## Задача». */
function taskTexts(src: string): string[] {
  return [...src.matchAll(/'\\n## Задача\\n\\n([\s\S]*?)',\s*\n\s*\);/g)].map((m) => m[1]!);
}

describe('жанр заданий ночной охоты', () => {
  it('задание есть у КАЖДОГО из трёх дел — предмет зуба не исчез', () => {
    expect(taskTexts(serviceSource()).length).toBeGreaterThanOrEqual(3);
  });

  it('ни одно задание не просит «типичных» нарушений', () => {
    for (const task of taskTexts(serviceSource())) {
      expect(task).not.toMatch(/типичн/i);
    }
  });

  it('ни одно задание не разрешает отход на чеклист', () => {
    for (const task of taskTexts(serviceSource())) {
      expect(task).not.toMatch(/чеклист/i);
    }
  });

  it('каждое задание требует адрес у находки', () => {
    for (const task of taskTexts(serviceSource())) {
      expect(task).toMatch(/адрес/i);
    }
  });

  it('ВСЕ ТРИ дела отказываются без предмета, а не сочиняют', () => {
    const src = serviceSource();
    expect(src).toContain('design-token-drift: предмета нет');
    expect(src).toContain('monorepo-dependency-graph: предмета нет');
    // Третье дело было здоровым по предмету, но при непрочитанных файлах
    // отправляло модели пустой контекст — мина той же породы, снята до взрыва.
    expect(src).toContain('services-api-contract-drift: предмета нет');
  });
});
