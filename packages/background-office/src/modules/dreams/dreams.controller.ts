import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { ApiTokenGuard } from '../../common/guards/api-token.guard';
import { DreamsService } from './dreams.service';

@ApiTags('dreams')
@Controller('v1/dreams')
export class DreamsController {
  constructor(private readonly dreams: DreamsService) {}

  @Get('digest/:day')
  @ApiOperation({ summary: 'Read-проекция дайджеста снов за сутки (≤6 победителей)' })
  @ApiResponse({ status: 200, description: 'projection + markdown' })
  async digest(@Param('day') day: string) {
    return this.dreams.digest(day);
  }

  @Post('tick')
  @UseGuards(ApiTokenGuard)
  @ApiBearerAuth('X-Membrana-Token')
  @ApiOperation({ summary: 'Ручной тик синтеза сна (hour UTC); дедуп слота, без залпа' })
  async tick(
    @Query('day') day?: string,
    @Query('hour') hourRaw?: string,
  ) {
    const d = day?.trim() || new Date().toISOString().slice(0, 10);
    const hour = hourRaw != null ? Number(hourRaw) : new Date().getUTCHours();
    return this.dreams.tick(d, hour);
  }

  @Post('deliver')
  @UseGuards(ApiTokenGuard)
  @ApiBearerAuth('X-Membrana-Token')
  @ApiOperation({ summary: 'Записать docs/DREAMS_DIGEST.md для ритуала' })
  async deliver(@Query('day') day?: string) {
    const d = day?.trim() || new Date().toISOString().slice(0, 10);
    return this.dreams.deliverToRitual(d);
  }
}
