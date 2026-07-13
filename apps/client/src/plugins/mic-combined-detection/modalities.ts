import type { CombinedDetectionSource } from './combinedDetectionState';

/**
 * Метка модальностей combined (консилиум live-neural-combined-fusion, точка 4):
 * отражает ДОСТУПНОСТЬ источников (present по TTL), не факт обновления в кадре —
 * поэтому не мигает на субдискретизации нейро. «спектр+нейро» держится, пока
 * yamnet жив; деградация до «спектр» видима, молчаливая — запрещена.
 */
export type CombinedModalities = 'dsp+neural' | 'dsp' | 'neural' | 'none';

export function resolveModalities(
  perSource: readonly CombinedDetectionSource[],
): CombinedModalities {
  const neuralAlive = perSource.some((s) => s.family === 'neural' && s.present);
  const dspAlive = perSource.some((s) => s.family === 'dsp' && s.present);
  if (neuralAlive && dspAlive) return 'dsp+neural';
  if (dspAlive) return 'dsp';
  if (neuralAlive) return 'neural';
  return 'none';
}

export function modalitiesLabel(modalities: CombinedModalities): string {
  switch (modalities) {
    case 'dsp+neural':
      return 'спектр+нейро';
    case 'dsp':
      return 'спектр';
    case 'neural':
      return 'нейро';
    default:
      return 'нет источников';
  }
}
