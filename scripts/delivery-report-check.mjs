#!/usr/bin/env node
/**
 * Приёмка доклада сессии о доставке (зуб #2147/№3): yarn report:delivery-check <файл>
 * (или текст в stdin). Каждая заявка «влит/доставлен PR #N» обязана нести
 * свидетельство ствола (см. scripts/lib/delivery-report.mjs; шаблон —
 * docs/templates/SESSION_DELIVERY_REPORT.md).
 *
 * Exit: 0 — все заявки подтверждены (или заявок нет) · 1 — есть неподтверждённые ·
 *       2 — нет входа (это отказ инструмента, не вердикт о докладе).
 */
import { readFileSync } from 'node:fs';

import { deliveryReportProblems, extractDeliveryClaims } from './lib/delivery-report.mjs';

const file = process.argv[2];
let text;
try {
  text = file ? readFileSync(file, 'utf8') : readFileSync(0, 'utf8');
} catch (e) {
  console.error(`report:delivery-check — вход не прочитан: ${e.message}`);
  process.exit(2);
}
if (!text?.trim()) {
  console.error('report:delivery-check — пустой вход (файл или stdin)');
  process.exit(2);
}

const problems = deliveryReportProblems(text);
if (problems.length > 0) {
  console.error('report:delivery-check — доклад НЕ принимается:');
  for (const p of problems) console.error(`  ✗ ${p}`);
  process.exit(1);
}
const claims = extractDeliveryClaims(text);
console.log(
  claims.length > 0
    ? `report:delivery-check — доставки подтверждены стволом: ${claims.map((n) => `#${n}`).join(', ')}`
    : 'report:delivery-check — заявок о доставке нет, проверять нечего',
);
