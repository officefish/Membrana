/**
 * SC4 (studio-capture-adaptation): парсер M1 shell-лога Studio для
 * capture-lifecycle smoke (закрывает backlog `logs:parse-shell` из
 * STUDIO_HOST_BRIDGE_CONTRACT §7.5).
 *
 * Usage:
 *   yarn logs:parse:shell -- --file <path-to-shell-YYYY-MM-DD.log>
 *   yarn logs:parse:shell -- --file <...> --require-acquired 1 --require-release 1
 *
 * Считает события `[capture] acquired/heartbeat/release ...` (renderer через
 * IPC-лог) и `capture acquired — window focused` (main, SC1). Exit 1, если
 * заданные --require-* пороги не выполнены.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export function parseCaptureLifecycle(text) {
  const lines = text.split('\n');
  const summary = {
    acquired: 0,
    acquiredByMode: { soft: 0, hard: 0 },
    heartbeat: 0,
    release: 0,
    releaseByReason: {},
    windowFocused: 0,
    lines: [],
  };
  for (const line of lines) {
    if (line.includes('[capture] acquired')) {
      summary.acquired++;
      const mode = line.match(/mode=(soft|hard)/)?.[1];
      if (mode) summary.acquiredByMode[mode]++;
      summary.lines.push(line.trim());
    } else if (line.includes('[capture] heartbeat')) {
      summary.heartbeat++;
    } else if (line.includes('[capture] release')) {
      summary.release++;
      const reason = line.match(/reason=([\w-]+)/)?.[1] ?? 'unknown';
      summary.releaseByReason[reason] = (summary.releaseByReason[reason] ?? 0) + 1;
      summary.lines.push(line.trim());
    } else if (line.includes('capture acquired — window focused')) {
      summary.windowFocused++;
    }
  }
  return summary;
}

function parseArgs(argv) {
  const options = { file: null, requireAcquired: 0, requireRelease: 0 };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--file' && argv[i + 1]) options.file = resolve(argv[++i]);
    else if (argv[i] === '--require-acquired' && argv[i + 1]) {
      options.requireAcquired = Number(argv[++i]);
    } else if (argv[i] === '--require-release' && argv[i + 1]) {
      options.requireRelease = Number(argv[++i]);
    }
  }
  if (!options.file) throw new Error('--file <shell-log> обязателен');
  return options;
}

const isDirectRun =
  process.argv[1] && resolve(process.argv[1]).endsWith('parse-studio-shell-log.mjs');
if (isDirectRun) {
  try {
    const options = parseArgs(process.argv.slice(2));
    const summary = parseCaptureLifecycle(readFileSync(options.file, 'utf8'));
    console.log(
      `capture-lifecycle: acquired=${summary.acquired} (soft=${summary.acquiredByMode.soft}, hard=${summary.acquiredByMode.hard}) heartbeat=${summary.heartbeat} release=${summary.release} focused=${summary.windowFocused}`,
    );
    for (const [reason, count] of Object.entries(summary.releaseByReason)) {
      console.log(`  release ${reason}: ${count}`);
    }
    let failed = false;
    if (summary.acquired < options.requireAcquired) {
      console.error(`FAIL: acquired ${summary.acquired} < ${options.requireAcquired}`);
      failed = true;
    }
    if (summary.release < options.requireRelease) {
      console.error(`FAIL: release ${summary.release} < ${options.requireRelease}`);
      failed = true;
    }
    if (failed) process.exitCode = 1;
  } catch (err) {
    console.error(err.message ?? err);
    process.exitCode = 1;
  }
}
