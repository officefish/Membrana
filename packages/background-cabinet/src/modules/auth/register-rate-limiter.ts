/**
 * Ограничитель частоты регистрации по коду — скользящее окно (решение M3, сессия C).
 *
 * Зачем свой: у кабинета ограничителя нет вовсе (`modules/auth`, `common` — пусто),
 * а образец из панели офиса (`panel-auth-core.ts`) тащить в кабинет запрещено
 * заданием — код офиса не импортируется и не копируется целиком. Здесь ровно то, что
 * нужно двери регистрации: порог попыток на ключ за окно, память процесса, ничего больше.
 *
 * Контракт (M3): ключ — адрес клиента; окно 600000 мс; порог 10; удар — в контроллере,
 * до сервиса, чтобы отказ 429 не стоил ни хеша пароля, ни обращения к офису.
 *
 * Чистая функция + состояние в памяти: время приходит снаружи (`nowMs`), чтобы зубы
 * могли двигать часы без подмены `Date`.
 */

export interface RegisterRateLimiter {
  /** true — попытка учтена и разрешена; false — порог в окне исчерпан, попытка не учтена. */
  hit(key: string, nowMs: number): boolean;
  /** Сколько попыток по ключу учтено в окне на момент `nowMs` (для зубов и диагностики). */
  count(key: string, nowMs: number): number;
}

/** Порог и окно двери регистрации кабинета — числа из решения M3. */
export const REGISTER_LIMIT_MAX_PER_WINDOW = 10;
export const REGISTER_LIMIT_WINDOW_MS = 600_000;

export function createRegisterRateLimiter(
  maxPerWindow: number = REGISTER_LIMIT_MAX_PER_WINDOW,
  windowMs: number = REGISTER_LIMIT_WINDOW_MS,
): RegisterRateLimiter {
  if (!Number.isInteger(maxPerWindow) || maxPerWindow < 1) {
    throw new Error(`register limiter: порог должен быть целым ≥ 1, получено ${String(maxPerWindow)}`);
  }
  if (!Number.isFinite(windowMs) || windowMs <= 0) {
    throw new Error(`register limiter: окно должно быть > 0 мс, получено ${String(windowMs)}`);
  }

  const hitsByKey = new Map<string, number[]>();

  const prune = (key: string, nowMs: number): number[] => {
    const floor = nowMs - windowMs;
    const kept = (hitsByKey.get(key) ?? []).filter((t) => t > floor);
    if (kept.length === 0) hitsByKey.delete(key);
    else hitsByKey.set(key, kept);
    return kept;
  };

  return {
    hit(key, nowMs) {
      const kept = prune(key, nowMs);
      if (kept.length >= maxPerWindow) return false;
      kept.push(nowMs);
      hitsByKey.set(key, kept);
      return true;
    },
    count(key, nowMs) {
      return prune(key, nowMs).length;
    },
  };
}

/**
 * Ключ ограничителя — адрес КЛИЕНТА, каким его видит обратный прокси (разъяснение Р6
 * ведущей к M3 «ключ = IP», 22.09).
 *
 * За Caddy без `trustProxy` Fastify отдаёт в `req.ip` адрес прокси, и все клиенты
 * попали бы в одно окно. Поэтому: есть заголовок `X-Forwarded-For` — берём ПОСЛЕДНИЙ
 * адрес в списке (его дописывает сам Caddy при `reverse_proxy`; первый элемент клиент
 * может подделать и обойти окно); заголовка нет — `req.ip`; нет и его — «unknown»,
 * чтобы отсутствие адреса не роняло дверь. Панель офиса берёт первый адрес — это её
 * долг, здесь не повторяется.
 */
export function registerLimiterKey(
  forwardedFor: string | readonly string[] | undefined | null,
  ip: string | undefined | null,
): string {
  const raw = Array.isArray(forwardedFor)
    ? forwardedFor.join(',')
    : typeof forwardedFor === 'string'
      ? forwardedFor
      : '';
  const hops = raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const last = hops.length > 0 ? hops[hops.length - 1] : '';
  if (last) return last;
  const direct = typeof ip === 'string' ? ip.trim() : '';
  return direct || 'unknown';
}
