import type {
  RegistryIndexInput,
  RegistryRecordPayload,
} from '../../src';

export interface StubRegistryRecord extends RegistryRecordPayload {
  readonly id: string;
  readonly sha256: string;
  readonly title: string;
  readonly metadata: {
    readonly labels: readonly string[];
  };
}

export interface StubRecordOptions {
  readonly id: string;
  readonly rootId?: string;
  readonly predecessor?: string | null;
  readonly sha256?: string;
  readonly title?: string;
}

export function contractRecordStub(
  options: StubRecordOptions,
): RegistryIndexInput<StubRegistryRecord> {
  const rootId = options.rootId ?? options.id;
  return {
    id: options.id,
    canonicalRef: `urn:mmbrn:static:${rootId}`,
    effectivePredecessor: options.predecessor ?? null,
    record: {
      id: options.id,
      sha256: options.sha256 ?? `sha256:${options.id}`,
      title: options.title ?? options.id,
      metadata: {
        labels: [`lineage:${rootId}`],
      },
    },
  };
}

export function contractLineStub(
  rootId: string,
  ids: readonly string[],
  sha256?: string,
): readonly RegistryIndexInput<StubRegistryRecord>[] {
  return ids.map((id, index) =>
    contractRecordStub({
      id,
      rootId,
      predecessor: index === 0 ? null : ids[index - 1],
      sha256,
    }),
  );
}
