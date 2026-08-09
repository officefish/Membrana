export const STATIC_REGISTRY_READ_PORT = Symbol('STATIC_REGISTRY_READ_PORT');

export type StaticRegistryReadResult<T> =
  | { readonly kind: 'found'; readonly value: T }
  | { readonly kind: 'not-found' };

export interface StaticRegistryRecordReadModel {
  readonly id: string;
  readonly sha256: string;
  readonly bytes: number;
  readonly addedAt: string;
  readonly canonicalRef: string;
  readonly effectivePredecessorId: string | null;
  readonly rootId: string;
  readonly tip: boolean;
}

export interface StaticRegistryLineageReadModel {
  readonly canonicalRef: string;
  readonly rootId: string;
  readonly recordIds: readonly string[];
  readonly tipId: string;
}

export interface StaticRegistryReadPort {
  getRecordById(
    recordId: string,
  ): Promise<StaticRegistryReadResult<StaticRegistryRecordReadModel>>;

  resolveCanonicalRef(
    canonicalRef: string,
  ): Promise<StaticRegistryReadResult<StaticRegistryLineageReadModel>>;
}
