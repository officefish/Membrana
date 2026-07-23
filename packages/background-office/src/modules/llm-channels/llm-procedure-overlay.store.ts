import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { Inject, Injectable, Logger } from '@nestjs/common';

import { APP_CONFIG } from '../../config/config.tokens';
import type { AppConfig } from '../../config/env.schema';
import type { ChainConfigDto } from './llm-channels.dto';

export const DEFAULT_OVERLAY_PATH = '/var/lib/membrana-office/llm-procedure-overlay.json';

export type OverlayState = {
  version: 1;
  procedures: Record<string, ChainConfigDto>;
};

export function emptyOverlay(): OverlayState {
  return { version: 1, procedures: {} };
}

export function parseOverlay(text: string): OverlayState | null {
  try {
    const raw = JSON.parse(text) as unknown;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const procedures = (raw as { procedures?: unknown }).procedures;
    if (!procedures || typeof procedures !== 'object' || Array.isArray(procedures)) return null;
    return {
      version: 1,
      procedures: procedures as Record<string, ChainConfigDto>,
    };
  } catch {
    return null;
  }
}

@Injectable()
export class LlmProcedureOverlayStore {
  private readonly logger = new Logger(LlmProcedureOverlayStore.name);
  private state: OverlayState = emptyOverlay();
  private loaded = false;
  private degraded = false;

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  storePath(): string {
    return this.config.LLM_PROCEDURE_OVERLAY_STORE_PATH?.trim() || DEFAULT_OVERLAY_PATH;
  }

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
      this.logger.warn({ path }, 'llm-overlay: файл отсутствует — пустой overlay');
      return;
    }
    const parsed = parseOverlay(text);
    if (!parsed) {
      this.degraded = true;
      this.logger.error({ path }, 'llm-overlay: файл повреждён — read-only');
      return;
    }
    this.state = parsed;
    this.logger.log(
      { path, procedures: Object.keys(parsed.procedures).length },
      'llm-overlay: загружен',
    );
  }

  snapshot(): OverlayState {
    this.ensureLoaded();
    return this.state;
  }

  get(procedureId: string): ChainConfigDto | undefined {
    return this.snapshot().procedures[procedureId];
  }

  put(procedureId: string, cfg: ChainConfigDto): OverlayState | null {
    this.ensureLoaded();
    if (this.degraded) return null;
    const next: OverlayState = {
      version: 1,
      procedures: { ...this.state.procedures, [procedureId]: cfg },
    };
    this.persist(next);
    this.state = next;
    return next;
  }

  delete(procedureId: string): OverlayState | null {
    this.ensureLoaded();
    if (this.degraded) return null;
    if (!(procedureId in this.state.procedures)) return this.state;
    const procedures = { ...this.state.procedures };
    delete procedures[procedureId];
    const next: OverlayState = { version: 1, procedures };
    this.persist(next);
    this.state = next;
    return next;
  }

  private persist(state: OverlayState): void {
    const path = this.storePath();
    const tmp = join(dirname(path), `.llm-overlay.${process.pid}.tmp`);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(tmp, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
    renameSync(tmp, path);
  }
}
