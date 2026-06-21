/**
 * Handle-конвенции RecordingSliceRef v0.7 (StopRecording → MakeTrack).
 * @see docs/prompts/DEVICE_BOARD_RECORDING_GATE_V07_EPIC_PROMPT.md
 */

/** Префикс handle для RecordingSliceRef. */
export const RECORDING_SLICE_REF_HANDLE_PREFIX = 'recording-slice' as const;

/** Создаёт канонический handle RecordingSliceRef. */
export function formatRecordingSliceRefHandle(deviceHandle: string, seq: number): string {
  return `${RECORDING_SLICE_REF_HANDLE_PREFIX}:${deviceHandle}:${seq}`;
}

/** Разбирает handle RecordingSliceRef; null если формат не совпадает. */
export function parseRecordingSliceRefHandle(
  handle: string,
): { readonly deviceHandle: string; readonly seq: number } | null {
  const parts = handle.split(':');
  if (parts.length !== 3 || parts[0] !== RECORDING_SLICE_REF_HANDLE_PREFIX) {
    return null;
  }
  const deviceHandle = parts[1];
  const seq = Number(parts[2]);
  if (deviceHandle === undefined || deviceHandle.length === 0 || !Number.isFinite(seq)) {
    return null;
  }
  return { deviceHandle, seq: Math.trunc(seq) };
}
