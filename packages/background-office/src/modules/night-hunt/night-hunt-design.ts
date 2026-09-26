/**
 * Дрейф оформления для ночной охоты — предмет вместо чеклиста.
 *
 * Дело `design-token-drift` до 25.09 получало DESIGN.md и кусок ARCHITECTURE.md, а
 * задание само разрешало отход: «Если нет доступа к файлам компонентов — дай чеклист
 * для ручной проверки». Доступа к компонентам ему не давали вовсе, поэтому чеклист и
 * приходил — отчёт, который нечем опровергнуть.
 *
 * Что здесь считается предметом. Дрейф в Мембране устроен не так, как обычно: DESIGN.md
 * объявляет палитру сырыми значениями (`--color-bg` и семь соседей), а приложения живут
 * на темах DaisyUI и семантических классах (`bg-base-200`). То есть документ и код
 * описывают цвет в РАЗНЫХ системах координат, и первый вопрос не «компонент разошёлся с
 * токеном», а «заведён ли токен хоть куда-нибудь».
 *
 * Поэтому дело измеряет три вещи и все три — числами с адресами:
 *   1) токены DESIGN.md, не объявленные в конфиге темы приложения;
 *   2) семантические классы цвета, реально употреблённые в компонентах (с адресами);
 *   3) прямые значения цвета в коде мимо системы (`#rrggbb`) — с файлом и строкой.
 *
 * Нет предмета (конфиг не найден, компонентов ноль) — отказ, а не проза: решение об
 * этом принимает вызывающий, здесь для него есть предикат `designSubjectProblems`.
 */

/** Токен палитры из таблицы DESIGN.md. */
export interface DesignToken {
  readonly name: string;
  readonly value: string;
}

/** Употребление семантического класса цвета: класс, файл, строка. */
export interface ColorClassUse {
  readonly className: string;
  readonly file: string;
  readonly line: number;
}

/** Прямое значение цвета в коде — мимо любой системы токенов. */
export interface RawColorUse {
  readonly hex: string;
  readonly file: string;
  readonly line: number;
}

/** Исходник компонента: адрес и текст. */
export interface SourceFile {
  readonly path: string;
  readonly text: string;
}

/**
 * Токены палитры из DESIGN.md: строки таблицы вида
 * `| \`--color-bg\` | \`#0A0F1A\` | Фон приложения |`.
 */
export function parseDesignTokens(designMd: string): DesignToken[] {
  const out: DesignToken[] = [];
  for (const line of designMd.split(/\r?\n/)) {
    const row = /^\|\s*`(--[a-z0-9-]+)`\s*\|\s*`([^`]+)`\s*\|/i.exec(line);
    if (row && !out.some((t) => t.name === row[1])) {
      out.push({ name: row[1]!, value: row[2]! });
    }
  }
  return out;
}

/** Семантические классы цвета DaisyUI/Tailwind, употреблённые в исходнике. */
const COLOR_CLASS = /\b((?:bg|text|border|fill|stroke|ring|from|via|to)-[a-z][a-z0-9-]*)\b/g;

/** Из служебных слов Tailwind цветом не являются эти — отсеиваем шум. */
const NOT_A_COLOR = new Set([
  'text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl', 'text-3xl',
  'text-center', 'text-left', 'text-right', 'text-justify', 'text-ellipsis', 'text-nowrap',
  'border-0', 'border-2', 'border-4', 'border-8', 'border-t', 'border-b', 'border-l',
  'border-r', 'border-x', 'border-y', 'border-solid', 'border-dashed', 'border-none',
  'bg-cover', 'bg-contain', 'bg-center', 'bg-no-repeat', 'bg-fixed', 'bg-clip-text',
  'to-none', 'from-none',
]);

export function extractColorClasses(file: SourceFile): ColorClassUse[] {
  const out: ColorClassUse[] = [];
  file.text.split(/\r?\n/).forEach((text, i) => {
    for (const m of text.matchAll(COLOR_CLASS)) {
      const className = m[1]!;
      if (NOT_A_COLOR.has(className)) continue;
      out.push({ className, file: file.path, line: i + 1 });
    }
  });
  return out;
}

/** Прямые значения цвета: `#rrggbb` и `#rgb` в исходнике компонента. */
export function extractRawColors(file: SourceFile): RawColorUse[] {
  const out: RawColorUse[] = [];
  file.text.split(/\r?\n/).forEach((text, i) => {
    for (const m of text.matchAll(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g)) {
      out.push({ hex: m[0]!.toUpperCase(), file: file.path, line: i + 1 });
    }
  });
  return out;
}

/** Токены DESIGN.md, не встречающиеся в конфиге темы приложения. */
export function tokensMissingFromTheme(
  tokens: readonly DesignToken[],
  themeConfig: string,
): DesignToken[] {
  return tokens.filter(
    (t) => !themeConfig.includes(t.name) && !themeConfig.toUpperCase().includes(t.value.toUpperCase()),
  );
}

/** Темы DaisyUI, объявленные в конфиге приложения. */
export function themesDeclared(themeConfig: string): string[] {
  const block = /themes:\s*\[([^\]]*)\]/.exec(themeConfig);
  if (!block) return [];
  return [...block[1]!.matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1]!);
}

export interface DesignSubject {
  readonly themeConfigPath: string;
  readonly themeConfig: string;
  readonly designMd: string;
  readonly files: readonly SourceFile[];
  /**
   * Граница выборки словами: откуда взяты файлы и чего в них заведомо нет.
   * Число без своей границы читается как число обо всём — это тихая ложь, ради
   * которой и переписывалось это дело. Обязательна, поэтому не необязательное поле.
   */
  readonly scope: string;
}

/**
 * Предикат предмета: чего не хватает, чтобы дело вообще имело о чём говорить.
 * Пустой список — предмет есть. Непустой — вызывающий обязан отказаться, а не
 * выдавать чеклист (уроки прогонов 21–24.09: отчёт без предмета никто не разбирает).
 */
export function designSubjectProblems(subject: DesignSubject): string[] {
  const problems: string[] = [];
  if (!subject.designMd.trim()) problems.push('DESIGN.md не прочитан — палитры нет');
  if (!subject.themeConfig.trim()) {
    problems.push(`конфиг темы не прочитан (${subject.themeConfigPath}) — сравнивать не с чем`);
  }
  if (subject.files.length === 0) {
    problems.push('ни один исходник компонента не прочитан — употребление цвета не измерить');
  }
  if (parseDesignTokens(subject.designMd).length === 0) {
    problems.push('в DESIGN.md не найдено ни одного токена палитры — таблица изменила форму');
  }
  return problems;
}

/** Замер: числа и адреса, по которым модель пишет объяснение. */
export function renderDesignSubject(subject: DesignSubject): string {
  const tokens = parseDesignTokens(subject.designMd);
  const missing = tokensMissingFromTheme(tokens, subject.themeConfig);
  const themes = themesDeclared(subject.themeConfig);
  const classUses = subject.files.flatMap((f) => extractColorClasses(f));
  const rawUses = subject.files.flatMap((f) => extractRawColors(f));

  const byClass = new Map<string, ColorClassUse[]>();
  for (const use of classUses) {
    const list = byClass.get(use.className) ?? [];
    list.push(use);
    byClass.set(use.className, list);
  }
  const ranked = [...byClass.entries()].sort((a, b) => b[1].length - a[1].length);

  const lines = [
    '## Замер оформления (посчитан кодом по исходникам)',
    '',
    `**Граница замера: ${subject.scope}.** Все числа ниже — об этой выборке и только о ней; ` +
      'читать их как утверждение обо всём приложении нельзя.',
    '',
    `В прочитанной выборке — файлов: ${subject.files.length} · ` +
      `прямых значений цвета: ${rawUses.length} · ` +
      `разных семантических классов цвета: ${byClass.size} · их употреблений: ${classUses.length}.`,
    '',
    `По всему документу: токенов в DESIGN.md — ${tokens.length}, ` +
      `из них не объявлено в конфиге темы — ${missing.length} ` +
      '(это утверждение о документе и конфиге целиком, не о выборке).',
    '',
    `Конфиг темы: \`${subject.themeConfigPath}\` · темы DaisyUI: ` +
      (themes.length > 0 ? themes.map((t) => `\`${t}\``).join(', ') : 'не объявлены'),
    '',
    '### Токены DESIGN.md, не объявленные в конфиге темы',
    '',
  ];

  if (tokens.length === 0) {
    lines.push('Таблица палитры в DESIGN.md не разобрана.', '');
  } else if (missing.length === 0) {
    lines.push('Все токены палитры встречаются в конфиге темы.', '');
  } else {
    lines.push('| Токен | Значение в DESIGN.md |', '|---|---|');
    for (const t of missing) lines.push(`| \`${t.name}\` | \`${t.value}\` |`);
    lines.push('');
  }

  lines.push('### Прямые значения цвета в коде (мимо системы токенов)', '');
  if (rawUses.length === 0) {
    lines.push(
      `Прямых значений цвета не найдено в прочитанной выборке (${subject.scope}). ` +
        'Про файлы вне выборки замер не говорит ничего.',
      '',
    );
  } else {
    lines.push('| Значение | Файл | Строка |', '|---|---|---|');
    for (const r of rawUses.slice(0, 40)) lines.push(`| \`${r.hex}\` | ${r.file} | ${r.line} |`);
    if (rawUses.length > 40) lines.push(`| … | ещё ${rawUses.length - 40} | |`);
    lines.push('');
  }

  lines.push('### Семантические классы цвета: что реально употребляется', '');
  if (ranked.length === 0) {
    lines.push('Классов цвета в прочитанных файлах не найдено.', '');
  } else {
    lines.push('| Класс | Употреблений | Первый адрес |', '|---|---|---|');
    for (const [className, uses] of ranked.slice(0, 30)) {
      const first = uses[0]!;
      lines.push(`| \`${className}\` | ${uses.length} | ${first.file}:${first.line} |`);
    }
    if (ranked.length > 30) lines.push(`| … | ещё ${ranked.length - 30} классов | |`);
    lines.push('');
  }

  return lines.join('\n');
}
