import { ApiProperty } from '@nestjs/swagger';

export class TrendsTemplatePackDto {
  @ApiProperty({ enum: [1], example: 1 })
  version!: 1;

  @ApiProperty({
    type: 'array',
    items: {
      type: 'object',
      additionalProperties: true,
      example: { key: 'user:my-template', name: 'Custom', bands: [] },
    },
    description: 'Each entry must include key starting with user:',
  })
  templates!: Array<Record<string, unknown>>;
}
