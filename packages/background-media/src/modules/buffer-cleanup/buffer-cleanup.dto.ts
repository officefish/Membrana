import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CleanupPlanDto {
  @ApiProperty({ enum: ['oldest', 'newest'], example: 'oldest' })
  principle!: 'oldest' | 'newest';

  @ApiProperty({ enum: [20, 50, 100, 200], example: 100 })
  volume!: number;
}

export class CleanupExecuteDto {
  @ApiProperty({
    type: [String],
    description: 'Exact sample ids taken from a plan that was shown to a human. Required.',
  })
  sampleIds!: string[];
}

export class CleanupPlanRowDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'rec-2026-08-20-1412' })
  title!: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ example: 5242880 })
  sizeBytes!: number;
}

export class CleanupProtectedRowDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty({ example: 'помечена человеком (метка или заметка)' })
  why!: string;
}

export class CleanupPlanResponseDto {
  @ApiProperty({ enum: ['oldest', 'newest'] })
  principle!: string;

  @ApiProperty({ example: 100 })
  requested!: number;

  @ApiProperty({ type: [CleanupPlanRowDto], description: 'What would leave, in shown order' })
  doomed!: CleanupPlanRowDto[];

  @ApiProperty({ type: [CleanupProtectedRowDto], description: 'Selected but protected, with reasons' })
  protectedOut!: CleanupProtectedRowDto[];

  @ApiProperty({ example: 524288000 })
  freedBytes!: number;

  @ApiProperty({ example: 1647, description: 'Samples left in buffer if confirmed' })
  remaining!: number;

  @ApiProperty({ example: 1747 })
  inBuffer!: number;

  @ApiPropertyOptional({
    nullable: true,
    example: 'набралось 63 из 100: 8 защищено (см. список), в буфере 71 проб',
    description: 'Non-null when fewer than requested were gathered — never silent',
  })
  shortfall!: string | null;
}

export class CleanupRefusalDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'помечена как хранимая после показа списка — не удалена' })
  why!: string;
}

export class CleanupExecuteResponseDto {
  @ApiProperty({ example: 100 })
  deleted!: number;

  @ApiProperty({ example: 524288000 })
  freedBytes!: number;

  @ApiProperty({ type: [CleanupRefusalDto], description: 'Skipped ones with reasons — never silent' })
  refused!: CleanupRefusalDto[];
}
