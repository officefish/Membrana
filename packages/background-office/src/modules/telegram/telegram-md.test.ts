import { describe, expect, it } from 'vitest';

import { mdToTelegramHtml, renderExpandablePrimer } from './telegram-md';

describe('mdToTelegramHtml', () => {
  it('bold / italic / ссылка / код', () => {
    expect(mdToTelegramHtml('**жирный** и *курсив*')).toBe('<b>жирный</b> и <i>курсив</i>');
    expect(mdToTelegramHtml('[памятка](https://example.com/a?b=1)')).toBe(
      '<a href="https://example.com/a?b=1">памятка</a>',
    );
    expect(mdToTelegramHtml('запусти `yarn ritual:day` утром')).toBe(
      'запусти <code>yarn ritual:day</code> утром',
    );
  });

  it('экранирует & < > до разметки', () => {
    expect(mdToTelegramHtml('a < b & **c > d**')).toBe('a &lt; b &amp; <b>c &gt; d</b>');
  });

  it('внутри `кода` разметка не действует', () => {
    expect(mdToTelegramHtml('`**не жирный**` и **жирный**')).toBe(
      '<code>**не жирный**</code> и <b>жирный</b>',
    );
  });

  it('смешанный сниппет шапки: несколько абзацев, словарь', () => {
    const md = [
      '**Что такое Membrana:** сеть недорогих «ушей».',
      '',
      '*Мини-словарь:* **PR** — порция изменений; подробнее — [ALLY_PRIMER](https://example.com).',
    ].join('\n');
    const html = mdToTelegramHtml(md);
    expect(html).toBe(
      [
        '<b>Что такое Membrana:</b> сеть недорогих «ушей».',
        '',
        '<i>Мини-словарь:</i> <b>PR</b> — порция изменений; подробнее — <a href="https://example.com">ALLY_PRIMER</a>.',
      ].join('\n'),
    );
  });

  it('одиночные звёздочки в тексте не ломают вывод', () => {
    expect(mdToTelegramHtml('оценка 5*')).toBe('оценка 5*');
  });

  it('текст « 0 » с пробелами не путается со слотами кода', () => {
    expect(mdToTelegramHtml('`x` версия 0 из 3 `y`')).toBe(
      '<code>x</code> версия 0 из 3 <code>y</code>',
    );
  });
});

describe('renderExpandablePrimer', () => {
  it('оборачивает конвертированный md в expandable blockquote', () => {
    expect(renderExpandablePrimer('**Membrana** — сеть «ушей»')).toBe(
      '<blockquote expandable><b>Membrana</b> — сеть «ушей»</blockquote>',
    );
  });
});
