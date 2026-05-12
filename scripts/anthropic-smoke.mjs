/**
 * Минимальный вызов Messages API: проверка ключа и сети.
 * Запуск: yarn anthropic:smoke
 *
 * Прокси: HTTPS_PROXY в .env (см. .env.example) — если VPN не покрывает терминал.
 */
import {
  anthropicPost,
  defaultModel,
  getAnthropicKey,
  loadDotEnv,
  printAnthropicHttpError,
} from './_anthropic-env.mjs';

loadDotEnv();

let key;
try {
  key = getAnthropicKey();
} catch (e) {
  console.error(e.message);
  console.error('См. .env.example и команду: yarn anthropic:smoke');
  process.exit(1);
}

const model = defaultModel();

const bodyJson = {
  model,
  max_tokens: 128,
  messages: [
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: 'Ответь одним коротким предложением на русском: подтверди, что запрос дошёл до API.',
        },
      ],
    },
  ],
};

let exitCode = 0;
try {
  const { ok, status, text } = await anthropicPost('https://api.anthropic.com/v1/messages', {
    headers: {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    bodyJson,
  });

  if (!ok) {
    printAnthropicHttpError(status, text);
    exitCode = 1;
  } else {
    let snippet = text;
    try {
      const json = JSON.parse(text);
      const block = json?.content?.[0];
      snippet =
        block?.type === 'text' ? block.text : JSON.stringify(json?.content ?? json);
    } catch {
      /* оставляем сырой text */
    }
    console.log('Ответ модели:', snippet);
  }
} catch (e) {
  console.error(e);
  exitCode = 1;
}

// Задержка перед выходом: на Windows libuv иногда падает с assert, если exit сразу после dispatcher.close().
if (exitCode === 0) {
  await new Promise((r) => setTimeout(r, 150));
}
process.exit(exitCode);
