import { describe, expect, it } from 'vitest';

import {
  parseDeviceScenarioDocument,
  type DeviceScenarioDocument,
  type ScenarioGraphNode,
} from '@membrana/core';
import { SCENARIO_NODE_KINDS } from '@membrana/core';

import { FREE_TIER_USER_CASE_ENTRIES } from './free-tier-user-case-entries.js';

/**
 * Интеграционный smoke коворка `cowork-free-fragment-usercases` (#487),
 * INTERFACE_CONTRACT §«Интеграционный smoke». Проверяет ШВЫ сборки лайнапа —
 * то, что собственные DoD блоков доказать не могли (им недоступен общий файл
 * `free-tier-user-case-entries.ts`).
 */

const FREE_IDS = [
  'usercase-free-spectrum-live',
  'usercase-free-sample-library',
  'usercase-free-neuro-detection',
  'usercase-free-combined-alarm',
] as const;

const NODE_KINDS = new Set<string>(SCENARIO_NODE_KINDS);

function allNodes(document: DeviceScenarioDocument): ScenarioGraphNode[] {
  const loops = document.scenario.loops;
  const fromLoops = Object.values(loops).flatMap((loop) => loop?.nodes ?? []);
  const fromFunctions = (document.scenario.functions ?? []).flatMap((fn) => fn.nodes ?? []);
  return [...fromLoops, ...fromFunctions];
}

describe('FREE-лайнап 3+1 — интеграционный smoke', () => {
  it('лайнап содержит ровно 4 FREE-записи с ожидаемыми id', () => {
    expect(FREE_TIER_USER_CASE_ENTRIES.map((e) => e.id).sort()).toEqual([...FREE_IDS].sort());
  });

  it('ни одна loadDocument не возвращает пустой каркас (стаб не дожил до прода)', () => {
    for (const entry of FREE_TIER_USER_CASE_ENTRIES) {
      const document = entry.loadDocument();
      const nodeCount = allNodes(document).length;
      expect(nodeCount, `${entry.id}: пустой документ = стаб дожил до прода`).toBeGreaterThan(0);
    }
  });

  it('каждый документ проходит parseDeviceScenarioDocument', () => {
    for (const entry of FREE_TIER_USER_CASE_ENTRIES) {
      const parsed = parseDeviceScenarioDocument(entry.loadDocument());
      expect(parsed.ok, `${entry.id}: parse failed`).toBe(true);
    }
  });

  it('все nodeKind всех документов ∈ SCENARIO_NODE_KINDS (гард «без новых узлов»)', () => {
    for (const entry of FREE_TIER_USER_CASE_ENTRIES) {
      for (const node of allNodes(entry.loadDocument())) {
        expect(
          node.nodeKind === undefined || NODE_KINDS.has(node.nodeKind),
          `${entry.id}: неизвестный nodeKind «${node.nodeKind}» (узел ${node.id})`,
        ).toBe(true);
      }
    }
  });

  it('три новых UC НЕ competition-locked (гард против регресса штампа, §5)', () => {
    const newUcIds = FREE_IDS.filter((id) => id !== 'usercase-free-combined-alarm');
    for (const id of newUcIds) {
      const entry = FREE_TIER_USER_CASE_ENTRIES.find((e) => e.id === id);
      expect(entry, `${id} отсутствует в лайнапе`).toBeDefined();
      const document = entry!.loadDocument();
      expect(
        document.meta?.executionPolicy,
        `${id}: competition-lock на FREE-сценарии блокирует правку структуры у бесплатного пользователя`,
      ).not.toBe('competition');
    }
  });
});
