/**
 * Ядро зонда и витрины контейнера network (#1449). Сеть — снаружи, здесь только
 * сборка наблюдения, рендер и предикаты свежести. Тестируемо без розетки.
 */
import { classifyOutcome, summarize } from './classify.mjs';

/** Наблюдение из ответа/ошибки → исход. Транспорт живёт только там, где нет статуса. */
export function observationFrom({ httpStatus = null, error = null, body = null, viaProxy = false }) {
  const errorCode = error?.cause?.code ?? error?.code ?? null;
  const errorText = error?.message ?? (typeof body === 'string' ? body.slice(0, 500) : null);
  return { httpStatus, errorCode, errorText, body, viaProxy };
}

/**
 * Один результат зонда = профиль + оба пути (прямой и через прокси, если он есть).
 *
 * `reachableStatuses` профиля — статусы, которые для ЗОНДА означают «дошли»: зонд
 * ходит без ключа и без тела, поэтому 401 на корне DeepSeek или 404 на корне Anthropic
 * это признак живого транспорта, а не находка. Иначе витрина полна ложных тревог.
 */
export function buildProbeResult(profile, paths) {
  const reachable = new Set(profile.reachableStatuses ?? []);
  const results = paths.map((p) => {
    const verdict = classifyOutcome(p.observation);
    const status = p.observation?.httpStatus ?? null;
    const adjusted =
      verdict.outcome !== 'ok' && status != null && reachable.has(status)
        ? { outcome: 'ok', isTransport: false, why: `${verdict.why} — для зонда без ключа это «дошли» (профиль)` }
        : verdict;
    return { path: p.path, ...adjusted, latencyMs: p.latencyMs ?? null };
  });
  const best = results.find((r) => r.outcome === 'ok') ?? results[0];
  return {
    id: profile.id,
    label: profile.label,
    role: profile.role ?? 'provider',
    paths: results,
    outcome: best?.outcome ?? 'unknown_protocol',
    isTransport: best?.isTransport ?? false,
    /** Путь имеет значение: прямой красный при зелёном прокси — это гео, а не сеть. */
    proxyMatters: results.length > 1 && results.some((r) => r.outcome === 'ok') && results.some((r) => r.outcome !== 'ok'),
  };
}

/** Сводка снимка: виновата ли сеть и что делать. Контроль весомее провайдеров. */
export function buildSnapshot({ probes, env, generatedAt }) {
  const control = probes.find((p) => p.role === 'control');
  const flat = probes.flatMap((p) => p.paths);
  const sum = summarize(flat);
  const controlOk = control ? control.outcome === 'ok' : null;
  return {
    version: 1,
    generatedAt,
    env,
    probes,
    summary: {
      ...sum,
      controlOk,
      // Контроль зелёный ⇒ сеть машины исправна, что бы ни отвечали провайдеры.
      networkAtFault: controlOk === true ? false : sum.networkAtFault,
      advice:
        controlOk === true
          ? 'сеть машины исправна — отказы провайдеров разбирать по их собственным причинам'
          : controlOk === false
            ? 'контрольная точка красная — проверять сеть машины прежде провайдеров'
            : 'контрольной точки в профиле нет — вывод о сети не делается',
    },
  };
}

const STALE_HOURS = 48;

/** Снимок старше 48 часов — не факт, а воспоминание. */
export function isStale(snapshot, nowIso, hours = STALE_HOURS) {
  if (!snapshot?.generatedAt) return true;
  const age = Date.parse(nowIso) - Date.parse(snapshot.generatedAt);
  return !Number.isFinite(age) || age > hours * 3_600_000;
}

/** Машина, с которой ходит встречная проба: другой канал, тот же сервер. */
export const COUNTER_PROBE_HOST = 'media-VPS (Нидерланды)';

/**
 * Команда встречной пробы. Смысл не в удобстве, а в РАЗРЕШИМОСТИ: отказ с рабочей
 * машины сам по себе не отличает мёртвый сервер от мёртвого канала до него, и оба
 * читаются одинаково — «недоступно». Вторая машина делает эти два случая разными
 * наблюдениями, потому что у неё свой путь к тому же серверу.
 *
 * @param {string} url цель пробы
 * @returns {string} команда одной строкой
 */
export function counterProbeCommand(url = 'https://office.mmbrn.tech/health') {
  return `node scripts/_ssh-media-exec.mjs 'curl -sS -o /dev/null -w "%{http_code} %{time_total}s\\n" ${url}'`;
}

/**
 * Подсказка встречной пробы для текста отказа.
 *
 * ВЕЩДОК 10.09, ради которого она здесь. Офис был недостижим с рабочей машины; инструмент
 * четырежды сказал «неизвестно» и объявил цепочку исчерпанной. Диагноз («клиент прокси
 * гонит трафик в туннель и подменяет имя офиса служебным адресом») закрыла ОДНА команда —
 * встречная проба с нидерландской машины: тот же сервер ответил за две десятых секунды.
 * Подсказка в тексте отказа стоит ноль и экономит час: она превращает «недоступно» в
 * вопрос с двумя различимыми ответами.
 *
 * @param {{url?: string, what?: string}} [opts] `what` — что именно не отвечает
 * @returns {string[]} строки для вставки в отказ
 */
export function renderCounterProbeHint(opts = {}) {
  const url = opts.url ?? 'https://office.mmbrn.tech/health';
  const what = opts.what ?? 'панель';
  return [
    `**Встречная проба — один шаг до диагноза.** Прежде чем звать сеть виноватой, спроси`,
    `ту же цель с другой машины: ${COUNTER_PROBE_HOST} ходит к ней своим каналом.`,
    '',
    '```',
    counterProbeCommand(url),
    '```',
    '',
    `Ответила оттуда — ${what} жива, и дело в канале рабочего места (прецедент 10.09:`,
    'с рабочей машины ECONNRESET за 6.5 с, с нидерландской — HTTP 200 за 0.2 с; виноват',
    'был клиент прокси, подменявший имя офиса служебным адресом). Молчит и оттуда —',
    `тогда ${what} действительно недоступна, и это уже другая работа.`,
  ];
}

/**
 * Блок для агента — то, что он должен знать ДО первого сетевого вызова.
 * Секретов здесь нет: только имена переменных и признак наличия.
 */
export function renderAgentBlock(snapshot, nowIso) {
  const s = snapshot?.summary ?? {};
  const stale = isStale(snapshot, nowIso);
  const lines = [
    '## Сетевое окружение (контейнер network)',
    '',
    `- снимок: ${snapshot?.generatedAt ?? 'нет'}${stale ? ' — **устарел, перепроверь**' : ''}`,
    `- прокси в окружении: ${snapshot?.env?.proxyConfigured ? `есть (${snapshot.env.proxyVars.join(', ')})` : 'нет'}`,
    `- вердикт: ${s.advice ?? 'неизвестно'}`,
    '',
    '| звено | исход | путь решает |',
    '|---|---|---|',
    ...(snapshot?.probes ?? []).map((p) => `| ${p.label} | \`${p.outcome}\` | ${p.proxyMatters ? '**да** — прямой путь закрыт, через прокси открыт' : 'нет'} |`),
    '',
    '**Правило чтения отказов:** если сервер ответил HTTP-статусом, транспорт работает.',
    '`404 модель снята`, `402 кончились кредиты`, `401 ключ не принят` и `403 гео` — это',
    'НЕ сетевые отказы. Сетью считаются только шесть исходов: `dns_fail`, `tcp_fail`,',
    '`tls_fail`, `timeout_idle`, `proxy_intercept`, `provider_unreachable_http`.',
    '',
    '**Грабля, стоившая двух суток (29.07):** голый `fetch` в Node не читает `HTTPS_PROXY` —',
    'нужен `undici` + `ProxyAgent`. Вызов пойдёт напрямую и получит гео-403, который легко',
    'принять за обрыв связи.',
  ];
  // Подсказка появляется ТОЛЬКО когда есть что диагностировать: при зелёном снимке
  // встречная проба не нужна, и её постоянное присутствие обесценило бы её саму.
  if (needsCounterProbe(snapshot)) lines.push('', ...renderCounterProbeHint());
  return lines.join('\n');
}

/**
 * Есть ли повод для встречной пробы: хоть одно звено молчит транспортом либо красна
 * контрольная точка. Живая сеть подсказки не получает — поведение при зелёном не меняется.
 * @param {object} snapshot
 * @returns {boolean}
 */
export function needsCounterProbe(snapshot) {
  if (snapshot?.summary?.controlOk === false) return true;
  return (snapshot?.probes ?? []).some((p) => p.isTransport === true);
}

/** Витрина снимка для человека. */
export function renderSnapshotMd(snapshot, nowIso) {
  const stale = isStale(snapshot, nowIso);
  return [
    '# Сетевое окружение — снимок',
    '',
    `> Сгенерирован: ${snapshot.generatedAt}${stale ? ' · **УСТАРЕЛ (>48 ч)**' : ''}`,
    `> Производный артефакт: пишется \`yarn network:snapshot\`, руками не править.`,
    '',
    `**Вердикт:** ${snapshot.summary.advice}`,
    '',
    '| звено | роль | исход | прямой | через прокси |',
    '|---|---|---|---|---|',
    ...snapshot.probes.map((p) => {
      const direct = p.paths.find((x) => x.path === 'direct');
      const proxied = p.paths.find((x) => x.path === 'proxy');
      return `| ${p.label} | ${p.role} | \`${p.outcome}\` | ${direct ? `\`${direct.outcome}\`` : '—'} | ${proxied ? `\`${proxied.outcome}\`` : '—'} |`;
    }),
    '',
    '## Окружение',
    '',
    `- прокси: ${snapshot.env.proxyConfigured ? `объявлен (${snapshot.env.proxyVars.join(', ')})` : 'не объявлен'}`,
    `- машина: ${snapshot.env.host}`,
    '',
    renderAgentBlock(snapshot, nowIso),
  ].join('\n');
}

/** Код возврата предполётной проверки — агент ветвится по числу, не по тексту. */
export function preflightExitCode(snapshot) {
  const probes = snapshot?.probes ?? [];
  if (probes.length === 0) return 2;
  if (probes.every((p) => p.outcome === 'ok')) return 0;
  if (probes.some((p) => p.isTransport)) return 10;
  if (probes.some((p) => ['auth_missing_key', 'auth_invalid_key'].includes(p.outcome))) return 20;
  if (probes.some((p) => ['geo_blocked', 'billing_exhausted', 'model_removed', 'rate_limited', 'provider_5xx'].includes(p.outcome))) return 30;
  return 40;
}
