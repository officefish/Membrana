import { Readable } from 'node:stream';

import { describe, expect, it, vi } from 'vitest';

import { registerMediaProxyRawBody } from './media-proxy-body';
import { MediaProxyController, proxySubpath } from './media-proxy.controller';
import type { MediaProxyService } from './media-proxy.service';

const D = '11111111-2222-4333-8444-555555555555';

describe('media-proxy controller', () => {
  it('подпуть — после /v1/media/devices/:deviceId, со строкой запроса', () => {
    expect(proxySubpath(`/v1/media/devices/${D}/collections/__buffer__/samples?page=1`, D)).toBe(
      '/collections/__buffer__/samples?page=1',
    );
    expect(proxySubpath('/v1/other', D)).toBe('');
  });

  it('статус, заголовки и тело media уходят браузеру как есть', async () => {
    const body = Readable.from([Buffer.from('x')]);
    const forward = vi.fn(async () => ({ status: 206, headers: { 'content-type': 'audio/wav' }, body }));
    const controller = new MediaProxyController({ forward } as unknown as MediaProxyService);
    const reply = { status: vi.fn(), headers: vi.fn(), send: vi.fn() };
    reply.status.mockReturnValue(reply);
    reply.headers.mockReturnValue(reply);
    await controller.forward(
      { authUser: { id: 'u-1' }, method: 'GET', url: `/v1/media/devices/${D}/samples/${D}/blob`, headers: { range: 'bytes=0-' }, body: undefined } as never,
      D,
      reply as never,
    );
    expect(forward).toHaveBeenCalledWith({
      userId: 'u-1',
      deviceId: D,
      method: 'GET',
      pathWithQuery: `/samples/${D}/blob`,
      headers: { range: 'bytes=0-' },
      body: undefined,
    });
    expect(reply.status).toHaveBeenCalledWith(206);
    expect(reply.headers).toHaveBeenCalledWith({ 'content-type': 'audio/wav' });
    expect(reply.send).toHaveBeenCalledWith(body);
  });

  it('multipart регистрируется парсером «поток как есть»', () => {
    const add = vi.fn();
    registerMediaProxyRawBody({ addContentTypeParser: add });
    expect(add).toHaveBeenCalledWith('multipart/form-data', expect.any(Function));
    const parser = add.mock.calls[0]![1] as (r: unknown, p: unknown, d: (e: null, b: unknown) => void) => void;
    const done = vi.fn();
    const payload = { stream: true };
    parser({}, payload, done);
    expect(done).toHaveBeenCalledWith(null, payload);
  });
});
