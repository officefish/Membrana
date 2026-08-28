#!/usr/bin/env node
/**
 * Вывоз вещдоков из приёмного лотка в именованные наборы (заказ владельца 28.08).
 *
 * РЕШЕНИЕ ВЛАДЕЛЬЦА, которое этот скрипт исполняет: буфер — приёмный лоток, архив —
 * именованные наборы. Защиту на месте не поднимаем: 1692 помеченных из 1747 сделали бы
 * уборку декоративной. Защита остаётся механизмом редких исключений, а не нормой.
 *
 * ПОЧЕМУ ПЕРЕНОС НЕ РВЁТ ССЫЛКИ (проверено шагом 0 до вывоза). Приёмочные документы не
 * называют НИ ОДНОГО номера пробы: ссылка держится устройством и окном времени
 * (`docs/field/evidence-windows.json` — машинная выжимка). Номер пробы переживает перенос,
 * меняется только набор. Поэтому вещдок остаётся разрешимым и после вывоза — при условии,
 * что резолвер ищет по всем наборам, а не в одном буфере; это исправлено в
 * `buffer-protect-evidence.mjs` тем же заходом.
 *
 * ДВА ГЛАГОЛА, КАК У УБОРКИ. Без `--execute` — только план: сколько поедет, куда, что
 * останется. Перенос необратим одним движением, и человек обязан увидеть числа заранее.
 *
 * FAIL-CLOSED. Недочитанный набор, неотвеченная media, несозданный набор — отказ (1), а не
 * частичный вывоз молча. Частичный вывоз возможен только как ЯВНЫЙ исход: сколько уехало,
 * сколько нет и почему.
 *
 * Исходы: 0 — вывезено (или планировать нечего) · 1 — отказ · 3 — план показан, ничего не
 * сделано (нужен --execute).
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REGISTRY_REL = 'docs/field/evidence-windows.json';
const BUFFER_ID = '__buffer__';
const PAGE_SIZE = 100;
const MAX_PAGES = 200;

const EXIT_OK = 0;
const EXIT_REFUSED = 1;
const EXIT_PLAN = 3;

/** Человеческое имя набора: через месяц должно читаться без документа. */
export const EVACUATION_NAMES = Object.freeze({
  'night-duty-2026-08-23': 'Ночное дежурство 23 августа',
  'listening-session-2026-08-21': 'Разметка на слух 21 августа',
});

export function inWindow(createdAt, from, to) {
  const t = Date.parse(createdAt);
  const a = Date.parse(from);
  const b = Date.parse(to);
  if (!Number.isFinite(t) || !Number.isFinite(a) || !Number.isFinite(b)) return false;
  return t >= a && t <= b;
}

function envValue(names) {
  const envPath = resolve(REPO, '.env');
  const text = existsSync(envPath) ? readFileSync(envPath, 'utf8') : '';
  for (const name of names) {
    const fromProcess = process.env[name];
    if (typeof fromProcess === 'string' && fromProcess.trim()) return fromProcess.trim();
    const m = new RegExp(`^${name}=(.*)$`, 'm').exec(text);
    const v = m?.[1]?.trim().replace(/^"|"$/gu, '');
    if (v) return v;
  }
  return null;
}

async function api(url, token, init = {}) {
  const res = await fetch(url, {
    ...init,
    headers: { 'X-Membrana-Token': token, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}: ${text.slice(0, 200)}`);
  return text ? JSON.parse(text) : null;
}

async function loadBuffer(base, token, deviceId) {
  const byId = new Map();
  let total = null;
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const url = `${base}/v1/devices/${encodeURIComponent(deviceId)}/collections/${BUFFER_ID}/samples?page=${page}&limit=${PAGE_SIZE}`;
    const json = await api(url, token);
    const items = Array.isArray(json.items) ? json.items : [];
    if (typeof json.total === 'number') total = json.total;
    for (const it of items) byId.set(it.id, it);
    if (items.length === 0) break;
    if (total !== null && byId.size >= total) break;
  }
  const rows = [...byId.values()];
  if (total !== null && rows.length < total) {
    throw new Error(`буфер недочитан: ${rows.length} из ${total} — вывозить по части нельзя`);
  }
  return rows;
}

/** Набор с таким именем уже есть? Вывоз обязан быть идемпотентным: второй прогон не плодит близнецов. */
async function ensureCollection(base, token, deviceId, name, execute) {
  const cols = await api(`${base}/v1/devices/${encodeURIComponent(deviceId)}/collections`, token);
  const list = Array.isArray(cols) ? cols : (cols.items ?? []);
  const found = list.find((c) => c.name === name);
  if (found) return { id: found.id, created: false };
  if (!execute) return { id: null, created: false };
  const made = await api(`${base}/v1/devices/${encodeURIComponent(deviceId)}/collections`, token, {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
  if (!made?.id) throw new Error(`набор «${name}» не создан: ответ без id`);
  return { id: made.id, created: true };
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(`Usage: yarn buffer:evacuate-evidence [--execute]

Вывозит пробы окон вещдоков (${REGISTRY_REL}) из буфера в именованные наборы.
Без --execute показывает план и ничего не трогает.`);
    return EXIT_OK;
  }
  const execute = argv.includes('--execute');

  const registryPath = resolve(REPO, REGISTRY_REL);
  if (!existsSync(registryPath)) {
    console.error(`✗ ОТКАЗ: нет реестра окон ${REGISTRY_REL} — вывозить нечего и не по чему.`);
    return EXIT_REFUSED;
  }
  const registry = JSON.parse(readFileSync(registryPath, 'utf8'));
  const windows = Array.isArray(registry?.windows) ? registry.windows : [];
  if (windows.length === 0) {
    console.error('✗ ОТКАЗ: в реестре ноль окон.');
    return EXIT_REFUSED;
  }
  const missingName = windows.find((w) => !EVACUATION_NAMES[w.id]);
  if (missingName) {
    console.error(`✗ ОТКАЗ: окну ${missingName.id} не назначено человеческое имя набора.`);
    console.error('  имя даётся руками в EVACUATION_NAMES: через месяц набор читают без документа.');
    return EXIT_REFUSED;
  }

  const base = (envValue(['MEDIA_API_URL', 'VITE_MEDIA_SERVER_URL', 'BACKGROUND_MEDIA_API_URL']) ?? '').replace(/\/$/u, '');
  const token = envValue(['MEDIA_API_TOKEN', 'VITE_MEDIA_API_TOKEN', 'MEDIA_INTERNAL_TOKEN']);
  if (!base || !token) {
    console.error('✗ ОТКАЗ: не задан адрес или ключ media.');
    return EXIT_REFUSED;
  }

  const devices = [...new Set(windows.map((w) => w.deviceId))];
  const buffers = new Map();
  for (const deviceId of devices) {
    try {
      buffers.set(deviceId, await loadBuffer(base, token, deviceId));
    } catch (e) {
      console.error(`✗ ОТКАЗ: ${e instanceof Error ? e.message : e}`);
      return EXIT_REFUSED;
    }
  }

  let movedTotal = 0;
  let plannedTotal = 0;
  for (const w of windows) {
    const name = EVACUATION_NAMES[w.id];
    const rows = (buffers.get(w.deviceId) ?? []).filter((s) => inWindow(s.createdAt, w.from, w.to));
    plannedTotal += rows.length;
    const bytes = rows.reduce((a, s) => a + (s.sizeBytes ?? 0), 0);
    console.error(`· ${w.id} → «${name}»`);
    console.error(`  в буфере проб окна: ${rows.length} · ${(bytes / 1024 / 1024).toFixed(1)} МБ`);
    console.error(`  источник ссылки: ${w.doc}`);
    if (rows.length === 0) continue;

    let target;
    try {
      target = await ensureCollection(base, token, w.deviceId, name, execute);
    } catch (e) {
      console.error(`✗ ОТКАЗ: набор «${name}» не заведён: ${e instanceof Error ? e.message : e}`);
      return EXIT_REFUSED;
    }
    if (!execute) {
      console.error(`  набор: ${target.id ? `есть (${target.id})` : 'будет создан'}`);
      continue;
    }
    console.error(`  набор: ${target.created ? 'создан' : 'уже был'} ${target.id}`);

    let moved = 0;
    const failed = [];
    for (const s of rows) {
      try {
        await api(`${base}/v1/devices/${encodeURIComponent(w.deviceId)}/samples/${encodeURIComponent(s.id)}/move`, token, {
          method: 'POST',
          body: JSON.stringify({ toCollectionId: target.id }),
        });
        moved += 1;
        if (moved % 200 === 0) console.error(`  … перенесено ${moved}/${rows.length}`);
      } catch (e) {
        failed.push({ id: s.id, why: e instanceof Error ? e.message : String(e) });
      }
    }
    movedTotal += moved;
    console.error(`  перенесено: ${moved} из ${rows.length}`);
    if (failed.length > 0) {
      console.error(`  НЕ перенесено: ${failed.length} — молчаливого пропуска нет:`);
      for (const f of failed.slice(0, 5)) console.error(`    · ${f.id}: ${f.why}`);
      if (failed.length > 5) console.error(`    … ещё ${failed.length - 5}`);
      return EXIT_REFUSED;
    }
  }

  if (!execute) {
    console.error(`\nПлан: к вывозу ${plannedTotal} проб. Ничего не изменено — нужен --execute.`);
    return plannedTotal > 0 ? EXIT_PLAN : EXIT_OK;
  }
  console.error(`\nВывоз завершён: ${movedTotal} проб в именованные наборы.`);
  return EXIT_OK;
}

if (process.argv[1] && process.argv[1].endsWith('buffer-evacuate-evidence.mjs')) {
  main().then((code) => process.exit(code));
}
