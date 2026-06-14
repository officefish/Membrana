import { ApiProperty } from '@nestjs/swagger';

export class OkResponseDto {
  @ApiProperty({ example: true })
  ok!: boolean;
}

export class ApiErrorBodyDto {
  @ApiProperty({ example: 404 })
  statusCode!: number;

  @ApiProperty({ example: 'Device not found' })
  message!: string | string[];

  @ApiProperty({ example: 'Not Found' })
  error!: string;
}
