/**
 * Реестр активных воспроизведений engine (tariff v2 CT6): единая точка
 * «погасить всё слышимое» для вытеснения захватом (fade 200 мс) и
 * emergency stop (hard-cut). Игроки регистрируются на play, снимаются на stop.
 *
 * ИНВАРИАНТ (канон §3.3): без permission-проверок — остановка выполняется
 * безусловно для любого вызывающего.
 */

/** Минимальный контракт останавливаемого воспроизведения (без цикла импортов). */
export interface StoppablePlayback {
  stop(options?: { readonly fadeOutMs?: number }): Promise<void>;
}

const activePlayers = new Set<StoppablePlayback>();

export function registerActivePlayback(player: StoppablePlayback): void {
  activePlayers.add(player);
}

export function unregisterActivePlayback(player: StoppablePlayback): void {
  activePlayers.delete(player);
}

/**
 * Останавливает все активные воспроизведения. `fadeOutMs` > 0 — graceful
 * (вытеснение, канон §3.1); 0/умолчание — hard-cut (emergency).
 * Возвращает число остановленных плееров.
 */
export async function stopAllActivePlayback(options?: {
  readonly fadeOutMs?: number;
}): Promise<number> {
  const players = [...activePlayers];
  await Promise.allSettled(players.map((player) => player.stop(options)));
  return players.length;
}

/** @internal unit tests */
export function getActivePlaybackCountForTests(): number {
  return activePlayers.size;
}

/** @internal unit tests */
export function clearActivePlaybackForTests(): void {
  activePlayers.clear();
}
