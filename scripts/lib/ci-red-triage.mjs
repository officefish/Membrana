/**
 * Разбор красного CI: моё или не моё (#1493 Ф4).
 *
 * ВЕЩДОК 30.07 (PR #1487): CI упал на двух тестах детекторов —
 * `does not provide an export named 'fuseDetectorConfidences'`. Символ переименован 13.07,
 * в кеше CI лежал устаревший dist. Правка касалась консилиума и детекторов не трогала.
 * Чтобы это установить, ушло четыре шага (`pr checks` → `run list` → `run view --log-failed`
 * → грепы) плюс сверка зелени main на базе ветки. Перезапуск джобы дал зелёное на том же
 * коммите.
 *
 * Вопрос, на который отвечает разбор, один: **пересекаются ли файлы упавших тестов с
 * файлами диффа**. Пусто — падение вне диффа, и первый ход не «искать у себя», а
 * `gh run rerun --failed`. Не пусто — своё, читать лог.
 *
 * Осторожность в формулировках намеренная: «вероятно вне диффа» вместо «флак». Инструмент
 * не умеет доказать флак — он умеет показать, что причина лежит не в изменённых файлах.
 *
 * Модуль чистый: ни сети, ни ФС.
 */

/** Исходы разбора. Перечень закрытый. */
export const TRIAGE_STATES = ['моё', 'вне диффа', 'не опознано'];

/**
 * Пути из строк лога упавших тестов.
 *
 * Ищем два вида следов: путь файла теста (`scripts/x.test.mjs`, `packages/a/b.test.ts`)
 * и модуль из ошибки резолва (`'./detection-fusion.js'`). Второй важен: именно он назвал
 * настоящую причину 30.07, а имя упавшего теста о ней молчало.
 *
 * @param {string} logText
 * @returns {{files: string[], modules: string[]}}
 */
export function extractFailureTargets(logText) {
  const text = String(logText ?? '');
  const files = new Set();
  const modules = new Set();
  for (const m of text.matchAll(/\b((?:apps|packages|scripts|docs)\/[\w./-]+\.(?:m?[jt]sx?|json))/gu)) {
    files.add(m[1]);
  }
  for (const m of text.matchAll(/requested module '([^']+)'/gu)) modules.add(m[1]);
  for (const m of text.matchAll(/Cannot find module '([^']+)'/gu)) modules.add(m[1]);
  return { files: [...files], modules: [...modules] };
}

/** Базовое имя без расширения: `./detection-fusion.js` → `detection-fusion`. */
export function moduleStem(spec) {
  const tail = String(spec).split(/[\\/]/u).pop() ?? '';
  return tail.replace(/\.(m?[jt]sx?|json)$/u, '');
}

/**
 * @param {{failureFiles: string[], failureModules: string[], diffFiles: string[]}} input
 * @returns {{state: string, overlapFiles: string[], overlapModules: string[], advice: string}}
 */
export function triage(input) {
  const failureFiles = input.failureFiles ?? [];
  const failureModules = input.failureModules ?? [];
  const diffFiles = input.diffFiles ?? [];

  if (failureFiles.length === 0 && failureModules.length === 0) {
    return {
      state: 'не опознано',
      overlapFiles: [],
      overlapModules: [],
      advice: 'в логе не нашлось ни файла теста, ни модуля — читать лог глазами, вывод не подменять',
    };
  }

  const diffSet = new Set(diffFiles);
  const overlapFiles = failureFiles.filter((f) => diffSet.has(f));
  // Модуль сопоставляем по основе имени: в логе он относительный (`./x.js`), в диффе — путь.
  const diffStems = new Set(diffFiles.map((f) => moduleStem(f)));
  const overlapModules = failureModules.filter((m) => diffStems.has(moduleStem(m)));

  if (overlapFiles.length > 0 || overlapModules.length > 0) {
    return {
      state: 'моё',
      overlapFiles,
      overlapModules,
      advice: 'падение пересекается с диффом — причина у тебя, читать лог упавшего прогона',
    };
  }
  return {
    state: 'вне диффа',
    overlapFiles: [],
    overlapModules: [],
    advice: 'ни один упавший файл/модуль не тронут диффом — вероятны кеш или флак; первый ход: gh run rerun --failed',
  };
}

/** @param {{state: string, advice: string}} verdict */
export function renderTriage(verdict, ctx = {}) {
  const lines = [`ci:triage — ${verdict.state}: ${verdict.advice}`];
  if (ctx.failureFiles?.length) lines.push(`  упавшие файлы: ${ctx.failureFiles.join(', ')}`);
  if (ctx.failureModules?.length) lines.push(`  модули из ошибок: ${ctx.failureModules.join(', ')}`);
  if (verdict.overlapFiles?.length) lines.push(`  пересечение по файлам: ${verdict.overlapFiles.join(', ')}`);
  if (verdict.overlapModules?.length) lines.push(`  пересечение по модулям: ${verdict.overlapModules.join(', ')}`);
  return lines;
}
