import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

export type FileHashManifest = Record<string, string>;

export function hashFileContent(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

export async function loadHashManifest(manifestPath: string): Promise<FileHashManifest> {
  try {
    const raw = await readFile(manifestPath, 'utf8');
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as FileHashManifest;
    }
  } catch {
    // missing manifest
  }
  return {};
}

export async function saveHashManifest(
  manifestPath: string,
  manifest: FileHashManifest,
): Promise<void> {
  await mkdir(dirname(manifestPath), { recursive: true });
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
}
