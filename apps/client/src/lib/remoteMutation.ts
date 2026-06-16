/** Default wall-clock limit for paired / remote-server mutations (JE1). */
export const DEFAULT_REMOTE_MUTATION_TIMEOUT_MS = 30_000;

export class RemoteMutationTimeoutError extends Error {
  constructor(readonly operationLabel: string) {
    super(`${operationLabel}: сервер не отвечает (таймаут)`);
    this.name = 'RemoteMutationTimeoutError';
  }
}

function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError';
}

/**
 * Runs an async operation with optional parent abort and a hard timeout.
 * Rejects with {@link RemoteMutationTimeoutError} when the timeout fires.
 */
export async function runRemoteMutation<T>(
  operationLabel: string,
  op: (signal: AbortSignal) => Promise<T>,
  options?: {
    readonly timeoutMs?: number;
    readonly signal?: AbortSignal;
  },
): Promise<T> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_REMOTE_MUTATION_TIMEOUT_MS;
  const controller = new AbortController();
  const parent = options?.signal;

  const abortFromParent = (): void => {
    controller.abort(parent?.reason);
  };
  if (parent?.aborted) {
    abortFromParent();
  } else {
    parent?.addEventListener('abort', abortFromParent);
  }

  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      controller.abort();
      reject(new RemoteMutationTimeoutError(operationLabel));
    }, timeoutMs);
  });

  try {
    return await Promise.race([op(controller.signal), timeoutPromise]);
  } catch (err) {
    if (isAbortError(err) && parent?.aborted) {
      throw err;
    }
    throw err;
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
    parent?.removeEventListener('abort', abortFromParent);
  }
}
