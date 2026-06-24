import { describe, expect, it } from 'vitest';
import { createEmptyDeviceScenarioDocument } from '@membrana/core';

import { validateBlockLinks } from './validate-block-links.js';
import { validateUserCaseDocument } from './validate-user-case-document.js';
import { validateUserCaseStructure } from './validate-user-case-structure.js';

describe('validateBlockLinks', () => {
  it('flags missing edge endpoints', () => {
    const issues = validateBlockLinks(
      {
        entry: 'a',
        nodes: [{ id: 'a', blockKind: 'custom', position: { x: 0, y: 0 } }],
        edges: [
          {
            kind: 'exec',
            source: 'a',
            sourceHandle: 'exec-out',
            target: 'missing',
            targetHandle: 'exec-in',
          },
        ],
      },
      'scenario.loops.main',
    );
    expect(issues.some((issue) => issue.code === 'block-missing-target')).toBe(true);
    expect(issues[0]?.blockId).toBe('missing');
  });
});

describe('validateUserCaseStructure', () => {
  it('flags unknown variable reference', () => {
    const document = createEmptyDeviceScenarioDocument('microphone');
    const withNode = {
      ...document,
      scenario: {
        ...document.scenario,
        loops: {
          ...document.scenario.loops,
          main: {
            entry: 'main-entry',
            nodes: [
              {
                id: 'getter',
                blockKind: 'custom',
                position: { x: 0, y: 0 },
                nodeKind: 'variable-get' as const,
                variableId: 'missing-var',
              },
            ],
            edges: [],
          },
        },
      },
    };
    const issues = validateUserCaseStructure(withNode);
    expect(issues.some((issue) => issue.code === 'variable-missing')).toBe(true);
  });
});

describe('validateUserCaseDocument', () => {
  it('returns isValid true for empty MVP document', () => {
    const result = validateUserCaseDocument(createEmptyDeviceScenarioDocument('microphone'));
    expect(result.isValid).toBe(true);
  });
});
