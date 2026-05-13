/**
 * Правила пропуска путей при обходе репозитория (CI / context-collector).
 * Не читать содержимое чувствительных файлов и не заходить в тяжёлые каталоги.
 */
export const CONTEXT_COLLECT_IGNORE_GLOBS = [
  'node_modules/**',
  '.yarn/**',
  '.pnp.*',
  'dist/**',
  'build/**',
  'coverage/**',
  '.turbo/**',
  '.env',
  '.env.*',
  '!.env.example',
  '.git/**',
];

const SENSITIVE_SEGMENTS = new Set([
  'node_modules',
  '.git',
  '.yarn',
  'dist',
  'build',
  'coverage',
  '.turbo',
]);

const SENSITIVE_FILES = new Set(['.env', '.env.local', '.env.development.local', '.env.production.local']);

/**
 * @param {string} posixPath сегменты через `/`, без ведущего `./`
 * @returns {boolean}
 */
export function shouldSkipContextPath(posixPath) {
  if (!posixPath || posixPath === '.' || posixPath === '..') return true;
  const norm = posixPath.replace(/\\/g, '/').replace(/^\.\/+/, '');
  const lower = norm.toLowerCase();
  if (lower === '.env.example' || lower.endsWith('/.env.example')) return false;
  if (lower === '.env' || lower.startsWith('.env.')) return true;
  const segments = norm.split('/').filter(Boolean);
  for (const seg of segments) {
    if (SENSITIVE_SEGMENTS.has(seg)) return true;
    if (SENSITIVE_FILES.has(seg)) return true;
  }
  return false;
}
