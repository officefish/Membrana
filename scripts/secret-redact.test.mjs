import assert from 'node:assert/strict';
import test from 'node:test';

import {
  formatRotationManifest,
  redactJsonSensitiveValues,
  redactionPlaceholder,
  redactSecrets,
} from './lib/secret-redact.mjs';
import { scanJsonForSensitiveKeys, scanTextForSecrets } from './night-triage-secret-scan.mjs';

// Синтетические образцы: настоящих секретов в репозитории быть не должно, иначе
// фикстура сама становится утечкой. Формы взяты из SECRET_PATTERNS сканера.
const SAMPLES = {
  'anthropic-key': 'sk-ant-api03-AAAABBBBCCCCDDDDEEEEFFFF',
  'openai-key': 'sk-AAAABBBBCCCCDDDDEEEEFFFFGGGG',
  'github-token': 'ghp_AAAABBBBCCCCDDDDEEEEFFFFGGGG',
  'github-pat': 'github_pat_AAAABBBBCCCCDDDDEEEEFFFF',
  'aws-access-key': 'AKIAAAAABBBBCCCCDDDD',
  'slack-token': 'xoxb-AAAABBBBCCCC-DDDDEEEE',
  'google-api-key': 'AIzaAAAABBBBCCCCDDDDEEEEFFFFGGGGHHH',
  'bearer-token': 'Bearer AAAABBBBCCCCDDDDEEEEFFFF',
  'basic-auth-url': 'https://user:s3cr3tpass@office.example.tech/path',
};

test('главный критерий: повторный скан вырезанного текста даёт НОЛЬ находок', () => {
  for (const [name, payload] of Object.entries(SAMPLES)) {
    const text = `строка до\n${payload}\nстрока после\n`;
    assert.ok(scanTextForSecrets(text, 'f.md').length > 0, `${name}: образец не ловится сканером`);
    const { text: clean, cuts } = redactSecrets(text);
    assert.ok(cuts.length > 0, `${name}: не вырезано`);
    assert.deepEqual(scanTextForSecrets(clean, 'f.md'), [], `${name}: секрет выжил после реза`);
    assert.ok(!clean.includes(payload), `${name}: исходное значение осталось в тексте`);
  }
});

test('PEM: вырезается ВЕСЬ блок, а не только BEGIN-заголовок', () => {
  const pem = [
    'преамбула',
    '-----BEGIN RSA PRIVATE KEY-----',
    'MIIEowIBAAKCAQEAxKZ1Q0aBcDeFgHiJkLmNoPqRsTuVwXyZ0123456789abcdef',
    'ghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/=',
    '-----END RSA PRIVATE KEY-----',
    'хвост',
  ].join('\n');
  const { text: clean, cuts } = redactSecrets(pem);
  assert.equal(cuts.length, 1);
  assert.equal(cuts[0].name, 'private-key-pem');
  assert.ok(clean.includes('преамбула'));
  assert.ok(clean.includes('хвост'));
  // Тело ключа — то, что утекает; заголовок сам по себе безвреден.
  assert.ok(!clean.includes('MIIEowIBAAKCAQEA'), 'тело ключа осталось в тексте');
  assert.ok(!clean.includes('-----END RSA PRIVATE KEY-----'));
  assert.deepEqual(scanTextForSecrets(clean, 'f.pem'), []);
});

test('PEM без END-маркера: тело съедается до первой обычной строки, носитель не портится', () => {
  const pem = [
    '-----BEGIN PRIVATE KEY-----',
    'MIIEowIBAAKCAQEAxKZ1Q0aBcDeFgHiJkLmNoPqRsTuVwXyZ',
    '',
    'Обычный текст протокола, который терять нельзя.',
  ].join('\n');
  const { text: clean, cuts } = redactSecrets(pem);
  assert.equal(cuts.length, 1);
  assert.equal(cuts[0].unterminated, true, 'незакрытый PEM должен быть помечен в манифесте');
  assert.ok(!clean.includes('MIIEowIBAAKCAQEA'));
  assert.ok(clean.includes('Обычный текст протокола, который терять нельзя.'));
});

test('PEM без END внутри ОДНОЙ строки (формат jsonl): тело не выживает', () => {
  // Найдено на живом прогоне: построчный поиск тела не срабатывает, когда весь PEM
  // лежит в одной строке JSON — вырезался только BEGIN-маркер, тело оставалось, а
  // повторный скан давал ноль. Это и есть «зелёный скан без вырезания».
  const line = '{"text":"-----BEGIN PRIVATE KEY----- MIIEowIBAAKCAQEAxKZ1Q0aBcDeFgHiJk"}';
  const next = '{"text":"следующая запись цела"}';
  const { text: clean, cuts } = redactSecrets(`${line}\n${next}\n`);
  assert.equal(cuts.length, 1);
  assert.equal(cuts[0].unterminated, true);
  assert.ok(!clean.includes('MIIEowIBAAKCAQEA'), 'тело ключа выжило в однострочном формате');
  assert.ok(clean.includes('следующая запись цела'), 'рез вышел за пределы своей строки');
  assert.deepEqual(scanTextForSecrets(clean, 's.jsonl'), []);
});

test('идемпотентность: второй проход ничего не меняет', () => {
  const text = `a ${SAMPLES['github-token']} b ${SAMPLES['aws-access-key']} c\n`;
  const once = redactSecrets(text);
  const twice = redactSecrets(once.text);
  assert.equal(twice.text, once.text);
  assert.deepEqual(twice.cuts, [], 'заглушка сама попалась детектору — рез не идемпотентен');
});

test('заглушка детерминирована: два прогона дают побайтово равные копии', () => {
  const text = `x ${SAMPLES['openai-key']} y`;
  assert.equal(redactSecrets(text).text, redactSecrets(text).text);
  assert.equal(redactSecrets(text).text, `x ${redactionPlaceholder('openai-key')} y`);
});

test('CRLF: переводы строк сохранены, рез одинаков в обеих раскладках', () => {
  const lf = `первая\n${SAMPLES['slack-token']}\nтретья\n`;
  const crlf = lf.replace(/\n/g, '\r\n');
  const cleanLf = redactSecrets(lf).text;
  const cleanCrlf = redactSecrets(crlf).text;
  assert.equal(cleanCrlf, cleanLf.replace(/\n/g, '\r\n'), 'CRLF-вход вырезан иначе, чем LF');
  assert.ok(cleanCrlf.includes('\r\n'), 'CRLF потерян при резе');
  assert.ok(!cleanLf.includes('\r'), 'в LF-вход добавился \\r');
});

test('целостность: текст без секретов возвращается байт в байт', () => {
  const text = '# Протокол\r\n\r\nОбычный markdown с числами 12345 и словом sk-short.\r\n';
  const { text: clean, cuts } = redactSecrets(text);
  assert.equal(clean, text);
  assert.deepEqual(cuts, []);
});

test('несколько вхождений одного правила: режутся ВСЕ, а не первое', () => {
  const text = `${SAMPLES['github-token']} и ещё ghp_ZZZZYYYYXXXXWWWWVVVVUUUU`;
  const { cuts, text: clean } = redactSecrets(text);
  assert.equal(cuts.length, 2, 'сканер берёт первое совпадение — резак обязан взять все');
  assert.deepEqual(scanTextForSecrets(clean, 'f.md'), []);
});

test('cuts[] не содержит вырезанных значений — резак не становится утечкой', () => {
  const payload = SAMPLES['anthropic-key'];
  const { cuts } = redactSecrets(`ключ ${payload} конец`);
  const dumped = JSON.stringify(cuts);
  assert.ok(!dumped.includes(payload));
  assert.ok(!dumped.includes(payload.slice(0, 12)), 'даже префикс значения не должен попадать в cuts');
  assert.deepEqual(Object.keys(cuts[0]).sort(), ['end', 'length', 'line', 'name', 'start']);
});

test('строка и номер строки названы верно — иначе манифест бесполезен', () => {
  const { cuts } = redactSecrets(`один\nдва\n${SAMPLES['aws-access-key']}\n`);
  assert.equal(cuts[0].line, 3);
});

test('JSON: чувствительный ключ вырезан, структура и путь сохранены', () => {
  const source = {
    office: { token: 'live-token-value-1234567890', baseUrl: 'https://office.example.tech' },
    nested: [{ api_key: 'AIzaAAAABBBBCCCCDDDDEEEEFFFFGGGGHHH' }],
    keep: 'обычное значение',
  };
  const { value, cuts } = redactJsonSensitiveValues(source);
  // Пусто, а не заглушка: правило сканера считает находкой любое НЕПУСТОЕ значение под
  // чувствительным ключом, поэтому текстовая заглушка оставила бы находку живой.
  assert.equal(value.office.token, '');
  assert.equal(value.nested[0].api_key, '');
  assert.equal(value.office.baseUrl, 'https://office.example.tech', 'несекретное поле изменено');
  assert.equal(value.keep, 'обычное значение');
  assert.ok(cuts.some((c) => c.path === '$.office.token'));
  // Повторный скан теми же правилами сканера — ноль находок.
  assert.deepEqual(scanJsonForSensitiveKeys(value, 'f.json'), []);
  assert.deepEqual(scanTextForSecrets(JSON.stringify(value), 'f.json'), []);
});

test('JSON: секрет в НЕчувствительном ключе тоже режется правилами текста', () => {
  const { value, cuts } = redactJsonSensitiveValues({ note: `см. ${SAMPLES['github-pat']}` });
  assert.ok(!JSON.stringify(value).includes(SAMPLES['github-pat']));
  assert.equal(cuts[0].name, 'github-pat');
  assert.equal(cuts[0].path, '$.note');
});

test('манифест: классы и места без значений, дата приходит параметром', () => {
  const { cuts } = redactSecrets(`${SAMPLES['github-token']}\n${SAMPLES['aws-access-key']}\n`);
  const md = formatRotationManifest(cuts, { file: 'session.jsonl', date: '2026-07-26' });
  assert.match(md, /Дата прохода: 2026-07-26/);
  assert.match(md, /`github-token` \| 1/);
  assert.match(md, /строка 2/);
  assert.ok(!md.includes(SAMPLES['github-token']));
  assert.match(md, /сначала ротация ключей владельцем/);
});

test('манифест пустого реза говорит прямо, а не молчит', () => {
  const md = formatRotationManifest([], { file: 'clean.md', date: '2026-07-26', dryRun: true });
  assert.match(md, /Секретов не найдено/);
  assert.match(md, /сухой прогон/);
});
