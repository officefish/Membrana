import { useCallback, useEffect, useState } from 'react';
import {
  SAMPLE_LABEL_OPTIONS,
  sampleLabelBadgeClass,
  type SampleLabel,
  type UpdateSampleLabelNotes,
} from '@membrana/media-library-service';

export interface SampleLabelNotesEditorProps {
  readonly sampleId: string;
  readonly label: SampleLabel;
  readonly notes?: string;
  readonly editable: boolean;
  readonly saving?: boolean;
  readonly error?: string | null;
  readonly onSave: (sampleId: string, patch: UpdateSampleLabelNotes) => void | Promise<void>;
  readonly compact?: boolean;
  readonly showNotes?: boolean;
}

export function SampleLabelNotesEditor({
  sampleId,
  label,
  notes = '',
  editable,
  saving = false,
  error,
  onSave,
  compact = false,
  showNotes = false,
}: SampleLabelNotesEditorProps) {
  const [draftNotes, setDraftNotes] = useState(notes);

  useEffect(() => {
    setDraftNotes(notes);
  }, [notes, sampleId]);

  const handleLabelChange = useCallback(
    (next: SampleLabel) => {
      if (!editable || next === label || saving) return;
      void onSave(sampleId, { label: next });
    },
    [editable, label, onSave, sampleId, saving],
  );

  const handleNotesSave = useCallback(() => {
    if (!editable || saving) return;
    const trimmed = draftNotes.trim();
    const normalized = trimmed.length > 0 ? trimmed : null;
    const current = notes?.trim() ? notes.trim() : null;
    if (normalized === current) return;
    void onSave(sampleId, { notes: normalized });
  }, [draftNotes, editable, notes, onSave, sampleId, saving]);

  if (!editable) {
    return (
      <div className="flex flex-col gap-1">
        <span className={sampleLabelBadgeClass(label)}>{label}</span>
        {showNotes && notes ? (
          <p className="text-xs text-base-content/60">{notes}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className="flex flex-col gap-2"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <select
        className="select select-bordered select-xs w-full max-w-[9rem]"
        value={label}
        disabled={saving}
        aria-label="Метка ground truth"
        onChange={(e) => handleLabelChange(e.target.value as SampleLabel)}
      >
        {SAMPLE_LABEL_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.title}
          </option>
        ))}
      </select>

      {!compact && showNotes ? (
        <div className="flex flex-col gap-1">
          <textarea
            className="textarea textarea-bordered textarea-xs min-h-[3rem] w-full max-w-md"
            placeholder="Заметки (опционально)"
            value={draftNotes}
            disabled={saving}
            aria-label="Заметки к сэмплу"
            onChange={(e) => setDraftNotes(e.target.value)}
            onBlur={() => handleNotesSave()}
          />
          <button
            type="button"
            className="btn btn-xs btn-outline w-fit"
            disabled={saving}
            onClick={() => handleNotesSave()}
          >
            {saving ? <span className="loading loading-spinner loading-xs" aria-hidden /> : null}
            Сохранить заметки
          </button>
        </div>
      ) : null}

      {error ? (
        <p className="text-xs text-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
