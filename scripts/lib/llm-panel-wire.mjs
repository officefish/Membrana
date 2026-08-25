/**
 * Зуб llm-panel-wire (#2147/№4): рабочие LLM-вызовы из scripts/ идут ПАНЕЛЬНОЙ
 * цепочкой (invokeProcedureLlm), а не напрямую в провайдера. Класс повторов:
 * потолок одного провайдера ронял процедуру целиком (план недели 24.08 — #2115;
 * до 25.08 оставались drift-anchor-run и два генератора синтеза).
 *
 * Сторож — греп по маркерам прямого вызова вне белого списка. Белый список —
 * ЯВНЫЙ и с причиной у каждой строки: новое имя добавляется только сюда,
 * с причиной, на ревью — молча мимо панели не проехать.
 */

/** Маркеры прямого вызова Anthropic Messages API. */
export const DIRECT_CALL_PATTERN = /api\.anthropic\.com|anthropicPost\(/u;

/**
 * Белый список: путь (posix, от корня репо) → причина законности прямого вызова.
 * Тестовые файлы (*.test.mjs) не судятся вовсе — там живут порча-фикстуры.
 */
export const LLM_PANEL_WHITELIST = new Map([
  ['scripts/anthropic-smoke.mjs', 'проба канала как таковая — судит сам провайдер (класс smoke)'],
  ['scripts/anthropic-task.mjs', 'ручная проба Messages API с файлом (класс smoke, зовётся руками)'],
  ['scripts/headroom-claude.mjs', 'headroom-замер провайдера — панель исказила бы замер'],
  ['scripts/headroom-start.mjs', 'headroom-замер провайдера — панель исказила бы замер'],
  ['scripts/task-closure-review.mjs', 'КАНДИДАТ на пересадку: вне окна #2147, назван вслух — не молчаливое исключение'],
  ['scripts/_anthropic-env.mjs', 'транспортная библиотека: здесь anthropicPost ОПРЕДЕЛЁН'],
  ['scripts/lib/llm-procedure-ritual.mjs', 'сам панельный канал: anthropic — одно из его звеньев'],
  ['scripts/lib/llm-panel-wire.mjs', 'этот сторож: несёт маркеры как данные'],
]);

/**
 * Чистая проверка: список {path, content} → нарушения [{path, line, excerpt}].
 * @param {Array<{path: string, content: string}>} files posix-пути от корня репо
 * @param {{whitelist?: Map<string,string>}} [opts]
 */
export function scanDirectLlmCalls(files, opts = {}) {
  const whitelist = opts.whitelist ?? LLM_PANEL_WHITELIST;
  const violations = [];
  for (const { path, content } of files) {
    const posix = path.replace(/\\/gu, '/');
    if (posix.endsWith('.test.mjs')) continue;
    if (whitelist.has(posix)) continue;
    const lines = content.split(/\r?\n/u);
    for (let i = 0; i < lines.length; i += 1) {
      if (DIRECT_CALL_PATTERN.test(lines[i])) {
        violations.push({ path: posix, line: i + 1, excerpt: lines[i].trim().slice(0, 120) });
      }
    }
  }
  return violations;
}
