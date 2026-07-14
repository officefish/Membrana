import { applyDecorators, SetMetadata } from '@nestjs/common';
import type { PanelRole } from './panel-auth-core';

export const PANEL_MIN_ROLE_KEY = 'panel:minRole';
export const PANEL_DENY_AS_404_KEY = 'panel:denyAs404';

/** Минимальный уровень доступа ручки. Отсутствие декоратора = deny (default-deny). */
export const MinRole = (role: PanelRole) => SetMetadata(PANEL_MIN_ROLE_KEY, role);

/** Явно публичная ручка панели (консилиум: публичность только явная). */
export const PanelPublic = () => MinRole('public');

/**
 * Owner-ручки admin-семейства (PU1, консилиум panel-promo-access Р6):
 * не-owner получает 404, а не 401/403 — существование ручки не подтверждаем.
 */
export const OwnerAdmin = () =>
  applyDecorators(MinRole('owner'), SetMetadata(PANEL_DENY_AS_404_KEY, true));
