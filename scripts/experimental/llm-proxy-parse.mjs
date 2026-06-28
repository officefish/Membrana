/**
 * Парсинг CLI для llm-proxy-ask: --<provider> --<model> "prompt"
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REGISTRY_PATH = resolve(dirname(fileURLToPath(import.meta.url)), 'llm-providers.json');

/** @typedef {{ label: string; apiFormat: string; baseUrlEnv: string; defaultBaseUrl: string; path: string }} TransportDef */

/** @typedef {{ id: string; label: string; apiKeyEnv: string; defaultTransport: string; transports: Record<string, TransportDef> }} ProviderDef */

/** @typedef {{ id: string; label: string; providerModels: Record<string, string | { modelId: string; transport?: string }> }} ModelDef */

/** @typedef {{ provider: ProviderDef; transport: TransportDef; transportId: string; modelAlias: ModelDef; modelId: string; prompt: string; maxTokens: number; smoke: boolean; help: boolean }} ResolvedLlmRequest */

/**
 * @param {string | { modelId: string; transport?: string }} entry
 * @param {ProviderDef} provider
 * @returns {{ modelId: string; transportId: string; transport: TransportDef }}
 */
export function resolveProviderModel(entry, provider) {
  const mapping = typeof entry === 'string' ? { modelId: entry } : entry;
  const transportId = mapping.transport ?? provider.defaultTransport;
  const transport = provider.transports?.[transportId];
  if (!transport) {
    throw new Error(
      `Транспорт "${transportId}" не настроен для провайдера ${provider.id}. См. llm-providers.json.`,
    );
  }
  return { modelId: mapping.modelId, transportId, transport };
}

/**
 * @returns {{ providers: Record<string, ProviderDef>; models: Record<string, ModelDef> }}
 */
export function loadProviderRegistry(registryPath = REGISTRY_PATH) {
  const raw = readFileSync(registryPath, 'utf8');
  const json = JSON.parse(raw);
  /** @type {Record<string, ProviderDef>} */
  const providers = {};
  for (const [id, def] of Object.entries(json.providers ?? {})) {
    providers[id] = { id, ...def };
  }
  /** @type {Record<string, ModelDef>} */
  const models = {};
  for (const [id, def] of Object.entries(json.models ?? {})) {
    models[id] = { id, ...def };
  }
  return { providers, models };
}

/**
 * @param {string[]} argv
 * @param {{ providers: Record<string, ProviderDef>; models: Record<string, ModelDef> }} registry
 * @returns {ResolvedLlmRequest}
 */
export function parseLlmProxyArgs(argv, registry) {
  const { providers, models } = registry;
  /** @type {string[]} */
  const positional = [];
  let providerId = '';
  let modelId = '';
  let smoke = false;
  let help = false;
  let maxTokens = 2048;

  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') {
      help = true;
      continue;
    }
    if (arg === '--smoke') {
      smoke = true;
      maxTokens = 128;
      continue;
    }
    const m = /^--max-tokens=(\d+)$/.exec(arg);
    if (m) {
      maxTokens = Number.parseInt(m[1], 10);
      continue;
    }
    if (!arg.startsWith('--')) {
      positional.push(arg);
      continue;
    }
    const flag = arg.slice(2);
    if (providers[flag]) {
      if (providerId && providerId !== flag) {
        throw new Error(`Указано несколько провайдеров: --${providerId} и --${flag}`);
      }
      providerId = flag;
      continue;
    }
    if (models[flag]) {
      if (modelId && modelId !== flag) {
        throw new Error(`Указано несколько моделей: --${modelId} и --${flag}`);
      }
      modelId = flag;
      continue;
    }
    throw new Error(`Неизвестный флаг: ${arg}`);
  }

  if (help) {
    return {
      provider: /** @type {ProviderDef} */ ({}),
      transport: /** @type {TransportDef} */ ({}),
      transportId: '',
      modelAlias: /** @type {ModelDef} */ ({}),
      modelId: '',
      prompt: '',
      maxTokens,
      smoke,
      help: true,
    };
  }

  if (!providerId) {
    const list = Object.keys(providers).map((id) => `--${id}`).join(', ');
    throw new Error(`Укажите провайдера: ${list}`);
  }
  if (!modelId) {
    const list = Object.keys(models).map((id) => `--${id}`).join(', ');
    throw new Error(`Укажите модель: ${list}`);
  }

  const provider = providers[providerId];
  const modelAlias = models[modelId];
  const entry = modelAlias.providerModels[providerId];
  if (!entry) {
    throw new Error(
      `Модель --${modelId} не настроена для провайдера --${providerId}. Добавьте mapping в llm-providers.json.`,
    );
  }

  const { modelId: resolvedModelId, transportId, transport } = resolveProviderModel(entry, provider);

  const prompt = positional.join(' ').trim();
  if (!smoke && !prompt) {
    throw new Error('Укажите текст запроса после флагов или используйте --smoke.');
  }

  return {
    provider,
    transport,
    transportId,
    modelAlias,
    modelId: resolvedModelId,
    prompt,
    maxTokens,
    smoke,
    help: false,
  };
}

/**
 * @param {{ providers: Record<string, ProviderDef>; models: Record<string, ModelDef> }} registry
 */
export function formatHelp(registry) {
  const providers = Object.entries(registry.providers)
    .map(([id, p]) => {
      const transports = Object.entries(p.transports ?? {})
        .map(([tid, t]) => `      ${tid}: ${t.label}`)
        .join('\n');
      return `  --${id}  ${p.label}\n${transports}`;
    })
    .join('\n');
  const models = Object.entries(registry.models)
    .map(([id, m]) => `  --${id}  ${m.label}`)
    .join('\n');
  return `Экспериментальный LLM proxy (не ритуалы Membrana).

Использование:
  yarn llm-proxy:ask --<provider> --<model> "текст запроса"
  yarn llm-proxy:smoke --<provider> --<model>

Провайдеры:
${providers}

Модели (алиасы):
${models}

Опции:
  --smoke              короткий ping вместо произвольного промпта
  --max-tokens=N       лимит ответа (default 2048, smoke 128)
  --help               эта справка

Ключи и base URL: .env.llm-proxy (см. .env.llm-proxy.example)
`;
}
