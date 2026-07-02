import type { ServerFirstFlags } from './server-first-flags.js';

export type ServerFirstBadgePerspective = 'field' | 'cabinet';

/** Описание badge для shell / cabinet header (SF5). */
export interface ServerFirstBadgeDescriptor {
  readonly key: string;
  readonly label: string;
  readonly className: string;
  readonly title?: string;
}

/**
 * Канонические подписи server-first (консилиум 2026-06-26).
 * soft capture → info; strict → warning (DESIGN.md).
 */
export function resolveServerFirstBadgeDescriptors(
  flags: ServerFirstFlags,
  perspective: ServerFirstBadgePerspective,
): readonly ServerFirstBadgeDescriptor[] {
  const badges: ServerFirstBadgeDescriptor[] = [];

  if (flags.cabinetEditLease) {
    badges.push({
      key: 'edit-lease',
      label: perspective === 'cabinet' ? 'Вы редактируете' : 'Редактирует кабинет',
      className:
        perspective === 'cabinet'
          ? 'badge badge-success badge-outline badge-sm shrink-0'
          : 'badge badge-info badge-outline badge-sm shrink-0',
      title:
        perspective === 'cabinet'
          ? 'Активен edit lease кабинета на этом узле'
          : 'Кабинет держит edit lease — структура сценария только для просмотра',
    });
  }

  // CT5 (канон §7): явный захват v2 — приоритетнее v1 authority-badge.
  if (flags.capturedByCabinet) {
    if (flags.captureMode === 'hard') {
      badges.push({
        key: 'capture-hard',
        label: perspective === 'cabinet' ? 'Захвачено: жёсткий' : 'Захват: жёсткий',
        className: 'badge badge-warning badge-sm shrink-0',
        title:
          perspective === 'cabinet'
            ? 'Устройство полностью ведомое; поле только смотрит'
            : 'Устройство захвачено сервером (жёсткий режим); доступен только аварийный стоп',
      });
    } else {
      badges.push({
        key: 'capture-soft-v2',
        label: perspective === 'cabinet' ? 'Захвачено: мягкий' : 'Захват: мягкий',
        className: 'badge badge-info badge-sm shrink-0',
        title:
          perspective === 'cabinet'
            ? 'Устройство захвачено; поле может запускать и останавливать сценарии'
            : 'Устройство захвачено сервером (мягкий режим); пуск/стоп доступны, правка и пауза — нет',
      });
    }
    if (flags.captureConnectionLost) {
      badges.push({
        key: 'capture-connection-lost',
        label: 'Соединение потеряно',
        className: 'badge badge-warning badge-outline badge-sm shrink-0',
        title: 'Нет heartbeat от сервера; захват будет отпущен автоматически по TTL (5 мин)',
      });
    }
    return badges;
  }

  if (flags.recentlyReleased && perspective === 'field') {
    badges.push({
      key: 'capture-released',
      label: 'Отпущено',
      className: 'badge badge-ghost badge-sm shrink-0',
      title: 'Сервер отпустил управление устройством — полная автономия',
    });
  }

  if (flags.authority === 'cabinet' && perspective === 'field') {
    if (flags.followerMode === 'strict') {
      badges.push({
        key: 'capture-strict',
        label: 'Захват: строгий',
        className: 'badge badge-warning badge-outline badge-sm shrink-0',
        title: 'Runtime под управлением кабинета; управление с поля отключено',
      });
    } else {
      badges.push({
        key: 'capture-soft',
        label: 'Захват: мягкий',
        className: 'badge badge-info badge-sm shrink-0',
        title: 'Runtime под управлением кабинета; pause/stop/mode разрешены',
      });
    }
  }

  return badges;
}
