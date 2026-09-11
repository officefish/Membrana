/**
 * Зуб зонда достижимости панели (блок panel-probe, 10.09).
 *
 * Предмет: причина отказа панели не стирается, и при её молчании цепочка НЕ ИДЁТ.
 * Красный вход дня — «вернуть неизвестно при мёртвой панели»: ровно так сегодня
 * родились четыре «неизвестно» и вывод «цепочка исчерпана» при живых провайдерах.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import { PANEL_PULL, pullOfficeOverlay } from './llm-procedure-office.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const TOKEN_ENV = { OFFICE_API_TOKEN: 'test-token' };

/** Панель молчит транспортом: fetch бросает, как это делал office 10.09. */
const deadPanel = (code = 'ECONNRESET') => () => {
  const e = new TypeError('fetch failed');
  e.cause = { code };
  return Promise.reject(e);
};

const livePanel = (body, status = 200) => () =>
  Promise.resolve({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) });

test('ВЕЩДОК 10.09: панель молчит ⇒ panel_unreachable, причина названа, звеньев нет', async () => {
  const r = await pullOfficeOverlay({ env: TOKEN_ENV, fetchImpl: deadPanel() });
  assert.equal(r.status, PANEL_PULL.UNREACHABLE);
  assert.equal(r.transportCause, 'tcp_fail', 'транспортная причина обязана доехать');
  assert.equal(r.procedures, null);
  assert.match(r.why, /звенья не пробовались/u, 'ПОРЧА ДНЯ: причина стёрта до «ничего»');
});

test('четыре вида молчания панели названы поимённо, а не одним «неизвестно»', async () => {
  for (const [code, cause] of [
    ['ENOTFOUND', 'dns_fail'],
    ['ECONNREFUSED', 'tcp_fail'],
    ['EPROTO', 'tls_fail'],
    ['UND_ERR_CONNECT_TIMEOUT', 'timeout_idle'],
  ]) {
    const r = await pullOfficeOverlay({ env: TOKEN_ENV, fetchImpl: deadPanel(code) });
    assert.equal(r.status, PANEL_PULL.UNREACHABLE, code);
    assert.equal(r.transportCause, cause, `${code} обязан назваться ${cause}`);
  }
});

test('токена нет ⇒ панель НЕ спрашивали: это не отказ панели', async () => {
  // Пустой `env` окружения без токена НЕ моделирует: резолвер намеренно ищет
  // OFFICE_API_TOKEN по .env всех worktree этого репо (трение 17.07). Отсутствие
  // токена подаётся значением — так проверяется именно ветка, а не резолвер.
  const r = await pullOfficeOverlay({ env: {}, token: '', fetchImpl: deadPanel() });
  assert.equal(r.status, PANEL_PULL.NO_TOKEN);
  assert.equal(r.transportCause, null);
  assert.equal(r.procedures, null, 'без токена откат на умолчания остаётся прежним');
});

test('панель ОТВЕТИЛА не-ok ⇒ жива: прежний откат на умолчания остаётся', async () => {
  for (const status of [401, 403, 500]) {
    const r = await pullOfficeOverlay({ env: TOKEN_ENV, fetchImpl: livePanel({}, status) });
    assert.equal(r.status, PANEL_PULL.EMPTY, `${status} — это живой отказ панели, не молчание`);
    assert.notEqual(r.status, PANEL_PULL.UNREACHABLE);
  }
});

test('панель отдала набор звеньев ⇒ он и едет дальше', async () => {
  const procedures = { consilium: { chain: [{ provider: 'anthropic', model: 'claude' }] } };
  const r = await pullOfficeOverlay({ env: TOKEN_ENV, fetchImpl: livePanel({ procedures }) });
  assert.equal(r.status, PANEL_PULL.OK);
  assert.deepEqual(r.procedures, procedures);
});

test('ЦЕПОЧКА НЕ ИДЁТ при мёртвой панели: отказ ДО первой попытки к моделям', async () => {
  const { invokeProcedureLlm, PanelUnreachableError } = await import('./llm-procedure-ritual.mjs');
  let attempts = 0;
  await assert.rejects(
    () =>
      invokeProcedureLlm({
        procedureId: 'consilium',
        prompt: 'x',
        env: { ...TOKEN_ENV, LLM_NO_OVERLAY: '0' },
        fetchImpl: deadPanel(),
        postFn: () => {
          attempts += 1;
          return Promise.resolve({ ok: false, status: 0, text: '' });
        },
      }),
    (e) => {
      assert.ok(e instanceof PanelUnreachableError);
      assert.equal(e.outcome, 'panel_unreachable');
      assert.equal(e.linksAttempted, false);
      return true;
    },
  );
  assert.equal(attempts, 0, 'ПОРЧА ДНЯ: четыре попытки к моделям поверх стёртой причины');
});

test('текст отказа несёт встречную пробу командой и разовый выход владельца', async () => {
  const { PanelUnreachableError } = await import('./llm-procedure-ritual.mjs');
  const text = new PanelUnreachableError('consilium', {
    why: 'панель не ответила (tcp_fail) — звенья не пробовались',
    transportCause: 'tcp_fail',
    baseUrl: 'https://office.mmbrn.tech',
  }).message;
  assert.match(text, /_ssh-media-exec\.mjs/u, 'встречная проба обязана быть командой');
  assert.match(text, /panel_unreachable/u);
  assert.match(text, /LLM_NO_OVERLAY=1/u, 'выход без панели — слово владельца, и он назван');
});

test('панель вошла в набор зондов: предполётная проверка больше не зелёная мимо неё', () => {
  const profiles = JSON.parse(readFileSync(join(repoRoot, 'docs/network/probes/default.json'), 'utf8'));
  const office = profiles.profiles.find((p) => p.id === 'office-panel');
  assert.ok(office, 'ПОРЧА: своей панели нет среди зондов — проверка зелена при мёртвой панели');
  assert.match(office.url, /office\.mmbrn\.tech/u);
});
