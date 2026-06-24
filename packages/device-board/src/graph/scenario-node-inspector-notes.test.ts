import { describe, expect, it } from 'vitest';

import {
  getScenarioNodeInspectorNotes,
  hasScenarioNodeInspectorNotes,
} from './scenario-node-inspector-notes.js';

describe('scenario-node-inspector-notes', () => {
  it('exposes start-recording anti-pattern note', () => {
    expect(hasScenarioNodeInspectorNotes('start-recording')).toBe(true);
    const notes = getScenarioNodeInspectorNotes('start-recording');
    expect(notes).toHaveLength(1);
    expect(notes[0]?.variant).toBe('warning');
    expect(notes[0]?.sections[0]?.heading).toContain('Защита');
    expect(notes[0]?.sections[0]?.paragraphs.join(' ')).toContain('start-recording-idempotent');
  });

  it('returns empty for node kinds without notes', () => {
    expect(hasScenarioNodeInspectorNotes('print')).toBe(false);
    expect(getScenarioNodeInspectorNotes('print')).toEqual([]);
    expect(getScenarioNodeInspectorNotes(undefined)).toEqual([]);
  });
});
