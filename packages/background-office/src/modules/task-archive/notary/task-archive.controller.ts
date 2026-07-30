import { Body, Controller, Get, HttpCode, HttpStatus, NotFoundException, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { ApiTokenGuard } from '../../../common/guards/api-token.guard';
import { TaskArchiveCheckpointService } from '../checkpoint/task-archive-checkpoint.service';
import { TaskArchiveService } from './task-archive.service';

@ApiTags('task-archive')
@Controller('v1/task-archive')
@UseGuards(ApiTokenGuard)
@ApiBearerAuth('X-Membrana-Token')
export class TaskArchiveController {
  constructor(
    private readonly archive: TaskArchiveService,
    private readonly checkpoint: TaskArchiveCheckpointService,
  ) {}

  @Post('closures')
  @ApiOperation({ summary: 'Notarize an append-only task closure record' })
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: 200, description: 'Record notarized, or equivalent record already exists' })
  @ApiResponse({ status: 400, description: 'Invalid record shape or insufficient proof' })
  @ApiResponse({ status: 409, description: 'Record conflict for the same task closure' })
  notarize(@Body() raw: unknown) {
    return this.archive.notarizeClosure(raw);
  }

  @Get('closures')
  @ApiOperation({ summary: 'List notarized task closure records' })
  list() {
    return this.archive.listClosures();
  }

  @Get('closures/:taskId')
  @ApiOperation({ summary: 'Read a notarized task closure record by task id' })
  async get(@Param('taskId') taskId: string) {
    const record = await this.archive.getClosure(taskId);
    if (!record) {
      throw new NotFoundException({ fieldErrors: { taskId: ['unknown task closure record'] } });
    }
    return record;
  }

  @Get('checkpoint')
  @ApiOperation({ summary: 'Build the current cold archive checkpoint snapshot' })
  currentCheckpoint() {
    return this.checkpoint.currentCheckpoint();
  }
}
