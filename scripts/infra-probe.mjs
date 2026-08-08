#!/usr/bin/env node
/**
 * yarn infra:probe — факт против инфраструктурной полиси (#1393 ч.2).
 *
 *   yarn infra:probe             # живость всех декларированных звеньев + балансы,
 *                                # где API отдаёт + сверка декларация↔env по имени;
 *                                # снимок → .membrana/infra-probe-latest.json (gitignore)
 *   yarn infra:probe --summary   # без сети: «инфра-сводка: что кончается и когда»
 *                                # (даты полиси + балансы последнего снимка)
 *
 * Транспорт LLM-зондов — ПЕРЕИСПОЛЬЗОВАН из llm-probe (probeOnce/probeProvider),
 * второго стека нет; xai/perplexity — те же зонды со своими спеками. Балансы:
 * OpenRouter отдаёт credits-эндпоинтом; DeepSeek — user/balance; xAI/Perplexity
 * не отдают — в снимке честное «not-provided», не ноль. 403 OpenRouter прямым
 * путём = гео, не ключ (смотреть viaProxy). Voyage — known-blocked из полиси:
 * отдельный статус, гасит красный до части 3, но НЕ ok.
 *
 * Exit: 0 — всё ok; 3 — finding (known-blocked / датное событие близко);
 *       1 — красный (расхождение декларация↔факт по имени / звено red);
 *       2 — инструментальная (полиси битая).
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';

import { classifyOutcome, diagnosePair, loadEnv, probeOnce, probeProvider } from './llm-probe.mjs';
import { ENV_KEY_RE, expiringSummary, linkStatus, policyProblems, reconcileEnv } from './lib/infra-policy.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const POLICY_REL = 'docs/security/infra-policy.json';
const SNAPSHOT_REL = '.membrana/infra-probe-latest.json';
const TIMEOUT = AbortSignal.timeout.bind(AbortSignal);

/** Спеки зондов сверх llm-probe (тот же транспорт probeOnce). */
const EXTRA_SPECS = {
  xai: {
    url: 'https://api.x.ai/v1/chat/completions',
    body: () => ({ model: 'grok-4.5', max_tokens: 1, messages: [{ role: 'user', content: 'ping' }] }),
    authHeader: (key) => ({ authorization: `Bearer ${key}` }),
    keyEnv: ['X_AI_API_KEY', 'XAI_API_KEY'],
  },
  perplexity: {
    url: 'https://api.perplexity.ai/chat/completions',
    body: () => ({ model: 'sonar', max_tokens: 1, messages: [{ role: 'user', content: 'ping' }] }),
    authHeader: (key) => ({ authorization: `Bearer ${key}` }),
    keyEnv: ['PERPLEXITY_API_KEY'],
  },
};

/**
 * TCP-зонд звена. Исходы — словарь #1449 (`docs/network/outcomes.yml`).
 *
 * Раньше все три отказа звались одним словом `net` (#1804): битый URL, молчание в срок и
 * отказ сокета читались одинаково, хотя чинятся по-разному — первое правкой полиси, второе
 * ожиданием, третье сетью. Одно слово на три причины и есть та ложь, которую снимает спринт.
 */
function tcpProbe(urlStr, timeoutMs = 4000) {
  return new Promise((res) => {
    let u;
    try {
      u = new URL(urlStr);
    } catch {
      // Строка вообще не URL — сеть тут ни при чём, зонд даже не начинался.
      return res('unknown_protocol');
    }
    const socket = net.connect({ host: u.hostname, port: Number(u.port || 80) }, () => {
      socket.destroy();
      res('ok');
    });
    socket.setTimeout(timeoutMs, () => {
      socket.destroy();
      res('timeout_idle');
    });
    socket.on('error', (e) => {
      const code = String(e?.code ?? '').toUpperCase();
      // Имя разрешить не удалось — это DNS, а не «сеть вообще».
      res(code === 'ENOTFOUND' || code === 'EAI_AGAIN' ? 'dns_fail' : 'tcp_fail');
    });
  });
}

async function fetchBalance(link, env) {
  try {
    if (link.id === 'openrouter' && env.OPENROUTER_API_KEY) {
      // 403 прямым путём = гео, не ключ (ловушка #1393) — кредиты ходят через прокси.
      const proxyUrl = env.HTTPS_PROXY?.trim() || env.HTTP_PROXY?.trim();
      const init = { headers: { authorization: `Bearer ${env.OPENROUTER_API_KEY}` }, signal: TIMEOUT(15_000) };
      let r = await fetch('https://openrouter.ai/api/v1/credits', init);
      if (r.status === 403 && proxyUrl) {
        const { fetch: undiciFetch, ProxyAgent } = await import('undici');
        r = await undiciFetch('https://openrouter.ai/api/v1/credits', { ...init, dispatcher: new ProxyAgent(proxyUrl) });
      }
      if (!r.ok) return `http-${r.status} (баланс не прочитан)`;
      const b = await r.json();
      const total = b?.data?.total_credits;
      const used = b?.data?.total_usage;
      if (typeof total === 'number' && typeof used === 'number') return `${(total - used).toFixed(2)} кр. (из ${total})`;
      return 'формат ответа неожиданный';
    }
    if (link.id === 'deepseek' && env.DEEPSEEK_API_KEY) {
      const r = await fetch('https://api.deepseek.com/user/balance', {
        headers: { authorization: `Bearer ${env.DEEPSEEK_API_KEY}` },
        signal: TIMEOUT(15_000),
      });
      if (!r.ok) return `http-${r.status} (баланс не прочитан)`;
      const b = await r.json();
      const info = (b?.balance_infos ?? [])[0];
      return info ? `${info.total_balance} ${info.currency}` : 'формат ответа неожиданный';
    }
    if (link.id === 'github') {
      const raw = execFileSync('gh', ['api', 'rate_limit', '--jq', '.resources.core | (.remaining|tostring) + "/" + (.limit|tostring) + " rate"'], { encoding: 'utf8', timeout: 30_000 }).trim();
      return raw;
    }
  } catch (e) {
    return `не прочитан (${String(e?.message ?? e).split('\n')[0]})`;
  }
  return null; // API баланса не декларирован — полиси несёт честное not-provided
}

async function probeLink(link, env) {
  const method = link.probe?.method ?? 'none';
  if (link.knownBlocked) return linkStatus(link, null); // блок известен — сеть не жжём
  if (method.startsWith('llm-probe:')) {
    const r = await probeProvider(method.slice('llm-probe:'.length), env);
    const outcome = r.direct === 'ok' || r.viaProxy === 'ok' ? 'ok' : r.diagnosis ?? r.direct;
    return linkStatus(link, outcome);
  }
  if (method.startsWith('infra-probe:')) {
    const spec = EXTRA_SPECS[method.slice('infra-probe:'.length)];
    const keyName = spec.keyEnv.find((k) => env[k]?.trim());
    if (!keyName) return linkStatus(link, 'auth_missing_key');
    const direct = classifyOutcome(await probeOnce(spec, env[keyName].trim()));
    let viaProxy = null;
    const proxyUrl = env.HTTPS_PROXY?.trim() || env.HTTP_PROXY?.trim();
    if (proxyUrl && direct !== 'ok') {
      const { ProxyAgent } = await import('undici');
      viaProxy = classifyOutcome({ ...(await probeOnce(spec, env[keyName].trim(), { dispatcher: new ProxyAgent(proxyUrl) })), viaProxy: true });
    }
    return linkStatus(link, direct === 'ok' || viaProxy === 'ok' ? 'ok' : diagnosePair(direct, viaProxy));
  }
  if (method.startsWith('http-health:')) {
    try {
      const r = await fetch(method.slice('http-health:'.length), { signal: TIMEOUT(15_000) });
      // Статус пришёл ⇒ транспорт работает: классификатор назовёт причину точнее «http-N».
      return linkStatus(link, r.ok ? 'ok' : classifyOutcome({ status: r.status, bodyText: await r.text().catch(() => '') }));
    } catch (e) {
      // Ответа не было — судим по КОДУ, а не по строке: прежнее `net (…)` метило одним
      // словом и DNS, и таймаут, и отказ соединения (#1804).
      return linkStatus(link, classifyOutcome({ error: String(e?.message ?? e), errorCode: e?.cause?.code ?? e?.code ?? null }));
    }
  }
  if (method === 'proxy-tcp') {
    const proxyUrl = env.HTTPS_PROXY?.trim() || env.HTTP_PROXY?.trim();
    if (!proxyUrl) return linkStatus(link, 'auth_missing_key');
    return linkStatus(link, await tcpProbe(proxyUrl));
  }
  if (method.startsWith('gh-api')) {
    try {
      execFileSync('gh', ['api', 'rate_limit'], { stdio: 'ignore', timeout: 30_000 });
      return linkStatus(link, 'ok');
    } catch {
      // `gh` не ответил — это отказ ИНСТРУМЕНТА (нет авторизации, нет бинаря, лимит), а не
      // доказанная сеть. Звать это сетью было прямой ложью: сеть тут никто не мерил.
      return linkStatus(link, 'unknown_protocol');
    }
  }
  return linkStatus(link, 'skipped');
}

async function main() {
  let policy;
  try {
    policy = JSON.parse(readFileSync(join(repoRoot, POLICY_REL), 'utf8'));
  } catch (e) {
    console.error(`infra:probe — декларация не читается (${POLICY_REL}): ${e.message}`);
    return 2;
  }
  const schema = policyProblems(policy);
  if (schema.length) {
    for (const p of schema) console.error(`  ✗ полиси: ${p}`);
    return 2;
  }

  if (process.argv.includes('--summary')) {
    let snapshot = null;
    try {
      snapshot = JSON.parse(readFileSync(join(repoRoot, SNAPSHOT_REL), 'utf8'));
    } catch {
      /* снимка нет — сводка честно скажет */
    }
    const { lines, finding } = expiringSummary(policy, snapshot);
    console.log('инфра-сводка: что кончается и когда');
    for (const l of lines) console.log(`  · ${l}`);
    return finding ? 3 : 0;
  }

  const env = loadEnv();
  // В сверку идут ВСЕ непустые ключи: первая сторона (звено без ключа) смотрит любые
  // имена (HTTPS_PROXY и т.п.); фильтр ENV_KEY_RE применяет само ядро только ко
  // второй стороне («ключ без записи») — иначе прокси ложно осиротеет (дефект 1-го прогона).
  const findings = reconcileEnv(policy, Object.keys(env).filter((k) => String(env[k] ?? '').trim()));
  const statuses = {};
  const balances = {};
  let red = findings.length > 0;
  let finding = false;

  for (const link of policy.links) {
    const s = await probeLink(link, env);
    statuses[link.id] = s.status;
    const bal = await fetchBalance(link, env);
    if (bal != null) balances[link.id] = bal;
    const mark = s.status === 'ok' ? '✓' : s.status === 'known-blocked' ? '⛔' : s.status === 'skipped' ? '·' : '✗';
    console.log(`  ${mark} ${link.id} — ${s.status}${s.note ? ` (${s.note})` : ''}${bal ? ` · остаток: ${bal}` : ''}`);
    if (s.status === 'red') red = true;
    if (s.status === 'known-blocked') finding = true;
  }
  for (const f of findings) console.error(`  ✗ сверка: ${f}`);

  const snapPath = join(repoRoot, SNAPSHOT_REL);
  mkdirSync(dirname(snapPath), { recursive: true });
  writeFileSync(snapPath, JSON.stringify({ at: new Date().toISOString(), statuses, balances }, null, 2) + '\n', 'utf8');
  console.log(`infra:probe — снимок: ${SNAPSHOT_REL} (в репо не коммитится; балансы живут только локально)`);

  if (red) return 1;
  return finding ? 3 : 0;
}

if (process.argv[1]?.endsWith('infra-probe.mjs')) {
  process.exit(await main());
}
