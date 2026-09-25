/**
 * Зов bash-скрипта из Node на Windows — один носитель на всех (#2420).
 *
 * ЗАЧЕМ. 23.09 общий прогон `yarn test:scripts` падал на `disk-watchdog.test.mjs` с exit 127,
 * хотя тот же файл прямым `node --test` был зелёным. Причина не в тесте: путь уезжал в `bash`
 * в Windows-форме (`C:\Users\…`), а msys-слой Git Bash читает командную строку сам и снимает
 * обратные косые как экранирование — до скрипта доезжает `C:Users…`. Файла с таким именем нет,
 * bash отвечает 127, и общий прогон краснеет молча: на Linux-CI этого не видно вовсе.
 *
 * Цена не во времени, а в доверии: «общий прогон красный» перестаёт что-либо значить, и
 * настоящие отказы прячутся за постоянным ложным.
 *
 * ЛЕКАРСТВО. Путь для `bash` всегда в POSIX-форме: прямые косые съедать нечем. Диск `C:\x`
 * становится `C:/x` — Git Bash такую форму понимает, а мангления в ней не бывает по устройству.
 *
 * ВТОРОЕ: 127 больше не молчит. Он значит ровно одно — «интерпретатор не нашёл скрипт», — и
 * зовущий получает названную причину вместо номера.
 *
 * Чистые функции; порождение процесса — у вызывающего.
 */

/**
 * Путь скрипта в форме, которую bash не испортит.
 *
 * Обратные косые заменяются на прямые. `C:\Users\x` → `C:/Users/x`: Git Bash принимает эту
 * форму как есть, а экранировать в ней нечего. UNC (`\\host\share`) → `//host/share`.
 *
 * @param {string} scriptPath
 * @returns {string}
 */
export function bashScriptArg(scriptPath) {
  const raw = String(scriptPath ?? '');
  if (raw.length === 0) throw new Error('bash-invoke: пустой путь скрипта');
  return raw.split('\\').join('/');
}

/**
 * Аргументы для `spawnSync('bash', …)`: сначала путь скрипта, затем аргументы скрипта.
 * Аргументы скрипта НЕ трогаются — они не пути, и нормализация их бы исказила.
 *
 * @param {string} scriptPath
 * @param {readonly string[]} [args]
 * @returns {string[]}
 */
export function bashArgv(scriptPath, args = []) {
  return [bashScriptArg(scriptPath), ...args.map((a) => String(a))];
}

/** Код, которым bash отвечает «не нашёл, что запускать». */
export const BASH_NOT_FOUND = 127;

/**
 * Объяснение исхода зова — предмет вместо номера.
 *
 * @param {{status?: number|null, error?: {code?: string}|null}} result итог spawnSync
 * @param {string} scriptPath путь, который зову передали
 * @returns {string|null} названная причина или null, если объяснять нечего
 */
export function explainBashFailure(result, scriptPath) {
  if (result?.error?.code === 'ENOENT') {
    return (
      'bash-invoke: интерпретатор bash не найден на PATH. ' +
      'На Windows это Git Bash («C:\\Program Files\\Git\\usr\\bin\\bash.exe»); ' +
      'bash из WSL (System32\\bash.exe) Windows-пути не читает и тоже даст 127.'
    );
  }
  if (result?.status === BASH_NOT_FOUND) {
    return (
      `bash-invoke: bash не нашёл скрипт «${bashScriptArg(scriptPath)}» (код 127). ` +
      'Обычная причина на Windows — путь ушёл в Windows-форме и обратные косые съело ' +
      'экранирование msys; путь обязан быть в POSIX-форме. Вторая причина — bash из WSL.'
    );
  }
  return null;
}
