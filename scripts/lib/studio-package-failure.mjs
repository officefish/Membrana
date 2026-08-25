/**
 * Зуб #2147/№5, классификатор падений упаковки Studio.
 *
 * Один и тот же stderr (`open …d3dcompiler_47.dll: Access is denied`,
 * ERR_ELECTRON_BUILDER_CANNOT_EXECUTE) имеет МИНИМУМ ТРИ причины с разным
 * лекарством (вещдоки 21.08 и 25.08):
 *   leftover        — остаток прерванной сборки: release/win-unpacked существовал
 *                     ДО запуска → удалить каталог и пересобрать (21.08: сработало
 *                     с первого раза, AV не при чём);
 *   app-running     — файл держит запущенный экземпляр Studio → закрыть приложение
 *                     (ни исключение AV, ни удаление каталога не помогут);
 *   external-holder — каталог был чист и приложение не запущено → внешний держатель
 *                     (антивирус/индексатор на свежезаписанном бинаре, 25.08 у Г):
 *                     одна повторная попытка, исключение AV на release/, fallback —
 *                     артефакт CI.
 * Свести всё к одной причине — дать неработающее лекарство двум другим.
 */

export const DENIED_RE = /Access is denied|EPERM|ERR_ELECTRON_BUILDER_CANNOT_EXECUTE/iu;

/**
 * @param {{ output: string, leftoverExistedBeforeRun: boolean, studioProcessRunning: boolean }} p
 * @returns {{ kind: 'leftover'|'app-running'|'external-holder'|'unknown', file: string|null }}
 */
export function classifyPackageFailure({ output, leftoverExistedBeforeRun, studioProcessRunning }) {
  if (!DENIED_RE.test(output)) return { kind: 'unknown', file: null };
  const file =
    /open (.+?): Access is denied/iu.exec(output)?.[1] ??
    /EPERM[^'"\n]*['"]([^'"\n]+)['"]/iu.exec(output)?.[1] ??
    null;
  if (leftoverExistedBeforeRun) return { kind: 'leftover', file };
  if (studioProcessRunning) return { kind: 'app-running', file };
  return { kind: 'external-holder', file };
}

/**
 * Лекарство по причине — именем файла и конкретным действием, без обобщений.
 * @param {{ kind: string, file: string|null }} c
 * @returns {string[]}
 */
export function packageFailureAdvice(c) {
  const fileLine = c.file ? `Файл: ${c.file}` : 'Файл держателя в выводе не назван.';
  switch (c.kind) {
    case 'leftover':
      return [
        'Упаковка упала на ОСТАТКЕ прерванной сборки (каталог release/win-unpacked существовал до запуска).',
        fileLine,
        'Лекарство: удалить apps/membrana-studio/release/win-unpacked и пересобрать (вещдок 21.08 — исключения AV не потребовались).',
      ];
    case 'app-running':
      return [
        'Файл держит ЗАПУЩЕННЫЙ экземпляр Membrana Studio на этой машине.',
        fileLine,
        'Лекарство: закрыть приложение и пересобрать (исключение AV и чистка каталога тут не помогут).',
      ];
    case 'external-holder':
      return [
        'Каталог был чист и Studio не запущена — файл держит внешний процесс (антивирус/индексатор на свежезаписанном бинаре, вещдок Г 25.08).',
        fileLine,
        'Лекарство: добавить исключение AV на apps/membrana-studio/release/ и повторить сборку.',
        'Fallback: взять установщик из артефакта CI (шаг «Package Membrana Studio»): gh run list --workflow unit-tests.yml → gh run download <run-id>.',
      ];
    default:
      return ['Падение упаковки не классифицировано — смотри вывод electron-builder выше.'];
  }
}
