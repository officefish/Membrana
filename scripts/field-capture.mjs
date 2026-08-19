#!/usr/bin/env node
/**
 * yarn field:capture — снять запись с полевого микрофона и отправить в сервис.
 *
 * Один глагол на весь тракт: запись → отправка → показ того, что сервер НАМЕРИЛ.
 * Заведён 16.08 под полевую неделю (оборудование: измерительный микрофон ECM8000 +
 * звуковой интерфейс Scarlett Solo).
 *
 * ГРАНИЦА ИЗМЕРЕННОГО И ОБЪЯВЛЕННОГО (норма «свидетельство не выдаётся за измерение»):
 *   измеряет сервер  — длительность, частота, каналы, формат, размер;
 *   объявляет человек — что снимали, дистанция, высота, погода, место.
 * Объявленное НИКОГДА не посылается в полях, которые сервер умеет мерить сам:
 * durationSec/sampleRate/channels в meta не кладутся принципиально (иначе объявленное
 * перебьёт измеренное — дефект приёма, Issue #1950).
 *
 * Usage:
 *   yarn field:capture --list                       # какие входы видит система
 *   yarn field:capture --device "<имя входа>" --seconds 60 \
 *     --what drone --apparatus "ECM8000 + Scarlett" --distance 50 --height 30 \
 *     --place polygon --weather dry --wind light --operator owner --gain "knob 5/10"
 *   yarn field:capture ... --dry-run                # записать, не отправляя
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  createCaptureSidecar, measureWav, validateCaptureSidecar, writeCaptureSidecar,
} from './lib/capture-sidecar.mjs';

export { measureWav };

/** Поля, которые сервер меряет сам — в объявленное их класть запрещено. */
export const MEASURED_FIELDS = Object.freeze(['durationSec', 'sampleRate', 'channels', 'audioFormat', 'sizeBytes']);

/**
 * Имя входа искать ПО ПОДСТРОКЕ, не по адресу: системный адрес устройства меняется
 * (проверено 16.08 — после установки Focusrite Control 2 адрес сменился, а жёстко
 * прописанный в команде перестал существовать; запись молча дала тишину).
 */
export const DEVICE_HINTS = Object.freeze(['Focusrite', 'Scarlett']);

/** Ниже этого порога запись считается тишиной и НАРУЖУ НЕ ОТПРАВЛЯЕТСЯ. */
export const SILENCE_PEAK_DBFS = -60;

/**
 * Разбор перечня устройств dshow: имя (audio) + следующий за ним Alternative name.
 * @param {string} text вывод ffmpeg -list_devices
 * @returns {{name: string, address: string}[]}
 */
export function parseAudioDevices(text) {
  const lines = text.split(/\r?\n/u).map((l) => l.replace(/^\[[^\]]*\]\s*/u, ''));
  const out = [];
  for (let i = 0; i < lines.length; i += 1) {
    const m = /^"(.+)"\s+\(audio\)$/u.exec(lines[i].trim());
    if (!m) continue;
    const alt = /^Alternative name\s+"(.+)"$/u.exec((lines[i + 1] ?? '').trim());
    if (alt) out.push({ name: m[1], address: alt[1] });
  }
  return out;
}

/**
 * @param {{name:string,address:string}[]} devices
 * @param {string[]} [hints]
 * @returns {{name:string,address:string}|null}
 */
export function pickFieldDevice(devices, hints = DEVICE_HINTS) {
  for (const hint of hints) {
    const hit = devices.find((d) => d.name.toLowerCase().includes(hint.toLowerCase()));
    if (hit) return hit;
  }
  return null;
}

/**
 * Уровень записи по каналу. Тишина — законный вердикт, а не исключение:
 * молчащая полевая запись должна быть названа на месте, а не обнаружена через неделю.
 * @param {Buffer} buf WAV
 * @returns {{sampleRate:number, channels:number, seconds:number, peakDbfs:number, rmsDbfs:number}}
 */
/** @param {string[]} argv */
export function parseArgs(argv) {
  const out = {
    list: false, device: null, seconds: 60, rate: 44100, dryRun: false,
    what: null, apparatus: null, distance: null, height: null, place: null,
    weather: null, wind: null, operator: null, gain: null, notes: null, help: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--list') out.list = true;
    else if (a === '--device') out.device = argv[++i];
    else if (a === '--seconds') out.seconds = Number(argv[++i]);
    else if (a === '--rate') out.rate = Number(argv[++i]);
    else if (a === '--dry-run') out.dryRun = true;
    else if (a === '--what') out.what = argv[++i];
    else if (a === '--apparatus') out.apparatus = argv[++i];
    else if (a === '--distance') out.distance = argv[++i];
    else if (a === '--height') out.height = argv[++i];
    else if (a === '--place') out.place = argv[++i];
    else if (a === '--weather') out.weather = argv[++i];
    else if (a === '--wind') out.wind = argv[++i];
    else if (a === '--operator') out.operator = argv[++i];
    else if (a === '--gain') out.gain = argv[++i];
    else if (a === '--notes') out.notes = argv[++i];
    else if (a === '--help' || a === '-h') out.help = true;
    else throw new Error(`неизвестный флаг: ${a}`);
  }
  // Нулевая длительность и нулевая частота — не «пустая запись», а негодный вход:
  // отказ именованный, чтобы ошибку было видно на месте, а не по тишине в поле.
  if (!Number.isFinite(out.seconds) || out.seconds <= 0) throw new Error('--seconds: нужно положительное число секунд');
  if (!Number.isFinite(out.rate) || out.rate <= 0) throw new Error('--rate: нужна положительная частота дискретизации');
  return out;
}

/**
 * Объявленное человеком — свободным текстом в notes, НЕ в измеряемых полях.
 * Пустое объявление — законный вход (проба тракта), но помечается явно.
 * @param {ReturnType<typeof parseArgs>} args
 */
export function buildDeclared(args) {
  const parts = [];
  if (args.what) parts.push(`снимали: ${args.what}`);
  if (args.distance) parts.push(`дистанция: ${args.distance} м`);
  if (args.height) parts.push(`высота: ${args.height} м`);
  if (args.place) parts.push(`место: ${args.place}`);
  if (args.weather) parts.push(`погода: ${args.weather}`);
  if (args.wind) parts.push(`ветер: ${args.wind}`);
  if (args.operator) parts.push(`оператор: ${args.operator}`);
  if (args.gain) parts.push(`усиление: ${args.gain}`);
  if (args.notes) parts.push(args.notes);
  return parts.length > 0 ? parts.join(' · ') : 'объявленное не заполнено';
}

export function buildSidecarDeclared(args) {
  const missingText = ['what', 'apparatus', 'place', 'weather', 'wind', 'operator', 'gain']
    .filter((key) => typeof args[key] !== 'string' || args[key].trim() === '');
  const missingNumbers = [['distanceM', args.distance], ['heightM', args.height]]
    .filter(([, value]) => value === null || value === '' || !Number.isFinite(Number(value)) || Number(value) < 0)
    .map(([key]) => key);
  const missing = [...missingText, ...missingNumbers];
  if (missing.length > 0) throw new Error(`объявленное не заполнено: ${missing.join(', ')}`);
  const values = {
    what: args.what,
    apparatus: args.apparatus,
    distanceM: Number(args.distance),
    heightM: Number(args.height),
    place: args.place,
    weather: args.weather,
    wind: args.wind,
    operator: args.operator,
    gain: args.gain,
    ...(args.notes ? { notes: args.notes } : {}),
  };
  return values;
}

/**
 * Сборка meta для отправки. Измеряемые поля не кладутся НИКОГДА.
 * @param {ReturnType<typeof parseArgs>} args @param {string} stamp
 */
export function buildMeta(args, stamp) {
  const meta = {
    title: `Полевая запись ${stamp}`,
    notes: buildDeclared(args),
  };
  for (const forbidden of MEASURED_FIELDS) {
    if (forbidden in meta) throw new Error(`измеряемое поле ${forbidden} в объявленном — запрещено`);
  }
  return meta;
}

/**
 * ffmpeg ставится winget-ом в пользовательский каталог, которого может не быть в PATH
 * дочернего процесса. Ищем сначала в PATH, потом в известном месте установки.
 */
export function ffmpegBin() {
  try {
    execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' });
    return 'ffmpeg';
  } catch {
    const home = process.env.USERPROFILE ?? process.env.HOME ?? '';
    const fallback = join(home, 'AppData', 'Local', 'Microsoft', 'WinGet', 'Links', 'ffmpeg.exe');
    if (existsSync(fallback)) return fallback;
    throw new Error('ffmpeg не найден: поставить `winget install ffmpeg` (установку запускает владелец)');
  }
}

/**
 * Перечень устройств ffmpeg печатает в stderr, а код возврата у разных сборок разный
 * (проверено 16.08: успешный выход при непустом stderr). Поэтому читаем поток ВСЕГДА,
 * а не только в ветке отказа — иначе список молча оказывается пустым.
 */
function deviceListText() {
  const res = spawnSync(ffmpegBin(), ['-hide_banner', '-list_devices', 'true', '-f', 'dshow', '-i', 'dummy'], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return new TextDecoder('cp866').decode(res.stderr ?? Buffer.alloc(0));
}

function listDevices() {
  const devices = parseAudioDevices(deviceListText());
  if (devices.length === 0) { console.log('field:capture — звуковых входов не найдено'); return; }
  for (const d of devices) console.log(`  «${d.name}»`);
  const picked = pickFieldDevice(devices);
  console.log(picked ? `выбран бы: «${picked.name}»` : 'полевой вход по имени не опознан');
}

/**
 * Порядок поиска .env: РЯДОМ со скриптом (переносимость одним файлом — узел Firebat
 * держит скрипт и .env в одной папке; находка первого сцепления 18.08), затем на
 * уровень выше (в репозитории скрипт живёт в scripts/, а .env — в корне).
 */
export function envCandidates(base = import.meta.url) {
  return [new URL('./.env', base), new URL('../.env', base)];
}

function env() {
  const path = envCandidates().find((u) => existsSync(u));
  if (!path) {
    throw new Error('нет файла .env ни рядом со скриптом, ни уровнем выше — контракт полевого узла объявлен в .env.example (четыре ключа FIELD_NODE_*/VITE_MEDIA_*)');
  }
  const raw = readFileSync(path, 'utf8');
  const map = Object.fromEntries(
    raw.split('\n').filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
  );
  return { base: map.VITE_MEDIA_SERVER_URL, token: map.VITE_MEDIA_API_TOKEN, device: map.FIELD_NODE_DEVICE_ID, collection: map.FIELD_NODE_COLLECTION_ID };
}

async function main(argv) {
  // Негодный вход показывается словом, а не стектрейсом: в поле читать стек некому.
  let args;
  try {
    args = parseArgs(argv);
  } catch (e) {
    console.error(`field:capture — ${e instanceof Error ? e.message : e}`);
    return 2;
  }
  if (args.help) {
    console.log('Usage: yarn field:capture [--list] [--device "<вход>"] [--seconds N] --what ... --apparatus ... --distance ... --height ... --place ... --weather ... --wind ... --operator ... --gain ... [--dry-run]');
    return 0;
  }
  if (args.list) { listDevices(); return 0; }

  let declared;
  try { declared = buildSidecarDeclared(args); }
  catch (e) { console.error(`field:capture — ${e.message}`); return 2; }

  // Адрес входа НЕ прописывается жёстко: он меняется при смене драйвера.
  let address = args.device;
  if (!address) {
    const devices = parseAudioDevices(deviceListText());
    const picked = pickFieldDevice(devices);
    if (!picked) {
      console.error(`field:capture — полевой вход не найден среди: ${devices.map((d) => d.name).join(' · ') || '(пусто)'}`);
      return 2;
    }
    address = picked.address;
    console.log(`field:capture — вход найден по имени: «${picked.name}»`);
  }

  const capturedAt = new Date().toISOString();
  const stamp = capturedAt.replace(/[:.]/gu, '-');
  const out = join(process.env.TEMP ?? '.', `field-${stamp}.wav`);

  console.log(`field:capture — пишу ${args.seconds} с на ${args.rate} Гц (беру ВХОД 1, не сведение)…`);
  execFileSync(ffmpegBin(), [
    '-hide_banner', '-loglevel', 'error',
    '-f', 'dshow', '-sample_rate', String(args.rate), '-channels', '2', '-i', `audio=${address}`,
    // вход 1 берётся отдельным каналом: сведение L+R подмешало бы пустой вход 2
    '-af', 'pan=mono|c0=c0',
    '-t', String(args.seconds),
    out,
  ], { stdio: 'inherit' });

  const size = statSync(out).size;
  const level = measureWav(readFileSync(out));
  const sidecar = createCaptureSidecar({ recordingPath: out, declared, capturedAt });
  const sidecarPath = writeCaptureSidecar(out, sidecar);
  const sidecarFindings = validateCaptureSidecar(sidecar, { sidecarPath });
  if (sidecarFindings.length > 0) {
    console.error(`field:capture — спутник невалиден: ${sidecarFindings[0].code} ${sidecarFindings[0].path}`);
    return 2;
  }
  console.log(`field:capture — снято: ${size} байт · ${level.seconds.toFixed(2)} с · ${level.sampleRate} Гц`);
  console.log(`  уровень: пик ${level.peakDbfs.toFixed(1)} dBFS · средний ${level.rmsDbfs.toFixed(1)} dBFS`);

  if (level.peakDbfs < SILENCE_PEAK_DBFS) {
    console.error(`field:capture — ТИШИНА (пик ниже ${SILENCE_PEAK_DBFS} dBFS). Наружу не отправляю.`);
    console.error('  проверить: фантомное питание 48V (сбрасывается перезагрузкой), усиление входа 1, кабель XLR');
    return 1;
  }

  if (args.dryRun) {
    // Файл СОХРАНЯЕТСЯ намеренно: при сухом прогоне он и есть предмет осмотра.
    console.log(`dry-run: не отправляю. Запись: ${out}`);
    console.log(`  спутник: ${sidecarPath}`);
    return 0;
  }

  const { base, token, device, collection } = env();
  if (!base || !token || !device || !collection) {
    console.error('field:capture — нет адреса/токена/устройства/коллекции в .env (FIELD_NODE_DEVICE_ID, FIELD_NODE_COLLECTION_ID)');
    return 2;
  }

  const fd = new FormData();
  fd.append('file', new Blob([readFileSync(out)], { type: 'audio/wav' }), `field-${stamp}.wav`);
  fd.append('meta', JSON.stringify(buildMeta(args, stamp)));

  const res = await fetch(`${base}/v1/devices/${device}/collections/${collection}/samples`, {
    method: 'POST', headers: { 'x-membrana-token': token }, body: fd, signal: AbortSignal.timeout(120_000),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) { console.error(`field:capture — сервис отказал: ${res.status} ${JSON.stringify(body).slice(0, 200)}`); return 1; }

  console.log('field:capture — принято сервисом. ИЗМЕРЕНО сервером:');
  console.log(`  длительность: ${body.durationSec} с · частота: ${body.sampleRate} Гц · каналов: ${body.channels} · формат: ${body.audioFormat}`);
  console.log(`  объявлено нами: ${body.notes}`);
  console.log(`  адрес записи: ${body.id}`);
  sidecar.recording.id = body.id;
  writeCaptureSidecar(out, sidecar);
  console.log(`  локальная пара сохранена: ${out} · ${sidecarPath}`);
  return 0;
}

const entry = (process.argv[1] ?? '').replace(/\\/gu, '/');
if (entry.endsWith('/field-capture.mjs')) {
  main(process.argv.slice(2)).then((code) => { process.exitCode = code; });
}
