/**
 * Tier 0 MCP servers (gitnexus, git, filesystem) для workstation config.
 * Git: официальный Python-сервер через uvx (npm @modelcontextprotocol/server-git снят).
 */
import { readFileSync } from 'node:fs';
import { platform } from 'node:os';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const TIER0 = resolve(root, 'docs/mcp/tier0-workstation.example.json');

function runWhere(cmd) {
  const shell = platform() === 'win32';
  return spawnSync(cmd, [], { encoding: 'utf8', shell });
}

function resolveWhereExe(name) {
  if (platform() !== 'win32') return name;
  const r = runWhere(`where ${name}`);
  if (r.status !== 0) return name;
  const line = (r.stdout || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => new RegExp(`${name}(\\.exe)?$`, 'i').test(l));
  return line ? line.replace(/\\/g, '/') : name;
}

/** Полный путь к uvx на Windows — Cursor часто не видит ~/.local/bin в PATH. */
export function resolveUvxCommand() {
  return resolveWhereExe('uvx');
}

/** Полный путь к uv (для Glyph MCP). */
export function resolveUvCommand() {
  return resolveWhereExe('uv');
}

export function buildTier0Servers(repoRoot) {
  const raw = readFileSync(TIER0, 'utf8');
  const normalized = repoRoot.replace(/\\/g, '/');
  const servers = JSON.parse(raw.replaceAll('__MEMBRANA_ROOT__', normalized)).mcpServers;
  if (servers.git?.command === 'uvx') {
    servers.git = { ...servers.git, command: resolveUvxCommand() };
  }
  return servers;
}

export function buildTier0Config(repoRoot) {
  return JSON.stringify({ mcpServers: buildTier0Servers(repoRoot) }, null, 2) + '\n';
}
