import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { TelegramController } from './telegram.controller';
import type { TelegramClient } from './telegram.client';

function fakeClient(sendResult = true) {
  const sentTexts: string[] = [];
  const client = {
    enabled: true,
    sendMessage: async (text: string) => {
      sentTexts.push(text);
      return sendResult;
    },
  } as unknown as TelegramClient;
  return { client, sentTexts };
}

const validPayload = {
  kind: 'evening',
  date: '2026-07-13',
  headline: 'День закрыт: главная цель достигнута.',
  points: ['Завтра — панель качества'],
  teamScore: '7.4/10',
};

describe('TelegramController.ingest', () => {
  it('валидный payload → формат + отправка, ok/sent', async () => {
    const { client, sentTexts } = fakeClient();
    const res = await new TelegramController(client).ingest(validPayload);
    expect(res).toEqual({ ok: true, sent: true });
    expect(sentTexts).toHaveLength(1);
    expect(sentTexts[0]).toContain('итоги дня 13.07.2026');
    expect(sentTexts[0]).toContain('главная цель достигнута');
  });

  it('fire-and-forget: неудача отправки не роняет запрос', async () => {
    const { client } = fakeClient(false);
    const res = await new TelegramController(client).ingest(validPayload);
    expect(res).toEqual({ ok: true, sent: false });
  });

  it('невалидная форма → BadRequest, отправки нет', async () => {
    const { client, sentTexts } = fakeClient();
    await expect(
      new TelegramController(client).ingest({ kind: 'night', date: '2026-07-13' }),
    ).rejects.toThrow(BadRequestException);
    expect(sentTexts).toHaveLength(0);
  });
});
