/**
 * Утилиты engine-слоя: создание AudioContext, загрузка файлов.
 * Этот файл ЗАВИСИТ от Web Audio API (DOM). Чистая математика — в src/math/.
 */

import { DomainError } from '@membrana/core';

/** Создаёт AudioContext с учётом префиксов старых WebKit. */
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

/** Загружает файл/Blob в AudioBuffer через временный AudioContext. */
export async function loadAudioBuffer(file: File | Blob): Promise<AudioBuffer> {
  const arrayBuffer = await file.arrayBuffer();
  const ctx = createAudioContext();
  try {
    return await ctx.decodeAudioData(arrayBuffer);
  } finally {
    await ctx.close().catch(() => {
      /* AudioContext.close может бросать в Safari — игнорируем */
    });
  }
}

/** Проверяет, доступен ли микрофон (запросив разрешение). */
export async function checkMicrophonePermission(): Promise<boolean> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop());
    return true;
  } catch {
    return false;
  }
}

/** Список input-устройств. */
export async function getAudioInputDevices(): Promise<MediaDeviceInfo[]> {
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices.filter((d) => d.kind === 'audioinput');
}
