#!/usr/bin/env node
/**
 * Проверка ссылок ПЕРЕД уборкой буфера — защита вещдоков (#2204, заказ владельца 28.08).
 *
 * ЗАЧЕМ. Защита уборки (`isPinnedByHuman`) знает два признака: метку человека и слова
 * `keep`/`хранить`/`не удалять` в заметке. Ссылок из приёмочных документов она не читает
 * вообще — media о них не знает, а run-записи уезжают в другой сервис, и спрашивать их
 * синхронно на пути удаления хрупко.
 *
 * Дыра не гипотетическая. 28.08 живой буфер: 1747 проб, и самые ранние сто — НОЧЬ 23.08,
 * та самая из закрытого разбора (1136 проб, ноль разрывов, все 48 кГц). Ни одна не была
 * защищена: все `unlabeled`, ни одной пометки. «Удалить 100 самых ранних» съело бы начало
 * документированной ночи, и план назвал бы это штатной уборкой. Пробы 22.08 спаслись
 * только тем, что их успели разложить по наборам руками.
 *
 * ЧТО ДЕЛАЕТ. Читает окна вещдоков (`docs/field/evidence-windows.json` — машинная выжимка
 * из полевых документов), спрашивает media о пробах буфера в этих окнах и объявляет
 * незащищённые. `--execute` ставит им пометку `keep`, называя документ-источник.
 *
 * FAIL-CLOSED. Нет реестра, нет ключей, media не ответила — это ОТКАЗ (exit 1), а не
 * «проверять нечего». Молчаливый пропуск здесь и есть тот самый класс, который мы чиним:
 * проверка, которая не смогла проверить, обязана сказать это словами.
 *
 * Исходы:
 *   0 — все вещдоки в окнах защищены (или защищены этим прогоном при --execute)
 *   3 — НАХОДКА: есть незащищённые вещдоки; уборку запускать нельзя
 *   1 — отказ проверки: нет реестра / ключей / media недоступна
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REGISTRY_REL = 'docs/field/evidence-windows.json';

const EXIT_OK = 0;
const EXIT_REFUSED = 1;
const EXIT_FINDING = 3;

const BUFFER_ID = '__buffer__';

/**
 * Потолок страницы у media — 100: `limit=200` отдаёт те же сто. Первая редакция просила 200
 * и обрывала цикл на «пришло меньше запрошенного», то есть читала ТОЛЬКО свежую сотню и
 * докладывала по ней. Ошибка опасна направлением: неполное чтение ЗАНИЖАЕТ число
 * незащищённых вещдоков, то есть врёт в сторону «всё хорошо». Поймано зубом на живом буфере.
 */
const PAGE_SIZE = 100;
const MAX_PAGES = 200;

/**
 * Защищена ли проба. ЗЕРКАЛО ядра `isPinnedByHuman`
 * (`packages/services/media-library/src/buffer-cleanup.ts`): правило одно, носителей два —
 * ядро на TypeScript в пакете, этот скрипт на .mjs без сборки. Расхождение носителей ловит
 * зуб `buffer-protect-evidence.test.mjs` («ЗЕРКАЛО»), а не надежда на внимательность.
 *
 * @param {{label?: string, notes?: string|null}} sample
 */
export function isPinned(sample) {
  const notes = String(sample?.notes ?? '').toLowerCase();
  if (/\bkeep\b/u.test(notes) || /хранить|не удалять/u.test(notes)) return true;
  return (sample?.label ?? 'unlabeled') !== 'unlabeled';
}

/** Проба попадает в окно вещдока? Границы включительные — документ называет их как отрезок. */
export function inWindow(createdAt, from, to) {
  const t = Date.parse(createdAt);
  const a = Date.parse(from);
  const b = Date.parse(to);
  if (!Number.isFinite(t) || !Number.isFinite(a) || !Number.isFinite(b)) return false;
  return t >= a && t <= b;
}

/** Значение из .env дерева — ключи media лежат под разными именами (урок #2199). */
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

async function fetchJson(url, token) {
  const res = await fetch(url, { headers: { 'X-Membrana-Token': token } });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status} от ${url}: ${text.slice(0, 200)}`);
  return JSON.parse(text);
}

/**
 * Пробы ОДНОГО набора — страницами, потому что их полторы тысячи.
 *
 * Полнота чтения ПРОВЕРЯЕТСЯ: сервер называет `total`, и если собрали меньше, это отказ, а
 * не «сколько прочли, по тому и судим». Недочитанный набор занижает число незащищённых
 * вещдоков — врёт в безопасную на вид сторону, и такую ложь заметить труднее всего.
 */
async function loadCollection(base, token, deviceId, collectionId) {
  const byId = new Map();
  let total = null;
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const url = `${base}/v1/devices/${encodeURIComponent(deviceId)}/collections/${encodeURIComponent(collectionId)}/samples?page=${page}&limit=${PAGE_SIZE}`;
    const json = await fetchJson(url, token);
    const items = Array.isArray(json.items) ? json.items : [];
    if (typeof json.total === 'number') total = json.total;
    for (const it of items) byId.set(it.id, { ...it, collectionId });
    if (items.length === 0) break;
    if (total !== null && byId.size >= total) break;
  }
  const rows = [...byId.values()];
  if (total !== null && rows.length < total) {
    throw new Error(`набор ${collectionId}: прочитано ${rows.length} из ${total} — недочитан, судить по части нельзя`);
  }
  return rows;
}

/**
 * ВСЕ пробы устройства, по всем наборам.
 *
 * Почему не только буфер (правка после шага 0, 28.08). Приёмочные документы ссылаются на
 * пробы УСТРОЙСТВОМ И ОКНОМ ВРЕМЕНИ — ни одного номера пробы в них нет, — а номер пробы
 * переживает перенос между наборами. Значит вещдок остаётся вещдоком и после вывоза из
 * буфера; искать его обязаны везде. Прежняя редакция смотрела только `__buffer__` и после
 * вывоза доложила бы «в окне ноль проб» — ложное зелёное ровно того класса, который это
 * задание и чинит.
 */
async function loadDevice(base, token, deviceId) {
  const cols = await fetchJson(`${base}/v1/devices/${encodeURIComponent(deviceId)}/collections`, token);
  const list = Array.isArray(cols) ? cols : (cols.items ?? []);
  if (list.length === 0) throw new Error(`у устройства ${deviceId} не перечислен ни один набор`);
  const rows = [];
  for (const c of list) rows.push(...(await loadCollection(base, token, deviceId, c.id)));
  return { rows, collections: list };
}

async function pin(base, token, deviceId, sample, windowRow) {
  const mark = `keep: вещдок ${windowRow.id} (${windowRow.doc})`;
  const notes = sample.notes ? `${sample.notes} · ${mark}` : mark;
  const url = `${base}/v1/devices/${encodeURIComponent(deviceId)}/samples/${encodeURIComponent(sample.id)}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'X-Membrana-Token': token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} при пометке ${sample.id}: ${(await res.text()).slice(0, 200)}`);
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(`Usage: yarn buffer:protect-evidence [--execute]

Проверяет, защищены ли пробы буфера, попадающие в окна вещдоков (${REGISTRY_REL}).
Без --execute только называет незащищённых (exit 3). С --execute ставит им пометку keep.`);
    return EXIT_OK;
  }
  const execute = argv.includes('--execute');

  const registryPath = resolve(REPO, REGISTRY_REL);
  if (!existsSync(registryPath)) {
    console.error(`✗ ОТКАЗ: нет реестра окон ${REGISTRY_REL} — проверить ссылки нечем.`);
    console.error('  это не «нечего проверять»: без реестра уборка пойдёт вслепую.');
    return EXIT_REFUSED;
  }
  /** @type {{windows: Array<{id:string,doc:string,deviceId:string,from:string,to:string,why:string}>}} */
  let registry;
  try {
    registry = JSON.parse(readFileSync(registryPath, 'utf8'));
  } catch (e) {
    console.error(`✗ ОТКАЗ: реестр ${REGISTRY_REL} нечитаем: ${e instanceof Error ? e.message : e}`);
    return EXIT_REFUSED;
  }
  const windows = Array.isArray(registry?.windows) ? registry.windows : [];
  if (windows.length === 0) {
    console.error(`✗ ОТКАЗ: в реестре ноль окон — так проверка всегда «зелёная» и ничего не значит.`);
    return EXIT_REFUSED;
  }

  const base = (envValue(['MEDIA_API_URL', 'VITE_MEDIA_SERVER_URL', 'BACKGROUND_MEDIA_API_URL']) ?? '').replace(/\/$/u, '');
  const token = envValue(['MEDIA_API_TOKEN', 'VITE_MEDIA_API_TOKEN', 'MEDIA_INTERNAL_TOKEN']);
  if (!base || !token) {
    console.error('✗ ОТКАЗ: не задан адрес или ключ media.');
    console.error('  адрес: MEDIA_API_URL | VITE_MEDIA_SERVER_URL | BACKGROUND_MEDIA_API_URL');
    console.error('  ключ : MEDIA_API_TOKEN | VITE_MEDIA_API_TOKEN | MEDIA_INTERNAL_TOKEN');
    return EXIT_REFUSED;
  }

  const devices = [...new Set(windows.map((w) => w.deviceId))];
  /** @type {Map<string, {rows: any[], collections: any[]}>} */
  const state = new Map();
  for (const deviceId of devices) {
    try {
      state.set(deviceId, await loadDevice(base, token, deviceId));
    } catch (e) {
      console.error(`✗ ОТКАЗ: media не ответила по устройству ${deviceId}: ${e instanceof Error ? e.message : e}`);
      console.error('  проверка ссылок не состоялась — уборку запускать нельзя.');
      return EXIT_REFUSED;
    }
  }

  let unprotected = 0;
  let pinned = 0;
  for (const w of windows) {
    const all = (state.get(w.deviceId)?.rows ?? []).filter((s) => inWindow(s.createdAt, w.from, w.to));
    const inBuffer = all.filter((s) => s.collectionId === BUFFER_ID);
    const evacuated = all.length - inBuffer.length;
    // Ссылка документа держится устройством и окном, поэтому считаем ВЕЗДЕ, а защита нужна
    // только тем, кто ещё лежит в приёмном лотке: вывезенные защищены самим набором.
    const bare = inBuffer.filter((s) => !isPinned(s));
    console.error(`· ${w.id}: в окне ${all.length} проб (в буфере ${inBuffer.length}, вывезено ${evacuated}), без защиты ${bare.length}`);
    console.error(`  источник: ${w.doc}`);
    if (bare.length === 0) continue;
    unprotected += bare.length;
    if (!execute) {
      const shown = bare.slice(0, 3).map((s) => `${s.id} (${s.createdAt})`).join(', ');
      console.error(`  например: ${shown}${bare.length > 3 ? ` … ещё ${bare.length - 3}` : ''}`);
      continue;
    }
    for (const s of bare) {
      try {
        await pin(base, token, w.deviceId, s, w);
        pinned += 1;
      } catch (e) {
        console.error(`✗ ОТКАЗ на пометке: ${e instanceof Error ? e.message : e}`);
        console.error(`  помечено до отказа: ${pinned}; уборку запускать нельзя.`);
        return EXIT_REFUSED;
      }
    }
    console.error(`  помечено: ${bare.length}`);
  }

  if (execute) {
    console.error(`\nЗащита поднята: помечено ${pinned} проб.`);
    return EXIT_OK;
  }
  if (unprotected > 0) {
    console.error(`\n✗ НАХОДКА: ${unprotected} проб вещдока в буфере БЕЗ защиты — уборку запускать нельзя.`);
    console.error('  что делать: yarn buffer:protect-evidence --execute, затем повторить проверку.');
    return EXIT_FINDING;
  }
  console.error('\nВсе пробы окон защищены — уборка безопасна по ссылкам.');
  return EXIT_OK;
}

if (process.argv[1] && process.argv[1].endsWith('buffer-protect-evidence.mjs')) {
  main().then((code) => process.exit(code));
}
