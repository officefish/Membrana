import { readFileSync } from 'node:fs';

import { resolveUserCaseDir, repoRootFromScripts } from './usercase-paths.mjs';

/** @typedef {'bundled' | 'tariff' | 'community'} UserCaseTier */
/** @typedef {'exec-lr-v1'} UserCaseLayoutProfile */
/** @typedef {'align' | 'groups' | 'functions' | 'exec-layout'} UserCaseEditorFeature */

/** @type {readonly UserCaseLayoutProfile[]} */
export const USERCASE_LAYOUT_PROFILES = ['exec-lr-v1'];

/** @type {readonly UserCaseTier[]} */
export const USERCASE_TIERS = ['bundled', 'tariff', 'community'];

/** @type {readonly UserCaseEditorFeature[]} */
export const USERCASE_EDITOR_FEATURES = ['align', 'groups', 'functions', 'exec-layout'];

/** @type {readonly string[]} */
export const USERCASE_DEVICE_KINDS = ['microphone', 'playback', 'generic'];

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * @param {unknown} manifest
 * @param {string} [sourceLabel]
 */
export function validateUserCaseManifest(manifest, sourceLabel = 'manifest') {
  if (!isRecord(manifest)) {
    throw new Error(`${sourceLabel}: must be a JSON object`);
  }

  const id = manifest['id'];
  if (typeof id !== 'string' || !/^usercase-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) {
    throw new Error(`${sourceLabel}: id must match usercase-<kebab>`);
  }

  const title = manifest['title'];
  if (typeof title !== 'string' || title.trim().length === 0) {
    throw new Error(`${sourceLabel}: title must be a non-empty string`);
  }

  const deviceKind = manifest['deviceKind'];
  if (typeof deviceKind !== 'string' || !USERCASE_DEVICE_KINDS.includes(deviceKind)) {
    throw new Error(`${sourceLabel}: deviceKind must be one of ${USERCASE_DEVICE_KINDS.join(', ')}`);
  }

  const embeddedDocument = manifest['embeddedDocument'];
  if (typeof embeddedDocument !== 'string' || embeddedDocument.trim().length === 0) {
    throw new Error(`${sourceLabel}: embeddedDocument must be a repo-relative path`);
  }

  const layoutProfile = manifest['layoutProfile'];
  if (typeof layoutProfile !== 'string' || !USERCASE_LAYOUT_PROFILES.includes(layoutProfile)) {
    throw new Error(
      `${sourceLabel}: layoutProfile must be one of ${USERCASE_LAYOUT_PROFILES.join(', ')}`,
    );
  }

  const tier = manifest['tier'];
  if (tier !== undefined) {
    if (typeof tier !== 'string' || !USERCASE_TIERS.includes(tier)) {
      throw new Error(`${sourceLabel}: tier must be one of ${USERCASE_TIERS.join(', ')}`);
    }
    if (tier === 'tariff') {
      const sku = manifest['tariffSku'];
      if (typeof sku !== 'string' || sku.trim().length === 0) {
        throw new Error(`${sourceLabel}: tariffSku required when tier is tariff`);
      }
    }
  }

  const minEditorFeatures = manifest['minEditorFeatures'];
  if (!Array.isArray(minEditorFeatures) || minEditorFeatures.length === 0) {
    throw new Error(`${sourceLabel}: minEditorFeatures must be a non-empty array`);
  }
  for (const feature of minEditorFeatures) {
    if (typeof feature !== 'string' || !USERCASE_EDITOR_FEATURES.includes(feature)) {
      throw new Error(
        `${sourceLabel}: minEditorFeatures entries must be ${USERCASE_EDITOR_FEATURES.join(', ')}`,
      );
    }
  }

  const branches = manifest['branches'];
  if (!isRecord(branches) || Object.keys(branches).length === 0) {
    throw new Error(`${sourceLabel}: branches must be a non-empty object`);
  }

  return /** @type {ValidatedUserCaseManifest} */ (manifest);
}

/**
 * @typedef {object} ValidatedUserCaseManifest
 * @property {string} id
 * @property {string} title
 * @property {string} deviceKind
 * @property {string} embeddedDocument
 * @property {UserCaseLayoutProfile} layoutProfile
 * @property {UserCaseTier} [tier]
 * @property {string} [tariffSku]
 * @property {readonly UserCaseEditorFeature[]} minEditorFeatures
 */

/**
 * @param {string} rawId
 * @param {string} [repoRoot]
 */
export function loadUserCaseManifest(rawId, repoRoot = repoRootFromScripts()) {
  const dir = resolveUserCaseDir(rawId, repoRoot);
  const manifestPath = `${dir}/manifest.json`;
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  return validateUserCaseManifest(manifest, manifestPath);
}
