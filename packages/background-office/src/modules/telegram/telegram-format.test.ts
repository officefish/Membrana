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

function dayDigest(over: Partial<RitualDigestDto> = {}): RitualDigestDto {
  return {
    kind: 'day',
    date: '2026-07-16',
    headline: 'Последний день перед дедлайном FREE — разведка, вердикт, старт в коде.',
    ...over,
  };
}

function eveningDigest(over: Partial<RitualDigestDto> = {}): RitualDigestDto {
  return {
    kind: 'evening',
    date: '2026-07-16',
    headline: 'День продуктивный: магистраль стартовала в коде.',
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
    expect(formatDateRu('2026-07-16')).toBe('16.07.2026');
  });

  it('нераспознанное — как есть', () => {
    expect(formatDateRu('вчера')).toBe('вчера');
  });
});

describe('formatDayDigest', () => {
  it('центральная задача под меткой; заголовок с датой', () => {
    const text = formatDayDigest(dayDigest());
    expect(text).toContain('<b>Membrana — план на 16.07.2026</b>');
    expect(text).toContain('<b>🎯 Центральная задача дня:</b>');
    expect(text).toContain('разведка, вердикт, старт в коде');
  });

  it('высокий приоритет и перспективы — булиты; критерий вечера — хвост', () => {
    const text = formatDayDigest(
      dayDigest({
        highPriority: ['live-neural fusion (#415)', 'merge-driver реестра (#476)'],
        perspective: ['batch-collection (#494)'],
        eveningCriterion: 'Магистраль стартовала в коде, дерево чистое',
      }),
    );
    expect(text).toContain('<b>⬆️ Высокий приоритет:</b>\n• live-neural fusion (#415)\n• merge-driver реестра (#476)');
    expect(text).toContain('<b>🔭 Перспективные направления:</b>\n• batch-collection (#494)');
    expect(text).toContain('<b>🌙 Критерий вечера:</b>\nМагистраль стартовала в коде, дерево чистое');
  });

  it('пустые секции не рендерятся', () => {
    const text = formatDayDigest(dayDigest());
    expect(text).not.toContain('Высокий приоритет');
    expect(text).not.toContain('Перспективные');
    expect(text).not.toContain('Критерий вечера');
  });

  it('контент экранируется', () => {
    const text = formatDayDigest(dayDigest({ headline: 'score < 0.5 && ok' }));
    expect(text).toContain('score &lt; 0.5 &amp;&amp; ok');
  });
});

describe('formatEveningDigest', () => {
  it('вердикт, три секции итогов, оценка команды', () => {
    const text = formatEveningDigest(
      eveningDigest({
        converged: ['fusion-узел стартовал', 'разведка §5 закрыта'],
        notConverged: ['UC-документы не тронуты'],
        unexpected: ['починка CI-флейка'],
        teamScore: '7.8/10',
      }),
    );
    expect(text).toContain('<b>Membrana — итоги дня 16.07.2026</b>');
    expect(text).toContain('магистраль стартовала');
    expect(text).toContain('<b>✅ Сошлось:</b>\n• fusion-узел стартовал\n• разведка §5 закрыта');
    expect(text).toContain('<b>⚠️ Не сошлось / перенесено:</b>\n• UC-документы не тронуты');
    expect(text).toContain('<b>🎲 Неожиданно всплыло:</b>\n• починка CI-флейка');
    expect(text).toContain('Команда оценивает полезность дня: 7.8/10.');
  });

  it('без teamScore строка оценки не рендерится; пустые секции опускаются', () => {
    const text = formatEveningDigest(eveningDigest());
    expect(text).not.toContain('полезность дня');
    expect(text).not.toContain('Сошлось');
  });
});

describe('formatRitualDigest', () => {
  it('диспетчеризует по kind', () => {
    expect(formatRitualDigest(dayDigest())).toContain('план на');
    expect(formatRitualDigest(eveningDigest())).toContain('итоги дня');
  });
});

describe('шапка-пояснение (#434)', () => {
  it('primerMd вшивается expandable blockquote после заголовка', () => {
    const text = formatDayDigest(
      dayDigest({ primerMd: '**Membrana** — сеть «ушей»; [памятка](https://example.com)' }),
    );
    const lines = text.split('\n');
    expect(lines[2]).toBe(
      '<blockquote expandable><b>Membrana</b> — сеть «ушей»; <a href="https://example.com">памятка</a></blockquote>',
    );
  });

  it('без primerMd blockquote отсутствует (graceful)', () => {
    expect(formatDayDigest(dayDigest())).not.toContain('<blockquote');
    expect(formatEveningDigest(eveningDigest())).not.toContain('<blockquote');
  });
});

describe('клэмп 4096', () => {
  it('булиты усечены с хвоста, сообщение в лимите, шапка сохранена', () => {
    const fat = 'ф'.repeat(400);
    const text = formatEveningDigest(
      eveningDigest({
        primerMd: '**Membrana** — сеть «ушей»',
        converged: Array.from({ length: 5 }, (_, i) => `сошлось ${i + 1}: ${fat}`),
        notConverged: Array.from({ length: 5 }, (_, i) => `не сошлось ${i + 1}: ${fat}`),
        unexpected: Array.from({ length: 5 }, (_, i) => `неожиданно ${i + 1}: ${fat}`),
      }),
    );
    expect(text.length).toBeLessThanOrEqual(TELEGRAM_MESSAGE_LIMIT);
    expect(text).toContain('<blockquote expandable>');
    expect(text).toContain('• сошлось 1:');
    expect(text).not.toContain('• неожиданно 5:');
  });

  it('крайний случай: даже без булитов и шапки текст не превышает лимит и не рвёт теги', () => {
    const text = formatDayDigest(
      dayDigest({ headline: 'а'.repeat(5000), primerMd: '**x**' }),
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
