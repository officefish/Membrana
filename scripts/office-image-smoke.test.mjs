import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import {
  SMOKE_LIMITS,
  SMOKE_OUTCOMES,
  formatSmokeVerdict,
  missingModuleFrom,
  smokeVerdict,
} from './lib/office-image-smoke.mjs';

// Зубы прибора «образ офиса исполняет свой рантайм» (блок 1, #1797). Ядро чистое:
// ответы контейнера приходят значением, docker и сеть не нужны.

const ok = { ok: true, status: 200, body: '{"projection":{}}' };

test('образ полон — pass, и это УТВЕРЖДЕНИЕ о проверенном', () => {
  const v = smokeVerdict({ health: { ok: true, status: 200 }, digest: ok, logs: 'Nest application successfully started' });
  assert.equal(v.outcome, 'pass');
  assert.equal(v.missingModule, null);
  const text = formatSmokeVerdict(v).join('\n');
  assert.match(text, /проверено ИСПОЛНЕНИЕМ, а не списком/u, 'иначе pass неотличим от «не смотрел»');
});

test('недостающий модуль назван ПО ИМЕНИ — иначе читатель полезет в логи угадывать', () => {
  const v = smokeVerdict({
    health: { ok: true, status: 200 },
    digest: { ok: false, status: 500, body: "Cannot find module '/app/scripts/lib/dreams-tick.mjs' imported from /app/..." },
    logs: '',
  });
  assert.equal(v.outcome, 'missing-module');
  assert.equal(v.missingModule, '/app/scripts/lib/dreams-tick.mjs');
  assert.match(v.detail, /COPY в packages\/background-office\/Dockerfile/u, 'сказано ЧТО починить, а не только что сломано');
});

test('падение на импорте ПРИ СТАРТЕ ловится из логов, а не прячется под «нездоров»', () => {
  // Самый частый случай расхождения: офис не поднялся вообще, health молчит. Диагноз
  // «unhealthy» здесь скрыл бы настоящую причину — ровно то молчание, что стоило 07.08.
  const v = smokeVerdict({
    health: { ok: false, status: null },
    digest: null,
    logs: "Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/app/scripts/network/lib/classify.mjs'",
  });
  assert.equal(v.outcome, 'missing-module');
  assert.equal(v.missingModule, '/app/scripts/network/lib/classify.mjs');
});

test('контейнер не поднялся без следа модуля — unhealthy, а НЕ missing-module', () => {
  const v = smokeVerdict({ health: { ok: false, status: 503 }, digest: null, logs: 'connect ECONNREFUSED mongo:27017' });
  assert.equal(v.outcome, 'unhealthy');
  assert.match(v.detail, /до проверки модулей дело не дошло/u, 'диагнозы не склеены: чинить тут другое');
});

test('контейнер не опрошен — broken, и это «прогон не состоялся», а не зелёное', () => {
  const v = smokeVerdict({ health: null, digest: null, logs: '' });
  assert.equal(v.outcome, 'broken');
  assert.match(v.detail, /«Не знаю» не значит «здоров»/u);
});

test('дайджест упал без имени модуля — прибор признаёт предел, а не выдумывает диагноз', () => {
  const v = smokeVerdict({
    health: { ok: true, status: 200 },
    digest: { ok: false, status: 500, body: '{"message":"Internal server error"}' },
    logs: 'TypeError: log.projectDay is not a function',
  });
  assert.equal(v.outcome, 'broken');
  assert.match(v.detail, /диагноз прибора здесь кончается/u);
});

test('имя модуля читается во всех трёх формах, которыми Node сообщает о пропаже', () => {
  assert.equal(missingModuleFrom("Cannot find module '/app/x.mjs'"), '/app/x.mjs');
  assert.equal(missingModuleFrom('Cannot find module \\"/app/y.mjs\\"'), '/app/y.mjs');
  assert.equal(missingModuleFrom("MODULE_NOT_FOUND\n  at require ('/app/z.js')"), '/app/z.js');
  assert.equal(missingModuleFrom('что-то другое'), null);
  assert.equal(missingModuleFrom(null), null, 'пустой вход не должен бросать: логи бывают пустыми');
});

test('прибор НЕ несёт списка модулей — условие резчика как зуб', () => {
  // Своя копия списка стала бы третьим рукописным источником истины поверх двух и
  // усугубила бы ровно тот дефект, который лечим. Проверяем буквально: в ядре нет
  // перечисления рантайм-модулей офиса.
  const text = readFileSync(new URL('./lib/office-image-smoke.mjs', import.meta.url), 'utf8');
  const code = text.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/[^\n]*/gm, ' ');
  const named = ['dreams-log.mjs', 'dreams-format.mjs', 'night-research.mjs', 'dreams-providers.mjs'];
  const found = named.filter((n) => code.includes(n));
  assert.deepEqual(found, [], `в исполняемом коде ядра перечислены модули: ${found.join(', ')} — это вторая копия списка`);
});

test('исходы и пределы объявлены вслух, список исходов закрыт', () => {
  assert.deepEqual([...SMOKE_OUTCOMES], ['pass', 'missing-module', 'unhealthy', 'broken']);
  assert.ok(SMOKE_LIMITS.length >= 3);
  assert.ok(
    SMOKE_LIMITS.some((l) => /json-данные/u.test(l)),
    'слепота к лениво читаемым json признана, а не скрыта',
  );
  assert.ok(SMOKE_LIMITS.some((l) => /путь снов/u.test(l)), 'область прибора названа: он не покрывает весь офис');
});
