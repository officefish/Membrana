import { SetMetadata } from '@nestjs/common';
import type { PanelRole } from './panel-auth-core';

export const PANEL_MIN_ROLE_KEY = 'panel:minRole';

/** Минимальный уровень доступа ручки. Отсутствие декоратора = deny (default-deny). */
export const MinRole = (role: PanelRole) => SetMetadata(PANEL_MIN_ROLE_KEY, role);

/** Явно публичная ручка панели (консилиум: публичность только явная). */
export const PanelPublic = () => MinRole('public');
