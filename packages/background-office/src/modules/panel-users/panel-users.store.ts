import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { Inject, Injectable, Logger } from '@nestjs/common';

import { APP_CONFIG } from '../../config/config.tokens';
import type { AppConfig } from '../../config/env.schema';
import { emptyState, parseState, type PanelUsersState } from './panel-users-core';

export const DEFAULT_STORE_PATH = '/var/lib/membrana-office/panel-users.json';

/**
 * Store реестра партнёров (PU1, ADR 0005): единственный персистентный стейт
 * office. Диск читается ОДИН раз на старте; рантайм живёт in-memory кэшем;
 * каждая мутация — синхронная атомарная запись (tmp → rename). Нет файла /
 * файл битый → пустой реестр + громкий warning (видимая деградация: сессии
 * не роняются, но грантов store не отдаёт).
 */
@Injectable()
export class PanelUsersStore {
  private readonly logger = new Logger(PanelUsersStore.name);
  private state: PanelUsersState;
  private loaded = false;
  private degraded = false;

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {
    this.state = emptyState();
  }

  storePath(): string {
    return this.config.PANEL_USERS_STORE_PATH?.trim() || DEFAULT_STORE_PATH;
  }

  /** Видимая деградация (ADR 0005): store недоступен на запись/чтение. */
  isDegraded(): boolean {
    this.ensureLoaded();
    return this.degraded;
  }

  private ensureLoaded(): void {
    if (this.loaded) return;
    this.loaded = true;
    const path = this.storePath();
    let text: string;
    try {
      text = readFileSync(path, 'utf8');
    } catch {
      this.logger.warn(
        { path },
        'panel-users: store-файл отсутствует — стартуем пустым реестром (первый запуск или НЕ смонтирован volume!)',
      );
      return;
    }
    const parsed = parseState(text);
    if (!parsed) {
      // Битый файл НЕ перезаписываем молча: деградация видимая, мутации отключены,
      // владелец восстанавливает из бэкапа (runbook).
      this.degraded = true;
      this.logger.error({ path }, 'panel-users: store-файл повреждён — реестр в read-only деградации');
      return;
    }
    this.state = parsed;
    this.logger.log(
      { path, users: parsed.users.length, codes: parsed.codes.length },
      'panel-users: store загружен',
    );
  }

  snapshot(): PanelUsersState {
    this.ensureLoaded();
    return this.state;
  }

  /**
   * Применить чистую мутацию ядра и атомарно записать на диск. null от мутации
   * (цель не найдена/уже в нужном состоянии) пробрасывается как null.
   */
  mutate(fn: (state: PanelUsersState) => PanelUsersState | null): PanelUsersState | null {
    this.ensureLoaded();
    if (this.degraded) {
      this.logger.error('panel-users: мутация отклонена — store в деградации');
      return null;
    }
    const next = fn(this.state);
    if (next === null) return null;
    this.persist(next);
    this.state = next;
    return next;
  }

  private persist(state: PanelUsersState): void {
    const path = this.storePath();
    const tmp = join(dirname(path), `.panel-users.${process.pid}.tmp`);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(tmp, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
    renameSync(tmp, path);
  }
}
