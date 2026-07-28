import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { ArchivariusController } from './archivarius.controller';
import { MemoryArchivariusStore } from './archivarius.memory-store';
import { ArchivariusService } from './archivarius.service';

/**
 * Долг попугая archivarius-nan-params-silent-200 (ревью 28.07): мусорный параметр
 * давал пустой 200 — «ничего не найдено» вместо «спросили неправильно».
 */
function controller() {
  return new ArchivariusController(new ArchivariusService(new MemoryArchivariusStore()));
}

describe('ArchivariusController — валидация параметров', () => {
  it('?limit=abc → 400 с именем параметра, не пустой 200', async () => {
    await expect(controller().search(undefined, undefined, undefined, undefined, undefined, 'abc'))
      .rejects.toThrow(BadRequestException);
    try {
      await controller().search(undefined, undefined, undefined, undefined, undefined, 'abc');
    } catch (e) {
      const body = (e as BadRequestException).getResponse() as { message: string };
      expect(body.message).toContain('limit');
      expect(body.message).toContain('abc');
    }
  });

  it('limit вне диапазона 1..500 — тоже 400 (0 и 501)', async () => {
    for (const bad of ['0', '501']) {
      await expect(controller().search(undefined, undefined, undefined, undefined, undefined, bad))
        .rejects.toThrow(BadRequestException);
    }
  });

  it('кривые from/to → 400, фильтр молча не отключается', async () => {
    await expect(controller().search(undefined, undefined, undefined, 'вчера', undefined, undefined))
      .rejects.toThrow(BadRequestException);
    await expect(controller().search(undefined, undefined, undefined, undefined, 'потом', undefined))
      .rejects.toThrow(BadRequestException);
  });

  it('?by=garbage → 400 с перечнем осей, без отката к sessions', async () => {
    await expect(controller().decompose('garbage')).rejects.toThrow(BadRequestException);
    try {
      await controller().decompose('garbage');
    } catch (e) {
      const body = (e as BadRequestException).getResponse() as { message: string };
      expect(body.message).toContain('sessions|days|actors');
    }
  });

  it('валидные параметры проходят: by пуст → sessions; limit число; даты ISO', async () => {
    await expect(controller().decompose(undefined)).resolves.toBeDefined();
    await expect(controller().decompose('days')).resolves.toBeDefined();
    await expect(controller().search('текст', undefined, undefined, '2026-07-28', '2026-07-29T10:00:00Z', '50'))
      .resolves.toBeDefined();
  });
});
