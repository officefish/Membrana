import { afterEach, describe, expect, it } from 'vitest';

import { dispatcherFor, proxyUrlFrom, resetProxyDispatchers } from './proxy-fetch';

afterEach(async () => {
  await resetProxyDispatchers();
});

describe('proxyUrlFrom', () => {
  it('HTTPS_PROXY приоритетнее HTTP_PROXY', () => {
    expect(proxyUrlFrom({ HTTPS_PROXY: 'http://p:1', HTTP_PROXY: 'http://p:2' })).toBe(
      'http://p:1',
    );
  });

  it('пробельный HTTPS_PROXY не считается объявленным', () => {
    expect(proxyUrlFrom({ HTTPS_PROXY: '   ', HTTP_PROXY: 'http://p:2' })).toBe('http://p:2');
  });

  it('прокси не объявлен → пусто (поведение голого fetch)', () => {
    expect(proxyUrlFrom({})).toBe('');
  });
});

describe('dispatcherFor', () => {
  it('без прокси диспетчера нет — вызов идёт напрямую', () => {
    expect(dispatcherFor('')).toBeUndefined();
  });

  it('один диспетчер на прокси-URL: пере-создание на вызов рвёт тело ответа', () => {
    expect(dispatcherFor('http://p:1')).toBe(dispatcherFor('http://p:1'));
  });

  it('разные прокси — разные диспетчеры', () => {
    expect(dispatcherFor('http://p:1')).not.toBe(dispatcherFor('http://p:2'));
  });
});
