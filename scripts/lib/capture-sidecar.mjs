import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join, parse } from 'node:path';

export const SIDECAR_SCHEMA = 'capture-sidecar/1';
export const DECLARED_FIELDS = Object.freeze([
  'what', 'apparatus', 'distanceM', 'heightM', 'place', 'weather', 'wind', 'operator', 'gain',
]);
export const MEASURED_FIELDS = Object.freeze([
  'instrument', 'capturedAt', 'durationSec', 'sampleRate', 'channels', 'audioFormat',
  'sizeBytes', 'peakDbfs', 'rmsDbfs', 'sha256',
]);

const optionalDeclared = new Set(['notes']);
const finding = (code, path, message) => ({ code, path, message });
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const isText = (value) => typeof value === 'string' && value.trim() !== '';
const finiteOrNull = (value) => value === null || Number.isFinite(value);
const isoWithOffset = (value) => typeof value === 'string'
  && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/u.test(value)
  && Number.isFinite(Date.parse(value));

export function sidecarNameFor(recordingFileName) {
  return `${parse(recordingFileName).name}.sidecar.json`;
}

export function sidecarPathFor(recordingPath) {
  return join(dirname(recordingPath), sidecarNameFor(basename(recordingPath)));
}

export function measureWav(buf) {
  let off = 12;
  let dataOff = null;
  let dataLen = 0;
  let channels = 1;
  let sampleRate = 0;
  while (off < buf.length - 8) {
    const id = buf.toString('ascii', off, off + 4);
    const size = buf.readUInt32LE(off + 4);
    if (id === 'fmt ') {
      channels = buf.readUInt16LE(off + 10);
      sampleRate = buf.readUInt32LE(off + 12);
    }
    if (id === 'data') { dataOff = off + 8; dataLen = size; break; }
    off += 8 + size + (size % 2);
  }
  if (dataOff === null) throw new Error('WAV без блока data');
  if (channels <= 0) throw new Error('WAV: число каналов должно быть положительным');
  const frames = Math.floor(dataLen / (2 * channels));
  let peak = 0;
  let sum = 0;
  for (let i = 0; i < frames; i += 1) {
    const v = buf.readInt16LE(dataOff + i * channels * 2);
    const a = Math.abs(v);
    if (a > peak) peak = a;
    sum += v * v;
  }
  const dbfs = (x) => (x > 0 ? 20 * Math.log10(x / 32768) : -Infinity);
  return {
    sampleRate,
    channels,
    seconds: frames / (sampleRate || 1),
    peakDbfs: dbfs(peak),
    rmsDbfs: dbfs(Math.sqrt(sum / Math.max(frames, 1))),
  };
}

export function createCaptureSidecar({ recordingPath, recordingId = null, declared, capturedAt }) {
  const buf = readFileSync(recordingPath);
  const level = measureWav(buf);
  return {
    schema: SIDECAR_SCHEMA,
    recording: { id: recordingId, fileName: basename(recordingPath) },
    declared: { ...declared },
    measured: {
      instrument: 'field-capture',
      capturedAt,
      durationSec: level.seconds,
      sampleRate: level.sampleRate,
      channels: level.channels,
      audioFormat: extname(recordingPath).slice(1).toLowerCase(),
      sizeBytes: buf.length,
      peakDbfs: Number.isFinite(level.peakDbfs) ? level.peakDbfs : null,
      rmsDbfs: Number.isFinite(level.rmsDbfs) ? level.rmsDbfs : null,
      sha256: createHash('sha256').update(buf).digest('hex'),
    },
  };
}

export function validateCaptureSidecar(sidecar, { sidecarPath, recordingBuffer } = {}) {
  const out = [];
  if (!isObject(sidecar)) return [finding('E_SIDECAR_SHAPE', '$', 'спутник должен быть объектом')];
  if (sidecar.schema !== SIDECAR_SCHEMA) out.push(finding('E_SIDECAR_SCHEMA', 'schema', `ожидалась ${SIDECAR_SCHEMA}`));

  const recording = sidecar.recording;
  if (!isObject(recording) || !isText(recording.fileName)) {
    out.push(finding('E_RECORDING_LINK', 'recording.fileName', 'нет имени связанной записи'));
  } else {
    if (basename(recording.fileName) !== recording.fileName || extname(recording.fileName).toLowerCase() !== '.wav') {
      out.push(finding('E_RECORDING_NAME', 'recording.fileName', 'нужно имя WAV без пути'));
    }
    if (sidecarPath && basename(sidecarPath) !== sidecarNameFor(recording.fileName)) {
      out.push(finding('E_RECORDING_STEM', 'recording.fileName', 'имена WAV и спутника имеют разную основу'));
    }
  }
  if (recording?.id !== null && !isText(recording?.id)) {
    out.push(finding('E_RECORDING_ID', 'recording.id', 'id должен быть непустой строкой или null до загрузки'));
  }

  const declared = sidecar.declared;
  if (!isObject(declared) || Object.keys(declared).length === 0) {
    out.push(finding('E_DECLARED_EMPTY', 'declared', 'объявленный раздел пуст'));
  } else {
    const backgroundWithoutSource = typeof declared.what === 'string'
      && declared.what.trim().toLowerCase().startsWith('background:');
    for (const field of DECLARED_FIELDS) {
      const value = declared[field];
      const numeric = field === 'distanceM' || field === 'heightM';
      const numericMissing = numeric && !(backgroundWithoutSource && value === null)
        && (!Number.isFinite(value) || value < 0);
      if (numeric ? numericMissing : !isText(value)) {
        out.push(finding('E_DECLARED_REQUIRED', `declared.${field}`, 'обязательное объявленное поле не заполнено'));
      }
    }
    for (const field of MEASURED_FIELDS) {
      if (field in declared) out.push(finding('E_DECLARED_CONTAINS_MEASURED', `declared.${field}`, 'измеряемое попало в объявленное'));
    }
    for (const field of Object.keys(declared)) {
      if (!DECLARED_FIELDS.includes(field) && !optionalDeclared.has(field)) {
        out.push(finding('E_DECLARED_UNKNOWN', `declared.${field}`, 'неизвестное объявленное поле'));
      }
    }
  }

  const measured = sidecar.measured;
  if (!isObject(measured)) {
    out.push(finding('E_MEASURED_EMPTY', 'measured', 'измеренный раздел отсутствует'));
  } else {
    for (const field of DECLARED_FIELDS) {
      if (field in measured) out.push(finding('E_MEASURED_CONTAINS_DECLARED', `measured.${field}`, 'объявленное попало в измеренное'));
    }
    for (const field of Object.keys(measured)) {
      if (!MEASURED_FIELDS.includes(field)) out.push(finding('E_MEASURED_UNKNOWN', `measured.${field}`, 'поле не производится измеряющим инструментом'));
    }
    if (measured.instrument !== 'field-capture') out.push(finding('E_MEASURED_PROVENANCE', 'measured.instrument', 'неизвестный измеряющий инструмент'));
    if (!isoWithOffset(measured.capturedAt)) out.push(finding('E_MEASURED_VALUE', 'measured.capturedAt', 'время не ISO-8601 со смещением'));
    for (const field of ['durationSec', 'sampleRate', 'channels', 'sizeBytes']) {
      if (!Number.isFinite(measured[field]) || measured[field] <= 0) out.push(finding('E_MEASURED_VALUE', `measured.${field}`, 'нужно положительное число'));
    }
    for (const field of ['peakDbfs', 'rmsDbfs']) {
      if (!finiteOrNull(measured[field])) out.push(finding('E_MEASURED_VALUE', `measured.${field}`, 'нужно число или null для цифровой тишины'));
    }
    if (!isText(measured.audioFormat)) out.push(finding('E_MEASURED_VALUE', 'measured.audioFormat', 'формат не измерен'));
    if (!/^[a-f0-9]{64}$/u.test(measured.sha256 ?? '')) out.push(finding('E_MEASURED_VALUE', 'measured.sha256', 'SHA-256 отсутствует или испорчен'));
  }

  if (recordingBuffer && isObject(measured)) {
    const actual = measureWav(recordingBuffer);
    const expectedHash = createHash('sha256').update(recordingBuffer).digest('hex');
    const actualPeak = Number.isFinite(actual.peakDbfs) ? actual.peakDbfs : null;
    const actualRms = Number.isFinite(actual.rmsDbfs) ? actual.rmsDbfs : null;
    const sameLevel = (left, right) => left === right
      || (Number.isFinite(left) && Number.isFinite(right) && Math.abs(left - right) <= 0.001);
    const mismatch = measured.sizeBytes !== recordingBuffer.length
      || measured.sha256 !== expectedHash
      || measured.sampleRate !== actual.sampleRate
      || measured.channels !== actual.channels
      || measured.audioFormat !== 'wav'
      || Math.abs(measured.durationSec - actual.seconds) > 0.001
      || !sameLevel(measured.peakDbfs, actualPeak)
      || !sameLevel(measured.rmsDbfs, actualRms);
    if (mismatch) out.push(finding('E_MEASURED_MISMATCH', 'measured', 'измерения или SHA-256 не совпадают с WAV'));
  }
  return out;
}

export function writeCaptureSidecar(recordingPath, sidecar) {
  const path = sidecarPathFor(recordingPath);
  writeFileSync(path, `${JSON.stringify(sidecar, null, 2)}\n`, 'utf8');
  return path;
}

export function checkCaptureSidecarFile(path) {
  let sidecar;
  try { sidecar = JSON.parse(readFileSync(path, 'utf8')); }
  catch (error) { return [finding('E_SIDECAR_JSON', '$', `JSON не читается: ${error.message}`)]; }
  const recordingPath = isText(sidecar?.recording?.fileName)
    ? join(dirname(path), sidecar.recording.fileName)
    : null;
  if (!recordingPath || !existsSync(recordingPath)) {
    return [
      ...validateCaptureSidecar(sidecar, { sidecarPath: path }),
      finding('E_RECORDING_MISSING', 'recording.fileName', 'WAV не лежит рядом со спутником'),
    ];
  }
  return validateCaptureSidecar(sidecar, { sidecarPath: path, recordingBuffer: readFileSync(recordingPath) });
}
