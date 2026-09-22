import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { AuthService, REGISTRATION_DISABLED_MESSAGE } from './auth.service';
import type { LoginDto, RegisterDto } from './auth.dto';
import { createRegisterRateLimiter, registerLimiterKey, type RegisterRateLimiter } from './register-rate-limiter';
import { SessionGuard, type AuthenticatedRequest } from '../../common/guards/session.guard';

/** Фраза 429 — буква в букву по карте двери M3. */
export const REGISTRATION_TOO_MANY_REQUESTS_MESSAGE = 'Too many requests';

@ApiTags('Auth')
@Controller('v1/auth')
export class AuthController {
  /**
   * Ограничитель регистрации (M3): 10 попыток за 600000 мс на адрес, удар здесь — до сервиса,
   * чтобы отказ 429 не стоил ни хеша пароля, ни обращения к офису. Состояние — память процесса.
   */
  private readonly registerLimiter: RegisterRateLimiter = createRegisterRateLimiter();

  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a cabinet user by an invitation code from the office panel' })
  async register(@Body() body: RegisterDto, @Req() req: FastifyRequest) {
    // 1) выключено — раньше ограничителя (порядок M3): попытка не учитывается, офис не зовётся
    if (!this.authService.registrationEnabled()) {
      throw new UnauthorizedException(REGISTRATION_DISABLED_MESSAGE);
    }
    // 2) ограничитель по адресу клиента (`req.ip`; за прокси без trustProxy — вопрос ведущей)
    if (!this.registerLimiter.hit(registerLimiterKey(req.ip), Date.now())) {
      throw new HttpException(REGISTRATION_TOO_MANY_REQUESTS_MESSAGE, HttpStatus.TOO_MANY_REQUESTS);
    }
    // 3–8) — в сервисе; причина отказа наружу не пробрасывается (Q3)
    return this.authService.register(body.login, body.password, body.code);
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
