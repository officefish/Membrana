import { BadRequestException } from '@nestjs/common';

export const STATIC_REGISTRY_RECORD_ID_PATTERN = /^[a-z0-9][a-z0-9-]{2,63}$/;
export const STATIC_REGISTRY_RECORD_ID_MAX_LENGTH = 64;
export const STATIC_REGISTRY_CANONICAL_REF_PREFIX = 'urn:mmbrn:static:';
export const STATIC_REGISTRY_CANONICAL_REF_MAX_LENGTH =
  STATIC_REGISTRY_CANONICAL_REF_PREFIX.length + STATIC_REGISTRY_RECORD_ID_MAX_LENGTH;

export function parseStaticRegistryRecordId(value: unknown): string {
  if (typeof value !== 'string' || !STATIC_REGISTRY_RECORD_ID_PATTERN.test(value)) {
    throw new BadRequestException('recordId is malformed');
  }
  return value;
}

export function parseStaticRegistryCanonicalRef(value: unknown): string {
  if (
    typeof value !== 'string' ||
    value.length > STATIC_REGISTRY_CANONICAL_REF_MAX_LENGTH ||
    !value.startsWith(STATIC_REGISTRY_CANONICAL_REF_PREFIX)
  ) {
    throw new BadRequestException('canonicalRef is malformed');
  }

  const rootId = value.slice(STATIC_REGISTRY_CANONICAL_REF_PREFIX.length);
  if (!STATIC_REGISTRY_RECORD_ID_PATTERN.test(rootId)) {
    throw new BadRequestException('canonicalRef is malformed');
  }
  return value;
}
