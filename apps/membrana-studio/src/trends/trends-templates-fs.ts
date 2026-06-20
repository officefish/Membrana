import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

export class TrendsTemplatesFsStore {
  private readonly filePath: string;

  constructor(rootDir: string) {
    this.filePath = path.join(rootDir, 'trends-templates.json');
  }

  async read(): Promise<string | null> {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    try {
      return await readFile(this.filePath, 'utf8');
    } catch {
      return null;
    }
  }

  async write(json: string): Promise<void> {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, json, 'utf8');
  }
}

export function createTrendsTemplatesFsStore(rootDir: string): TrendsTemplatesFsStore {
  return new TrendsTemplatesFsStore(rootDir);
}
