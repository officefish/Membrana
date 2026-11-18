/**
 * Доказательство удаления файла (#2632 g2; консилиум archive-gc-journal-2026-10-08, вердикт 3:
 * доказательство v1 = stat до и после на каждый файл).
 *
 * Нынешний `BlobStorageService.delete` = `rm(full, { force: true })`: отсутствие файла не отличимо
 * от удаления, неудача не отличима от успеха (Д5 замера). Здесь — исход ОДНОГО пути по двум
 * наблюдениям диска, а не по коду возврата rm:
 *
 * - `removed`        — файл был до rm и его нет после;
 * - `already_absent` — файла не было до rm (rm не зовётся) и нет после;
 * - `failed`         — файл есть после rm (`afterExists = true`), либо наблюдение не удалось.
 *
 * Литералы совпадают с `PURGE_PATH_ACTIONS` словаря журнала (`purge-journal.vocabulary.ts`, g1a),
 * форма исхода — надмножество `PurgePathOutcome` (beforeExists/afterExists/action). Слой blob
 * словарь журнала НЕ импортирует (blob ниже модуля downgrade-archive); равенство литералов
 * сверяет исполнитель g3b при записи `outcomes` в задание.
 *
 * Консервативность: «не смог посмотреть» ≠ «файла нет». Ошибка stat (кроме ENOENT) считается
 * присутствием файла — исход `failed`, долг остаётся и уходит в политику повторов (g3a).
 */

export const BLOB_REMOVAL_ACTIONS = ['removed', 'already_absent', 'failed'] as const;
export type BlobRemovalAction = (typeof BLOB_REMOVAL_ACTIONS)[number];

/** Исход удаления одного пути. `error` — только у `failed`, текст без адреса файла. */
export interface BlobRemovalOutcome {
  readonly storageRef: string;
  readonly beforeExists: boolean;
  readonly afterExists: boolean;
  readonly action: BlobRemovalAction;
  /** Размер файла по stat ДО rm, если исход `removed`; иначе 0. */
  readonly bytesFreed: number;
  readonly error?: string;
}

/** Наблюдение диска: `null` — пути нет (ENOENT), иначе размер. Прочие ошибки — throw. */
export interface BlobRemovalFs {
  stat(fullPath: string): Promise<{ readonly size: number } | null>;
  rm(fullPath: string): Promise<void>;
}

/** Чистая классификация по двум наблюдениям. Решает только `afterExists` и `beforeExists`. */
export function classifyRemoval(beforeExists: boolean, afterExists: boolean): BlobRemovalAction {
  if (afterExists) return 'failed';
  return beforeExists ? 'removed' : 'already_absent';
}

function errorCode(err: unknown): string {
  if (err && typeof err === 'object' && 'code' in err && typeof (err as { code: unknown }).code === 'string') {
    return (err as { code: string }).code;
  }
  return err instanceof Error ? err.name : 'unknown';
}

type Observation = { exists: boolean; size: number; error?: string };

async function observe(fs: BlobRemovalFs, fullPath: string, phase: 'before' | 'after'): Promise<Observation> {
  try {
    const st = await fs.stat(fullPath);
    return st === null ? { exists: false, size: 0 } : { exists: true, size: st.size };
  } catch (err) {
    // «Не смог посмотреть» трактуется как «файл есть»: доказательства удаления нет.
    return { exists: true, size: 0, error: `stat_${phase}:${errorCode(err)}` };
  }
}

/**
 * stat → (rm, если файл был) → stat. rm не зовётся, если до него файла нет или наблюдение до
 * не удалось. Ошибка rm не решает исход сама: решает stat после (rm мог упасть на гонке, когда
 * файл уже снят другим путём, — тогда `removed`).
 */
export async function removeWithProof(fs: BlobRemovalFs, fullPath: string, storageRef: string): Promise<BlobRemovalOutcome> {
  const before = await observe(fs, fullPath, 'before');
  if (before.error) {
    return { storageRef, beforeExists: true, afterExists: true, action: 'failed', bytesFreed: 0, error: before.error };
  }
  if (!before.exists) {
    const after = await observe(fs, fullPath, 'after');
    const action = classifyRemoval(false, after.exists);
    return withError({ storageRef, beforeExists: false, afterExists: after.exists, action, bytesFreed: 0 }, after.error);
  }

  let rmError: string | undefined;
  try {
    await fs.rm(fullPath);
  } catch (err) {
    rmError = `rm:${errorCode(err)}`;
  }
  const after = await observe(fs, fullPath, 'after');
  const action = classifyRemoval(true, after.exists);
  const bytesFreed = action === 'removed' ? before.size : 0;
  const error = action === 'failed' ? (after.error ?? rmError ?? 'after_exists') : undefined;
  return withError({ storageRef, beforeExists: true, afterExists: after.exists, action, bytesFreed }, error);
}

function withError(outcome: BlobRemovalOutcome, error: string | undefined): BlobRemovalOutcome {
  if (outcome.action !== 'failed') return outcome;
  return { ...outcome, error: error ?? 'after_exists' };
}
