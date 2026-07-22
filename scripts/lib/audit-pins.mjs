/**
 * auditPins — единое ядро аудита пинов (procedure-frames F2 / #928, вердикт m2).
 *
 * Родовой узор T7: кит (L = весь файл) и фрейм (L = строки якоря) инъектируют
 * свой `resolveSegment`; дубль-скрипта нет.
 *
 * Чистая логика + ФС только внутри адаптеров резолва; без DOM / Web Audio.
 */

import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/** @typedef {'heading'|'marker'|'signature'} AnchorKind */

/**
 * @typedef {{ path: string, anchor: { kind: AnchorKind, ref: string }, segmentHash: string }} Pin
 */

/**
 * @typedef {{
 *   status: 'resolved',
 *   lines: string[],
 *   contentHash?: string,
 * } | {
 *   status: 'not-found',
 * } | {
 *   status: 'ambiguous',
 *   count: number,
 * }} ResolveResult
 */

/**
 * @typedef {{
 *   kind: 'matched'|'segment-drift'|'anchor-lost'|'ambiguous',
 *   path: string,
 *   anchorKind: string,
 *   pinType: 'file'|'segment',
 *   status: 'matched'|'segment-drift'|'anchor-lost'|'ambiguous',
 *   repairVerb: string,
 *   expectedHash: string,
 *   actualHash: string|null,
 *   blocking: boolean,
 * }} PinFinding
 */

const REPAIR = Object.freeze({
  matched: '—',
  'segment-drift': 'обнови segmentHash осознанно ИЛИ откати правку отрезка',
  'anchor-lost': 'восстанови якорь (ссылка удалена/переименована)',
  ambiguous: 'сделай якорь уникальным (предпочтительно marker)',
});

/**
 * Git blob SHA-1 (эквивалент `git hash-object`).
 * @param {Buffer|string} content
 * @returns {string}
 */
export function gitBlobSha(content) {
  const buf = Buffer.isBuffer(content) ? content : Buffer.from(content);
  return createHash('sha1').update(`blob ${buf.length}\0`).update(buf).digest('hex');
}

/**
 * Нормализация отрезка перед хэшем (m2): хвостовые пробелы → LF → без финального \n.
 * Без семантической правки markdown.
 * @param {string[]} lines
 * @returns {string}
 */
export function normalizeSegmentLines(lines) {
  const body = lines.map((l) => String(l).replace(/[ \t]+$/u, '')).join('\n');
  return body.replace(/\r\n/gu, '\n').replace(/\n$/u, '');
}

/**
 * @param {string[]} lines
 * @returns {string} 40 hex
 */
export function segmentHashOf(lines) {
  return gitBlobSha(normalizeSegmentLines(lines));
}

/**
 * Резолв якоря в тексте файла (три рода, тотальные исходы).
 * @param {string} fileText
 * @param {{ kind: string, ref: string }} anchor
 * @returns {ResolveResult}
 */
export function resolveSegmentInText(fileText, anchor) {
  const kind = anchor?.kind;
  const ref = typeof anchor?.ref === 'string' ? anchor.ref : '';
  const lines = String(fileText).replace(/\r\n/gu, '\n').split('\n');

  if (kind === 'marker') {
    const startRe = new RegExp(
      `<!--\\s*pin:START\\s+${escapeRegExp(ref)}\\s*-->`,
      'u',
    );
    const endRe = new RegExp(
      `<!--\\s*pin:END\\s+${escapeRegExp(ref)}\\s*-->`,
      'u',
    );
    /** @type {number[]} */
    const starts = [];
    /** @type {number[]} */
    const ends = [];
    for (let i = 0; i < lines.length; i += 1) {
      if (startRe.test(lines[i])) starts.push(i);
      if (endRe.test(lines[i])) ends.push(i);
    }
    if (starts.length === 0 || ends.length === 0) return { status: 'not-found' };
    if (starts.length > 1 || ends.length > 1) {
      return { status: 'ambiguous', count: Math.max(starts.length, ends.length) };
    }
    const start = starts[0];
    const end = ends[0];
    if (end <= start) return { status: 'not-found' };
    return { status: 'resolved', lines: lines.slice(start, end + 1) };
  }

  if (kind === 'heading') {
    /** @type {number[]} */
    const hits = [];
    for (let i = 0; i < lines.length; i += 1) {
      const m = /^(#{1,6})\s+(.+?)\s*$/u.exec(lines[i]);
      if (!m) continue;
      const title = m[2];
      const full = `${m[1]} ${title}`;
      if (title === ref || full === ref || lines[i].trim() === ref) hits.push(i);
    }
    if (hits.length === 0) return { status: 'not-found' };
    if (hits.length > 1) return { status: 'ambiguous', count: hits.length };
    const start = hits[0];
    const level = /^(#{1,6})/u.exec(lines[start])?.[1].length ?? 1;
    let end = lines.length;
    for (let j = start + 1; j < lines.length; j += 1) {
      const m = /^(#{1,6})\s+/u.exec(lines[j]);
      if (m && m[1].length <= level) {
        end = j;
        break;
      }
    }
    return { status: 'resolved', lines: lines.slice(start, end) };
  }

  if (kind === 'signature') {
    // Блоки по пустым строкам; ищем те, чей segmentHash === ref.
    /** @type {string[][]} */
    const blocks = [];
    /** @type {string[]} */
    let cur = [];
    for (const line of lines) {
      if (line.trim() === '') {
        if (cur.length) {
          blocks.push(cur);
          cur = [];
        }
      } else {
        cur.push(line);
      }
    }
    if (cur.length) blocks.push(cur);
    const matched = blocks.filter((b) => segmentHashOf(b) === ref);
    if (matched.length === 0) return { status: 'not-found' };
    if (matched.length > 1) return { status: 'ambiguous', count: matched.length };
    return { status: 'resolved', lines: matched[0] };
  }

  return { status: 'not-found' };
}

/**
 * @param {string} s
 * @returns {string}
 */
function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

/**
 * Адаптер: весь файл как отрезок (кит, pinType=file).
 * @param {string} repoRoot
 * @returns {(pin: Pin) => ResolveResult}
 */
export function makeFileResolveSegment(repoRoot) {
  return (pin) => {
    const abs = join(repoRoot, pin.path);
    if (!existsSync(abs)) return { status: 'not-found' };
    try {
      // Кит пинит весь blob без normalize отрезка — хэш = gitBlobSha(сырой буфер).
      const buf = readFileSync(abs);
      const text = buf.toString('utf8');
      return {
        status: 'resolved',
        lines: text.replace(/\r\n/gu, '\n').split('\n'),
        contentHash: gitBlobSha(buf),
      };
    } catch {
      return { status: 'not-found' };
    }
  };
}

/**
 * Адаптер: отрезок по якорю (фрейм, pinType=segment).
 * @param {string} repoRoot
 * @returns {(pin: Pin) => ResolveResult}
 */
export function makeAnchorResolveSegment(repoRoot) {
  return (pin) => {
    const abs = join(repoRoot, pin.path);
    if (!existsSync(abs)) return { status: 'not-found' };
    let text;
    try {
      text = readFileSync(abs, 'utf8');
    } catch {
      return { status: 'not-found' };
    }
    return resolveSegmentInText(text, pin.anchor);
  };
}

/**
 * Единое ядро аудита пинов.
 *
 * @param {Pin[]} pins
 * @param {(pin: Pin) => ResolveResult} resolveSegment
 * @param {{ pinType?: 'file'|'segment' }} [opts]
 * @returns {PinFinding[]}
 */
export function auditPins(pins, resolveSegment, opts = {}) {
  const pinType = opts.pinType ?? 'segment';
  /** @type {PinFinding[]} */
  const findings = [];
  for (const pin of pins ?? []) {
    const path = typeof pin?.path === 'string' ? pin.path : '';
    const anchorKind = pin?.anchor?.kind ?? '—';
    const expected = typeof pin?.segmentHash === 'string' ? pin.segmentHash : '';
    const resolved = resolveSegment(pin);

    if (resolved.status === 'not-found') {
      findings.push({
        kind: 'anchor-lost',
        path,
        anchorKind,
        pinType,
        status: 'anchor-lost',
        repairVerb: REPAIR['anchor-lost'],
        expectedHash: expected,
        actualHash: null,
        blocking: true,
      });
      continue;
    }
    if (resolved.status === 'ambiguous') {
      findings.push({
        kind: 'ambiguous',
        path,
        anchorKind,
        pinType,
        status: 'ambiguous',
        repairVerb: REPAIR.ambiguous,
        expectedHash: expected,
        actualHash: null,
        blocking: true,
      });
      continue;
    }

    const actual = resolved.contentHash ?? segmentHashOf(resolved.lines);
    if (actual === expected) {
      findings.push({
        kind: 'matched',
        path,
        anchorKind,
        pinType,
        status: 'matched',
        repairVerb: REPAIR.matched,
        expectedHash: expected,
        actualHash: actual,
        blocking: false,
      });
    } else {
      findings.push({
        kind: 'segment-drift',
        path,
        anchorKind,
        pinType,
        status: 'segment-drift',
        repairVerb: REPAIR['segment-drift'],
        expectedHash: expected,
        actualHash: actual,
        blocking: true,
      });
    }
  }
  return findings;
}

/**
 * Человекочитаемая таблица из ядра (руками не править).
 * @param {PinFinding[]} findings
 * @returns {string}
 */
export function formatPinAuditTable(findings) {
  const blocking = findings.filter((f) => f.blocking);
  const lines = [
    `| путь | род якоря | тип | статус | глагол ремонта |`,
    `| --- | --- | --- | --- | --- |`,
  ];
  if (blocking.length === 0) {
    lines.push(`| — | — | — | matched | все пины целы |`);
    return lines.join('\n');
  }
  for (const f of findings.filter((x) => x.blocking)) {
    lines.push(
      `| ${f.path || '—'} | ${f.anchorKind} | ${f.pinType} | ${f.status} | ${f.repairVerb.replace(/\|/gu, '\\|')} |`,
    );
  }
  return lines.join('\n');
}
