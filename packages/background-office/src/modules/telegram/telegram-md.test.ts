import { describe, expect, it } from 'vitest';

import { clampTelegramHtml, mdToTelegramHtml, renderExpandablePrimer } from './telegram-md';

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

describe('clampTelegramHtml', () => {
  it('короткий текст не трогает', () => {
    expect(clampTelegramHtml('<b>ок</b>', 100)).toBe('<b>ок</b>');
  });

  it('срез внутри парного тега дозакрывает тег (parse_mode HTML отклоняет незакрытые)', () => {
    const html = `а <b>${'ж'.repeat(50)}</b>`;
    const out = clampTelegramHtml(html, 20);
    expect(out.length).toBeLessThanOrEqual(20);
    expect(out).toBe(`а <b>${'ж'.repeat(10)}…</b>`);
  });

  it('вложенные теги закрываются в правильном порядке, частично открытый тег снят', () => {
    const html = `<blockquote expandable><b>${'ж'.repeat(80)}</b> хвост <i>x</i></blockquote>`;
    const out = clampTelegramHtml(html, 60);
    expect(out.length).toBeLessThanOrEqual(60);
    expect(out.endsWith('…</b></blockquote>')).toBe(true);
    expect(out).not.toMatch(/<[^>]*$/);
  });
});
