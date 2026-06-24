export type {
  UserCaseValidationError,
  UserCaseValidationResult,
  UserCaseValidationSeverity,
} from './types.js';
export {
  isUserCaseValidationValid,
  toUserCaseValidationResult,
} from './types.js';

export { validateBlockLinks } from './validate-block-links.js';
export { validateBlockParameters } from './validate-block-parameters.js';
export { validateUserCaseStructure } from './validate-user-case-structure.js';
export { validateUserCaseDocument } from './validate-user-case-document.js';

export {
  collectValidationErrorNodeIds,
  mergePreRunWithUserCaseDocumentIssues,
  userCaseErrorsToPreRunIssues,
} from './validation-bridge.js';
