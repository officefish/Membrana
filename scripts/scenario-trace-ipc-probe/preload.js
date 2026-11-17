/**
 * Отрисовщикова сторона прибора. Мерит РОВНО то, что синтетический прибор
 * scripts/measure-scenario-trace-teardown.mjs подменяет заглушкой-счётчиком: простой
 * отрисовщика внутри `ipcRenderer.sendSync` (apps/membrana-studio/src/preload.ts).
 *
 * Строки формуются как в fillSyntheticTrace, чтобы объём совпадал с синтетическим прибором
 * (10 000 строк = 1 230 913 байт — то же число, что в замере #2476).
 */
const { ipcRenderer } = require('electron');

const REPEATS = 25;
const WARMUP = 3;

function traceLine(i) {
  return (
    `[INFO] [device-board] main-tick-done {runId: 'synthetic-run', tick: ${i}, ` +
    `branch: 'main', nodeId: 'node-${i % 37}', elapsedMs: ${i % 19}}`
  );
}

function buildTraceText(count) {
  const lines = [];
  for (let i = 0; i < count; i += 1) lines.push(traceLine(i));
  return lines.join('\n');
}

function summarize(samples) {
  const sorted = [...samples].sort((a, b) => a - b);
  const percentile = (p) => sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p))];
  return {
    n: sorted.length,
    minMs: sorted[0],
    medianMs: percentile(0.5),
    p95Ms: percentile(0.95),
    maxMs: sorted[sorted.length - 1],
  };
}

async function measure(text) {
  const samples = [];
  for (let i = 0; i < REPEATS + WARMUP; i += 1) {
    const startedAt = performance.now();
    ipcRenderer.sendSync('membrana:logging:flushScenarioTrace', text, 'synthetic-run');
    const elapsed = performance.now() - startedAt;
    if (i >= WARMUP) samples.push(elapsed);
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  return summarize(samples);
}

const MODES = ['noop', 'single', 'full'];
const LOADS = [
  { name: 'idle', blockMs: 0, periodMs: 0 },
  { name: 'busy 20/30', blockMs: 20, periodMs: 30 },
  { name: 'busy 200/250', blockMs: 200, periodMs: 250 },
];

async function run() {
  const size = Number.parseInt(process.env.PROBE_TRACE_LINES ?? '10000', 10);
  const text = buildTraceText(size);
  const bytes = new TextEncoder().encode(text).length;
  const rows = [];

  for (const mode of MODES) {
    await ipcRenderer.invoke('probe:setMode', mode);
    for (const load of LOADS) {
      await ipcRenderer.invoke('probe:setBusy', load.blockMs, load.periodMs);
      await new Promise((resolve) => setTimeout(resolve, 300));
      rows.push({ size, bytes, mode, load: load.name, ...(await measure(text)) });
    }
  }

  await ipcRenderer.invoke('probe:setBusy', 0, 0);
  await ipcRenderer.invoke('probe:report', rows);
}

run().catch((error) => {
  void ipcRenderer.invoke('probe:fail', error instanceof Error ? error.stack : String(error));
});
