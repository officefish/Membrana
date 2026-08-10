/**
 * Гард против ВТОРОЙ КОПИИ таблицы моделей (блок b2 спринта `dreams-models-liveness`,
 * долг `#office-dreams-test-stubs-own-models`).
 *
 * ПОВОД. Зуб офиса `dreams.service.test.ts` три недели держал свой рукописный список
 * маршрутов. Пока он совпадал с реестром, вреда не было; 07.08 реестр сменил два id
 * (`e3c0fb59` — прежние ответили с прода HTTP 404), и копия осталась на мёртвых.
 * Замер 10.08: три дня расхождения, 38 коммитов в ствол, 45 зелёных прогонов `ci.yml`
 * и 46 `unit-tests.yml` — в каждом зуб числился пройденным, утверждая мёртвое.
 *
 * Блок b1 снял ту копию. Этот гард не даёт завести третью: литерал вида `<вендор>/<модель>`
 * внутри офисного пакета — почти всегда начало нового носителя той же правды.
 *
 * ПОЧЕМУ ГАРД ЖИВЁТ В КОРПУСЕ scripts, А НЕ В ПАКЕТЕ. С 10.08 мердж-гейт корпуса vitest
 * выборочный (`vitest-gate`): тесты пакета идут, только когда пакет затронут. Гард обязан
 * стоять и тогда, когда правят СОСЕДА — например сам реестр в `scripts/lib/`. Корпус
 * scripts гоняется мердж-гейтом всегда, поэтому дом гарда здесь.
 *
 * ПОЧЕМУ ТУПОЙ ГРЕП, А НЕ РАЗБОР AST. Слова резчика: «простой, тупой, работает».
 * AST-разбор поймал бы больше, но и стоил бы больше, а предмет — не хитрость, а копипаста.
 * Признанный предел заявлен ниже зубом на самого себя.
 */
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Зона гарда. Расширяется явной правкой — молчаливого расползания зоны не бывает. */
export const GUARDED_ROOTS = Object.freeze(['packages/background-office/src']);

/** Единственный законный носитель маршрутов провайдеров снов. */
export const REGISTRY_REL = 'scripts/lib/dreams-providers.mjs';

/**
 * Вендоры, чьи id выглядят как `вендор/модель`. Список закрыт и расширяется правкой:
 * открытый список («любое слово со слэшем») ловил бы пути импортов и был бы выключен
 * через неделю — а выключенный гард хуже отсутствующего, он создаёт видимость.
 */
export const MODEL_VENDORS = Object.freeze([
  'x-ai',
  'google',
  'anthropic',
  'openai',
  'perplexity',
  'meta-llama',
  'mistralai',
  'deepseek',
  'qwen',
]);

/**
 * Оговорка на строке — по идиоме `network-tooth:allow-bare-fetch`. Без причины рядом
 * оговорка не считается: пустой ярлык означал бы «выключить гард молча».
 */
export const WAIVER_RE = /dreams-model-ids:allow\s+\S+/u;

// Бэктик задан кодом `, а не экранированием: под флагом `u` escape-последовательность
// \` в классе символов недопустима, и регексп не собирался вовсе — поймано первым прогоном.
const QUOTE = '[\'"\\u0060]';
const modelIdRe = new RegExp(`${QUOTE}(${MODEL_VENDORS.join('|')})\\/[a-z0-9][a-z0-9._-]*${QUOTE}`, 'iu');

/** @param {string} root абсолютный путь */
function walkTs(root) {
  const out = [];
  let entries;
  try {
    entries = readdirSync(root, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = join(root, e.name);
    if (e.isDirectory()) {
      if (['node_modules', 'dist', 'generated'].includes(e.name)) continue;
      out.push(...walkTs(full));
    } else if (/\.tsx?$/u.test(e.name)) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Находки: литерал модели вне реестра и без оговорки.
 * @returns {Array<{file: string, line: number, text: string}>}
 */
export function findModelIdLiterals(roots = GUARDED_ROOTS, io = { read: readFileSync, walk: walkTs }) {
  const findings = [];
  for (const rel of roots) {
    for (const file of io.walk(join(repoRoot, rel))) {
      const relFile = relative(repoRoot, file).split('\\').join('/');
      if (relFile === REGISTRY_REL) continue;
      const source = String(io.read(file, 'utf8'));
      source.split('\n').forEach((line, i) => {
        if (!modelIdRe.test(line)) return;
        if (WAIVER_RE.test(line)) return;
        findings.push({ file: relFile, line: i + 1, text: line.trim().slice(0, 120) });
      });
    }
  }
  return findings;
}

test('в офисном пакете нет литералов моделей — носитель маршрутов один', () => {
  const findings = findModelIdLiterals();
  const report = findings.map((f) => `  ${f.file}:${f.line} — ${f.text}`).join('\n');
  assert.equal(
    findings.length,
    0,
    `литерал модели вне ${REGISTRY_REL} — это вторая копия таблицы, ровно та, что 07.08 ` +
      `осталась на мёртвых id:\n${report}\n` +
      `Чинить импортом реестра; если случай законный — оговорка «dreams-model-ids:allow <причина>» на строке.`,
  );
});

test('гард ловит подложенный литерал — иначе зелёный ничего не значит', () => {
  const fake = {
    read: () => "const routes = { grok: 'x-ai/grok-4-fast' };\n",
    walk: () => [join(repoRoot, 'packages/background-office/src/fake.ts')],
  };
  const findings = findModelIdLiterals(GUARDED_ROOTS, fake);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].line, 1);
  assert.match(findings[0].file, /fake\.ts$/u);
});

test('оговорка с причиной снимает находку, пустой ярлык — нет', () => {
  const withReason = {
    read: () => "const m = 'google/gemini-3.5-flash'; // dreams-model-ids:allow ADR-0018-fixture\n",
    walk: () => [join(repoRoot, 'packages/background-office/src/a.ts')],
  };
  assert.equal(findModelIdLiterals(GUARDED_ROOTS, withReason).length, 0);

  const bare = {
    read: () => "const m = 'google/gemini-3.5-flash'; // dreams-model-ids:allow\n",
    walk: () => [join(repoRoot, 'packages/background-office/src/a.ts')],
  };
  assert.equal(findModelIdLiterals(GUARDED_ROOTS, bare).length, 1, 'ярлык без причины гард не выключает');
});

test('путь импорта вендором не считается — гард не кричит на @membrana/*', () => {
  const imports = {
    read: () => "import { x } from '@membrana/core';\nimport y from './google/helper';\n",
    walk: () => [join(repoRoot, 'packages/background-office/src/b.ts')],
  };
  assert.equal(findModelIdLiterals(GUARDED_ROOTS, imports).length, 0);
});

test('предел гарда назван: конкатенация не ловится — это признанная дыра, а не обещание', () => {
  const split = {
    read: () => "const m = 'x-ai' + '/grok-4.3';\n",
    walk: () => [join(repoRoot, 'packages/background-office/src/c.ts')],
  };
  assert.equal(
    findModelIdLiterals(GUARDED_ROOTS, split).length,
    0,
    'греп по литералу склейку не видит — заявлено в шапке, ловится ревью, не гардом',
  );
});

test('реестр в зону не входит и находкой стать не может', () => {
  assert.ok(!GUARDED_ROOTS.some((r) => REGISTRY_REL.startsWith(r)));
});
