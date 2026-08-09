export type RegistryPrimitive = string | number | boolean | null;

export type RegistryValue =
  | RegistryPrimitive
  | { readonly [key: string]: RegistryValue }
  | readonly RegistryValue[];

export type RegistryRecordPayload = Readonly<Record<string, RegistryValue>>;

export type DeepReadonly<T> = T extends RegistryPrimitive
  ? T
  : T extends readonly (infer TItem)[]
    ? readonly DeepReadonly<TItem>[]
    : T extends object
      ? { readonly [TKey in keyof T]: DeepReadonly<T[TKey]> }
      : never;

export interface RegistryIndexInput<
  TRecord extends RegistryRecordPayload = RegistryRecordPayload,
> {
  readonly id: string;
  readonly canonicalRef: string;
  readonly effectivePredecessor: string | null;
  readonly record: TRecord;
}

export interface IndexedRegistryRecord<
  TRecord extends RegistryRecordPayload = RegistryRecordPayload,
> {
  readonly id: string;
  readonly canonicalRef: string;
  readonly effectivePredecessor: string | null;
  readonly record: DeepReadonly<TRecord>;
}

export interface RegistryLineage<
  TRecord extends RegistryRecordPayload = RegistryRecordPayload,
> {
  readonly canonicalRef: string;
  readonly records: readonly IndexedRegistryRecord<TRecord>[];
  readonly tip: IndexedRegistryRecord<TRecord>;
}

export type RegistryLineDecoder<
  TRecord extends RegistryRecordPayload = RegistryRecordPayload,
> = (line: string, lineNumber: number) => RegistryIndexInput<TRecord>;
