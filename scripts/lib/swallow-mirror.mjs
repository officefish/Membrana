/**
 * Ласточка-зеркало (Ф2 спринта morning-report-completion #788; тезисы T8/T10
 * шторма storm-morning-two-precedents-2026-07-21).
 *
 * Урок #768: детерминированная СКЛЕЙКА текста из артефактов наследует жаргон —
 * поэтому склейки здесь нет. Механика даёт две вещи: ШАБЛОН-зеркало 5 блоков
 * (структуру) и ГЕЙТ чистоты (структура на месте ∧ жаргона нет). Слова пишет
 * ведущая через линзу Ожегова; гейт Ангелины не пускает воду (T10) и не судит
 * стиль — только проверяемое.
 *
 * Чистые функции без fs/сети.
 */

import { frame } from './day-plan-frame.mjs';
import { externalizeQuery } from './strategy-horizon.mjs';

/**
 * Метки строк ласточки — продуктовые имена слотов frame() в каноническом порядке.
 * Партнёры не знают внутренних названий блоков; порядок — зеркало плана (T8).
 */
export const SWALLOW_LABELS = Object.freeze([
  { slotId: 'magistral', label: 'Главное' },
  { slotId: 'reinforcement', label: 'Также' },
  { slotId: 'perspective', label: 'Смотрим вперёд' },
  { slotId: 'experimental', label: 'Пробуем' },
  { slotId: 'sanitary', label: 'Гигиена' },
]);

/** Метка хвостовой строки деталей — единственное место, где допустимы #N. */
export const DETAILS_LABEL = 'Детали';

/**
 * Шаблон черновика: интро свободное, затем 5 строк-зеркал по порядку frame(),
 * хвост — строка деталей. Ведущая заполняет <…> словами через линзу.
 * @returns {string}
 */
export function buildSwallowSkeleton() {
  const rows = SWALLOW_LABELS.map((l) => `${l.label}: <одной фразой, без внутренних имён>`);
  return ['Доброе утро! <интро одной-двумя фразами>', '', ...rows, '', `${DETAILS_LABEL}: <#номера Issue/PR — только здесь>`].join('\n');
}

/**
 * Гейт чистоты черновика: структура-зеркало на месте И тело без внутреннего
 * жаргона. Возврат с диагнозом по строкам (T11: поправка, не булев отказ).
 *
 * Правила:
 *  - каждая метка из SWALLOW_LABELS присутствует ровно строкой `Метка: текст`
 *    в каноническом порядке; пустой блок — легально словами («без изменений»,
 *    «пока пусто»), но строка обязана быть;
 *  - ИНВАРИАНТ ФОРМАТА: блок — ОДНА строка (T8: «по строчке»); многострочный
 *    текст под меткой парсером не собирается и жаргон-чеком строк ловится
 *    построчно как интро, а не как блок;
 *  - жаргон-детектор (#599, externalizeQuery) гоняется по интро и строкам блоков;
 *  - строка `Детали:` — единственная, где допустимы #N; жаргон-детектор её
 *    не проверяет (номера PR/Issue там разрешены каноном ласточки).
 *
 * @param {string} draft
 * @returns {{ok: boolean, violations: string[]}}
 */
export function checkSwallowDraft(draft) {
  const violations = [];
  const lines = String(draft ?? '').split(/\r?\n/u);

  // 1) Структура: метки в каноническом порядке.
  const labelLineIndex = new Map();
  lines.forEach((line, i) => {
    const m = /^([^:]{1,30}):\s*(.*)$/u.exec(line.trim());
    if (m && !labelLineIndex.has(m[1])) labelLineIndex.set(m[1], { index: i, text: m[2] });
  });

  let prevIndex = -1;
  for (const { label } of SWALLOW_LABELS) {
    const hit = labelLineIndex.get(label);
    if (!hit) {
      violations.push(`нет строки «${label}:» — зеркало блока потеряно`);
      continue;
    }
    if (hit.text.trim() === '' || /^<.*>$/u.test(hit.text.trim())) {
      violations.push(`строка «${label}:» пуста или осталась плейсхолдером`);
    }
    if (hit.index < prevIndex) violations.push(`строка «${label}:» стоит раньше предыдущего блока — порядок зеркала нарушен`);
    prevIndex = Math.max(prevIndex, hit.index ?? -1);
  }

  // 2) Чистота: жаргон в теле (всё, кроме строки деталей).
  const detailsIndex = labelLineIndex.get(DETAILS_LABEL)?.index ?? -1;
  lines.forEach((line, i) => {
    if (i === detailsIndex || line.trim() === '') return;
    const check = externalizeQuery(line);
    if (!check.ok && check.offending.length > 0) {
      violations.push(`строка ${i + 1}: внутренний жаргон (${check.offending.join(', ')}) — переписать словами продукта`);
    }
  });

  return { ok: violations.length === 0, violations };
}
