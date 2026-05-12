/**
 * Минимальный вызов Messages API: проверка ключа и сети.
 * Запуск: yarn anthropic:smoke
 */
import { defaultModel, getAnthropicKey, loadDotEnv } from './_anthropic-env.mjs';

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

const body = {
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

const res = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'x-api-key': key,
    'anthropic-version': '2023-06-01',
  },
  body: JSON.stringify(body),
});

const text = await res.text();
if (!res.ok) {
  console.error(`HTTP ${res.status}:`, text);
  process.exit(1);
}

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
