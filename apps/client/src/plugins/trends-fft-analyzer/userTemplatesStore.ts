import type { PatternTemplate } from '@membrana/trends-detector-service';

const STORAGE_KEY = 'membrana.trends-fft.user-templates.v1';

interface PersistedPayload {
  readonly version: 1;
  readonly templates: PatternTemplate[];
}

class UserTemplatesStoreImpl {
  private templates: PatternTemplate[] = [];
  private listeners = new Set<() => void>();
  private loaded = false;

  private ensureLoaded(): void {
    if (this.loaded) return;
    this.loaded = true;
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as PersistedPayload;
      if (parsed?.version === 1 && Array.isArray(parsed.templates)) {
        this.templates = parsed.templates.filter(
          (t) => typeof t?.key === 'string' && t.key.startsWith('user:'),
        );
      }
    } catch {
      this.templates = [];
    }
  }

  private canPersist(): boolean {
    return (
      typeof localStorage !== 'undefined' &&
      typeof localStorage.setItem === 'function'
    );
  }

  private persist(): void {
    if (!this.canPersist()) return;
    const payload: PersistedPayload = { version: 1, templates: this.templates };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }

  private notify(): void {
    for (const listener of this.listeners) listener();
  }

  getTemplates = (): readonly PatternTemplate[] => {
    this.ensureLoaded();
    return this.templates;
  };

  subscribe = (listener: () => void): (() => void) => {
    this.ensureLoaded();
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  upsert(template: PatternTemplate): void {
    this.ensureLoaded();
    const index = this.templates.findIndex((t) => t.key === template.key);
    if (index >= 0) {
      this.templates = [
        ...this.templates.slice(0, index),
        template,
        ...this.templates.slice(index + 1),
      ];
    } else {
      this.templates = [...this.templates, template];
    }
    this.persist();
    this.notify();
  }

  remove(key: string): void {
    this.ensureLoaded();
    this.templates = this.templates.filter((t) => t.key !== key);
    this.persist();
    this.notify();
  }

  /** Только для тестов */
  resetForTests(): void {
    this.templates = [];
    this.loaded = true;
    if (this.canPersist()) {
      localStorage.removeItem(STORAGE_KEY);
    }
    this.notify();
  }
}

export const userTemplatesStore = new UserTemplatesStoreImpl();
