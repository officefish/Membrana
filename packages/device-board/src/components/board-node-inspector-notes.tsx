import React from 'react';
import type { ScenarioNodeKind } from '@membrana/core';

import { getScenarioNodeInspectorNotes } from '../graph/scenario-node-inspector-notes.js';

export interface BoardNodeInspectorNotesProps {
  readonly nodeKind: ScenarioNodeKind | undefined;
}

/** Операторские заметки из `scenario-node-inspector-notes` (правый инспектор). */
export function BoardNodeInspectorNotes({ nodeKind }: BoardNodeInspectorNotesProps): React.JSX.Element | null {
  const notes = getScenarioNodeInspectorNotes(nodeKind);
  if (notes.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      {notes.map((note, noteIndex) => (
        <div
          key={`${nodeKind ?? 'node'}-note-${noteIndex}`}
          className={`alert text-xs leading-relaxed ${
            note.variant === 'warning' ? 'alert-warning' : 'alert-info'
          }`}
          role="note"
        >
          <div className="flex flex-col gap-1.5">
            {note.sections.map((section, sectionIndex) => (
              <div key={sectionIndex} className="flex flex-col gap-1">
                {section.heading !== undefined ? (
                  <span className="font-semibold">{section.heading}</span>
                ) : null}
                {section.paragraphs.map((paragraph, paragraphIndex) => (
                  <p key={paragraphIndex} className="m-0 text-base-content/80">
                    {paragraph}
                  </p>
                ))}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
