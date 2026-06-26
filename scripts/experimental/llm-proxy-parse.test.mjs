import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatHelp,
  loadProviderRegistry,
  parseLlmProxyArgs,
} from './llm-proxy-parse.mjs';

const registry = loadProviderRegistry();

test('parseLlmProxyArgs resolves provider, model alias and prompt', () => {
  const req = parseLlmProxyArgs(
    ['--freemodel-dev', '--opus-4-7', 'hello', 'world'],
    registry,
  );
  assert.equal(req.provider.id, 'freemodel-dev');
  assert.equal(req.modelAlias.id, 'opus-4-7');
  assert.equal(req.modelId, 'claude-opus-4-7');
  assert.equal(req.transportId, 'openai-chat');
  assert.equal(req.prompt, 'hello world');
});

test('parseLlmProxyArgs smoke mode does not require prompt', () => {
  const req = parseLlmProxyArgs(['--smoke', '--openrouter', '--haiku-4-5'], registry);
  assert.equal(req.smoke, true);
  assert.equal(req.maxTokens, 128);
  assert.equal(req.modelId, 'anthropic/claude-haiku-4.5');
});

test('parseLlmProxyArgs rejects unknown flag', () => {
  assert.throws(
    () => parseLlmProxyArgs(['--unknown-provider', '--haiku-4-5', 'x'], registry),
    /Неизвестный флаг/,
  );
});

test('parseLlmProxyArgs rejects duplicate providers', () => {
  assert.throws(
    () => parseLlmProxyArgs(['--freemodel-dev', '--openrouter', '--haiku-4-5', 'x'], registry),
    /несколько провайдеров/,
  );
});

test('formatHelp lists providers and models', () => {
  const help = formatHelp(registry);
  assert.match(help, /--freemodel-dev/);
  assert.match(help, /--opus-4-7/);
});
