import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

export function resolveCodebaseMemoryBinary(repoRoot, env = process.env, platform = process.platform, fileExists = existsSync) {
  const name = platform === 'win32' ? 'codebase-memory-mcp.exe' : 'codebase-memory-mcp';
  const candidates = [env.CODEBASE_MEMORY_MCP_BIN, env.LOCALAPPDATA && join(env.LOCALAPPDATA, 'Programs', 'codebase-memory-mcp', name), resolve(repoRoot, 'tools', 'bin', name)].filter(Boolean);
  return candidates.find((candidate) => fileExists(candidate)) ?? null;
}

export function resolveHeadroomBinary(repoRoot, env = process.env, platform = process.platform, fileExists = existsSync) {
  const relative = platform === 'win32' ? ['Scripts', 'headroom.exe'] : ['bin', 'headroom'];
  const candidates = [env.HEADROOM_BIN, resolve(repoRoot, 'tools', 'headroom-venv', ...relative)].filter(Boolean);
  return candidates.find((candidate) => fileExists(candidate)) ?? null;
}

export function checkCodebaseMemoryIndex(repoRoot, options = {}) {
  const binary = resolveCodebaseMemoryBinary(repoRoot, options.env, options.platform, options.fileExists);
  if (!binary) return { ok: false, skipped: true, detail: 'binary not found' };
  const result = (options.spawn ?? spawnSync)(binary, ['cli', 'index_status'], { cwd: repoRoot, encoding: 'utf8', timeout: 60_000, windowsHide: true });
  const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
  const ok = result.status === 0 && !output.includes('"error"');
  return { ok, skipped: false, detail: ok ? 'index available' : 'index missing or stale' };
}

export function updateCodebaseMemoryIndex(repoRoot, options = {}) {
  const binary = resolveCodebaseMemoryBinary(repoRoot, options.env, options.platform);
  if (!binary) return { ok: false, skipped: true };
  const result = (options.spawn ?? spawnSync)(binary, ['cli', 'index_repository'], { cwd: repoRoot, encoding: 'utf8', timeout: 120_000, windowsHide: true });
  return { ok: result.status === 0, skipped: false };
}

export function writeHeadroomAudit(repoRoot, options = {}) {
  const binary = resolveHeadroomBinary(repoRoot, options.env, options.platform);
  if (!binary) return { ok: false, skipped: true, path: null };
  const result = (options.spawn ?? spawnSync)(binary, ['audit-reads', '--format', 'json'], { cwd: repoRoot, encoding: 'utf8', timeout: 120_000, windowsHide: true });
  if (result.status !== 0 || !result.stdout?.trim()) return { ok: false, skipped: false, path: null };
  const dateKey = (options.now ?? new Date()).toISOString().slice(0, 10);
  const archiveDir = resolve(repoRoot, 'docs', 'archive');
  mkdirSync(archiveDir, { recursive: true });
  const path = resolve(archiveDir, `${dateKey}-audit-reads.json`);
  writeFileSync(path, `${result.stdout.trim()}\n`, 'utf8');
  return { ok: true, skipped: false, path };
}
