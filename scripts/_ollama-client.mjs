/**
 * Общий клиент Ollama для локальных скриптов (local-code-review, ensure-ollama).
 * OLLAMA_HOST — как в Ollama (http://127.0.0.1:11434); по умолчанию 127.0.0.1, не localhost (IPv6 на Windows).
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { platform } from 'node:os';
import { join } from 'node:path';
import { Agent, fetch as undiciFetch } from 'undici';

const DEFAULT_HOST = 'http://127.0.0.1:11434';
const DEFAULT_GENERATE_TIMEOUT_MS = 900_000;

export function getOllamaHost() {
  const raw = process.env.OLLAMA_HOST?.trim();
  if (!raw) return DEFAULT_HOST;
  return raw.replace(/\/$/, '');
}

export function getOllamaModel() {
  return process.env.OLLAMA_MODEL?.trim() || 'mistral:7b';
}

export function getOllamaGenerateTimeoutMs() {
  const raw = process.env.OLLAMA_GENERATE_TIMEOUT_MS?.trim();
  if (!raw) return DEFAULT_GENERATE_TIMEOUT_MS;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_GENERATE_TIMEOUT_MS;
}

function formatFetchError(error) {
  const cause = error?.cause;
  const code = cause?.code ?? cause?.errno;
  const parts = [error?.message ?? String(error)];
  if (code) parts.push(`(${code})`);
  if (cause?.message && cause.message !== error?.message) parts.push(`— ${cause.message}`);
  return parts.join(' ');
}

function createOllamaDispatcher(timeoutMs) {
  return new Agent({
    connectTimeout: 30_000,
    headersTimeout: timeoutMs,
    bodyTimeout: timeoutMs,
  });
}

/** @returns {Promise<{ ok: true, models: string[] } | { ok: false, error: string }>} */
export async function pingOllama({ host = getOllamaHost(), timeoutMs = 5_000 } = {}) {
  const dispatcher = createOllamaDispatcher(timeoutMs);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await undiciFetch(`${host}/api/tags`, {
      signal: controller.signal,
      dispatcher,
    });
    if (!response.ok) {
      const text = await response.text();
      return { ok: false, error: `HTTP ${response.status}: ${text.slice(0, 200)}` };
    }
    const data = await response.json();
    const models = Array.isArray(data.models)
      ? data.models.map((m) => String(m.name ?? m.model ?? '')).filter(Boolean)
      : [];
    return { ok: true, models };
  } catch (error) {
    if (error?.name === 'AbortError') {
      return { ok: false, error: `таймаут ${timeoutMs}ms — сервер не ответил на ${host}` };
    }
    return { ok: false, error: formatFetchError(error) };
  } finally {
    clearTimeout(timer);
    await dispatcher.close();
  }
}

export function modelIsAvailable(model, availableModels) {
  if (availableModels.includes(model)) return true;
  const base = model.split(':')[0];
  return availableModels.some((name) => name === base || name.startsWith(`${base}:`));
}

const WINDOWS_OLLAMA_CANDIDATES = [
  join(process.env.LOCALAPPDATA ?? '', 'Programs', 'Ollama', 'Ollama.exe'),
  join(process.env.LOCALAPPDATA ?? '', 'Programs', 'Ollama', 'ollama app.exe'),
  'C:\\Program Files\\Ollama\\Ollama.exe',
  'C:\\Program Files\\Ollama\\ollama app.exe',
];

/** Попытка поднять Ollama tray/app на Windows, если API мёртв. */
export function tryStartOllamaApp() {
  if (platform() !== 'win32') return null;
  for (const exe of WINDOWS_OLLAMA_CANDIDATES) {
    if (existsSync(exe)) {
      const child = spawn(exe, [], {
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
      });
      child.unref();
      return exe;
    }
  }
  return null;
}

export function printOllamaHelp({ host, model, extra = [] } = {}) {
  const h = host ?? getOllamaHost();
  const m = model ?? getOllamaModel();
  console.error('');
  console.error('Проверка Ollama:');
  console.error(`  curl ${h}/api/tags`);
  console.error('');
  console.error('Windows: запустите приложение Ollama из трея или меню Пуск.');
  console.error('Linux/macOS: ollama serve');
  console.error(`Модель: ollama pull ${m}`);
  if (process.env.OLLAMA_HOST) {
    console.error(`OLLAMA_HOST=${process.env.OLLAMA_HOST}`);
  } else {
    console.error('Удалённый Ollama: OLLAMA_HOST=http://127.0.0.1:11434 (через SSH -L туннель)');
  }
  for (const line of extra) console.error(line);
}

/** @param {number} ms */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * @param {object} opts
 * @param {string} opts.prompt
 * @param {string} [opts.host]
 * @param {string} [opts.model]
 * @param {number} [opts.timeoutMs]
 * @param {(chunk: string) => void} [opts.onToken]
 */
export async function generateOllama({
  prompt,
  host = getOllamaHost(),
  model = getOllamaModel(),
  timeoutMs = getOllamaGenerateTimeoutMs(),
  onToken,
}) {
  const dispatcher = createOllamaDispatcher(timeoutMs);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let lineBuffer = '';

  try {
    const response = await undiciFetch(`${host}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      dispatcher,
      body: JSON.stringify({
        model,
        prompt,
        stream: true,
        options: { temperature: 0.3, num_predict: 4096, top_p: 0.9 },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Ollama HTTP ${response.status}: ${text.slice(0, 400)}`);
    }

    if (response.body === null) {
      throw new Error('Ollama не вернул тело ответа (stream)');
    }

    let result = '';
    for await (const chunk of response.body) {
      lineBuffer += Buffer.from(chunk).toString('utf8');
      const lines = lineBuffer.split('\n');
      lineBuffer = lines.pop() ?? '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        let data;
        try {
          data = JSON.parse(trimmed);
        } catch {
          continue;
        }
        if (typeof data.response === 'string' && data.response.length > 0) {
          result += data.response;
          onToken?.(data.response);
        }
        if (data.done === true) {
          return result;
        }
      }
    }

    return result;
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error(`таймаут генерации (${Math.round(timeoutMs / 1000)}s) — модель ${model} на ${host}`);
    }
    throw new Error(formatFetchError(error));
  } finally {
    clearTimeout(timer);
    await dispatcher.close();
  }
}
