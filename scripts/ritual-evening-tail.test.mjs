/**
 * Зубы хвоста вечера: два ненулевых исхода третьего звена различимы.
 *
 * Заведены по вопросу P1 ревью PR #1801 (карточка feedback-claims-code-probe): «виден ли
 * exit 2 инструмента в хвосте как честный красный, или молча проглатывается». Ответ обязан
 * держаться зубом, а не чтением исходника: молчаливый зелёный на неработающем приборе —
 * ровно тот класс, против которого звено и заведено.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';

import { abortsOn } from './ritual-evening-tail.mjs';

test('находка хвост не роняет, отказ инструмента — роняет', () => {
  assert.equal(abortsOn(0), false, 'exit 0 (в т.ч. найденный hard) — хвост идёт дальше');
  assert.equal(abortsOn(2), true, 'exit 2 — отказ инструмента, честный красный');
  assert.equal(abortsOn(1), true);
  assert.equal(abortsOn(null), true, 'процесс не запустился — тоже красный, а не «ок»');
  assert.equal(abortsOn(undefined), true);
});

test('probe на найденном hard-нарушении возвращает 0 — протокол вечера не отменяется', () => {
  const res = spawnSync(
    process.execPath,
    ['scripts/feedback-claims-probe.mjs', '--protocol', 'docs/seanses/team-evening-feedback-2026-08-07.md'],
    { cwd: process.cwd(), encoding: 'utf8' },
  );
  assert.equal(res.status, 0);
  assert.match(res.stdout, /НЕ ПОДТВЕРЖДЕНО/u, 'находка есть, но цепочку она не роняет');
  assert.equal(abortsOn(res.status), false);
});

test('probe на несуществующем протоколе возвращает 2 — и хвост обязан упасть', () => {
  const res = spawnSync(
    process.execPath,
    ['scripts/feedback-claims-probe.mjs', '--protocol', 'docs/seanses/нет-такого-протокола.md'],
    { cwd: process.cwd(), encoding: 'utf8' },
  );
  assert.equal(res.status, 2);
  assert.equal(abortsOn(res.status), true);
});

test('--strict делает находку красной для ручного прогона и CI', () => {
  const res = spawnSync(
    process.execPath,
    [
      'scripts/feedback-claims-probe.mjs',
      '--protocol',
      'docs/seanses/team-evening-feedback-2026-08-07.md',
      '--strict',
    ],
    { cwd: process.cwd(), encoding: 'utf8' },
  );
  assert.equal(res.status, 1);
});
