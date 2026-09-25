/**
 * Зубы дрейфа оформления. Предмет — фикстуры DESIGN.md, конфига темы и исходников.
 * Держат жанр: находка несёт адрес, отсутствие предмета даёт отказ, а не чеклист.
 */
import { describe, expect, it } from 'vitest';

import {
  designSubjectProblems,
  extractColorClasses,
  extractRawColors,
  parseDesignTokens,
  renderDesignSubject,
  themesDeclared,
  tokensMissingFromTheme,
  type DesignSubject,
} from './night-hunt-design';

const DESIGN_MD = `# DESIGN — визуальный контракт

## Базовая палитра

| Токен | Значение | Применение |
|-------|----------|------------|
| \`--color-bg\` | \`#0A0F1A\` | Фон приложения |
| \`--color-surface\` | \`#111827\` | Карточки |
| \`--color-accent\` | \`#7C3AED\` | Акцент |

## Сетка

- Базовая сетка: 8 px.
`;

const THEME_CONFIG = `
export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: { extend: {} },
  daisyui: { themes: ['forest', 'sunset', 'dark'], darkTheme: 'dark' },
};
`;

const COMPONENT: DesignSubject['files'][number] = {
  path: 'apps/client/src/components/Panel.tsx',
  text: [
    'export function Panel() {',
    '  return (',
    '    <div className="bg-base-200 text-base-content border-base-300 text-sm">',
    '      <span className="text-error">ошибка</span>',
    '      <span className="bg-base-200">снова</span>',
    '    </div>',
    '  );',
    '}',
  ].join('\n'),
};

const subjectOf = (over: Partial<DesignSubject> = {}): DesignSubject => ({
  themeConfigPath: 'apps/client/tailwind.config.js',
  scope: 'файлы каталога apps/client/src/components без вложенных подкаталогов, не более 25, тесты исключены',
  themeConfig: THEME_CONFIG,
  designMd: DESIGN_MD,
  files: [COMPONENT],
  ...over,
});

describe('токены DESIGN.md', () => {
  it('читаются из таблицы палитры с именем и значением', () => {
    expect(parseDesignTokens(DESIGN_MD)).toEqual([
      { name: '--color-bg', value: '#0A0F1A' },
      { name: '--color-surface', value: '#111827' },
      { name: '--color-accent', value: '#7C3AED' },
    ]);
  });

  it('строки вне таблицы палитры токенами не считаются', () => {
    expect(parseDesignTokens('- Базовая сетка: 8 px.')).toEqual([]);
  });

  it('токен, не объявленный в конфиге темы, назван', () => {
    const missing = tokensMissingFromTheme(parseDesignTokens(DESIGN_MD), THEME_CONFIG);
    expect(missing.map((t) => t.name)).toEqual([
      '--color-bg',
      '--color-surface',
      '--color-accent',
    ]);
  });

  it('токен, заведённый в конфиг, из списка пропавших уходит', () => {
    const withToken = `${THEME_CONFIG}\n// '--color-bg': '#0A0F1A'`;
    const missing = tokensMissingFromTheme(parseDesignTokens(DESIGN_MD), withToken);
    expect(missing.map((t) => t.name)).not.toContain('--color-bg');
  });

  it('темы DaisyUI читаются из конфига', () => {
    expect(themesDeclared(THEME_CONFIG)).toEqual(['forest', 'sunset', 'dark']);
    expect(themesDeclared('нет такого блока')).toEqual([]);
  });
});

describe('употребление цвета в исходниках', () => {
  it('семантические классы цвета собираются с файлом и строкой', () => {
    const uses = extractColorClasses(COMPONENT);
    expect(uses).toContainEqual({
      className: 'bg-base-200',
      file: 'apps/client/src/components/Panel.tsx',
      line: 3,
    });
    expect(uses.filter((u) => u.className === 'bg-base-200')).toHaveLength(2);
  });

  it('размерные и служебные классы цветом не считаются', () => {
    const names = extractColorClasses(COMPONENT).map((u) => u.className);
    expect(names).not.toContain('text-sm');
  });

  it('прямые значения цвета ловятся с адресом', () => {
    const uses = extractRawColors({
      path: 'apps/client/src/theme.ts',
      text: 'const bg = "#0A0F1A";\nconst accent = "#7C3AED";',
    });
    expect(uses).toEqual([
      { hex: '#0A0F1A', file: 'apps/client/src/theme.ts', line: 1 },
      { hex: '#7C3AED', file: 'apps/client/src/theme.ts', line: 2 },
    ]);
  });

  it('ноль прямых значений — это измеренный ноль, а не пропуск', () => {
    expect(extractRawColors(COMPONENT)).toEqual([]);
  });
});

describe('предмет обязателен', () => {
  it('полный предмет проблем не даёт', () => {
    expect(designSubjectProblems(subjectOf())).toEqual([]);
  });

  it('без конфига темы — отказ с названием файла', () => {
    const problems = designSubjectProblems(subjectOf({ themeConfig: '' }));
    expect(problems.join(' ')).toContain('apps/client/tailwind.config.js');
  });

  it('без единого исходника — отказ, а не чеклист', () => {
    expect(designSubjectProblems(subjectOf({ files: [] })).join(' ')).toContain(
      'ни один исходник компонента не прочитан',
    );
  });

  it('таблица палитры изменила форму — отказ называет это прямо', () => {
    const problems = designSubjectProblems(subjectOf({ designMd: '# DESIGN\n\nбез таблицы' }));
    expect(problems.join(' ')).toContain('ни одного токена палитры');
  });
});

describe('замер для модели', () => {
  it('несёт числа и адреса, а не предложение проверить руками', () => {
    const subject = renderDesignSubject(subjectOf());

    expect(subject).toContain('В прочитанной выборке — файлов: 1');
    expect(subject).toContain('токенов в DESIGN.md — 3');
    expect(subject).toContain('не объявлено в конфиге темы — 3');
    expect(subject).toContain('прямых значений цвета: 0');
    expect(subject).toContain('apps/client/src/components/Panel.tsx:3');
    expect(subject).not.toMatch(/чеклист|типичн/i);
  });

  /**
   * Число без своей границы читается как число обо всём приложении. Ровно эту тихую
   * ложь дело и лечит, поэтому граница выборки обязана стоять рядом с числами, а не
   * подразумеваться.
   */
  it('каждое число несёт свою границу: выборка названа словами и рядом с числами', () => {
    const subject = renderDesignSubject(subjectOf());

    expect(subject).toContain('Граница замера:');
    expect(subject).toContain('без вложенных подкаталогов');
    expect(subject).toContain('не более 25');
    expect(subject).toContain('читать их как утверждение обо всём приложении нельзя');
  });

  it('измеренный ноль тоже назван выборкой, а не приложением', () => {
    const subject = renderDesignSubject(subjectOf());

    expect(subject).toContain('Прямых значений цвета не найдено в прочитанной выборке');
    expect(subject).toContain('Про файлы вне выборки замер не говорит ничего');
  });

  it('прямое значение цвета попадает в таблицу с файлом и строкой', () => {
    const subject = renderDesignSubject(
      subjectOf({
        files: [{ path: 'apps/client/src/theme.ts', text: 'const bg = "#123456";' }],
      }),
    );

    expect(subject).toContain('#123456');
    expect(subject).toContain('apps/client/src/theme.ts');
  });
});
