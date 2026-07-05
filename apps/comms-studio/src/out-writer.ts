/**
 * CC8 — писатель выхода контура. Единственная точка записи; пишет ТОЛЬКО в `out/`.
 *
 * Инвариант «сток, не исток» на уровне записи: путь принудительно резолвится внутри `out/`
 * (защита от `../` escape). Перед записью прогоняется tone-guard (канон формы на рендере);
 * при нарушении запись отклоняется. Секрет-гигиена — отдельный блокирующий CI-шаг (CC4).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve, isAbsolute } from 'node:path';
import { checkTone, formatToneViolations, type ToneViolation } from './tone-guard.js';

export class OutWriteError extends Error {}

export interface WriteResult {
  readonly path: string;
  readonly bytes: number;
}

/** Абсолютный путь каталога out/ для данного пакета контура. */
export function outDir(pkgRoot: string): string {
  return resolve(pkgRoot, 'out');
}

/**
 * Проверяет, что `relName` резолвится строго внутри `out/`.
 * @throws OutWriteError при попытке выйти за пределы out/.
 */
export function resolveOutPath(pkgRoot: string, relName: string): string {
  if (isAbsolute(relName)) {
    throw new OutWriteError(`Абсолютный путь запрещён: ${relName}`);
  }
  const base = outDir(pkgRoot);
  const target = resolve(base, relName);
  const rel = relative(base, target);
  if (rel === '' || rel.startsWith('..') || isAbsolute(rel)) {
    throw new OutWriteError(`Путь вне out/: ${relName}`);
  }
  return target;
}

/**
 * Записывает артефакт в out/ после tone-guard.
 * @throws OutWriteError если путь вне out/ или контент нарушает канон формы.
 */
export function writeArtifact(pkgRoot: string, relName: string, content: string): WriteResult {
  const target = resolveOutPath(pkgRoot, relName);
  const violations: readonly ToneViolation[] = checkTone(content);
  if (violations.length > 0) {
    throw new OutWriteError(
      `Канон формы нарушен, запись отклонена (${violations.length}):\n${formatToneViolations(violations)}`,
    );
  }
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content, 'utf8');
  return { path: target, bytes: Buffer.byteLength(content, 'utf8') };
}
