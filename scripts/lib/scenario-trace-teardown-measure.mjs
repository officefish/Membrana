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

