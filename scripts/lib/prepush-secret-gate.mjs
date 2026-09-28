/**
 * Предикат достижимости секрет-гейта в предпушевом хуке (#2495, граница к #1262).
 *
 * ЗАЧЕМ. До 28.09 секрет-скан диапазона стоял восьмым шагом `.githooks/pre-push`, а
 * выше него — зуб сети, краснеющий по КАЛЕНДАРЮ (снимок старше 48 ч). При `set -e`
 * это значит: в день без вечернего ритуала секрет-скан не запускался ни у кого — его
 * вытеснял отказ на постороннем файле. А единственным названным обходом того отказа
 * был общий `SKIP_PREPUSH=1`, который гасит и секрет-скан заодно. То есть календарь
 * чужого артефакта выключал жёсткую границу двумя разными путями.
 *
 * Здесь проверяются ровно два свойства, оба — про достижимость, не про текст:
 *   1. секрет-скан не спрятан ни под каким условием окружения;
 *   2. ничто не может его вытеснить — он идёт до всех прочих шагов.
 *
 * Плюс отдельный предикат: уход за снимком в предпуше не блокирует (иначе первое
 * свойство снова начнёт зависеть от календаря, а читателя снова пошлют в SKIP_PREPUSH).
 */

/** Шаг секрет-скана диапазона (#1262). */
export const SECRET_GATE_STEP = 'node scripts/secret-gate-push.mjs';

/** Шаг зуба контейнера сети (#1449) — тот, что краснел по календарю. */
export const NETWORK_TOOTH_STEP = 'node scripts/network/tooth.mjs';

/** Ключ, которым уход за снимком объявлен предупреждением, а не отказом (#2495). */
export const UPKEEP_WARN_FLAG = '--snapshot-upkeep=warn';

/**
 * Шаги хука — строки, которые ЗАПУСКАЮТ проверку (`node …` / `yarn …`), с глубиной
 * вложенности в условные блоки. `echo` шагом не считается: он ничего не проверяет.
 *
 * @param {string} hookText
 * @returns {{ line: number, command: string, depth: number, conditional: boolean }[]}
 */
export function hookSteps(hookText) {
  const lines = String(hookText ?? '').split(/\r?\n/u);
  const steps = [];
  let depth = 0;
  for (let i = 0; i < lines.length; i += 1) {
    // Комментарий убираем целиком: в нём команды перечисляются как цитаты.
    const line = lines[i].replace(/^(\s*)#.*$/u, '$1');
    if (/^\s*(if|case)\b/u.test(line)) depth += 1;
    else if (/^\s*(fi|esac)\b/u.test(line)) depth -= 1;
    const m = /^\s*((?:node|yarn)\s+\S.*)$/u.exec(line);
    if (!m) continue;
    steps.push({
      line: i + 1,
      command: m[1].trim(),
      depth,
      conditional: depth > 0 || /&&|\|\|/u.test(line),
    });
  }
  return steps;
}

/**
 * Блок комментария, лежащий над строкой (через `echo`-строки тоже смотрим):
 * именно там хук объясняет читателю, чем обходить шаг.
 *
 * @param {string} hookText
 * @param {number} line номер строки шага (1-based)
 * @returns {string}
 */
export function commentBlockAbove(hookText, line) {
  const lines = String(hookText ?? '').split(/\r?\n/u);
  const out = [];
  for (let i = line - 2; i >= 0; i -= 1) {
    const raw = lines[i];
    if (/^\s*#/u.test(raw)) {
      out.unshift(raw);
      continue;
    }
    if (/^\s*echo\b/u.test(raw) || raw.trim() === '') {
      if (out.length) break; // блок кончился
      continue;
    }
    break;
  }
  return out.join('\n');
}

/**
 * Достижимость секрет-гейта. Пустой список — свойство держится.
 *
 * @param {string} hookText содержимое .githooks/pre-push
 * @returns {string[]} находки
 */
export function auditSecretGateReach(hookText) {
  const findings = [];
  const text = String(hookText ?? '');
  const steps = hookSteps(text);

  if (!/^\s*set -e\s*$/mu.test(text)) {
    findings.push('нет `set -e` — отказ шага станет советом, и ни один гейт больше не гейт');
  }

  const gates = steps.filter((s) => s.command.startsWith(SECRET_GATE_STEP));
  if (gates.length === 0) {
    findings.push(`в хуке нет шага секрет-скана (${SECRET_GATE_STEP}) — #1262 не исполняется вовсе`);
    return findings;
  }
  if (gates.length > 1) {
    findings.push(
      `шаг секрет-скана встречается ${gates.length} раза (строки ${gates.map((g) => g.line).join(', ')}) — какой исполняется, читателю не видно`,
    );
  }

  const gate = gates[0];
  if (gate.conditional) {
    findings.push(
      `секрет-скан (#1262) стоит под условием (строка ${gate.line}) — его можно выключить флагом окружения`,
    );
  }

  const preempting = steps.filter((s) => s.line < gate.line);
  if (preempting.length) {
    findings.push(
      `секрет-скан не первый: при \`set -e\` его вытесняет отказ выше — ${preempting
        .map((s) => `${s.command} (строка ${s.line})`)
        .join(', ')}`,
    );
  }
  return findings;
}

/**
 * Уход за снимком сети в предпуше не блокирует и не посылает читателя в общий обход.
 *
 * @param {string} hookText содержимое .githooks/pre-push
 * @returns {string[]} находки
 */
export function auditSnapshotUpkeepNotBlocking(hookText) {
  const findings = [];
  const text = String(hookText ?? '');
  const tooth = hookSteps(text).find((s) => s.command.startsWith(NETWORK_TOOTH_STEP));
  if (!tooth) {
    findings.push(`в хуке нет шага зуба сети (${NETWORK_TOOTH_STEP}) — проверять свойство не на чем`);
    return findings;
  }
  if (!tooth.command.includes(UPKEEP_WARN_FLAG)) {
    findings.push(
      `зуб сети вызван без ${UPKEEP_WARN_FLAG} (строка ${tooth.line}) — протухший по календарю снимок снова роняет push постороннего изменения (#2495)`,
    );
  }
  const block = commentBlockAbove(text, tooth.line);
  // Любое указание обходить ИМЕННО этот шаг общим выключателем: именно оно 27.09 и было
  // единственным доступным человеку ответом на календарный отказ.
  if (/обход[^\n]*SKIP_PREPUSH/iu.test(block)) {
    findings.push(
      'блок зуба сети снова посылает за обходом в общий SKIP_PREPUSH=1 — это гасит и секрет-скан #1262',
    );
  }
  return findings;
}
