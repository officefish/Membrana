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
import { z } from 'zod';
import { ApiTokenGuard } from '../../common/guards/api-token.guard';
import { LinearService } from './linear.service';

const commentSchema = z.object({ body: z.string().min(1) });

@Controller('v1/linear')
@UseGuards(ApiTokenGuard)
export class LinearController {
  constructor(@Inject(LinearService) private readonly linear: LinearService) {}

  @Get('issue/:id')
  async getIssue(@Param('id') id: string) {
    return this.linear.getIssueByIdentifier(id);
  }

  @Post('issue/:id/comment')
  @HttpCode(HttpStatus.OK)
  async postComment(@Param('id') id: string, @Body() raw: unknown) {
    const parsed = commentSchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.linear.addComment(id, parsed.data.body);
  }
}
