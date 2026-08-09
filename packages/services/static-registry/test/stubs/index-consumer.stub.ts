import {
  RegistryIndexError,
  type RegistryIndexErrorCode,
  type RegistryRecordPayload,
  type StaticRegistryIndex,
} from '../../src';

export type ConsumerRequest =
  | { readonly kind: 'lookup'; readonly id: string }
  | { readonly kind: 'resolve'; readonly canonicalRef: string }
  | { readonly kind: 'lineage'; readonly canonicalRef: string }
  | { readonly kind: 'tip'; readonly canonicalRef: string };

export type ConsumerResult =
  | {
      readonly ok: true;
      readonly canonicalRef: string;
      readonly ids: readonly string[];
      readonly tipId: string;
    }
  | {
      readonly ok: false;
      readonly code: RegistryIndexErrorCode;
      readonly ids: readonly string[];
    };

export function consumeIndexStub<TRecord extends RegistryRecordPayload>(
  index: StaticRegistryIndex<TRecord>,
  request: ConsumerRequest,
): ConsumerResult {
  try {
    if (request.kind === 'lookup') {
      const record = index.lookupById(request.id);
      return {
        ok: true,
        canonicalRef: record.canonicalRef,
        ids: [record.id],
        tipId: record.id,
      };
    }

    const lineage = request.kind === 'resolve'
      ? index.resolveCanonicalRef(request.canonicalRef)
      : request.kind === 'lineage'
        ? {
            canonicalRef: request.canonicalRef,
            records: index.lineage(request.canonicalRef),
            tip: index.tip(request.canonicalRef),
          }
        : {
            canonicalRef: request.canonicalRef,
            records: [index.tip(request.canonicalRef)],
            tip: index.tip(request.canonicalRef),
          };

    return {
      ok: true,
      canonicalRef: lineage.canonicalRef,
      ids: lineage.records.map((record) => record.id),
      tipId: lineage.tip.id,
    };
  } catch (error) {
    if (!(error instanceof RegistryIndexError)) {
      throw error;
    }

    return {
      ok: false,
      code: error.code,
      ids: error.ids,
    };
  }
}
