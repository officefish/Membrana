/**
 * Зуб инфра-полиси (#1393 ч.1–2): схема, сверка по имени в обе стороны,
 * known-blocked ≠ ok, «не отдаёт» ≠ 0.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { expiringSummary, linkStatus, policyProblems, reconcileEnv } from './infra-policy.mjs';
import { OUTCOME_IDS } from '../network/lib/classify.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const LIVE = JSON.parse(readFileSync(join(repoRoot, 'docs/security/infra-policy.json'), 'utf8'));

test('живая декларация валидна по схеме: 10 звеньев карты #1393 + 3 немых носителя первого прогона', () => {
  assert.deepEqual(policyProblems(LIVE), []);
  assert.equal(LIVE.links.length, 13);
  assert.ok(LIVE.links.some((l) => l.id === 'anthropic' && l.renewsAt === '2026-08-01'));
  assert.ok(LIVE.links.some((l) => l.id === 'xai' && l.envKeys.includes('X_AI_API_KEY')), 'реальное имя ключа xAI — находка прогона');
  for (const id of ['linear', 'openai-rag', 'media-vps']) {
    assert.ok(LIVE.links.some((l) => l.id === id), `немой носитель «${id}» принят в реестр`);
  }
});

test('схема кричит по имени: billing вне перечня, replenish без сигнала, knownBlocked без срока', () => {
  const p = policyProblems({
    links: [
      { id: 'x', envKeys: [], billing: 'по-настроению', replenish: { who: 'кто-то' }, scale: 's', probe: { method: 'none' }, fallback: 'f' },
      { id: 'y', envKeys: [], billing: 'credits', replenish: { who: 'w', signal: 's' }, scale: 's', probe: { method: 'm' }, fallback: 'f', knownBlocked: { reason: 'только причина' } },
    ],
  });
  assert.ok(p.some((x) => x.startsWith('x: billing')));
  assert.ok(p.some((x) => x.includes('x: replenish')));
  assert.ok(p.some((x) => x.includes('y: knownBlocked')));
});

test('сверка: «в полиси есть — ключа нет» И «ключ без записи» — оба красные, по имени', () => {
  const policy = { links: [{ id: 'openrouter', envKeys: ['OPENROUTER_API_KEY'] }] };
  const f1 = reconcileEnv(policy, []);
  assert.ok(f1.some((x) => x.includes('«openrouter»') && x.includes('ключа нет')));
  const f2 = reconcileEnv(policy, ['OPENROUTER_API_KEY', 'MYSTERY_API_KEY']);
  assert.equal(f2.length, 1);
  assert.ok(f2[0].includes('«MYSTERY_API_KEY»') && f2[0].includes('без записи в полиси'));
});

test('known-blocked ≠ ok: отдельный статус с причиной и сроком, красный погашен', () => {
  const link = { id: 'voyage', knownBlocked: { reason: 'сетевой фильтр отдаёт HTML', until: '#1393 часть 3' } };
  const s = linkStatus(link, 'proxy_intercept');
  assert.equal(s.status, 'known-blocked');
  assert.notEqual(s.status, 'ok');
  assert.match(s.note, /часть 3/u);
  assert.equal(linkStatus({ id: 'x' }, 'ok').status, 'ok');
  assert.equal(linkStatus({ id: 'x' }, 'dns_fail').status, 'red');
});

test('#1804: таблица представления ПОЛНА по закрытому перечню исходов', () => {
  // linkStatus не судит причину — он окрашивает вердикт классификатора. Полнота значит:
  // каждый исход #1449 получает определённый цвет, и ни один не проваливается в «не знаю».
  // Раньше JSDoc перечислял свои слова и читался как третий словарь репозитория.
  for (const id of OUTCOME_IDS) {
    const got = linkStatus({ id: 'x' }, id).status;
    assert.equal(got, id === 'ok' ? 'ok' : 'red', `исход ${id} окрашен как «${got}»`);
  }
  assert.equal(linkStatus({ id: 'x' }, 'skipped').status, 'skipped');
  assert.equal(linkStatus({ id: 'x' }, null).status, 'skipped');
});

test('сводка: датное событие близко → finding; «не отдаёт» — словом, не нулём', () => {
  const policy = {
    links: [
      { id: 'anthropic', billing: 'monthly-limit', renewsAt: '2026-08-01', balanceApi: 'not-provided (консолью)' },
      { id: 'xai', billing: 'credits', balanceApi: 'not-provided (проверено 28.07)' },
    ],
  };
  const { lines, finding } = expiringSummary(policy, null, { today: '2026-07-30' });
  assert.equal(finding, true);
  assert.ok(lines.some((l) => l.includes('anthropic') && l.includes('через 2 дн.')));
  assert.ok(lines.some((l) => l.includes('xai') && l.includes('API не отдаёт')));
  assert.ok(!lines.some((l) => /xai.*: 0/u.test(l)), 'нолём не притворяемся');
});

test('сводка known-blocked всегда finding (не зелёнка), баланс из снимка показывается', () => {
  const policy = { links: [{ id: 'voyage', billing: 'credits', knownBlocked: { reason: 'HTML-заглушка', until: 'часть 3' } }, { id: 'openrouter', billing: 'credits', balanceApi: 'https://…' }] };
  const { lines, finding } = expiringSummary(policy, { balances: { openrouter: '12.50 кр. (из 20)' } }, { today: '2026-07-28' });
  assert.equal(finding, true);
  assert.ok(lines.some((l) => l.includes('voyage: known-blocked')));
  assert.ok(lines.some((l) => l.includes('openrouter: остаток 12.50')));
});
