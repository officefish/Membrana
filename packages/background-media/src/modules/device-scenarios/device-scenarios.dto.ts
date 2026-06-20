import { ApiProperty } from '@nestjs/swagger';

export class DeviceScenarioRecordDto {
  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    description: 'device-scenario v1 document',
  })
  document!: Record<string, unknown>;

  @ApiProperty({ example: '2026-06-17T12:00:00.000Z' })
  updatedAt!: string;
}

export class PutDeviceScenarioDto {
  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    description: 'device-scenario v1 document',
  })
  document!: Record<string, unknown>;
}
