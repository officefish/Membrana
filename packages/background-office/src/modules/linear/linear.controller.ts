import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody, ApiParam } from '@nestjs/swagger';
import { z } from 'zod';
import { ApiTokenGuard } from '../../common/guards/api-token.guard';
import { LinearService } from './linear.service';

const commentSchema = z.object({ body: z.string().min(1) });

@ApiTags('Linear')
@Controller('v1/linear')
@UseGuards(ApiTokenGuard)
@ApiBearerAuth('api-token')
export class LinearController {
  constructor(@Inject(LinearService) private readonly linear: LinearService) {}

  @Get('issue/:id')
  @ApiOperation({ summary: 'Get Linear issue by identifier' })
  @ApiParam({ name: 'id', description: 'Issue identifier in format like TEC-42', example: 'TEC-42' })
  @ApiResponse({ status: 200, description: 'Linear issue details' })
  @ApiResponse({ status: 401, description: 'Missing or invalid API token' })
  @ApiResponse({ status: 404, description: 'Issue not found' })
  async getIssue(@Param('id') id: string) {
    return this.linear.getIssueByIdentifier(id);
  }

  @Post('issue/:id/comment')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add comment to Linear issue' })
  @ApiParam({ name: 'id', description: 'Issue identifier in format like TEC-42', example: 'TEC-42' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        body: { type: 'string', description: 'Comment text', minLength: 1 },
      },
      required: ['body'],
    },
  })
  @ApiResponse({ status: 200, description: 'Comment created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request body' })
  @ApiResponse({ status: 401, description: 'Missing or invalid API token' })
  @ApiResponse({ status: 404, description: 'Issue not found' })
  async postComment(@Param('id') id: string, @Body() raw: unknown) {
    const parsed = commentSchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.linear.addComment(id, parsed.data.body);
  }
}
