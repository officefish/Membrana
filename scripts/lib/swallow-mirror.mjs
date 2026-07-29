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
import { checkLiveLinks } from './live-links.mjs';
import { externalizeQuery } from './strategy-horizon.mjs';

/**
 * Метки строк ласточки — продуктовые имена слотов frame() в каноническом порядке.
 * Партнёры не знают внутренних названий блоков; порядок — зеркало плана (T8).
 */
export const SWALLOW_LABELS = Object.freeze([
  { slotId: 'magistral', label: 'Главное', emoji: '🎯' },
  { slotId: 'reinforcement', label: 'Также', emoji: '🔧' },
  { slotId: 'perspective', label: 'Смотрим вперёд', emoji: '🔭' },
  { slotId: 'experimental', label: 'Пробуем', emoji: '🧪' },
  { slotId: 'sanitary', label: 'Гигиена', emoji: '🧹' },
]);

/** Метка хвостовой строки деталей — единственное место, где допустимы #N. */
export const DETAILS_LABEL = 'Детали';

/** Эмодзи интро (утро) и деталей — в скелете; гейт требует только эмодзи блоков. */
export const INTRO_EMOJI = '☀️';
export const DETAILS_EMOJI = '📎';

/**
 * Шаблон черновика: интро свободное, затем 5 строк-зеркал по порядку frame(),
 * хвост — строка деталей. Ведущая заполняет <…> словами через линзу.
 * @returns {string}
 */
export function buildSwallowSkeleton() {
  // Эмодзи — обязательная часть формата (слово владельца 29.07); гейт зеркала
  // требует строку С МЕТКИ, поэтому эмодзи стоит ПОСЛЕ метки: «Главное: 🎯 …».
  const rows = SWALLOW_LABELS.map((l) => `${l.label}: ${l.emoji} <одной фразой, без внутренних имён>`);
  return [`${INTRO_EMOJI} Доброе утро! <интро одной-двумя фразами>`, '', ...rows, '', `${DETAILS_LABEL}: ${DETAILS_EMOJI} [#N](https://github.com/officefish/Membrana/pull/N) — ТОЛЬКО кликабельными markdown-ссылками`].join('\n');
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
  for (const { label, emoji } of SWALLOW_LABELS) {
    const hit = labelLineIndex.get(label);
    if (!hit) {
      violations.push(`нет строки «${label}:» — зеркало блока потеряно`);
      continue;
    }
    // Эмодзи — обязательная часть формата (слово владельца 29.07): после метки.
    if (!hit.text.includes(emoji)) {
      violations.push(`строка «${label}:» без эмодзи ${emoji} — эмодзи обязательны; форма: «${label}: ${emoji} …»`);
    }
    const textSansEmoji = hit.text.trim().replace(/^[\p{Extended_Pictographic}️\s]+/u, '');
    if (textSansEmoji === '' || /^<.*>$/u.test(textSansEmoji)) {
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

  // 3) ЖИВЫЕ ССЫЛКИ — провод линзы (слово владельца 28.07 «исправь сразу провода
  //    линзы, научи всех агентов использовать инструмент правильно»). Линза
  //    checkLiveLinks существовала, но её НИКТО не звал: партнёрам дважды ушли
  //    нерабочие детали — 27.07 голые URL, 28.07 голые коды «#N». Норма: ссылка в
  //    письме обязана быть КЛИКАБЕЛЬНОЙ, т.е. markdown-формой `[#N](url)`, которую
  //    office превращает в <a href> (mdToTelegramHtml, не менялся с 14.07 — прод
  //    умеет; «прод отстал» был неверным диагнозом, виноват формат).
  const live = checkLiveLinks(String(draft ?? ''));
  for (const b of live.bare) {
    const path = b.kind === 'issue' ? 'issues' : 'pull';
    violations.push(
      `голая ссылка «${b.raw}» — в телеграме это просто текст, не ссылка; оформить ` +
        `кликабельно: [${b.raw}](https://github.com/officefish/Membrana/${path}/${b.n})`,
    );
  }
  for (const n of live.naked) {
    violations.push(
      `строка ${n.line}: число «${n.raw}» читается как задача, но адреса нет — ` +
        'дать markdown-ссылку [#N](url) либо убрать номер из текста',
    );
  }
  // Битые формы адреса — вторая поимка владельцем 28.07 («кликнул и попал на 404»).
  const FORM_HINT = {
    ellipsis: 'сокращение многоточием — телеграм линкует огрызок; писать адрес целиком',
    schemeless: 'адрес без схемы — добавить https://',
    'branch-blob': 'ссылка на файл в ветке умирает вместе с веткой при мердже — для чтения давать /blob/main/… (PR-ссылка адресует событие, не содержание)',
  };
  for (const b of live.broken) {
    violations.push(`строка ${b.line}: «${b.raw}» — ${FORM_HINT[b.kind]}`);
  }

  return { ok: violations.length === 0, violations };
}
