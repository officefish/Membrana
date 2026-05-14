import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { readFileSync, existsSync } from 'node:fs';
import { getPromptsDir } from '../../lib/paths';

const PERSONA_FILES: Record<string, string> = {
  vesnin: 'PROMPT_TEAMLEAD.md',
  dynin: 'PROMPT_MATHEMATICIAN.md',
};

@Injectable()
export class PersonaLoaderService implements OnModuleInit {
  private readonly logger = new Logger(PersonaLoaderService.name);
  private readonly cache = new Map<string, string>();

  onModuleInit(): void {
    const dir = getPromptsDir();
    if (!existsSync(dir)) {
      this.logger.warn(`Prompts directory missing: ${dir} (run yarn prepare)`);
      return;
    }
    for (const file of [
      'PROMPT_TEAMLEAD.md',
      'PROMPT_MATHEMATICIAN.md',
      'WHITE_PAPER.md',
      'ARCHITECTURE.md',
      'SERVICES.md',
    ]) {
      const p = `${dir}/${file}`;
      if (existsSync(p)) {
        this.cache.set(file, readFileSync(p, 'utf8'));
      }
    }
    this.logger.log(`Loaded ${this.cache.size} prompt files from ${dir}`);
  }

  getPersonaPromptFile(persona: string): string | undefined {
    const key = PERSONA_FILES[persona];
    if (!key) return undefined;
    return this.cache.get(key);
  }

  getDocument(name: keyof typeof DOC_KEYS): string | undefined {
    return this.cache.get(DOC_KEYS[name]);
  }
}

const DOC_KEYS = {
  whitePaper: 'WHITE_PAPER.md',
  architecture: 'ARCHITECTURE.md',
  services: 'SERVICES.md',
} as const;
