import type { RegistryLineDecoder } from '../../src';
import {
  contractRecordStub,
  type StubRecordOptions,
  type StubRegistryRecord,
} from './registry-contract.stub';

export const lineDecoderStub: RegistryLineDecoder<StubRegistryRecord> = (line) => {
  const parsed = JSON.parse(line) as unknown;
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new TypeError('stub line must be an object');
  }

  const candidate = parsed as Partial<StubRecordOptions>;
  if (typeof candidate.id !== 'string') {
    throw new TypeError('stub line id must be a string');
  }

  return contractRecordStub({
    id: candidate.id,
    rootId: candidate.rootId,
    predecessor: candidate.predecessor,
    sha256: candidate.sha256,
    title: candidate.title,
  });
};

export function encodeLineStub(options: StubRecordOptions): string {
  return JSON.stringify(options);
}
