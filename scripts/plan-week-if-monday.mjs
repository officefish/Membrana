/**
 * Понедельничный шаг утреннего ритуала: генерирует план недели (plan:week)
 * только по понедельникам — в остальные дни тихо пропускается.
 *
 * Решение владельца 2026-07-06: процедура стратегии недели становится
 * регулярной через ritual:day, не отдельным ручным запуском.
 *
 * Запуск:
 *   node scripts/plan-week-if-monday.mjs           # в составе yarn ritual:day
 *   node scripts/plan-week-if-monday.mjs --force   # принудительно в любой день
 */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Нужно ли сегодня генерировать план недели. */
export function shouldRunWeeklyPlan(date = new Date(), force = false) {
  if (force) return true;
  return date.getDay() === 1; // понедельник (локальное время)
}

function main() {
  const force = process.argv.includes('--force');
  const today = new Date();
  if (!shouldRunWeeklyPlan(today, force)) {
    const dayName = today.toLocaleDateString('ru-RU', { weekday: 'long' });
    console.log(`[plan:week] сегодня ${dayName} — недельный план по понедельникам (пропуск; --force для принудительного).`);
    return;
  }
  console.log('[plan:week] понедельник — генерирую план недели…');
  const scriptPath = join(dirname(fileURLToPath(import.meta.url)), 'strategic-plan-week.mjs');
  const result = spawnSync(process.execPath, [scriptPath], { stdio: 'inherit' });
  if (result.status !== 0) {
    // Не роняем весь утренний ритуал из-за недельного плана: день важнее.
    console.error(`[plan:week] генерация не удалась (exit ${result.status}) — продолжайте ритуал, запустите вручную: yarn plan:week`);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
