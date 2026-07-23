import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { ApiTokenGuard } from '../../common/guards/api-token.guard';
import { OwnerAdmin } from '../panel-auth/panel-auth.decorators';
import { PanelAuthGuard } from '../panel-auth/panel-auth.guard';
import {
  overlayPutSchema,
  procedureIdSchema,
  usageEventHasForbiddenKeys,
  usageEventSchema,
} from './llm-channels.dto';
import { LlmChannelsService } from './llm-channels.service';

@ApiTags('llm-procedure')
@Controller('v1/llm-procedure')
export class LlmProcedureController {
  constructor(private readonly channels: LlmChannelsService) {}

  @Get('effective')
  @UseGuards(ApiTokenGuard)
  @ApiBearerAuth('X-Membrana-Token')
  @ApiOperation({ summary: 'List effective chains (overlay ?? git default) for agents' })
  listEffective() {
    return { procedures: this.channels.listEffective() };
  }

  @Get('effective/owner')
  @UseGuards(PanelAuthGuard)
  @OwnerAdmin()
  @ApiCookieAuth('panel_session')
  @ApiOperation({ summary: 'Owner: list effective chains for panel editor' })
  listEffectiveOwner() {
    return { procedures: this.channels.listEffective() };
  }

  @Get('effective/:procedureId')
  @UseGuards(ApiTokenGuard)
  @ApiBearerAuth('X-Membrana-Token')
  @ApiOperation({ summary: 'Resolve effective chain for one procedure' })
  getEffective(@Param('procedureId') procedureId: string) {
    const id = procedureIdSchema.safeParse(procedureId);
    if (!id.success) throw new BadRequestException(id.error.flatten());
    return this.channels.resolveEffective(id.data);
  }

  @Get('overlay')
  @UseGuards(PanelAuthGuard)
  @OwnerAdmin()
  @ApiCookieAuth('panel_session')
  @ApiOperation({ summary: 'Owner: read office overlay map (no secrets)' })
  getOverlay() {
    return this.channels.getOverlaySnapshot();
  }

  @Get('overlay/agent')
  @UseGuards(ApiTokenGuard)
  @ApiBearerAuth('X-Membrana-Token')
  @ApiOperation({ summary: 'Agent: read overlay map for local merge fallback' })
  getOverlayAgent() {
    return this.channels.getOverlaySnapshot();
  }

  @Put('overlay/:procedureId')
  @UseGuards(PanelAuthGuard)
  @OwnerAdmin()
  @ApiCookieAuth('panel_session')
  @ApiOperation({ summary: 'Owner: set overlay chain for a procedure' })
  @ApiResponse({ status: 404, description: 'Unknown procedure or non-owner (deny-as-404)' })
  putOverlay(@Param('procedureId') procedureId: string, @Body() raw: unknown) {
    const id = procedureIdSchema.safeParse(procedureId);
    if (!id.success) throw new BadRequestException(id.error.flatten());
    const parsed = overlayPutSchema.safeParse(raw);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    const cfg = this.channels.putOverlay(id.data, parsed.data);
    return { ok: true as const, procedureId: id.data, chain: cfg?.chain ?? parsed.data.chain };
  }

  @Delete('overlay/:procedureId')
  @UseGuards(PanelAuthGuard)
  @OwnerAdmin()
  @ApiCookieAuth('panel_session')
  @ApiOperation({ summary: 'Owner: clear overlay (fall back to git default)' })
  deleteOverlay(@Param('procedureId') procedureId: string) {
    const id = procedureIdSchema.safeParse(procedureId);
    if (!id.success) throw new BadRequestException(id.error.flatten());
    return this.channels.deleteOverlay(id.data);
  }
}

@ApiTags('llm-usage')
@Controller('v1/llm-usage')
export class LlmUsageController {
  constructor(private readonly channels: LlmChannelsService) {}

  @Post('events')
  @UseGuards(ApiTokenGuard)
  @ApiBearerAuth('X-Membrana-Token')
  @ApiOperation({ summary: 'Ingest a per-call LLM usage event (best-effort from agents)' })
  @ApiResponse({ status: 200, description: 'Accepted (duplicate=true if eventId seen)' })
  ingest(@Body() raw: unknown): { ok: true; duplicate: boolean } {
    const forbidden = usageEventHasForbiddenKeys(raw);
    if (forbidden) {
      throw new BadRequestException(`forbidden field «${forbidden}»`);
    }
    const parsed = usageEventSchema.safeParse(raw);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.channels.ingestUsage(parsed.data);
  }

  @Get('day')
  @UseGuards(PanelAuthGuard)
  @OwnerAdmin()
  @ApiCookieAuth('panel_session')
  @ApiOperation({ summary: 'Owner: day aggregate + recent events' })
  day(@Query('date') date?: string) {
    const d = (date?.trim() || new Date().toISOString().slice(0, 10));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) {
      throw new BadRequestException('date must be YYYY-MM-DD');
    }
    return this.channels.dayUsage(d);
  }
}
