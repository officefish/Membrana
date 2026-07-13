import { describe, expect, it } from 'vitest';

import type { RitualDigestDto } from './ritual-digest.dto';
import {
  escapeTelegramHtml,
  formatDateRu,
  formatDayDigest,
  formatEveningDigest,
  formatRitualDigest,
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
