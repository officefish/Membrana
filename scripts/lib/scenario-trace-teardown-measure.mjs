import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';

export const DEFAULT_TRACE_SIZES = [100, 1_000, 10_000];
export const DEFAULT_REPEATS = 80;
export const DEFAULT_WARMUP = 8;

export class ScenarioTraceProbe {
  constructor({ maxLines = 10_000, sink = null } = {}) {
    this.maxLines = maxLines;
    this.lines = [];
    this.listeners = new Set();
    this.linesSnapshot = null;
    this.sink = sink;
  }

  formatScenarioTraceLine(message, context = undefined) {
    if (context === undefined || Object.keys(context).length === 0) {
      return `[INFO] ${message}`;
    }
    const body = Object.entries(context)
      .map(([key, value]) => {
        if (typeof value === 'string') return `${key}: '${value}'`;
        if (value === null) return `${key}: null`;
        return `${key}: ${String(value)}`;
      })
      .join(', ');
    return `[INFO] ${message} {${body}}`;
  }

  notify() {
    this.linesSnapshot = null;
    this.listeners.forEach((listener) => listener());
  }

  appendScenarioTraceLine(message, context = undefined) {
    this.lines.push(this.formatScenarioTraceLine(message, context));
    if (this.lines.length > this.maxLines) {
      this.lines.splice(0, this.lines.length - this.maxLines);
    }
    this.notify();
  }

  clearScenarioTraceBuffer() {
    if (this.lines.length === 0) return;
    this.lines.length = 0;
    this.notify();
  }

  getScenarioTraceLines() {
    if (this.linesSnapshot === null) {
      this.linesSnapshot = this.lines.slice();
    }
    return this.linesSnapshot;
  }

  getScenarioTraceText() {
    return this.lines.join('\n');
  }

  subscribeScenarioTraceBuffer(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  persistScenarioTraceToDisk(runId = null) {
    const text = this.getScenarioTraceText();
    if (text.length === 0) return false;
    this.sink?.flushScenarioTrace?.(text, runId);
    return true;
  }

  finishStopped(runId = 'synthetic-run') {
    this.appendScenarioTraceLine('scenario-run-stop', { runId, reason: 'user' });
    this.persistScenarioTraceToDisk(runId);
  }

  beforeUnloadPersist() {
    this.persistScenarioTraceToDisk();
  }
}

export function fillSyntheticTrace(buffer, count) {
  for (let i = 0; i < count; i += 1) {
    buffer.appendScenarioTraceLine('[device-board] main-tick-done', {
      runId: 'synthetic-run',
      tick: i,
      branch: 'main',
      nodeId: `node-${i % 37}`,
      elapsedMs: i % 19,
    });
  }
  return buffer;
}

export function makeCountingSink() {
  return {
    writes: 0,
    bytes: 0,
    flushScenarioTrace(text) {
      this.writes += 1;
      this.bytes += Buffer.byteLength(text, 'utf8');
    },
  };
}

export function summarizeSamples(samples) {
  const sorted = [...samples].sort((a, b) => a - b);
  const percentile = (p) => sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p))];
  return {
    minMs: sorted[0],
    medianMs: percentile(0.5),
    p95Ms: percentile(0.95),
    maxMs: sorted[sorted.length - 1],
  };
}

export function measureOperation({ size, repeats, warmup, maxLines, subscribers, operation }) {
  const samples = [];
  let lastSink = null;
  for (let i = 0; i < repeats + warmup; i += 1) {
    const sink = makeCountingSink();
    const buffer = fillSyntheticTrace(new ScenarioTraceProbe({ maxLines, sink }), size);
    for (let s = 0; s < subscribers; s += 1) {
      buffer.subscribeScenarioTraceBuffer(() => {
        buffer.getScenarioTraceLines();
      });
    }
    const startedAt = performance.now();
    operation(buffer);
    const elapsed = performance.now() - startedAt;
    if (i >= warmup) samples.push(elapsed);
    lastSink = sink;
  }
  return {
    size,
    samples,
    sinkWrites: lastSink?.writes ?? 0,
    sinkBytes: lastSink?.bytes ?? 0,
    ...summarizeSamples(samples),
  };
}

export function runScenarioTraceTeardownBenchmark({
  sizes = DEFAULT_TRACE_SIZES,
  repeats = DEFAULT_REPEATS,
  warmup = DEFAULT_WARMUP,
  maxLines = 10_000,
  subscribers = 1,
} = {}) {
  return sizes.map((size) => {
    const stopRecording = measureOperation({
      size,
      repeats,
      warmup,
      maxLines,
      subscribers,
      operation: (buffer) => buffer.finishStopped(),
    });
    const exitBoard = measureOperation({
      size,
      repeats,
      warmup,
      maxLines,
      subscribers,
      operation: (buffer) => buffer.beforeUnloadPersist(),
    });
    const clear = measureOperation({
      size,
      repeats,
      warmup,
      maxLines,
      subscribers,
      operation: (buffer) => buffer.clearScenarioTraceBuffer(),
    });
    const snapshot = measureOperation({
      size,
      repeats,
      warmup,
      maxLines,
      subscribers,
      operation: (buffer) => buffer.getScenarioTraceLines(),
    });
    return { size, stopRecording, exitBoard, clear, snapshot };
  });
}


/**
 * Единственный настоящий источник потолка — продуктовый модуль. Прибор ОБЯЗАН читать его,
 * а не носить свою константу: разошедшийся потолок заставил бы прибор мерить прошлое.
 */
export const SCENARIO_TRACE_BUFFER_SOURCE = 'apps/client/src/modules/device-board/scenarioTraceBuffer.ts';

export function scenarioTraceBufferSourcePath(repoRoot) {
  return join(repoRoot, SCENARIO_TRACE_BUFFER_SOURCE);
}

export function readMaxTraceLines(repoRoot) {
  const sourcePath = scenarioTraceBufferSourcePath(repoRoot);
  const source = readFileSync(sourcePath, 'utf8');
  const match = source.match(/const\s+MAX_TRACE_LINES\s*=\s*([\d_]+)/);
  if (!match) throw new Error(`MAX_TRACE_LINES not found in ${sourcePath}`);
  const parsed = Number.parseInt(match[1].replaceAll('_', ''), 10);
  // Потолок — вещдок, а не подсказка: нечисло здесь тихо превратило бы прибор в генератор NaN.
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`MAX_TRACE_LINES в ${sourcePath} не читается как положительное целое: ${match[1]}`);
  }
  return parsed;
}

/**
 * Поверхность продуктового модуля, которую прибор воспроизводит своей копией.
 * Расхождение ловится зубом: новый экспорт, не попавший ни в один список, красит прогон,
 * потому что копия про него молчит.
 */
export const PROBE_MODELLED_EXPORTS = Object.freeze([
  'appendScenarioTraceLine',
  'clearScenarioTraceBuffer',
  'formatScenarioTraceLine',
  'getScenarioTraceLines',
  'getScenarioTraceText',
  'subscribeScenarioTraceBuffer',
]);

/** Экспорты, сознательно НЕ воспроизводимые прибором, с причиной. */
export const PROBE_UNMODELLED_EXPORTS = Object.freeze({
  getScenarioTraceLineCount: 'дешёвое чтение length, вне измеряемой разборки',
  copyScenarioTraceToClipboard: 'требует navigator.clipboard, недоступен в node',
  downloadScenarioTraceFile: 'требует Blob/DOM, недоступен в node',
});

/**
 * Несущие выражения продуктового модуля, которые копия воспроизводит ДОСЛОВНО.
 * Зуб ищет их в исходнике: правка любой из этих строк краснит прибор и заставляет
 * сверить копию. Это переносимая половина зуба — ей не нужен загрузчик TypeScript,
 * поэтому она работает на любом Node (в CI это Node 20).
 */
export const PROBE_CARRYING_EXPRESSIONS = Object.freeze([
  'lines.push(formatScenarioTraceLine(message, context));',
  'lines.splice(0, lines.length - MAX_TRACE_LINES);',
  'linesSnapshot = lines.slice();',
  String.raw`return lines.join('\n');`,
  'return `[INFO] ${message}`;',
  "return `${key}: '${value}'`;",
  'return `${key}: null`;',
  'return `${key}: ${String(value)}`;',
  'return `[INFO] ${message} {${body}}`;',
]);

export function readScenarioTraceBufferSource(repoRoot) {
  return readFileSync(scenarioTraceBufferSourcePath(repoRoot), 'utf8');
}

/** Имена экспортов продуктового модуля, прочитанные из текста (без загрузки модуля). */
export function readScenarioTraceBufferExports(repoRoot) {
  const source = readScenarioTraceBufferSource(repoRoot);
  const names = [...source.matchAll(/^export\s+(?:async\s+)?function\s+([A-Za-z0-9_$]+)/gm)].map(
    (match) => match[1],
  );
  if (names.length === 0) {
    throw new Error('в scenarioTraceBuffer.ts не найдено ни одного export function — зуб ослеп');
  }
  return names;
}
