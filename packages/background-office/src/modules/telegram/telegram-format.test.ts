import { describe, expect, it } from 'vitest';

import type { RitualDigestDto } from './ritual-digest.dto';
import {
  escapeTelegramHtml,
  formatAllyMessage,
  formatDateRu,
  formatDayDigest,
  formatEveningDigest,
  formatRitualDigest,
  TELEGRAM_MESSAGE_LIMIT,
} from './telegram-format';

function digest(over: Partial<RitualDigestDto> = {}): RitualDigestDto {
  return {
    kind: 'day',
    date: '2026-07-13',
    headline: 'Сегодня команда занимается панелью наблюдения за качеством.',
    points: [],
    ...over,
  };
}

describe('escapeTelegramHtml', () => {
  it('экранирует & < > (HTML parse mode)', () => {
    expect(escapeTelegramHtml('a < b & c > d')).toBe('a &lt; b &amp; c &gt; d');
  });
});

describe('formatDateRu', () => {
  it('ISO → русский формат', () => {
    expect(formatDateRu('2026-07-13')).toBe('13.07.2026');
  });

  it('нераспознанное — как есть', () => {
    expect(formatDateRu('вчера')).toBe('вчера');
  });
});

describe('formatDayDigest', () => {
  it('заголовок с датой + headline; без пустых секций', () => {
    const text = formatDayDigest(digest());
    expect(text).toContain('<b>Membrana — план на 13.07.2026</b>');
    expect(text).toContain('панелью наблюдения');
    expect(text).not.toContain('Сегодня в работе:');
    expect(text).not.toContain('<i>');
  });

  it('булиты и технический хвост', () => {
    const text = formatDayDigest(
      digest({
        points: ['Первая задача', 'Вторая задача'],
        techFooter: 'Магистраль: контур DA4/DA5',
      }),
    );
    expect(text).toContain('Сегодня в работе:\n• Первая задача\n• Вторая задача');
    expect(text).toContain('<i>Магистраль: контур DA4/DA5</i>');
  });

  it('контент экранируется', () => {
    const text = formatDayDigest(digest({ headline: 'score < 0.5 && ok' }));
    expect(text).toContain('score &lt; 0.5 &amp;&amp; ok');
  });
});

describe('formatEveningDigest', () => {
  it('итоги дня: заголовок, оценка команды, «что дальше»', () => {
    const text = formatEveningDigest(
      digest({
        kind: 'evening',
        headline: 'День продуктивный: главная цель достигнута.',
        teamScore: '7.4/10',
        points: ['Довести панель качества'],
      }),
    );
    expect(text).toContain('<b>Membrana — итоги дня 13.07.2026</b>');
    expect(text).toContain('Команда оценивает полезность дня: 7.4/10.');
    expect(text).toContain('Что дальше:\n• Довести панель качества');
  });

  it('без teamScore строка оценки не рендерится', () => {
    const text = formatEveningDigest(digest({ kind: 'evening' }));
    expect(text).not.toContain('полезность дня');
  });
});

describe('formatRitualDigest', () => {
  it('диспетчеризует по kind', () => {
    expect(formatRitualDigest(digest({ kind: 'day' }))).toContain('план на');
    expect(formatRitualDigest(digest({ kind: 'evening' }))).toContain('итоги дня');
  });
});

describe('шапка-пояснение v2 (#434)', () => {
  it('primerMd вшивается expandable blockquote после заголовка', () => {
    const text = formatDayDigest(
      digest({ primerMd: '**Membrana** — сеть «ушей»; [памятка](https://example.com)' }),
    );
    const lines = text.split('\n');
    expect(lines[2]).toBe(
      '<blockquote expandable><b>Membrana</b> — сеть «ушей»; <a href="https://example.com">памятка</a></blockquote>',
    );
  });

  it('без primerMd blockquote отсутствует (graceful)', () => {
    expect(formatDayDigest(digest())).not.toContain('<blockquote');
    expect(formatEveningDigest(digest({ kind: 'evening' }))).not.toContain('<blockquote');
  });
});

describe('треки дня v2 (#434)', () => {
  it('вечер: секция «Треки дня» между вердиктом и «Что дальше»', () => {
    const text = formatEveningDigest(
      digest({
        kind: 'evening',
        tracks: ['Teamlead: контур качества замкнут', 'Математик: таблица не начата'],
        points: ['Собрать таблицу сравнения'],
      }),
    );
    expect(text).toContain('Треки дня:\n• Teamlead: контур качества замкнут\n• Математик: таблица не начата');
    expect(text.indexOf('Треки дня:')).toBeLessThan(text.indexOf('Что дальше:'));
  });

  it('день секцию треков не рендерит', () => {
    expect(formatDayDigest(digest({ tracks: ['не должно попасть'] }))).not.toContain('Треки дня:');
  });
});

describe('клэмп 4096 (#434)', () => {
  it('булиты усечены с хвоста, сообщение в лимите, шапка сохранена', () => {
    const fat = 'ф'.repeat(400);
    const text = formatEveningDigest(
      digest({
        kind: 'evening',
        primerMd: '**Membrana** — сеть «ушей»',
        tracks: Array.from({ length: 8 }, (_, i) => `трек ${i + 1}: ${fat}`),
        points: Array.from({ length: 8 }, (_, i) => `шаг ${i + 1}: ${fat}`),
      }),
    );
    expect(text.length).toBeLessThanOrEqual(TELEGRAM_MESSAGE_LIMIT);
    expect(text).toContain('<blockquote expandable>');
    expect(text).toContain('• трек 1:');
    expect(text).not.toContain('• шаг 8:');
  });

  it('крайний случай: даже без булитов и шапки текст не превышает лимит и не рвёт теги', () => {
    const text = formatDayDigest(
      digest({ headline: 'а'.repeat(5000), primerMd: '**x**'.repeat(1) }),
    );
    expect(text.length).toBeLessThanOrEqual(TELEGRAM_MESSAGE_LIMIT);
    expect(text.endsWith('…')).toBe(true);
    expect(text).not.toMatch(/<[^>]*$/);
  });
});

describe('formatAllyMessage («ласточка»)', () => {
  it('конвертирует md и не добавляет обвязку', () => {
    expect(formatAllyMessage({ text: '**Новость**: pilot *запущен*' })).toBe(
      '<b>Новость</b>: pilot <i>запущен</i>',
    );
  });

  it('длинный текст клэмпится под лимит без обрыва тегов', () => {
    const text = formatAllyMessage({ text: `**x** ${'ф'.repeat(4096)}` });
    expect(text.length).toBeLessThanOrEqual(TELEGRAM_MESSAGE_LIMIT);
    expect(text.endsWith('…')).toBe(true);
    expect(text).not.toMatch(/<[^>]*$/);
  });
});
