/**
 * Общие чистые форматтеры строк для гранул tasks-readme-*.
 *
 * Живёт внутри контейнера (не в scripts/), чтобы гранулы не импортировали через
 * границу docs/ → scripts/. Каталог начинается с `_`, поэтому `loadGranules`
 * его пропускает: `readGranuleDir` возвращает null без `granule.json`.
 *
 * Чистота: ни fs, ни Date, ни process. Тот же реестр → те же строки.
 */

const ISSUE_URL = 'https://github.com/officefish/Membrana/issues';

/**
 * Ссылка на промпт относительно docs/tasks/README.md:
 * `docs/prompts/X.md` → `[`X.md`](../prompts/X.md)`.
 * @param {string | null | undefined} promptPath
 */
export function promptLink(promptPath) {
  if (!promptPath) return '—';
  const rel = promptPath.replace(/\\/g, '/').replace(/^docs\//, '');
  return `[\`${promptPath.split('/').pop()}\`](../${rel})`;
}

/** @param {object} t */
export function activeRow(t) {
  const gh = t.githubIssue != null ? `[#${t.githubIssue}](${ISSUE_URL}/${t.githubIssue})` : '—';
  return `| \`${t.id}\` | ${t.title} | ${t.size} | ${promptLink(t.promptPath)} | ${gh} |`;
}

/** @param {object} t */
export function archivedRow(t) {
  const card = `[карточка](./archive/${t.id}.md)`;
  const gh = t.githubIssue != null ? `#${t.githubIssue}` : '—';
  const ghPending = t.githubIssue != null && !t.githubIssueClosedAt ? ' (Issue открыт)' : '';
  return `| \`${t.id}\` | ${t.title} | ${t.archivedAt ?? '—'} | ${promptLink(t.promptPath)} | ${gh}${ghPending} | ${card} |`;
}

/**
 * Активные карточки в порядке реестра (конвенция «свежие сверху» — вставка в голову).
 * @param {{ tasks?: object[] }} registry
 */
export function selectActive(registry) {
  return (registry?.tasks ?? []).filter((t) => t?.status === 'active');
}

/**
 * Архивные карточки: свежие сверху по archivedAt. Сортировка стабильная —
 * при равных датах сохраняется порядок реестра, иначе генерация не идемпотентна.
 * @param {{ tasks?: object[] }} registry
 */
export function selectArchived(registry) {
  return (registry?.tasks ?? [])
    .filter((t) => t?.status === 'archived')
    .sort((a, b) => (b.archivedAt ?? '').localeCompare(a.archivedAt ?? ''));
}

/** @param {object[]} active */
export function renderActiveTable(active) {
  if (active.length === 0) {
    return '_Нет активных задач. Новую добавь в `registry.json` (см. workflow)._';
  }
  return [
    '| ID | Название | Размер | Промпт | GitHub |',
    '|----|----------|--------|--------|--------|',
    ...active.map(activeRow),
  ].join('\n');
}

/** @param {object[]} archived */
export function renderArchiveTable(archived) {
  if (archived.length === 0) return '_Архив пуст._';
  return [
    '| ID | Название | Архивировано | Промпт | GitHub | Карточка |',
    '|----|----------|--------------|--------|--------|----------|',
    ...archived.map(archivedRow),
  ].join('\n');
}
