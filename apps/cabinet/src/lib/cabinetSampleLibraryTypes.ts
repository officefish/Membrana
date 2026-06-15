/** Выбор источника сэмплов в cabinet sample library. */
export type LibrarySelection =
  | { kind: 'catalog' }
  | { kind: 'node'; nodeId: string; deviceId: string; label: string; collectionId: string }
  | { kind: 'node-offline'; nodeId: string; label: string };

export const DEFAULT_IMPORT_CLASS = 'unlabeled';
