/**
 * Источник диффа для ревью PR — с ЯВНОЙ базой.
 *
 * Блок b2 плана `docs/sprint/cut/review-diff-explicit-base.json` (карточка
 * `review-diff-explicit-base`, иссью #1771, строка 7 десятки хендофа 08.08).
 *
 * ПОВОД. Ревью в режиме `--pr` брало дифф из `gh pr diff` — ручки БЕЗ явной базы, и её
 * список файлов кэшируется на стороне GitHub. 07.08 на PR #1769 она дала 23 файла против
 * 13 у `compare` и у локального git: ревью назвало в разборе файлы соседского PR, уже
 * влитого в ствол. Этажом выше тот же прогон считал пути честно (`code-review.mjs:132`) —
 * два источника правды о предмете ревью в одном прогоне.
 *
 * Опасное направление названо в иссью: если кэш отстанет так, что часть настоящего
 * изменения в дифф не попадёт, ревьюер её не увидит, а вердикт всё равно привяжется к SHA
 * и откроет мердж. Гейт останется формально зелёным, будучи фактически пустым на этих
 * файлах.
 *
 * ЧИСТАЯ ОТ ПОРТОВ. Ни `spawnSync`, ни сети здесь нет: процесс живёт в адаптерах, которые
 * приносит вызывающий. Так зубы проверяют правило, а не наличие интернета — требование
 * исполнителя блока: «фикстуры обеих ручек, сеть не нужна».
 */

/**
 * Потолок `files[]` у ручки compare. Ответ обрезается молча — поля «усечено» в нём нет,
 * поэтому длина ровно в потолок читается как подозрение на обрез, а не как факт полноты.
 */
export const COMPARE_FILES_CAP = 300;

/** Источники, которыми может быть добыт дифф. Список закрыт: источник попадает в провенанс. */
export const DIFF_SOURCES = Object.freeze({
  COMPARE: 'gh-compare',
  LOCAL: 'git-local',
  LOCAL_AFTER_TRUNCATION: 'git-local:truncated-fallback',
});

/**
 * Похоже ли, что ответ `compare` обрезан.
 *
 * Два признака, оба от исполнителя блока: длина ровно в потолок и файл с изменениями, но
 * без патча. Второй ловит крупные и бинарные файлы — для них GitHub патч не отдаёт, и
 * молча ревьюить «изменение без содержимого» нельзя.
 *
 * @param {{files?: readonly {patch?: string, changes?: number, status?: string}[]}} compare
 */
export function looksTruncated(compare) {
  const files = Array.isArray(compare?.files) ? compare.files : [];
  if (files.length >= COMPARE_FILES_CAP) return true;
  return files.some((f) => f?.status !== 'removed' && !f?.patch && Number(f?.changes) > 0);
}

/** Собрать текст диффа из `files[].patch` — форма, привычная ревьюеру. */
export function patchesToDiff(compare) {
  const files = Array.isArray(compare?.files) ? compare.files : [];
  return files
    .filter((f) => f?.patch)
    .map((f) => `diff --git a/${f.filename} b/${f.filename}\n${f.patch}`)
    .join('\n');
}

/** Строка `--stat`-вида из `files[]`: имя и счётчики, как их видит сам GitHub. */
export function filesToStat(compare) {
  const files = Array.isArray(compare?.files) ? compare.files : [];
  const rows = files.map((f) => ` ${f.filename} | ${f.changes ?? 0} +${f.additions ?? 0}/-${f.deletions ?? 0}`);
  const add = files.reduce((s, f) => s + (Number(f.additions) || 0), 0);
  const del = files.reduce((s, f) => s + (Number(f.deletions) || 0), 0);
  return [...rows, ` ${files.length} files changed, ${add} insertions(+), ${del} deletions(-)`].join('\n');
}

/**
 * Провенанс источника — блок под маркером вердикта.
 *
 * Блоком, а не строкой: решение исполнителя блока — одна строка плохо читается и ломается
 * на переносах. Поле `base:` в самом маркере вердикта (блок b1) остаётся машинным входом
 * гейта; этот блок — для человека и для постфактум-воспроизведения.
 */
export function renderSourceProvenance(r) {
  return [
    '<!-- review-source',
    `  source: ${r?.source ?? 'unknown'}`,
    `  base_ref: ${r?.baseRef ?? '—'}`,
    `  merge_base: ${r?.mergeBase ?? '—'}`,
    `  head_sha: ${r?.headSha ?? '—'}`,
    `  head_match: ${r?.headMatch === null || r?.headMatch === undefined ? 'unknown' : String(r.headMatch)}`,
    `  files: ${r?.files ?? 0}`,
    `  truncated: ${Boolean(r?.truncated)}`,
    '-->',
  ].join('\n');
}

/**
 * Добыть дифф PR с явной базой.
 *
 * Порядок источников и условия падения — решение исполнителя блока:
 *   1. `gh api compare` — отдаёт `merge_base_commit` и файлы СОГЛАСОВАННО, в одном ответе,
 *      и работает для соседнего PR без выкачки ветки;
 *   2. локальный `git merge-base` + `git diff` (канон `pr-recreate.mjs:88-93`) — когда
 *      ручка отказала ИЛИ её ответ похож на обрезанный;
 *   3. честный отказ — когда ни один источник не дал базу. `gh pr diff` не участвует.
 *
 * Расхождение локального HEAD с `headRefOid` PR НАЗЫВАЕТСЯ (`headMatch: false`) и запрещает
 * локальный источник: ревьюить локальное состояние, привязывая вердикт к head PR, значило
 * бы ровно ту подмену предмета, против которой карточка и заведена.
 *
 * @param {{pr: string|number, slug: string, ports: {ghApi: Function, ghJson: Function, git: Function}}} input
 * @returns {{ok: boolean, source?: string, baseRef?: string, mergeBase?: string|null, headSha?: string|null, headMatch?: boolean|null, files?: number, truncated?: boolean, diff?: string, stat?: string, meta?: object, reason?: string}}
 */
export function resolveReviewDiff({ pr, slug, ports }) {
  const { ghJson, ghApi, git } = ports ?? {};
  const meta = ghJson?.(['pr', 'view', String(pr), '--repo', slug, '--json',
    'number,title,body,state,baseRefName,headRefName,headRefOid,files,commits']);
  if (!meta?.ok) {
    return { ok: false, reason: `gh pr view ${pr}: ${meta?.reason ?? 'отказ'}` };
  }
  const info = meta.value ?? {};
  const baseRef = info.baseRefName ?? 'main';
  const headOid = info.headRefOid ?? null;

  const localHead = git?.(['rev-parse', 'HEAD']);
  const localHeadSha = localHead?.ok ? String(localHead.value).trim() : null;
  const headMatch = headOid && localHeadSha ? headOid === localHeadSha : null;

  const compare = ghApi?.([`repos/${slug}/compare/${baseRef}...${headOid ?? info.headRefName}`]);
  if (compare?.ok) {
    const body = compare.value ?? {};
    const truncated = looksTruncated(body);
    if (!truncated) {
      return {
        ok: true,
        source: DIFF_SOURCES.COMPARE,
        baseRef,
        mergeBase: body.merge_base_commit?.sha ?? null,
        headSha: headOid,
        headMatch,
        files: Array.isArray(body.files) ? body.files.length : 0,
        truncated: false,
        diff: patchesToDiff(body),
        stat: filesToStat(body),
        meta: info,
      };
    }
    const local = localDiff({ git, baseRef, head: headOid, headMatch, info, baseRefName: baseRef });
    return local.ok
      ? { ...local, source: DIFF_SOURCES.LOCAL_AFTER_TRUNCATION, truncated: true }
      : {
          ok: true,
          source: DIFF_SOURCES.COMPARE,
          baseRef,
          mergeBase: body.merge_base_commit?.sha ?? null,
          headSha: headOid,
          headMatch,
          files: Array.isArray(body.files) ? body.files.length : 0,
          truncated: true,
          diff: patchesToDiff(body),
          stat: filesToStat(body),
          meta: info,
        };
  }

  // Ручка отказала — локальный источник. Он законен ТОЛЬКО когда локальный head и есть
  // head PR: иначе вердикт привяжется к одному коду, а осмотрен будет другой.
  if (headMatch === false) {
    return {
      ok: false,
      headMatch,
      reason:
        `compare недоступен (${compare?.reason ?? 'отказ'}), а локальный HEAD ${String(localHeadSha).slice(0, 8)} ` +
        `не совпадает с head PR ${String(headOid).slice(0, 8)} — ревьюить локальное состояние под чужой вердикт нельзя`,
    };
  }
  const local = localDiff({ git, baseRef, head: headOid ?? localHeadSha, headMatch, info, baseRefName: baseRef });
  return local.ok
    ? { ...local, source: DIFF_SOURCES.LOCAL }
    : { ok: false, reason: `ни compare, ни локальный git не дали базу: ${local.reason}` };
}

/** Локальный источник по канону `pr-recreate.mjs:88-93`: явная merge-base, затем дифф от неё. */
function localDiff({ git, baseRef, head, headMatch, info }) {
  if (!git || !head) return { ok: false, reason: 'git-порт или head не даны' };
  const mb = git(['merge-base', head, `origin/${baseRef}`]);
  if (!mb?.ok) return { ok: false, reason: `merge-base ${head}↔origin/${baseRef}: ${mb?.reason ?? 'отказ'}` };
  const mergeBase = String(mb.value).trim();
  const diff = git(['diff', mergeBase, head]);
  const stat = git(['diff', '--stat', mergeBase, head]);
  const names = git(['diff', '--name-only', mergeBase, head]);
  if (!diff?.ok) return { ok: false, reason: `git diff ${mergeBase.slice(0, 8)}..${String(head).slice(0, 8)}: ${diff?.reason ?? 'отказ'}` };
  return {
    ok: true,
    baseRef,
    mergeBase,
    headSha: head,
    headMatch,
    files: names?.ok ? String(names.value).split('\n').filter(Boolean).length : 0,
    truncated: false,
    diff: String(diff.value),
    stat: stat?.ok ? String(stat.value) : '',
    meta: info,
  };
}
