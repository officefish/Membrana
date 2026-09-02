/**
 * ПОРЧА-ЗУБ (DoD блока `key-ttl`, пункт 3): снять fail-closed ветку — зуб обязан покраснеть.
 *
 * ЗАЧЕМ. Вердикт M3 предупреждает прямо: если ветки нет, «защита по умолчанию» есть надежда, а
 * не факт о коде. Но и зелёный зуб сам по себе фактом не является: он мог бы зеленеть по
 * причинам, к ветке отношения не имеющим, — тогда снятие ветки прошло бы незамеченным, и мы
 * получили бы ту же надежду, только с галочкой. Этот файл проверяет НЕ предмет, а зуб на
 * предмет: калечит ЖИВОЙ исходник и требует, чтобы перебор перестал сходиться.
 *
 * КАК. Читается настоящий `track-key-ttl.ts` (не копия, не фикстура), по якорю
 * `fail-closed:branch` константа подменяется на `null`, результат транспилируется и
 * исполняется в песочнице. Через мутанта гоняется ТОТ ЖЕ перебор порчи, что и в основном зубе.
 *
 * ЗУБ ПАДАЕТ В ОБЕ СТОРОНЫ:
 *  - якоря в исходнике нет (ветку сняли или переименовали) → тест говорит об этом прямо, а не
 *    зеленеет на пустом месте;
 *  - мутант всё равно возвращает константу → значит перебор к ветке не привязан, и основной
 *    зуб — театр. Тоже красный.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { DEFAULT_TRACK_KEY_TTL, type ResolvedTrackKeyTtl } from './track-key-ttl';
import { TTL_CORRUPTION_CASES, TTL_NOW } from './stubs/ttl-corruption-table';

const SOURCE_PATH = fileURLToPath(new URL('./track-key-ttl.ts', import.meta.url));
const ANCHOR = '/* fail-closed:branch */ seconds: DEFAULT_TRACK_KEY_TTL,';
const MUTATION = '/* fail-closed:branch */ seconds: null,';

interface ResolverModule {
  resolveTrackKeyTtl(stored: unknown, opts?: { now?: Date }): ResolvedTrackKeyTtl;
}

/** Транспилировать TS-исходник в CJS и исполнить в песочнице. Модуль без внешних импортов. */
function evaluateModule(source: string): ResolverModule {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const ts = require('typescript') as typeof import('typescript');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  });
  const module = { exports: {} as Record<string, unknown> };
  const run = new Function('exports', 'require', 'module', outputText);
  run(module.exports, require, module);
  return module.exports as unknown as ResolverModule;
}

describe('DoD-3 · порча: без fail-closed ветки зуб краснеет', () => {
  const source = readFileSync(SOURCE_PATH, 'utf8');

  it('якорь порчи в живом исходнике ровно один', () => {
    const occurrences = source.split(ANCHOR).length - 1;
    expect(
      occurrences,
      'якоря fail-closed:branch в track-key-ttl.ts нет или он не один — ветку сняли, переименовали или размножили',
    ).toBe(1);
  });

  it('целый исходник, исполненный в песочнице, ведёт себя как импортированный', () => {
    // Опора: если бы песочница искажала поведение, красный у мутанта ничего не доказывал бы.
    const intact = evaluateModule(source);
    for (const testCase of TTL_CORRUPTION_CASES) {
      expect(intact.resolveTrackKeyTtl(testCase.stored, { now: TTL_NOW }).seconds).toBe(
        DEFAULT_TRACK_KEY_TTL,
      );
    }
  });

  it('снятие ветки роняет ВЕСЬ перебор порчи, а не отдельный случай', () => {
    const mutant = evaluateModule(source.replace(ANCHOR, MUTATION));

    const survived: string[] = [];
    for (const testCase of TTL_CORRUPTION_CASES) {
      const ttl = mutant.resolveTrackKeyTtl(testCase.stored, { now: TTL_NOW });
      // Ровно то утверждение, которое стережёт основной зуб: `.not.toBeNull()`.
      if (ttl.seconds !== null) survived.push(`${testCase.kind} · ${testCase.name}`);
    }

    expect(
      survived,
      `эти случаи пережили снятие fail-closed ветки — значит зуб на них проверяет не ветку: ${survived.join(', ')}`,
    ).toEqual([]);
  });

  it('порча ломает именно инвариант «null только у снятого срока»', () => {
    const mutant = evaluateModule(source.replace(ANCHOR, MUTATION));
    const ttl = mutant.resolveTrackKeyTtl(undefined, { now: TTL_NOW });

    // Мутант выдаёт бессрочную ссылку, называя источником умолчание. Это и есть та самая
    // «надежда вместо факта»: настройки нет — а ссылка не истекает никогда.
    expect(ttl.seconds).toBeNull();
    expect(ttl.source).toBe('default');
    expect(ttl.source === 'lifted').toBe(false);
  });

  it('валидный срок порчей не затронут — мутация бьёт ровно в умолчание', () => {
    // Иначе красный у мутанта мог бы объясняться поломкой чего угодно, а не снятием ветки.
    const mutant = evaluateModule(source.replace(ANCHOR, MUTATION));
    expect(mutant.resolveTrackKeyTtl({ mode: 'seconds', seconds: 3600 }, { now: TTL_NOW }).seconds).toBe(3600);
  });
});
