/**
 * Экспериментальный запрос к LLM через proxy-провайдер (freemodel.dev, OpenRouter, …).
 * Изолирован от ритуалов Membrana — ключи только в .env.llm-proxy.
 *
 * Примеры:
 *   yarn llm-proxy:ask --freemodel-dev --opus-4-7 "Объясни cepstrum в двух предложениях"
 *   yarn llm-proxy:smoke --freemodel-dev --haiku-4-5
 *   yarn llm-proxy:ask --help
 */
import {
  executeLlmRequest,
  loadLlmProxyDotEnv,
  printLlmProxyHttpError,
} from '../_llm-proxy-env.mjs';
import {
  formatHelp,
  loadProviderRegistry,
  parseLlmProxyArgs,
} from './llm-proxy-parse.mjs';

const registry = loadProviderRegistry();
const envLoaded = loadLlmProxyDotEnv();
if (!envLoaded) {
  console.error('Файл .env.llm-proxy не найден. Скопируйте .env.llm-proxy.example → .env.llm-proxy');
  console.error('См. docs/experiments/OPENCODE_PROXY_SETUP.md');
}

const argv = process.argv.slice(2);

let req;
try {
  req = parseLlmProxyArgs(argv, registry);
} catch (e) {
  console.error(e.message);
  console.error('');
  console.error(formatHelp(registry));
  process.exit(1);
}

if (req.help) {
  console.log(formatHelp(registry));
  process.exit(0);
}

console.error(
  `[llm-proxy] ${req.provider.label} / ${req.transport.label} / ${req.modelAlias.label} → ${req.modelId}${req.smoke ? ' (smoke)' : ''}`,
);

let exitCode = 0;
try {
  const { ok, status, text, extract } = await executeLlmRequest(req);
  if (!ok) {
    printLlmProxyHttpError(status, text);
    exitCode = 1;
  } else {
    let snippet = text;
    try {
      snippet = extract(text);
    } catch {
      /* raw */
    }
    console.log(snippet);
  }
} catch (e) {
  console.error(e);
  exitCode = 1;
}

if (exitCode === 0) {
  await new Promise((r) => setTimeout(r, 150));
}
process.exit(exitCode);
