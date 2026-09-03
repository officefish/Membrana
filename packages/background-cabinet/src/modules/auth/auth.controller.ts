import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import type { LoginDto, RegisterDto } from './auth.dto';
import { SessionGuard, type AuthenticatedRequest } from '../../common/guards/session.guard';

@ApiTags('Auth')
@Controller('v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a cabinet user' })
  async register(@Body() body: RegisterDto) {
    return this.authService.register(body.login, body.password);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create a cabinet session' })
  async login(@Body() body: LoginDto) {
    return this.authService.login(body.login, body.password);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(SessionGuard)
  @ApiOperation({ summary: 'Revoke the current cabinet session' })
  async logout(@Req() req: AuthenticatedRequest): Promise<void> {
    const token = this.extractBearerToken(req);
    if (token) {
      await this.authService.logout(token);
    }
  }

  @Get('me')
  @UseGuards(SessionGuard)
  @ApiOperation({ summary: 'Return the authenticated cabinet user' })
  me(@Req() req: AuthenticatedRequest) {
    return { user: req.authUser };
  }

  private extractBearerToken(req: AuthenticatedRequest): string | null {
    const header = req.headers.authorization;
    if (typeof header !== 'string') return null;
    const match = /^Bearer\s+(.+)$/i.exec(header.trim());
    return match?.[1]?.trim() || null;
  }
}
