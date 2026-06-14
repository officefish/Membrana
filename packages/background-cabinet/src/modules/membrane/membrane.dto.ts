import type { NodeAccessKeyDuration } from '../../prisma/client';

export interface CreateAccessKeyDto {
  duration: NodeAccessKeyDuration;
}

export interface CreateNodeDto {
  label?: string;
}
