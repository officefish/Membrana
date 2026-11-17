const GHSA_RE = /\bGHSA-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}\b/giu;

export function advisoryKey(finding = {}) {
  const haystack = `${finding.id ?? ''} ${finding.issue ?? ''} ${finding.url ?? ''}`;
  const ghsa = haystack.match(GHSA_RE)?.[0];
  if (ghsa) return ghsa.toLowerCase();

  const pkg = String(finding.pkg ?? '').trim();
  const id = String(finding.id ?? '').trim();
  if (pkg && id) return `${pkg}:${id}`.toLowerCase();
  return '';
}

export function highFindings(snapshot = {}) {
  const findings = Array.isArray(snapshot.findings) ? snapshot.findings : [];
  return findings.filter((finding) => String(finding?.severity ?? '').toLowerCase() === 'high');
}

export function triageKeys(markdown = '') {
  return new Set(String(markdown).match(GHSA_RE)?.map((id) => id.toLowerCase()) ?? []);
}

export function missingHighTriageRows(snapshot = {}, markdown = '') {
  const covered = triageKeys(markdown);
  const triageText = String(markdown).toLowerCase();
  return highFindings(snapshot).filter((finding) => {
    const key = advisoryKey(finding);
    return key && !covered.has(key) && !triageText.includes(key);
  });
}
