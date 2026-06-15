import { useEffect, useState } from 'react';
import {
  SAMPLE_LABEL_OPTIONS,
  sampleLabelBadgeClass,
  sampleLabelFromStorage,
  sampleLabelTitle,
  type SampleLabel,
  type UpdateSampleLabelNotes,
} from '@membrana/media-library-service';

export interface SampleLabelEditorProps {
  readonly sampleId: string;
  readonly label: string;
  readonly editable: boolean;
  readonly saving?: boolean;
  readonly error?: string | null;
  readonly onSave: (sampleId: string, patch: UpdateSampleLabelNotes) => void | Promise<void>;
}

export function SampleLabelEditor({
  sampleId,
  label,
  editable,
  saving = false,
  error,
  onSave,
}: SampleLabelEditorProps) {
  const saved = sampleLabelFromStorage(label);
  const [draft, setDraft] = useState<SampleLabel>(saved);

  useEffect(() => {
    setDraft(sampleLabelFromStorage(label));
  }, [label, sampleId]);

  const dirty = draft !== saved;

  if (!editable) {
    return (
      <span className={sampleLabelBadgeClass(label)}>{sampleLabelTitle(label)}</span>
    );
  }

  return (
    <div
      className="flex flex-col gap-1"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <select
        className="select select-bordered select-xs w-full max-w-[9rem]"
        value={draft}
        disabled={saving}
        aria-label="Метка ground truth"
        onChange={(e) => setDraft(e.target.value as SampleLabel)}
      >
        {SAMPLE_LABEL_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.title}
          </option>
        ))}
      </select>
      <button
        type="button"
        className="btn btn-xs btn-primary w-fit"
        disabled={!dirty || saving}
        onClick={() => void onSave(sampleId, { label: draft })}
      >
        {saving ? <span className="loading loading-spinner loading-xs" aria-hidden /> : null}
        Сохранить
      </button>
      {error ? (
        <p className="text-xs text-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export interface SampleNotesEditorProps {
  readonly sampleId: string;
  readonly notes?: string;
  readonly editable: boolean;
  readonly saving?: boolean;
  readonly error?: string | null;
  readonly onSave: (sampleId: string, patch: UpdateSampleLabelNotes) => void | Promise<void>;
}

export function SampleNotesEditor({
  sampleId,
  notes = '',
  editable,
  saving = false,
  error,
  onSave,
}: SampleNotesEditorProps) {
  const saved = notes.trim();
  const [draft, setDraft] = useState(notes);

  useEffect(() => {
    setDraft(notes ?? '');
  }, [notes, sampleId]);

  const dirty = draft.trim() !== saved;

  if (!editable) {
    return notes ? <p className="text-xs text-base-content/60">{notes}</p> : null;
  }

  return (
    <div
      className="flex w-full flex-col gap-1"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <label className="text-xs text-base-content/50">Заметки</label>
      <textarea
        className="textarea textarea-bordered textarea-xs min-h-[3rem] w-full"
        placeholder="Опционально: почему такая метка"
        value={draft}
        disabled={saving}
        aria-label="Заметки к сэмплу"
        onChange={(e) => setDraft(e.target.value)}
      />
      <button
        type="button"
        className="btn btn-xs btn-outline w-fit"
        disabled={!dirty || saving}
        onClick={() => void onSave(sampleId, { notes: draft.trim() ? draft.trim() : null })}
      >
        {saving ? <span className="loading loading-spinner loading-xs" aria-hidden /> : null}
        Сохранить заметки
      </button>
      {error ? (
        <p className="text-xs text-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
