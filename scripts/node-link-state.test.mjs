import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  EXIT_NOT_LIVE,
  EXIT_OK,
  EXIT_REFUSED,
  exitCodeFor,
  judgeNode,
  parseNodeEnvBinding,
  reconcileServiceBinding,
  summaryLine,
} from './node-link-state.mjs';

const NOW = Date.parse('2026-09-06T12:00:00.000Z');
const H = 3600_000;
const node = (over = {}) => ({
  id: 'ad6975f1-0000-4000-8000-000000000001',
  name: 'Узел 1',
  accessKeys: [{ id: '77004e50-0000-4000-8000-000000000002', duration: 'weeks_2', expiresAt: new Date(NOW + 72 * H).toISOString(), revokedAt: null }],
  device: { pairingStatus: 'paired', pairedKeyId: '77004e50-0000-4000-8000-000000000002', pairedKeyExpiresAt: new Date(NOW + 72 * H).toISOString(), lastSeenAt: '2026-09-05T21:40:17.695Z' },
  ...over,
});

test('#2284 живой ключ и сопряжение — ok, exit 0', () => {
  const r = judgeNode(node(), { now: NOW, link: { paired: true, live: false, lastSeenAt: '2026-09-05T21:40:17.695Z' } });
  assert.equal(r.verdict, 'ok');
  assert.equal(r.remedy, null);
  assert.equal(exitCodeFor([r.verdict]), EXIT_OK);
});

test('#2284 ПОРЧА: ключ 20.08 с истечением 03.09 — expired, лекарство названо, exit 27', () => {
  // Ровно снимок приёмки 20.08 («истекает 03.09»), поданный живому суду 06.09.
  const exp = '2026-09-03T11:06:00.000Z';
  const r = judgeNode(node({ accessKeys: [{ id: '77004e50-x', duration: 'weeks_2', expiresAt: exp, revokedAt: null }], device: { pairingStatus: 'paired', pairedKeyId: '77004e50-x', pairedKeyExpiresAt: exp } }), { now: NOW });
  assert.equal(r.verdict, 'expired');
  assert.match(r.lines.at(-1), /ИСТЁК/u);
  assert.match(r.remedy, /новый ключ/u);
  assert.equal(exitCodeFor([r.verdict]), EXIT_NOT_LIVE);
});

test('#2284 осталось меньше суток — expiring: дежурство не переживёт', () => {
  const exp = new Date(NOW + 5 * H).toISOString();
  const r = judgeNode(node({ accessKeys: [{ id: 'k', duration: 'hours_4', expiresAt: exp, revokedAt: null }], device: { pairingStatus: 'paired', pairedKeyId: 'k', pairedKeyExpiresAt: exp } }), { now: NOW });
  assert.equal(r.verdict, 'expiring');
  assert.equal(exitCodeFor([r.verdict]), EXIT_NOT_LIVE);
});

test('#2284 отозванный ключ — revoked; ключа нет — no-key', () => {
  const revoked = judgeNode(node({ accessKeys: [{ id: 'k', expiresAt: new Date(NOW + 72 * H).toISOString(), revokedAt: '2026-09-04T00:00:00.000Z' }], device: { pairingStatus: 'paired', pairedKeyId: 'k' } }), { now: NOW });
  assert.equal(revoked.verdict, 'revoked');
  const none = judgeNode({ id: 'n', name: 'Узел', accessKeys: [], device: null }, { now: NOW });
  assert.equal(none.verdict, 'no-key');
});

test('#2284 ключ жив, но связка снята — not-paired (link-state главнее снимка device)', () => {
  const r = judgeNode(node(), { now: NOW, link: { paired: false, live: false, lastSeenAt: null } });
  assert.equal(r.verdict, 'not-paired');
});

test('#2284 неизвестная форма ответа — unknown и ОТКАЗ, а не молчаливое «ok»', () => {
  const r = judgeNode({ id: 'n', name: 'Узел' }, { now: NOW });
  assert.equal(r.verdict, 'unknown');
  assert.equal(exitCodeFor(['ok', 'unknown']), EXIT_REFUSED, 'один неснятый узел отравляет ноль');
  assert.equal(exitCodeFor([]), EXIT_REFUSED, 'нет узлов — не успех');
});

// ───────── #2461: вторая привязка прибора — служба узла ─────────

/** Живые числа 25.09: новый прибор мембраны september и прежний прибор field-node-2026-08. */
const STUDIO_DEVICE = '9e86ec85-0572-4253-8a3e-998ac2f36e80';
const SERVICE_DEVICE = '2b48c488-0000-4000-8000-000000000001';
const paired = (mediaDeviceId) => ({
  pairingStatus: 'paired',
  pairedKeyId: '77004e50-0000-4000-8000-000000000002',
  pairedKeyExpiresAt: new Date(NOW + 72 * H).toISOString(),
  lastSeenAt: '2026-09-05T21:40:17.695Z',
  mediaDeviceId,
});

test('#2461 ПОРЧА 25.09: Студия на одном приборе, служба узла на другом — binding-split, оба прибора названы, exit 27', () => {
  // Ровно вечер 25.09: ключ жив, узел сопряжён, пульс идёт — и ни одной пробы на сервере.
  const r = judgeNode(node({ device: paired(STUDIO_DEVICE) }), {
    now: NOW,
    link: { paired: true, live: true, lastSeenAt: '2026-09-25T13:31:00.000Z' },
    nodeBinding: { deviceId: SERVICE_DEVICE },
  });
  assert.equal(r.verdict, 'binding-split', 'расхождение привязок — отказ, а не тишина');
  assert.equal(r.bindingSplit, true);
  assert.equal(r.bindingChecked, true);
  const said = r.lines.join('\n');
  assert.ok(said.includes(STUDIO_DEVICE), 'прибор Студии назван полностью');
  assert.ok(said.includes(SERVICE_DEVICE), 'прибор службы назван полностью');
  assert.match(said, /РАСХОЖДЕНИЕ ПРИВЯЗОК/u);
  assert.match(r.remedy, /ДВА действия/u, 'лекарство называет второе действие, а не только первое');
  assert.match(r.remedy, /firebat-service-install\.ps1/u, 'лекарство называет, ЧЕМ перевязать службу');
  assert.equal(exitCodeFor([r.verdict]), EXIT_NOT_LIVE);
  assert.equal(summaryLine(EXIT_NOT_LIVE, [{ node: 'Узел 1', bindingChecked: true }]), 'связка НЕ готова — см. лекарство');
});

test('#2461 привязки сошлись — ok, сверка состоялась, закрывающая строка обещает ровно это', () => {
  const r = judgeNode(node({ device: paired(STUDIO_DEVICE) }), {
    now: NOW,
    link: { paired: true, live: true, lastSeenAt: '2026-09-25T13:31:00.000Z' },
    nodeBinding: { deviceId: STUDIO_DEVICE },
  });
  assert.equal(r.verdict, 'ok');
  assert.equal(r.bindingChecked, true);
  assert.equal(r.bindingSplit, false);
  assert.match(r.lines.join('\n'), /привязки сошлись/u);
  assert.equal(exitCodeFor([r.verdict]), EXIT_OK);
  assert.match(summaryLine(EXIT_OK, [{ node: 'Узел 1', bindingChecked: true }]), /привязка службы сошлись/u);
});

test('#2461 предмета сверки нет — успех НЕ выдаёт себя за сверенный (проверка без предмета)', () => {
  const r = judgeNode(node({ device: paired(STUDIO_DEVICE) }), {
    now: NOW,
    link: { paired: true, live: true, lastSeenAt: null },
    nodeBinding: null,
  });
  assert.equal(r.verdict, 'ok', 'кабинетная половина жива — её вердикт не подменяем');
  assert.equal(r.bindingChecked, false, 'но сверки не было, и результат об этом говорит');
  assert.match(r.lines.join('\n'), /привязка службы узла НЕ сверена/u);
  const summary = summaryLine(EXIT_OK, [{ node: 'Узел 1', bindingChecked: false }]);
  assert.match(summary, /НЕ сверена/u, 'закрывающая строка 25.09 врала «готовы» — теперь сужает обещание');
  assert.ok(!/готовы/u.test(summary), 'слово «готовы» без сверки не произносится');
});

test('#2461 сверка судит и порчу предмета: пустой .env, .env без FIELD_NODE_DEVICE_ID, пустой mediaDeviceId', () => {
  assert.match(parseNodeEnvBinding('').error, /пуст/u);
  assert.match(parseNodeEnvBinding('VITE_MEDIA_SERVER_URL=https://media.membrana.space\n').error, /FIELD_NODE_DEVICE_ID/u);
  assert.equal(
    parseNodeEnvBinding(`# комплект узла\nVITE_MEDIA_SERVER_URL=https://media.membrana.space\nFIELD_NODE_DEVICE_ID=${SERVICE_DEVICE}\nFIELD_NODE_KEY=secret\n`).deviceId,
    SERVICE_DEVICE,
  );
  const broken = reconcileServiceBinding(paired(STUDIO_DEVICE), parseNodeEnvBinding(''));
  assert.equal(broken.checked, false);
  assert.equal(broken.split, false, 'нечитаемый предмет — не «расхождение», а несверенность');
  const blankStudio = reconcileServiceBinding(paired('   '), { deviceId: SERVICE_DEVICE });
  assert.equal(blankStudio.checked, false);
  assert.match(blankStudio.line, /сверять не с чем/u);
});

test('#2461 расхождение видно в строках даже когда вердиктом стал более срочный отказ по ключу', () => {
  const exp = '2026-09-03T11:06:00.000Z';
  const r = judgeNode(
    node({
      accessKeys: [{ id: '77004e50-x', duration: 'weeks_2', expiresAt: exp, revokedAt: null }],
      device: { ...paired(STUDIO_DEVICE), pairedKeyId: '77004e50-x', pairedKeyExpiresAt: exp },
    }),
    { now: NOW, nodeBinding: { deviceId: SERVICE_DEVICE } },
  );
  assert.equal(r.verdict, 'expired', 'истёкший ключ фундаментальнее — он и вердикт');
  assert.equal(r.bindingSplit, true, 'но расхождение не потеряно');
  assert.match(r.lines.join('\n'), /РАСХОЖДЕНИЕ ПРИВЯЗОК/u, 'и названо в выводе, а не только в поле');
});

test('#2461 отказ проверяемый: строка называет файл, из которого взята привязка службы', () => {
  const NODE_ENV_PATH = 'C:\\membrana-node\\.env';
  const r = reconcileServiceBinding(paired(STUDIO_DEVICE), { deviceId: SERVICE_DEVICE, path: NODE_ENV_PATH });
  assert.equal(r.split, true);
  assert.ok(r.line.includes(`по ${NODE_ENV_PATH}`), 'без имени файла расхождение нечем опровергнуть');
  const same = reconcileServiceBinding(paired(STUDIO_DEVICE), { deviceId: STUDIO_DEVICE, path: NODE_ENV_PATH });
  assert.ok(same.line.includes(`по ${NODE_ENV_PATH}`), 'и успех сверки называет предмет');
});
