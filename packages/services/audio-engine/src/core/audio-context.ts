/**
 * AudioContext utilities — единое место создания/закрытия контекста.
 */

import { DomainError } from '@membrana/core';

/** Создаёт AudioContext с поддержкой webkit-префикса. */
export function createAudioContext(): AudioContext {
  const Ctor: typeof AudioContext | undefined =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;

  if (!Ctor) {
    throw new DomainError(
      'Web Audio API is not supported in this environment',
      'WEB_AUDIO_UNAVAILABLE',
    );
  }
  return new Ctor();
}

/**
 * Безопасно закрывает AudioContext. Игнорирует исключения старых Safari.
 */
export async function closeAudioContext(ctx: AudioContext | null): Promise<void> {
  if (!ctx) return;
  try {
    await ctx.close();
  } catch {
    /* Safari может бросать "Cannot close a closed AudioContext" — ок */
  }
}
