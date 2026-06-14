import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import type { PairDto } from './pair.dto';
import { PairService } from './pair.service';

@Controller('v1')
export class PairController {
  constructor(private readonly pairService: PairService) {}

  @Post('pair')
  @HttpCode(HttpStatus.OK)
  pair(@Body() body: PairDto) {
    return this.pairService.pair(body.accessKey, body.clientLabel);
  }
}
