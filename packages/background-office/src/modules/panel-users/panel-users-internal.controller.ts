import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  HttpCode,
  Inject,
  Post,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';

import { ApiTokenGuard } from '../../common/guards/api-token.guard';
import {
  consumeCabinetRegistrationCode,
  createStateLock,
  type CabinetConsumeMode,
  type CabinetConsumeOutcome,
} from './panel-users-core';
import { PanelUsersStore } from './panel-users.store';

/**
 * Внутренняя дверь офиса для регистрации в кабинете по промокоду панели
 * (заседание M1 21.09, ратифицировано владельцем; протокол
 * docs/seanses/cabinet-registration-promo-m1-grant-door-2026-09-21.md).
 *
 * Отдельный контроллер, а не метод в PanelUsersController: тот объявлен
 * @Controller('v1/panel') под классовым PanelAuthGuard, а дверь живёт вне
 * панельного префикса и под внутренней охраной офиса — той же, что у прочих
 * служебных дверей (заголовок X-Membrana-Token, ключ API_INTERNAL_TOKEN).
 *
 * Дверь не создаёт пользователя панели и не копирует его гранты разделов:
 * она только отвечает о годности кода и приращает счётчик использований.
 * Причина отказа отдаётся сервису кабинета; в браузер её выносить нельзя.
 */
@Controller('v1/internal/cabinet/registration-codes')
@UseGuards(ApiTokenGuard)
export class PanelUsersInternalController {
  /** Единственный пишущий контур двери: участки исполняются по одному. */
  private readonly lock = createStateLock();

  constructor(@Inject(PanelUsersStore) private readonly store: PanelUsersStore) {}

  // Nest по умолчанию отвечает на POST кодом 201. Клиент кабинета считает успехом
  // ровно 200 (M2), и 24.09 это стоило живой регистрации: офис погасил код и ответил
  // 201, кабинет прочитал «исход неизвестен», пользователя не создал, код сгорел.
  // Номер ответа — часть контракта двери, а не деталь фреймворка.
  @Post('consume')
  @HttpCode(200)
  async consume(@Body() body: { code?: unknown; mode?: unknown }): Promise<CabinetConsumeOutcome> {
    const code = typeof body?.code === 'string' ? body.code.trim() : '';
    if (!code) {
      throw new BadRequestException('code is required');
    }
    const mode = body?.mode;
    if (mode !== 'check' && mode !== 'redeem') {
      throw new BadRequestException('mode must be "check" or "redeem"');
    }

    // Стор в деградации — состояние недостоверно: это не отказ из пяти причин,
    // а недоступность. Ни «годен», ни «погашено» отвечать нельзя.
    if (this.store.isDegraded()) {
      throw new ServiceUnavailableException('panel store is degraded');
    }

    return this.lock.run(async () => this.consumeOnce(code, mode));
  }

  private consumeOnce(code: string, mode: CabinetConsumeMode): CabinetConsumeOutcome {
    const nowIso = new Date().toISOString();
    const nowSec = Math.floor(Date.now() / 1000);
    const result = consumeCabinetRegistrationCode(
      this.store.snapshot(),
      code,
      mode,
      nowSec,
      nowIso,
    );

    // Состояние меняется только на redeem (приращение и аудит); check его не трогает.
    if (result.state !== this.store.snapshot() && !this.store.mutate(() => result.state)) {
      throw new ServiceUnavailableException('panel store is degraded');
    }
    if (!result.outcome.ok) {
      throw new ConflictException(result.outcome);
    }
    return result.outcome;
  }
}
