import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import type { PairDto } from './pair.dto';
import { PairService } from './pair.service';
import { SessionGuard, type AuthenticatedRequest } from '../../common/guards/session.guard';

@Controller('v1')
export class PairController {
  constructor(private readonly pairService: PairService) {}

  @Post('pair')
  @HttpCode(HttpStatus.OK)
  pair(@Body() body: PairDto) {
    return this.pairService.pair(body.accessKey, body.clientLabel);
  }

  @Get('pair/status')
  @UseGuards(SessionGuard)
  pairStatus(@Req() req: AuthenticatedRequest) {
    const token = this.extractBearerToken(req);
    return this.pairService.getPairStatus(req.authUser!.id, token!);
  }

  private extractBearerToken(req: AuthenticatedRequest): string | null {
    const header = req.headers.authorization;
    if (typeof header !== 'string') return null;
    const match = /^Bearer\s+(.+)$/i.exec(header.trim());
    return match?.[1]?.trim() || null;
  }
}
