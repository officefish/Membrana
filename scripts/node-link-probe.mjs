/**
 * Пробник устойчивости связи узел ↔ cabinet (wss) — для отладки из песочницы.
 *
 * Подключается к realtime-гейту cabinet как role=node (та же механика, что у
 * клиента: токен+deviceId в query, presence.heartbeat, ответ pong на healthPing),
 * держит соединение N минут, считает разрывы и коды закрытия, в конце — вердикт.
 *
 * ВАЖНО: пробник регистрируется в реестре сервера под этим deviceId и на время
 * прогона ВЫТЕСНЯЕТ реальный клиент из реестра присутствия. Закройте клиент
 * (вкладку) на время пробы; после завершения пробника узел уйдёт в offline до
 * реконнекта клиента — это ожидаемо.
 *
 * Запуск:
 *   node scripts/node-link-probe.mjs --device-id <id> --token <token> [--minutes 3]
 *     [--url wss://.../v1/nodes/realtime] [--heartbeat-sec 30]
 *
 * Откуда взять параметры:
 *   deviceId — консоль клиента, строка `[node-ws] connecting` (поле deviceId).
 *   token    — localStorage клиента, ключ `membrana.client.nodeConnection`
 *              (поле token; в консоль клиента токен намеренно не логируется).
 *   url      — по умолчанию собирается из VITE_CABINET_API_URL в apps/client/.env.
 *
 * Прокси: если задан HTTPS_PROXY/HTTP_PROXY — wss идёт через него
 * (https-proxy-agent), как у браузера в песочнице.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';

export const DEFAULT_MINUTES = 3;
export const DEFAULT_HEARTBEAT_SEC = 30;
export const REALTIME_PATH = '/v1/nodes/realtime';

/** Разбор аргументов CLI (экспорт для теста). */
export function parseProbeArgs(argv) {
  const out = {
    deviceId: process.env.MEMBRANA_PROBE_DEVICE_ID ?? '',
    token: process.env.MEMBRANA_PROBE_TOKEN ?? '',
    url: '',
    minutes: DEFAULT_MINUTES,
    heartbeatSec: DEFAULT_HEARTBEAT_SEC,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') out.help = true;
    else if (a === '--device-id') out.deviceId = argv[++i] ?? '';
    else if (a === '--token') out.token = argv[++i] ?? '';
    else if (a === '--url') out.url = argv[++i] ?? '';
    else if (a === '--minutes') out.minutes = Number(argv[++i]);
    else if (a === '--heartbeat-sec') out.heartbeatSec = Number(argv[++i]);
  }
  if (!Number.isFinite(out.minutes) || out.minutes <= 0) out.minutes = DEFAULT_MINUTES;
  if (!Number.isFinite(out.heartbeatSec) || out.heartbeatSec <= 0) {
    out.heartbeatSec = DEFAULT_HEARTBEAT_SEC;
  }
  return out;
}

/** wss-URL из VITE_CABINET_API_URL (apps/client/.env → .env). */
export function resolveDefaultWsUrl(cwd = process.cwd()) {
  for (const rel of ['apps/client/.env.development', 'apps/client/.env', '.env']) {
    const abs = resolve(cwd, rel);
    if (!existsSync(abs)) continue;
    const line = readFileSync(abs, 'utf8')
      .split(/\r?\n/)
      .find((l) => l.startsWith('VITE_CABINET_API_URL='));
    if (!line) continue;
    const raw = line.slice('VITE_CABINET_API_URL='.length).trim();
    try {
      const url = new URL(raw);
      url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
      url.pathname = REALTIME_PATH;
      url.search = '';
      return url.toString();
    } catch {
      /* следующий файл */
    }
  }
  return null;
}

/**
 * Сводка по событиям пробы (экспорт для теста).
 * @param {{ type: 'open'|'close'|'error', at: number, code?: number }[]} events
 * @param {number} startedAt
 * @param {number} finishedAt
 */
export function summarizeProbe(events, startedAt, finishedAt) {
  const totalMs = Math.max(1, finishedAt - startedAt);
  const closes = events.filter((e) => e.type === 'close');
  const codeCounts = {};
  for (const c of closes) {
    const key = String(c.code ?? 'unknown');
    codeCounts[key] = (codeCounts[key] ?? 0) + 1;
  }

  // Суммарное время в состоянии connected и самый длинный стабильный отрезок.
  let connectedMs = 0;
  let longestMs = 0;
  let openAt = null;
  for (const e of events) {
    if (e.type === 'open' && openAt === null) openAt = e.at;
    if (e.type === 'close' && openAt !== null) {
      const span = e.at - openAt;
      connectedMs += span;
      if (span > longestMs) longestMs = span;
      openAt = null;
    }
  }
  if (openAt !== null) {
    const span = finishedAt - openAt;
    connectedMs += span;
    if (span > longestMs) longestMs = span;
  }

  const uptimePct = Math.round((connectedMs / totalMs) * 1000) / 10;
  const drops = closes.length;

  let verdict;
  if (events.every((e) => e.type !== 'open')) {
    verdict = 'НЕТ СОЕДИНЕНИЯ: сокет ни разу не открылся — проверь url/токен/прокси.';
  } else if (drops === 0) {
    verdict = 'УСТОЙЧИВО: ни одного разрыва за время пробы.';
  } else if (codeCounts['4401']) {
    verdict = 'AUTH: сервер закрывает 4401 — сессия/токен истёк или отозван.';
  } else if (codeCounts['1006']) {
    verdict = `СЕТЬ/ПРОКСИ: ${drops} разрыв(ов), код 1006 — соединение рвёт транспорт (idle-таймаут прокси/сети), клиентский реконнект это компенсирует, но presence будет мигать.`;
  } else {
    verdict = `НЕСТАБИЛЬНО: ${drops} разрыв(ов), коды: ${JSON.stringify(codeCounts)}.`;
  }

  return { totalMs, connectedMs, uptimePct, drops, codeCounts, longestStableMs: longestMs, verdict };
}

function ts() {
  return new Date().toISOString().slice(11, 19);
}

async function main() {
  const args = parseProbeArgs(process.argv.slice(2));
  if (args.help || !args.deviceId || !args.token) {
    console.log(
      [
        'Пробник устойчивости связи узел↔cabinet.',
        '',
        'node scripts/node-link-probe.mjs --device-id <id> --token <token> [--minutes 3] [--url wss://...] [--heartbeat-sec 30]',
        '',
        'deviceId — из консоли клиента ([node-ws] connecting).',
        'token — localStorage клиента, ключ membrana.client.nodeConnection.',
        'ВНИМАНИЕ: на время пробы закройте вкладку клиента (пробник вытесняет её из реестра присутствия).',
      ].join('\n'),
    );
    process.exit(args.help ? 0 : 1);
  }

  const wsUrl = args.url || resolveDefaultWsUrl();
  if (!wsUrl) {
    console.error('Не найден VITE_CABINET_API_URL ни в apps/client/.env*, ни в .env — задай --url явно.');
    process.exit(1);
  }

  const target = new URL(wsUrl);
  target.searchParams.set('role', 'node');
  target.searchParams.set('token', args.token);
  target.searchParams.set('deviceId', args.deviceId);
  target.searchParams.set('clientVersion', 'link-probe');

  const proxy = process.env.HTTPS_PROXY?.trim() || process.env.HTTP_PROXY?.trim() || '';
  const { default: WebSocketWs } = await import('ws');
  let agent;
  if (proxy) {
    const { HttpsProxyAgent } = await import('https-proxy-agent');
    agent = new HttpsProxyAgent(proxy);
  }

  console.log(`[probe] цель: ${target.origin}${target.pathname}`);
  console.log(`[probe] deviceId: ${args.deviceId}`);
  console.log(`[probe] прокси: ${proxy ? 'да (как у песочницы)' : 'нет (напрямую)'}`);
  console.log(`[probe] длительность: ${args.minutes} мин · heartbeat каждые ${args.heartbeatSec}с`);
  console.log('[probe] ВНИМАНИЕ: вкладка клиента должна быть закрыта на время пробы.\n');

  /** @type {{ type: 'open'|'close'|'error', at: number, code?: number }[]} */
  const events = [];
  const startedAt = Date.now();
  const deadline = startedAt + args.minutes * 60_000;
  let socket = null;
  let heartbeatTimer = null;
  let stopping = false;

  const heartbeatEnvelope = () =>
    JSON.stringify({
      v: 1,
      channel: 'presence',
      type: 'presence.heartbeat',
      ts: new Date().toISOString(),
      payload: {},
    });

  const connect = () => {
    if (stopping || Date.now() >= deadline) return;
    const ws = new WebSocketWs(target.toString(), agent ? { agent } : undefined);
    socket = ws;

    ws.on('open', () => {
      events.push({ type: 'open', at: Date.now() });
      console.log(`${ts()} [probe] open`);
      clearInterval(heartbeatTimer);
      heartbeatTimer = setInterval(() => {
        if (ws.readyState === ws.OPEN) ws.send(heartbeatEnvelope());
      }, args.heartbeatSec * 1000);
      ws.send(heartbeatEnvelope());
    });

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(String(data));
        // PCB6: сервер пингует живость — отвечаем, иначе кабинетная проба
        // будет считать узел unreachable, пока висит пробник.
        if (msg?.channel === 'presence' && msg?.type === 'presence.health-ping' && msg?.payload?.pingId) {
          ws.send(
            JSON.stringify({
              v: 1,
              channel: 'presence',
              type: 'presence.health-pong',
              ts: new Date().toISOString(),
              payload: { pingId: msg.payload.pingId },
            }),
          );
          console.log(`${ts()} [probe] health-ping → pong`);
        }
      } catch {
        /* не наш кадр */
      }
    });

    ws.on('close', (code, reason) => {
      events.push({ type: 'close', at: Date.now(), code });
      clearInterval(heartbeatTimer);
      if (!stopping) {
        console.log(`${ts()} [probe] close code=${code}${reason?.length ? ` reason=${reason}` : ''} → реконнект через 2с`);
        setTimeout(connect, 2_000);
      }
    });

    ws.on('error', (err) => {
      events.push({ type: 'error', at: Date.now() });
      console.log(`${ts()} [probe] error: ${err?.message ?? err}`);
    });
  };

  connect();

  await new Promise((r) => setTimeout(r, Math.max(0, deadline - Date.now())));
  stopping = true;
  clearInterval(heartbeatTimer);
  try {
    socket?.close(1000, 'probe finished');
  } catch {
    /* уже закрыт */
  }

  const summary = summarizeProbe(events, startedAt, Date.now());
  console.log('\n===== СВОДКА ПРОБЫ =====');
  console.log(`uptime: ${summary.uptimePct}% · разрывов: ${summary.drops} · самый длинный стабильный отрезок: ${Math.round(summary.longestStableMs / 1000)}с`);
  if (summary.drops > 0) console.log(`коды закрытия: ${JSON.stringify(summary.codeCounts)}`);
  console.log(`ВЕРДИКТ: ${summary.verdict}`);
  process.exit(0);
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
  main().catch((err) => {
    console.error('[probe] fatal:', err);
    process.exit(1);
  });
}
