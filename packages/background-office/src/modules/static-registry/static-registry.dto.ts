import { ApiProperty } from '@nestjs/swagger';

import type {
  StaticRegistryLineageReadModel,
  StaticRegistryRecordReadModel,
} from './static-registry-read.port';

export class StaticRegistryRecordResponseDto {
  @ApiProperty({ example: 'day-memo-2026-07-28-r2', type: String })
  id!: string;

  @ApiProperty({ example: '2bb80d537b1da3e38bd30361aa855686bde0ba16...', type: String })
  sha256!: string;

  @ApiProperty({ example: 4096, minimum: 1, type: Number })
  bytes!: number;

  @ApiProperty({ example: '2026-07-28T12:00:00.000Z', format: 'date-time', type: String })
  addedAt!: string;

  @ApiProperty({ example: 'urn:mmbrn:static:day-memo-2026-07-28', type: String })
  canonicalRef!: string;

  @ApiProperty({
    example: 'day-memo-2026-07-28',
    nullable: true,
    type: String,
  })
  effectivePredecessorId!: string | null;

  @ApiProperty({ example: 'day-memo-2026-07-28', type: String })
  rootId!: string;

  @ApiProperty({ example: true, type: Boolean })
  tip!: boolean;
}

export class StaticRegistryLineageResponseDto {
  @ApiProperty({ example: 'urn:mmbrn:static:day-memo-2026-07-28', type: String })
  canonicalRef!: string;

  @ApiProperty({ example: 'day-memo-2026-07-28', type: String })
  rootId!: string;

  @ApiProperty({
    example: ['day-memo-2026-07-28', 'day-memo-2026-07-28-r2'],
    type: [String],
  })
  recordIds!: string[];

  @ApiProperty({ example: 'day-memo-2026-07-28-r2', type: String })
  tipId!: string;
}

export class StaticRegistryErrorResponseDto {
  @ApiProperty({ example: 400, type: Number })
  statusCode!: number;

  @ApiProperty({ example: 'recordId is malformed', type: String })
  message!: string;

  @ApiProperty({ example: 'Bad Request', type: String })
  error!: string;
}

export function toStaticRegistryRecordResponse(
  model: StaticRegistryRecordReadModel,
): StaticRegistryRecordResponseDto {
  return {
    id: model.id,
    sha256: model.sha256,
    bytes: model.bytes,
    addedAt: model.addedAt,
    canonicalRef: model.canonicalRef,
    effectivePredecessorId: model.effectivePredecessorId,
    rootId: model.rootId,
    tip: model.tip,
  };
}

export function toStaticRegistryLineageResponse(
  model: StaticRegistryLineageReadModel,
): StaticRegistryLineageResponseDto {
  return {
    canonicalRef: model.canonicalRef,
    rootId: model.rootId,
    recordIds: [...model.recordIds],
    tipId: model.tipId,
  };
}
