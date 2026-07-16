import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { TelegramController } from './telegram.controller';
import type { TelegramClient } from './telegram.client';

function fakeClient(sendResult = true) {
  const sentTexts: string[] = [];
  const sentDocs: { name: string; content: string }[] = [];
  const client = {
    enabled: true,
    sendMessage: async (text: string) => {
      sentTexts.push(text);
      return sendResult;
    },
    sendDocument: async (name: string, content: string) => {
      sentDocs.push({ name, content });
      return sendResult;
    },
  } as unknown as TelegramClient;
  return { client, sentTexts, sentDocs };
}

const validPayload = {
  kind: 'evening',
  date: '2026-07-13',
  headline: 'День закрыт: главная цель достигнута.',
  converged: ['Панель качества доведена'],
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

  it('вложение уходит отдельным документом после текста', async () => {
    const { client, sentTexts, sentDocs } = fakeClient();
    await new TelegramController(client).ingest({
      kind: 'day',
      date: '2026-07-16',
      headline: 'Центральная задача дня.',
      documentMd: '# MAIN_DAY_ISSUE\n\nдетали дня',
      documentName: 'MAIN_DAY_ISSUE-16.07.md',
    });
    expect(sentTexts).toHaveLength(1);
    expect(sentDocs).toEqual([
      { name: 'MAIN_DAY_ISSUE-16.07.md', content: '# MAIN_DAY_ISSUE\n\nдетали дня' },
    ]);
  });

  it('без documentMd вложение не отправляется', async () => {
    const { client, sentDocs } = fakeClient();
    await new TelegramController(client).ingest(validPayload);
    expect(sentDocs).toHaveLength(0);
  });
});

describe('TelegramController.allyMessage («ласточка»)', () => {
  it('md-текст конвертируется и уходит как есть, без обвязки дайджеста', async () => {
    const { client, sentTexts } = fakeClient();
    const res = await new TelegramController(client).allyMessage({
      text: '**Короткая новость** для союзников: смотрите [страницу](https://example.com).',
    });
    expect(res).toEqual({ ok: true, sent: true });
    expect(sentTexts[0]).toBe(
      '<b>Короткая новость</b> для союзников: смотрите <a href="https://example.com">страницу</a>.',
    );
    expect(sentTexts[0]).not.toContain('Membrana — план');
  });

  it('пустой/невалидный текст → BadRequest, отправки нет', async () => {
    const { client, sentTexts } = fakeClient();
    await expect(new TelegramController(client).allyMessage({ text: '' })).rejects.toThrow(
      BadRequestException,
    );
    await expect(new TelegramController(client).allyMessage({})).rejects.toThrow(
      BadRequestException,
    );
    expect(sentTexts).toHaveLength(0);
  });

  it('fire-and-forget: неудача отправки не роняет запрос', async () => {
    const { client } = fakeClient(false);
    const res = await new TelegramController(client).allyMessage({ text: 'проверка связи' });
    expect(res).toEqual({ ok: true, sent: false });
  });
});
