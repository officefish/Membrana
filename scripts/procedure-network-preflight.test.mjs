/**
 * Зуб провода предполётной проверки в процедуры (блок preflight-wire, 10.09).
 *
 * Предмет: глагол `network:preflight` существовал с 29.07 и не был подключён НИ К ЧЕМУ.
 * Красный вход — «процедура пошла к моделям при молчащем транспорте» и «проверка
 * подключена к одной процедуре, а не к обеим».
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import { buildProbeResult, buildSnapshot } from './network/lib/probe-core.mjs';
import { EXIT_TRANSPORT, PANEL_PROBE_ID, preflightDecision, runProcedurePreflight } from './lib/procedure-network-preflight.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const at = '2026-09-10T12:00:00.000Z';

const probe = (id, role, observation) =>
  buildProbeResult({ id, label: id, role }, [{ path: 'direct', observation, latencyMs: 10 }]);

const snapshotOf = (probes) =>
  buildSnapshot({ probes, env: { proxyConfigured: false, proxyVars: [], host: 'x' }, generatedAt: at });

test('ВЕЩДОК 10.09: панель молчит ⇒ процедура НЕ идёт, причина названа', () => {
  const d = preflightDecision(
    snapshotOf([
      probe('control', 'control', { httpStatus: 200 }),
      probe(PANEL_PROBE_ID, 'provider', { errorCode: 'ECONNRESET' }),
    ]),
  );
  assert.equal(d.ok, false, 'ПОРЧА ДНЯ: зелёное при мёртвой панели');
  assert.equal(d.code, EXIT_TRANSPORT);
  assert.match(d.reason, /звенья не пробовались/u);
  assert.match(d.hint.join('\n'), /_ssh-media-exec/u, 'отказ обязан нести встречную пробу');
});

test('зелёные провайдеры НЕ оправдывают мёртвую панель — случай сегодняшнего дня', () => {
  // Ровно замер 10.09: все провайдерские звенья ok, предполётный код 0, панель мертва.
  const d = preflightDecision(
    snapshotOf([
      probe('control', 'control', { httpStatus: 200 }),
      probe('openrouter', 'provider', { httpStatus: 200 }),
      probe('anthropic', 'provider', { httpStatus: 200 }),
      probe(PANEL_PROBE_ID, 'provider', { errorCode: 'ECONNRESET' }),
    ]),
  );
  assert.equal(d.ok, false, 'четыре зелёных звена не делают панель живой');
});

test('НЕ транспорт (ключи, деньги, гео) ⇒ процедура идёт: цепочка разберёт сама', () => {
  for (const observation of [{ httpStatus: 401 }, { httpStatus: 402 }, { httpStatus: 403 }]) {
    const d = preflightDecision(
      snapshotOf([probe('control', 'control', { httpStatus: 200 }), probe('openrouter', 'provider', observation)]),
    );
    assert.equal(d.ok, true, 'это не сеть — отказывать процедуре не за что');
  }
});

test('всё зелено ⇒ идём молча и без подсказок', () => {
  const d = preflightDecision(snapshotOf([probe('control', 'control', { httpStatus: 200 })]));
  assert.equal(d.ok, true);
  assert.equal(d.code, 0);
  assert.deepEqual(d.hint, []);
});

test('проверка НЕ состоялась ≠ «всё зелено»: процедура идёт, но знает, что не мерили', async () => {
  const lines = [];
  const r = await runProcedurePreflight({
    procedureId: 'consilium',
    env: {},
    log: (l) => lines.push(l),
    probesImpl: () => Promise.reject(new Error('undici не установлен')),
    profilesImpl: () => [],
  });
  assert.equal(r.ok, true);
  assert.equal(r.skipped, true);
  assert.equal(r.code, 2, 'инструментальная причина не сливается с зелёным');
  assert.match(lines.join('\n'), /не состоялась/u);
});

test('обход существует и назван словом владельца', async () => {
  const r = await runProcedurePreflight({
    procedureId: 'code-review',
    env: { NETWORK_PREFLIGHT_SKIP: '1' },
    log: () => {},
    probesImpl: () => assert.fail('при обходе сеть не трогаем'),
  });
  assert.equal(r.ok, true);
  assert.equal(r.skipped, true);
});

test('проверка подключена К ОБЕИМ процедурам — консилиуму и ревью', () => {
  for (const file of ['scripts/consilium.mjs', 'scripts/code-review.mjs']) {
    const src = readFileSync(join(repoRoot, file), 'utf8');
    assert.match(src, /runProcedurePreflight/u, `${file}: проверка не подключена`);
    assert.match(src, /preflight\.ok/u, `${file}: результат проверки не читается`);
  }
});

test('в консилиуме проверка стоит ДО разрешения цепочки, а не после', () => {
  const src = readFileSync(join(repoRoot, 'scripts/consilium.mjs'), 'utf8');
  const preflightAt = src.indexOf('runProcedurePreflight({ procedureId');
  const chainAt = src.indexOf("resolveEffective('consilium')");
  assert.ok(preflightAt > 0 && chainAt > 0);
  assert.ok(preflightAt < chainAt, 'проверка после цепочки бесполезна — причина уже стёрта');
});

test('в ревью проверка стоит ДО вызова моделей', () => {
  const src = readFileSync(join(repoRoot, 'scripts/code-review.mjs'), 'utf8');
  const preflightAt = src.indexOf('runProcedurePreflight({ procedureId');
  const invokeAt = src.indexOf('invokeProcedureLlm({');
  assert.ok(preflightAt > 0 && invokeAt > 0);
  assert.ok(preflightAt < invokeAt, 'ПОРЧА: модели зовутся раньше проверки');
});
