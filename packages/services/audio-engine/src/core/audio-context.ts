/**
 * AudioContext utilities — единое место создания/закрытия контекста.
 */

import { DomainError } from '@membrana/core';

export interface CreateAudioContextOptions {
  readonly sampleRate?: number;
}

/** Создаёт AudioContext с поддержкой webkit-префикса. */
export function createAudioContext(options: CreateAudioContextOptions = {}): AudioContext {
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
  return options.sampleRate === undefined
    ? new Ctor()
    : new Ctor({ sampleRate: options.sampleRate });
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
