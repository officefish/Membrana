import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  AUDIO_FORMATS,
  MEDIA_MIME_EXAMPLES,
  SAMPLE_LABELS,
  SAMPLE_SOURCES_API,
} from '../../common/swagger/openapi.constants';

export class UploadMetaOverrideDto {
  @ApiPropertyOptional()
  title?: string;

  @ApiPropertyOptional({ example: 'unclassified' })
  class?: string;

  @ApiPropertyOptional({ enum: SAMPLE_LABELS })
  label?: (typeof SAMPLE_LABELS)[number];

  @ApiPropertyOptional({ enum: SAMPLE_SOURCES_API })
  source?: string;

  @ApiPropertyOptional()
  durationSec?: number;

  @ApiPropertyOptional({ example: 48000 })
  sampleRate?: number;

  @ApiPropertyOptional({ enum: [1, 2] })
  channels?: 1 | 2;

  @ApiPropertyOptional()
  notes?: string;
}

export class SampleResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  collectionId!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  class!: string;

  @ApiProperty({ enum: SAMPLE_LABELS })
  label!: string;

  @ApiProperty({ enum: SAMPLE_SOURCES_API })
  source!: string;

  @ApiProperty()
  durationSec!: number;

  @ApiProperty()
  sampleRate!: number;

  @ApiProperty({ enum: [1, 2] })
  channels!: 1 | 2;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty()
  storageRef!: string;

  @ApiPropertyOptional()
  notes?: string;

  @ApiProperty({ enum: AUDIO_FORMATS })
  audioFormat!: string;

  @ApiProperty({ example: 'audio/wav' })
  contentType!: string;

  @ApiProperty()
  sizeBytes!: number;
}

export class MoveSampleDto {
  @ApiProperty({ description: 'Target collection id' })
  toCollectionId!: string;
}

export class PatchSampleLabelDto {
  @ApiPropertyOptional({ enum: SAMPLE_LABELS, description: 'drone | not_drone | unlabeled (not-drone accepted)' })
  label?: string;

  @ApiPropertyOptional({ nullable: true, description: 'Training / curation notes; null clears' })
  notes?: string | null;
}

/** Multipart upload: `file` (binary) + optional `meta` (JSON string). */
export class UploadSampleMultipartDto {
  @ApiProperty({ type: 'string', format: 'binary', description: MEDIA_MIME_EXAMPLES })
  file!: unknown;

  @ApiPropertyOptional({
    type: 'string',
    description: 'JSON string matching UploadMetaOverrideDto',
  })
  meta?: string;
}
