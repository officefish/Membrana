import type { ScenarioReferenceValue, ScenarioVariableValue } from '@membrana/core';
import { isScenarioReferenceValue } from '@membrana/core';

import type { ScenarioResourceMetadata, ScenarioRuntimeHost } from './host.js';

function referenceNoun(kind: ScenarioReferenceValue['kind']): string {
  if (kind === 'ServerRef') {
    return 'server';
  }
  if (kind === 'MicrophoneRef') {
    return 'microphone';
  }
  if (kind === 'AudioStreamRef') {
    return 'audio stream';
  }
  if (kind === 'AudioSampleRef') {
    return 'audio sample';
  }
  if (kind === 'FftFrameRef') {
    return 'fft frame';
  }
  return 'device';
}

function formatMetadataBlock(title: string, metadata: ScenarioResourceMetadata): string {
  const lines = Object.entries(metadata.fields).map(([key, value]) => `  ${key}: ${value}`);
  if (lines.length === 0) {
    return `${title}: (no metadata)`;
  }
  return `${title}:\n${lines.join('\n')}`;
}

/** Синхронный fallback без host-метаданных (тесты, snapshot). */
export function formatVariableValueForPrint(value: ScenarioVariableValue | null): string {
  if (value === null) {
    return 'null';
  }
  if (value.kind === 'DateTime') {
    return value.iso;
  }
  if (value.kind === 'Integer') {
    return String(value.value);
  }
  if (value.kind === 'String') {
    return value.value;
  }
  if (value.kind === 'RecordingPolicy') {
    return `RecordingPolicy(windowSec=${value.windowSec}, captureFormat=${value.captureFormat})`;
  }
  if (value.kind === 'FftTrendsPolicy') {
    return `FftTrendsPolicy(mode=${value.detectionMode}, n=${value.measurementsCount}, intervalMs=${value.intervalMs}, tpl=${value.enabledTemplateKeys.length})`;
  }
  if (isScenarioReferenceValue(value)) {
    const handle = value.handle ?? 'null';
    const status = value.valid ? 'valid' : 'invalid';
    return `${referenceNoun(value.kind)}(${handle}, ${status})`;
  }
  return 'unknown';
}

/** @deprecated Используйте `formatVariableValueForPrint` или `formatVariableValueForPrintRuntime`. */
export function formatReferenceForPrint(value: ScenarioVariableValue | null): string {
  return formatVariableValueForPrint(value);
}

/**
 * Формат Print в рантайме: DateTime → ISO-строка; ссылки → read-only метаданные с host.
 */
export async function formatVariableValueForPrintRuntime(
  value: ScenarioVariableValue | null,
  host: Pick<ScenarioRuntimeHost, 'getResourceMetadata'>,
): Promise<string> {
  if (value === null) {
    return 'null';
  }
  if (value.kind === 'DateTime') {
    return value.iso;
  }
  if (value.kind === 'Integer') {
    return String(value.value);
  }
  if (value.kind === 'String') {
    return value.value;
  }
  if (value.kind === 'RecordingPolicy') {
    return `RecordingPolicy(windowSec=${value.windowSec}, captureFormat=${value.captureFormat})`;
  }
  if (value.kind === 'FftTrendsPolicy') {
    return `FftTrendsPolicy(mode=${value.detectionMode}, n=${value.measurementsCount}, intervalMs=${value.intervalMs}, tpl=${value.enabledTemplateKeys.length})`;
  }
  if (isScenarioReferenceValue(value)) {
    if (!value.valid) {
      return `${referenceNoun(value.kind)}: invalid`;
    }
    const resolver = host.getResourceMetadata;
    if (resolver === undefined) {
      return formatVariableValueForPrint(value);
    }
    const metadata = await resolver(value);
    if (metadata === null) {
      return `${referenceNoun(value.kind)}(${value.handle ?? 'null'}): no metadata`;
    }
    const title = `${referenceNoun(value.kind)}(${value.handle ?? 'null'})`;
    return formatMetadataBlock(title, metadata);
  }
  return 'unknown';
}
