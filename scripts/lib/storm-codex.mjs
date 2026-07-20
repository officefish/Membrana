/**
 * Р2 формата ШТОРМА — кодекс правды Ангелины.
 * Канон: docs/STORM_REGULATION.md § «Кодекс правды Ангелины» и § «Вес: две подписи».
 * Эпик: docs/meeting/storm-format-ratify/EPIC.md Р2.
 *
 * Чистое ядро над объектом документа: детерминированный предикат без сети, без
 * `Date.now`, без `Math.random`. Тот же документ + та же версия кодекса = тот же
 * вердикт. Дайджесты приходят уже посчитанными (свежесть меряется сравнением, а не
 * чтением источников), чтобы предикат оставался чистым и тестировался поконъюнктно.
 *
 * Гейт каскада ОДИН — Ангелина. Питомец (origin==='pet') — голос, не гейт: его
 * реплика НИКОГДА не входит в основания возврата (см. `isPetRemarkInReasons` и фильтр).
 *
 * Модель документа:
 *   {
 *     sourceDigest,          // строка — дайджест источников, зафиксированный в документе
 *     sections,              // string[] — присутствующие секции
 *     claims,                // {key:value} — заявленное в honest-шапке
 *     facts,                 // {key:value} — факты для сверки
 *     signatures,            // any[] — следы подписей (заявка участника + подтверждение владельца)
 *     premises,              // {text, isConclusion}[] — список посылок
 *   }
 */

import { createHash } from 'node:crypto';

/** Версия кодекса — semver. Несётся в актах возврата и derived-статусах. */
export const CODEX_VERSION = '0.1.0';

/**
 * Обязательные секции структуры (QC2). Замкнутая константа канона.
 * «Список посылок» обязателен — на нём стоит QC5.
 */
export const REQUIRED_SECTIONS = Object.freeze(['Конспект', 'Развилка', 'Список посылок']);

/** Замкнутое множество имён проверок — порядок QC1..QC5 фиксирован. */
export const QC_CODES = Object.freeze(['QC1', 'QC2', 'QC3', 'QC4', 'QC5']);

/**
 * sha256 источников — утилита свежести. Предикат её НЕ вызывает (остаётся чистым):
 * оператор считает дайджест текущих источников снаружи и передаёт как expectedDigest.
 */
export function sha256(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

// ── Пять проверок (каждая — чистый bool над документом) ──────────────────────

/** QC1 свежесть: дайджест в документе совпадает с дайджестом текущих источников. */
export function qc1Fresh(document, expectedDigest) {
  return typeof document.sourceDigest === 'string' && document.sourceDigest === expectedDigest;
}

/** QC2 структура: все обязательные секции присутствуют (вкл. «Список посылок»). */
export function qc2Structure(document) {
  const sections = Array.isArray(document.sections) ? document.sections : [];
  const present = new Set(sections);
  return REQUIRED_SECTIONS.every((name) => present.has(name));
}

/**
 * QC3 honest-шапка: заявленное не противоречит фактам. Противоречие ⟺ для общего
 * ключа значения различны. Нет общих ключей или все совпали — pass.
 */
export function qc3Honest(document) {
  const claims = document.claims || {};
  const facts = document.facts || {};
  for (const key of Object.keys(claims)) {
    if (Object.prototype.hasOwnProperty.call(facts, key) && facts[key] !== claims[key]) {
      return false;
    }
  }
  return true;
}

/** QC4 две подписи (T10): заявка участника + подтверждение владельца ⟹ signatures ≥ 2. */
export function qc4TwoSignatures(document) {
  return Array.isArray(document.signatures) && document.signatures.length >= 2;
}

/**
 * QC5 посылки-не-выводы: ни одна посылка не помечена как вывод этой же комнаты.
 * Вход комнаты — посылка (isConclusion !== true); заключение среди посылок — fail.
 */
export function qc5PremisesNotConclusions(document) {
  const premises = Array.isArray(document.premises) ? document.premises : [];
  return premises.every((p) => p.isConclusion !== true);
}

/** Таблица QC: имя → предикат. Замкнута; codex — конъюнкция всех пяти. */
const QC_CHECKS = Object.freeze({
  QC1: (document, expectedDigest) => qc1Fresh(document, expectedDigest),
  QC2: (document) => qc2Structure(document),
  QC3: (document) => qc3Honest(document),
  QC4: (document) => qc4TwoSignatures(document),
  QC5: (document) => qc5PremisesNotConclusions(document),
});

/**
 * Кодекс — чистый предикат `codex = QC1 ∧ QC2 ∧ QC3 ∧ QC4 ∧ QC5`.
 * @returns {{pass: boolean, reasons: string[]}} reasons ⊆ QC_CODES, ровно павшие,
 *          в порядке QC1..QC5. pass ⟺ reasons пуст.
 */
export function codex(document, expectedDigest) {
  const reasons = [];
  for (const code of QC_CODES) {
    if (!QC_CHECKS[code](document, expectedDigest)) reasons.push(code);
  }
  return { pass: reasons.length === 0, reasons };
}

// ── Версия кодекса: род изменения по сравнению множеств имён QC ───────────────

/**
 * Род bump'а по сравнению множеств имён QC (простое сравнение множеств).
 *   - major — множество уменьшилось или переименовано (удалён/ужесточён пункт → ломает passed);
 *   - minor — множество выросло (добавлен непрерывающий пункт);
 *   - patch — те же имена (уточнена формулировка, структура QC та же).
 * @returns {'major'|'minor'|'patch'}
 */
export function bumpKind(oldQC, newQC) {
  const oldSet = new Set(oldQC);
  const newSet = new Set(newQC);
  const removed = [...oldSet].some((name) => !newSet.has(name));
  const added = [...newSet].some((name) => !oldSet.has(name));
  if (removed) return 'major'; // удаление или переименование (старое имя исчезло)
  if (added) return 'minor'; // только добавления
  return 'patch'; // множества имён совпали
}

// ── Возврат (адресный акт) vs статус (derived) ───────────────────────────────

/**
 * Возврат — АДРЕСНЫЙ АКТ Ангелины: событие «вернула», перечисляющее павшие QC.
 * Отличен от derived-статуса «не прошёл» (состояние отсутствия валидного passed).
 * @returns {{kind:'returned', reasons:string[], codexVersion:string}}
 */
export function returned(reasons, codexVersion = CODEX_VERSION) {
  return { kind: 'returned', reasons: [...reasons], codexVersion };
}

/**
 * Derived-статус документа из результата кодекса: 'passed' | 'blocked'.
 * «Вернула» — акт (returned), «не пропустила» — статус (blocked = отсутствие
 * валидного passed). blocked не перечисляет причины: это состояние, не событие.
 * @returns {'passed'|'blocked'}
 */
export function passStatus(codexResult) {
  return codexResult && codexResult.pass === true ? 'passed' : 'blocked';
}

// ── Питомец: голос, не гейт ───────────────────────────────────────────────────

/**
 * Гарантия «питомец не судья»: реплика с origin==='pet' НИКОГДА не входит в reasons.
 * Функция-проверка: true ⟺ реплика питомская (origin==='pet') — такую в основания нельзя.
 * Симметрична `filterPetFromReasons`, отсекающей эти записи из оснований.
 */
export function isPetRemarkInReasons(reasons, remark) {
  if (!remark || remark.origin !== 'pet') return false;
  return reasons.some((r) => r === remark || (r && r.origin === 'pet' && r === remark));
}

/**
 * Фильтр оснований: выкидывает любую запись с origin==='pet'. Строковые QC-коды
 * ('QC1'…) проходят как есть — у них нет origin. Гарантирует, что голос питомца не
 * протаскивается в основания возврата.
 */
export function filterPetFromReasons(reasons) {
  return reasons.filter((r) => !(r && typeof r === 'object' && r.origin === 'pet'));
}
