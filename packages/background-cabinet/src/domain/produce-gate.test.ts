/**
 * Зубы гейта производства (S5 плана интеграции; заседание `tariff-grid`).
 *
 * Сторожат вердикт M5: гейт стоит на создании и расширении, НИКОГДА на
 * существовании; при потере права созданное живёт; причина отказа различает
 * «нет права» и «нужна сеть». Проверка по ЖИВОЙ матрице.
 */
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  assertNoExistenceCheck,
  decideProduce,
  PRODUCE_ENTITLEMENT_ID,
  scopeAllows,
  UNGATED_ACTIONS,
  type ProduceAction,
} from './produce-gate';
import type { TariffGridDocument } from './tariff-grid';
import { MINIMAL_NETWORK_READY } from './tariff-resolve';

const LIVE: TariffGridDocument = JSON.parse(
  readFileSync(new URL('../../../../docs/tariffs/tariff-grid.json', import.meta.url), 'utf8'),
);

describe('кого гейт сторожит', () => {
  it('создание своего на «Блокпосте» разрешено', () => {
    const d = decideProduce(LIVE, 'checkpoint-v1', { action: 'create', scope: 'own_detection' });
    expect(d.allowed).toBe(true);
    expect(d.gated).toBe(true);
  });

  it('«Датчику» создавать своё нельзя — причина названа', () => {
    const d = decideProduce(LIVE, 'free-v1', { action: 'create', scope: 'own_detection' });
    expect(d.allowed).toBe(false);
    expect(d.reason).toBe('not_entitled');
    expect(d.toothId).toBe('produce_on_create');
  });

  it('расширяющее изменение сторожится наравне с созданием', () => {
    const d = decideProduce(LIVE, 'free-v1', { action: 'expanding_mutate', scope: 'dataset_index' });
    expect(d.allowed).toBe(false);
    expect(d.gated).toBe(true);
  });

  it('создание без указания вида отвергается — «что-нибудь» не производят', () => {
    const d = decideProduce(LIVE, 'checkpoint-v1', { action: 'create' });
    expect(d.reason).toBe('missing_scope');
  });
});

describe('кого гейт НЕ сторожит — созданное живёт', () => {
  const ungated: ProduceAction[] = ['read', 'delete', 'execute', 'rename'];

  it.each(ungated)('«%s» разрешено даже на тарифе без права производить', (action) => {
    const d = decideProduce(LIVE, 'free-v1', { action });
    expect(d.allowed).toBe(true);
    expect(d.gated).toBe(false);
  });

  it('запуск уже собранного сценария не зависит от нынешнего тарифа', () => {
    expect(decideProduce(LIVE, 'free-v1', { action: 'execute' }).allowed).toBe(true);
  });

  it('удаление своего доступно владельцу всегда — иначе данные в заложниках', () => {
    expect(decideProduce(LIVE, 'free-v1', { action: 'delete' }).allowed).toBe(true);
  });

  it('список несторожимых действий закрыт и осознан', () => {
    expect([...UNGATED_ACTIONS].sort()).toEqual(['delete', 'execute', 'read', 'rename']);
  });
});

describe('проверка существования запрещена', () => {
  it('попытка спросить «имеет ли право существовать» падает громко', () => {
    expect(() => assertNoExistenceCheck('sample-library.list')).toThrow(/existence_check_forbidden/);
    expect(() => assertNoExistenceCheck('x')).toThrow(/вердикт M5/);
  });
});

describe('вид производимого', () => {
  it('пустой scope означает все известные виды, а не ни одного', () => {
    expect(scopeAllows(undefined, 'own_detection')).toBe(true);
    expect(scopeAllows([], 'dataset_index')).toBe(true);
  });

  it('выданный список ограничивает точно', () => {
    expect(scopeAllows(['dataset_index'], 'dataset_index')).toBe(true);
    expect(scopeAllows(['dataset_index'], 'scenario_on_own')).toBe(false);
  });

  it('вид вне выданного отвергается с причиной scope_not_allowed', () => {
    const narrow = structuredClone(LIVE);
    const cells = narrow.rows[1].cells as Record<string, unknown>;
    cells[PRODUCE_ENTITLEMENT_ID] = { kind: 'produce', enabled: true, scope: ['dataset_index'] };
    const d = decideProduce(narrow, 'checkpoint-v1', { action: 'create', scope: 'scenario_on_own' });
    expect(d.reason).toBe('scope_not_allowed');
  });
});

describe('право есть, условие не выполнено', () => {
  it('производить нельзя, но причина другая — не «купите тариф», а «нужна сеть»', () => {
    const gatedProduce = structuredClone(LIVE);
    const cells = gatedProduce.rows[1].cells as Record<string, unknown>;
    // Ставим производство за условие сети, чтобы проверить различение причин.
    gatedProduce.registry = gatedProduce.registry.map((d) =>
      d.id === PRODUCE_ENTITLEMENT_ID ? { ...d, kind: 'gated' as const } : d,
    );
    cells[PRODUCE_ENTITLEMENT_ID] = {
      kind: 'gated',
      enabled: true,
      preconditionId: MINIMAL_NETWORK_READY,
    };
    const d = decideProduce(gatedProduce, 'checkpoint-v1', { action: 'create', scope: 'own_detection' });
    expect(d.allowed).toBe(false);
    expect(d.reason).toBe('precondition_unmet');
  });

  it('несторожимые действия условием не блокируются', () => {
    expect(decideProduce(LIVE, 'checkpoint-v1', { action: 'read' }).allowed).toBe(true);
  });
});
