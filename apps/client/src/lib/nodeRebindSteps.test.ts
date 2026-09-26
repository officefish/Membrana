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

  it('второе действие говорит РОВНО своё следствие: задания и пульс уходят на прибор прежнего аккаунта', () => {
    const second = describeNodeRebindSteps(NEW_DEVICE)[1];
    expect(second.detail).toMatch(/задания и пульс/u);
    expect(second.detail).toMatch(/прежнего аккаунта/u);
  });

  it('и НЕ приписывает расхождению чужих последствий — доска пишет своим трактом Студии', () => {
    // Поправка ведущей 26.09. Первая редакция говорила «записи не уходят никуда» — лишний вывод:
    // пробы со сценария отправляет САМА Студия (server-storage-backend → POST
    // /v1/devices/<id>/collections/<id>/samples), и после перевязки она отправляет их от имени
    // нового прибора. Отсутствие проб 25.09 расхождением не объясняется, и текст не вправе
    // делать вид, что объясняется.
    const second = describeNodeRebindSteps(NEW_DEVICE)[1];
    expect(second.detail).not.toMatch(/не уходят никуда|не поедут никуда|ни одной пробы/u);
    expect(second.detail).toMatch(/Записи со сценария доски это не затрагивает/u);
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
