/**
 * Зубы проверки ссылок перед уборкой буфера (#2204, заказ владельца 28.08).
 *
 * Главный зуб здесь — ЗЕРКАЛО: правило защиты живёт в ядре на TypeScript, а этот скрипт
 * на .mjs без сборки, и носителя два. Разойдутся — уборка и проверка станут судить пробу
 * по-разному, а это ровно тот класс, который мы ловили на близнецах библиотеки (#2184).
 */
import { strict as assert } from 'node:assert';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { inWindow, isPinned } from './buffer-protect-evidence.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPT = join(REPO, 'scripts', 'buffer-protect-evidence.mjs');
const CORE = join(REPO, 'packages', 'services', 'media-library', 'src', 'buffer-cleanup.ts');
const REGISTRY = join(REPO, 'docs', 'field', 'evidence-windows.json');

test('ЗЕРКАЛО: скрипт судит защиту теми же признаками, что ядро уборки', () => {
  const core = readFileSync(CORE, 'utf8');
  const script = readFileSync(SCRIPT, 'utf8');

  // Ядро — источник правила; скрипт обязан нести те же три признака дословно.
  assert.match(core, /\\bkeep\\b/u, 'ядро ловит латинское keep по границам слова');
  assert.match(core, /хранить\|не удалять/u, 'ядро ловит русские пометки');
  assert.match(core, /label !== 'unlabeled'/u, 'ядро считает любую метку человека защитой');

  assert.match(script, /\\bkeep\\b/u, 'скрипт обязан ловить keep так же');
  assert.match(script, /хранить\|не удалять/u, 'скрипт обязан ловить русские пометки так же');
  assert.match(script, /!== 'unlabeled'/u, 'скрипт обязан считать метку защитой так же');
});

test('защита: метка человека, латинское keep и русские слова — каждое защищает', () => {
  assert.equal(isPinned({ label: 'drone', notes: null }), true, 'метка защищает');
  assert.equal(isPinned({ label: 'unlabeled', notes: 'keep' }), true, 'keep защищает');
  assert.equal(isPinned({ label: 'unlabeled', notes: 'хранить до приёмки' }), true);
  assert.equal(isPinned({ label: 'unlabeled', notes: 'не удалять' }), true);
  assert.equal(isPinned({ label: 'unlabeled', notes: 'scenario make-track' }), false, 'происхождение — не защита');
  assert.equal(isPinned({ label: 'unlabeled', notes: 'housekeeping' }), false, 'keep внутри слова не считается');
});

test('окно: границы включительные, соседняя минута снаружи', () => {
  const from = '2026-08-23T18:00:00.000Z';
  const to = '2026-08-23T19:40:00.000Z';
  assert.equal(inWindow('2026-08-23T18:00:00.000Z', from, to), true, 'левая граница внутри');
  assert.equal(inWindow('2026-08-23T19:40:00.000Z', from, to), true, 'правая граница внутри');
  assert.equal(inWindow('2026-08-23T18:24:03.788Z', from, to), true, 'самая ранняя проба живого буфера — внутри');
  assert.equal(inWindow('2026-08-23T17:59:59.000Z', from, to), false);
  assert.equal(inWindow('2026-08-26T19:10:43.144Z', from, to), false, 'свежая проба вне окна');
});

test('реестр окон читается и несёт документ-источник на каждое окно', () => {
  const registry = JSON.parse(readFileSync(REGISTRY, 'utf8'));
  assert.ok(Array.isArray(registry.windows) && registry.windows.length > 0, 'окна есть');
  for (const w of registry.windows) {
    for (const field of ['id', 'doc', 'deviceId', 'from', 'to', 'why']) {
      assert.ok(w[field], `окно ${w.id ?? '?'} обязано нести ${field}`);
    }
    assert.ok(Number.isFinite(Date.parse(w.from)), `${w.id}: from — время`);
    assert.ok(Number.isFinite(Date.parse(w.to)), `${w.id}: to — время`);
    assert.ok(Date.parse(w.to) > Date.parse(w.from), `${w.id}: окно не вывернуто`);
  }
});

/**
 * FAIL-CLOSED живым прогоном. Ключи скрипт берёт из `.env` дерева, поэтому «убрать ключи»
 * через окружение не выйдет — вместо этого уводим адрес media в никуда: проверка, которая
 * не смогла спросить, обязана ОТКАЗАТЬ, а не доложить «всё защищено».
 */
test('FAIL-CLOSED: media не отвечает → ОТКАЗ, а не зелёное молчание', () => {
  const dir = mkdtempSync(join(tmpdir(), 'protect-evidence-'));
  let code = 0;
  let stderr = '';
  try {
    execFileSync(process.execPath, [SCRIPT], {
      cwd: dir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, MEDIA_API_URL: 'https://media-nonexistent.invalid' },
    });
  } catch (err) {
    code = typeof err?.status === 'number' ? err.status : 1;
    stderr = String(err?.stderr ?? '');
  }
  assert.equal(code, 1, 'недоступная media — отказ проверки (1), не находка (3) и не ok');
  assert.match(stderr, /ОТКАЗ/u, 'отказ назван словом');
  assert.match(stderr, /уборку запускать нельзя/u, 'сказано, что делать');
});

test('НЕПОЛНОЕ ЧТЕНИЕ — отказ: недочитанный набор занижает число незащищённых', () => {
  const script = readFileSync(SCRIPT, 'utf8');
  assert.match(script, /PAGE_SIZE = 100/u, 'страница по потолку сервера, а не по желанию');
  assert.match(script, /недочитан, судить по части нельзя/u, 'неполнота — отказ, а не тишина');
});

test('ПОСЛЕ ВЫВОЗА не станет ложно-зелёной: ищет по ВСЕМ наборам, не только в буфере', () => {
  const script = readFileSync(SCRIPT, 'utf8');
  // Ссылка документа держится устройством и окном; номер пробы переживает перенос. Проверка,
  // смотрящая в один буфер, после вывоза доложит «в окне ноль» — ложное зелёное того самого
  // класса, который это задание чинит.
  assert.match(script, /\/collections`/u, 'скрипт перечисляет наборы устройства');
  assert.match(script, /async function loadDevice/u, 'есть чтение по всем наборам');
  assert.match(script, /в окне \$\{all\.length\} проб \(в буфере \$\{inBuffer\.length\}, вывезено \$\{evacuated\}\)/u,
    'доклад различает «в окне», «в буфере» и «вывезено»');
  assert.doesNotMatch(
    script,
    /async function loadBuffer/u,
    'старого чтения только буфера не осталось — иначе два пути и один из них слепой',
  );
});

test('ВЫВОЗ: каждому окну назначено человеческое имя набора, план не трогает прод', () => {
  const evac = readFileSync(join(REPO, 'scripts', 'buffer-evacuate-evidence.mjs'), 'utf8');
  const registry = JSON.parse(readFileSync(REGISTRY, 'utf8'));
  for (const w of registry.windows) {
    assert.match(evac, new RegExp(`'${w.id}':`, 'u'), `окну ${w.id} назначено имя набора`);
  }
  assert.match(evac, /Ночное дежурство 23 августа/u, 'имя читается без документа');
  assert.match(evac, /Ночное дежурство 23 августа/u);
  assert.match(evac, /нужен --execute/u, 'без --execute только план');
  assert.match(evac, /молчаливого пропуска нет/u, 'частичный вывоз называется, а не скрывается');
});

test('порядок исходов различает находку и отказ', () => {
  const script = readFileSync(SCRIPT, 'utf8');
  assert.match(script, /EXIT_FINDING = 3/u, 'находка — 3');
  assert.match(script, /EXIT_REFUSED = 1/u, 'отказ проверки — 1');
  assert.match(
    script,
    /НАХОДКА: \$\{unprotected\} проб вещдока в буфере БЕЗ защиты/u,
    'находка называет число незащищённых',
  );
});
