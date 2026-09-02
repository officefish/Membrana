/**
 * Наружные поля пробы — вердикт M2 заседания `library-open-api`.
 *
 * Этот кортеж — ЕДИНСТВЕННЫЙ источник имён для типа, сериализатора, валидатора и схемы
 * OpenAPI. Разойтись им негде: всё остальное выводится отсюда.
 */
export const PUBLIC_SAMPLE_FIELDS = [
  'id',
  'collectionId',
  'title',
  'class',
  'label',
  'source',
  'durationSec',
  'sampleRate',
  'channels',
  'createdAt',
  'sizeBytes',
] as const;

export type PublicSampleField = (typeof PUBLIC_SAMPLE_FIELDS)[number];

/** Вердикт назвал одиннадцать постоянных полей. Число зафиксировано отдельно — зуб сверяет с ним. */
export const PUBLIC_SAMPLE_FIELD_COUNT = 11;

/**
 * Внутренние поля пробы, которым наружу хода нет:
 * `storageRef` — путь хранилища, `notes` — пометки человека.
 *
 * Список нужен НЕ для вычёркивания (сериализатор — allow-list), а чтобы валидатор мог
 * назвать нарушение своим именем, а не общим «посторонний ключ».
 */
export const FORBIDDEN_SAMPLE_FIELDS = ['storageRef', 'notes'] as const;

export type ForbiddenSampleField = (typeof FORBIDDEN_SAMPLE_FIELDS)[number];
