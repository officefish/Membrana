/**
 * @membrana/usercase-catalog-service — UserCase catalog entitlement facade.
 * @see docs/prompts/DEVICE_BOARD_PHASE_3_EPIC_PROMPT.md (A1)
 */

export type { UserCaseCatalogCard, UserCaseEntitlementStatus } from './types.js';

export {
  ClientUserCaseCatalogService,
  getDefaultClientUserCaseCatalogService,
  resetDefaultClientUserCaseCatalogService,
  type ClientUserCaseCatalogServiceOptions,
  type UserCaseCatalogPort,
} from './service.js';

export { useClientUserCaseCatalogService } from './hooks.js';
