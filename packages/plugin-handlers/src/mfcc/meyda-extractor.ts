/**
 * Считалка MFCC — `meyda`, ТОЙ ЖЕ библиотекой и теми же настройками, что снимались ворота калибровки.
 * Единственная точка конфигурации считалки для плагина: регистратор media и скрипт прогона зовут её,
 * а не собирают свой экземпляр (ревью PR #1975, P1). Ядро `mfcc-analyzer` библиотеку не знает — она
 * приходит в него параметром `extract` (тип шва `MfccExtractor`).
 *
 * Свой экземпляр настроек, не глобальный объект: параметр вызова `Meyda.extract` молча игнорируется,
 * настройки задаются свойствами (#1603); в CJS-сборке `meyda` отдаёт объект напрямую, в ESM — `default`.
 */
import type { MfccExtractor } from '@membrana/mfcc-analyzer-service';
import type { MfccRuntimeConfig } from './preset.js';

type MeydaLike = { extract(feature: 'mfcc', signal: Float32Array): number[] | null };

export async function createMeydaExtractor(config: MfccRuntimeConfig): Promise<MfccExtractor> {
  // Форма модуля зависит от загрузчика (CJS/ESM/vitest-интероп): объект сам, в `default` или в `default.default`.
  const mod = (await import('meyda')) as unknown as Record<string, unknown>;
  const candidates = [mod, mod.default, (mod.default as Record<string, unknown> | undefined)?.default];
  const Meyda = candidates.find((c): c is MeydaLike => typeof (c as MeydaLike | undefined)?.extract === 'function');
  if (!Meyda) throw new Error('meyda: не найден объект с extract() — форма модуля неизвестна');
  // Прототипом, а не spread'ом: у интероп-обёрток методы не перечислимы, spread их теряет (ревью #1975, P2);
  // банки фильтров, которые extract кладёт в this, остаются собственными полями экземпляра.
  const instance: MeydaLike = Object.assign(Object.create(Meyda) as MeydaLike, {
    bufferSize: config.bufferSize,
    melBands: config.melBands,
    numberOfMFCCCoefficients: config.numberOfCoefficients,
    sampleRate: config.sampleRate,
  });
  // `null` от библиотеки — не массив: ядро откажет «извлекатель вернул 0 значений», а не упадёт.
  return (frame) => instance.extract('mfcc', frame) ?? [];
}
