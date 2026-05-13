/**
 * Работа с микрофоном: получение MediaStream, проверка разрешений,
 * перечисление input-устройств.
 */

import { DomainError } from '@membrana/core';

/** Запрашивает доступ к микрофону. Кидает DomainError при отказе/ошибке. */
export async function acquireMicrophone(
  constraints: MediaTrackConstraints | true = true,
): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new DomainError(
      'getUserMedia is not available',
      'MEDIA_DEVICES_UNAVAILABLE',
    );
  }

  try {
    return await navigator.mediaDevices.getUserMedia({ audio: constraints });
  } catch (err) {
    throw new DomainError(
      `Failed to access microphone: ${
        err instanceof Error ? err.message : String(err)
      }`,
      'MICROPHONE_ACCESS_DENIED',
      err,
    );
  }
}

/** Останавливает все треки в MediaStream. */
export function releaseMediaStream(stream: MediaStream | null): void {
  if (!stream) return;
  stream.getTracks().forEach((t) => t.stop());
}

/** Проверка разрешения без удержания потока. */
export async function checkMicrophonePermission(): Promise<boolean> {
  try {
    const stream = await acquireMicrophone();
    releaseMediaStream(stream);
    return true;
  } catch {
    return false;
  }
}

/** Список доступных audio-input устройств. */
export async function getAudioInputDevices(): Promise<MediaDeviceInfo[]> {
  const all = await navigator.mediaDevices.enumerateDevices();
  return all.filter((d) => d.kind === 'audioinput');
}
