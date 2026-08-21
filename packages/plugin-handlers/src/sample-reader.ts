/**
 * Порт чтения проб коллекции — ЕДИНСТВЕННОЕ окно executor'а в дом `collections`.
 *
 * Норма #1950 держится здесь структурно: у порта два члена, оба читают. Ни `upload`, ни
 * `move`, ни `patch` в этом типе нет, а executor другого канала к пробам не имеет — поэтому
 * «write-путь в `samples`/`collections` отсутствует» проверяется зубом по форме порта и по
 * тексту исходников, а не обещанием.
 */
import { createHash } from 'node:crypto';

export interface CollectionSampleDescriptor {
  readonly id: string;
  readonly sampleRate: number;
  readonly channels: number;
  /** `wav` | `mp3` | … — как хранит сервис; декодер плагина умеет только `wav` PCM16. */
  readonly audioFormat: string;
  readonly sizeBytes: number;
  readonly title: string;
  /**
   * Отметка создания пробы, ISO. НЕОБЯЗАТЕЛЬНА: порт общий с mfcc, которому она не нужна, и
   * добавление поля ничего у него не ломает. Ею адресуется ОКНО СЕАНСА (j2, #1961).
   *
   * Полем, а не методом `createdAt(sampleId)`: у сеанса ~720 проб, и отдельный запрос на
   * каждую превратил бы одно чтение списка в 720 обращений к базе.
   */
  readonly createdAt?: string;
}

export interface CollectionSampleAudio {
  readonly bytes: Uint8Array;
  /** SHA-256 сырых байтов файла — вклад пробы в `inputHash`. */
  readonly contentHash: string;
}

export interface CollectionSampleReader {
  listSamples(collectionId: string): Promise<readonly CollectionSampleDescriptor[]>;
  readAudio(sample: CollectionSampleDescriptor): Promise<CollectionSampleAudio>;
}

export function sha256Hex(data: Uint8Array | string): string {
  return createHash('sha256').update(data).digest('hex');
}

/**
 * `inputHash` по M3: SHA-256 от отсортированного по `sampleId` списка `(sampleId, contentHash)`.
 * Порядок выдачи сервиса (createdAt desc) в отпечаток не входит — иначе один и тот же срез
 * коллекции давал бы разные отпечатки от страницы к странице.
 */
export function inputHashOf(
  entries: ReadonlyArray<{ readonly sampleId: string; readonly contentHash: string }>,
): string {
  const lines = [...entries]
    .sort((a, b) => (a.sampleId < b.sampleId ? -1 : a.sampleId > b.sampleId ? 1 : 0))
    .map((e) => `${e.sampleId}:${e.contentHash}`);
  return sha256Hex(lines.join('\n'));
}
