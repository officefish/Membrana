import { describe, expect, it } from 'vitest';

import {
  NODE_BINDING_CHECK_VERB,
  NODE_SERVICE_ENV_PATH,
  describeNodeRebindSteps,
} from './nodeRebindSteps';

/** Прибор мембраны september, выданный кабинетом 25.09 при перевязке. */
const NEW_DEVICE = '9e86ec85-0572-4253-8a3e-998ac2f36e80';

describe('#2461 перевязка прибора — два действия, и второе названо', () => {
  it('действий РОВНО два, пронумерованных 1 и 2', () => {
    const steps = describeNodeRebindSteps(NEW_DEVICE);
    expect(steps.map((s) => s.n)).toEqual([1, 2]);
  });

  it('первое действие — то, что человек делает в Студии', () => {
    const [first] = describeNodeRebindSteps(NEW_DEVICE);
    expect(first.title).toMatch(/Ключ доступа/u);
    expect(first.title).toMatch(/это действие/u);
  });

  it('второе действие называет службу узла, файл её привязки, чем перевязать и чем сверить', () => {
    // Ровно то, о чём Студия 25.09 молчала: человек вставил ключ и считал, что прибор перевязан.
    const second = describeNodeRebindSteps(NEW_DEVICE)[1];
    expect(second.title).toMatch(/служб/iu);
    expect(second.title).toMatch(/отдельное действие/u);
    expect(second.detail).toContain(NODE_SERVICE_ENV_PATH);
    expect(second.detail).toMatch(/firebat-service-install\.ps1/u);
    expect(second.detail).toContain(NODE_BINDING_CHECK_VERB);
  });

  it('второе действие говорит цену молчания: записи не уходят НИКУДА, а не «не туда»', () => {
    const second = describeNodeRebindSteps(NEW_DEVICE)[1];
    expect(second.detail).toMatch(/не уходят никуда/u);
  });

  it('прибор нового аккаунта подставлен в команды, когда он уже известен', () => {
    const second = describeNodeRebindSteps(NEW_DEVICE)[1];
    expect(second.detail).toContain(`/v1/devices/${NEW_DEVICE}/node-key?rotate=true`);
    expect(second.detail).toContain(`-DeviceId ${NEW_DEVICE}`);
  });

  it('прибор ещё не известен — место под него названо, а не подставлено undefined', () => {
    for (const unknown of [undefined, null, '   ']) {
      const second = describeNodeRebindSteps(unknown)[1];
      expect(second.detail).toContain('<прибор нового аккаунта>');
      expect(second.detail).not.toMatch(/undefined|null/u);
    }
  });
});
