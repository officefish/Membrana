import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const STRATEGIC_DOCS_CATALOG_REL = 'docs/containers/strategic-docs/workshop.catalog.json';
export const AFFINE_FREEZE_BYPASS_FLAG = '--allow-affine-frozen-publish';

export function stripAffineFreezeBypass(argv) {
  const kept = [];
  let bypass = false;
  for (const a of argv) {
    if (a === AFFINE_FREEZE_BYPASS_FLAG) bypass = true;
    else kept.push(a);
  }
  return { argv: kept, bypass };
}

export function loadAffinePublishStatus(repoRoot) {
  const catalog = JSON.parse(readFileSync(join(repoRoot, STRATEGIC_DOCS_CATALOG_REL), 'utf8'));
  const status = catalog?.surfaceStatus?.affinePublish;
  if (!status || typeof status !== 'object') {
    return { status: 'unknown', source: STRATEGIC_DOCS_CATALOG_REL, raw: null };
  }
  return {
    status: typeof status.status === 'string' ? status.status : 'unknown',
    source: STRATEGIC_DOCS_CATALOG_REL,
    raw: status,
  };
}

export function affineFreezeMessage({ commandName, source, raw }) {
  const reason = raw?.reason ?? 'Affine publish leg is frozen for this container.';
  const precedent = raw?.precedent ?? 'docs/precedents/2026-07-26-affine-editor-paradigm-impedance.md';
  const since = raw?.since ? ` since ${raw.since}` : '';
  const bypass = raw?.bypassFlag ?? AFFINE_FREEZE_BYPASS_FLAG;
  return [
    `${commandName}: Affine publish is frozen${since}.`,
    `Reason: ${reason}`,
    `Precedent: ${precedent}`,
    `Status source: ${source}#surfaceStatus.affinePublish`,
    `Explicit bypass: rerun with ${bypass}`,
  ].join('\n');
}

export function guardAffinePublishFreeze(repoRoot, argv, commandName) {
  const { argv: cleanArgv, bypass } = stripAffineFreezeBypass(argv);
  if (cleanArgv.includes('--help') || cleanArgv.includes('-h')) return cleanArgv;

  const loaded = loadAffinePublishStatus(repoRoot);
  if (loaded.status === 'frozen' && !bypass) {
    throw new Error(affineFreezeMessage({ commandName, ...loaded }));
  }
  return cleanArgv;
}
