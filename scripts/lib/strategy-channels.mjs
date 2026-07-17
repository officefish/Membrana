/**
 * strategy-channels — ОДИН читатель каналов горизонта (эпик #592, S4).
 *
 * Q5: «Один читатель `collectHorizonInputs`». До эпика инсайты читал ТОЛЬКО недельный
 * план (grep = 1), аналайзер-ресёрч — тоже только недельный, и оба зашиты флагами в её
 * тело. S4 выносит чтение сюда: флаги стали ПАРАМЕТРАМИ (`includeInsights` и т.п.), а
 * не hardcode в замороженной недельной. Отсутствующий канал возвращает `null` → ядро
 * (collectHorizonInputs) превращает его в ВИДИМУЮ пометку «канал мёртв», не в тишину.
 *
 * Это IO-слой: он ходит на диск, но не считает горизонт. Логика горизонта — чистое
 * ядро strategy-horizon.mjs. Разделение позволяет тестировать ядро офлайн, а этот слой
 * — на фикстурах каталога.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

/**
 * Минимальный парсер YAML-фронтматтера (`---\n key: value \n---`). Плоские пары
 * ключ:значение — этого хватает для {topic, mode, origin, status, ttl}. Не тянем
 * зависимость: фронтматтер ночного артефакта пишем мы сами и держим плоским.
 *
 * @param {string} md
 * @returns {Record<string, string>}
 */
export function parseFrontmatter(md) {
  const text = String(md ?? '');
  const m = text.match(/^﻿?---\r?\n([\s\S]*?)\r?\n---/u);
  if (!m) return {};
  /** @type {Record<string, string>} */
  const out = {};
  for (const line of m[1].split(/\r?\n/u)) {
    const kv = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/u);
    if (!kv) continue;
    let value = kv[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[kv[1]] = value;
  }
  return out;
}

/**
 * Канал инсайтов: docs/insights/registry.json → массив активных инсайтов. Отсутствие
 * файла → `null` (мёртвый канал), а не пустой массив: пустой массив = «канал жив, но
 * пуст», null = «канала нет вовсе». Оба ядро пометит видимо, но различие честное.
 *
 * @param {string} repoRoot
 * @returns {any[] | null}
 */
export function readInsightChannel(repoRoot) {
  const path = resolve(repoRoot, 'docs/insights/registry.json');
  if (!existsSync(path)) return null;
  try {
    const json = JSON.parse(readFileSync(path, 'utf8'));
    const list = Array.isArray(json?.insights) ? json.insights : [];
    // adopted/active — стратегический backlog; revoked/archived не подсвечиваем.
    return list.filter((i) => i && i.status !== 'archived' && i.status !== 'revoked');
  } catch {
    return null;
  }
}

/**
 * Канал ночного ресёрча: docs/research/night/<date>-<slug>.md. Отсутствие каталога →
 * `null` (канал ещё не рождён — сегодня буквально так). Каждый файл → его фронтматтер
 * {topic, mode, origin, status, ttl} + производные {slug, date} из имени.
 *
 * @param {string} repoRoot
 * @returns {any[] | null}
 */
export function readResearchChannel(repoRoot) {
  const dir = resolve(repoRoot, 'docs/research/night');
  if (!existsSync(dir)) return null;
  let files;
  try {
    files = readdirSync(dir).filter((f) => f.endsWith('.md'));
  } catch {
    return null;
  }
  return files.map((file) => {
    const fm = parseFrontmatter(readFileSync(join(dir, file), 'utf8'));
    const base = file.replace(/\.md$/u, '');
    const dm = base.match(/^(\d{4}-\d{2}-\d{2})-(.+)$/u);
    return {
      slug: dm ? dm[2] : base,
      date: fm.date || (dm ? dm[1] : null),
      topic: fm.topic ?? base,
      mode: fm.mode ?? null,
      origin: fm.origin ?? fm.topic ?? base,
      status: fm.status ?? null,
      ttl: fm.ttl ?? null,
    };
  });
}

/**
 * ОДИН читатель: собрать каналы горизонта. Флаги — ПАРАМЕТРЫ (S4), не hardcode в
 * недельной. Выключенный канал возвращается как `undefined` (не читаем вовсе);
 * включённый, но отсутствующий на диске — как `null` (ядро пометит «канал мёртв»).
 *
 * @param {string} repoRoot
 * @param {{includeInsights?: boolean, includeResearch?: boolean}} [flags]
 * @returns {{insights: any[]|null|undefined, research: any[]|null|undefined}}
 */
export function readHorizonChannels(repoRoot, flags = {}) {
  const includeInsights = flags.includeInsights !== false;
  const includeResearch = flags.includeResearch !== false;
  return {
    insights: includeInsights ? readInsightChannel(repoRoot) : undefined,
    research: includeResearch ? readResearchChannel(repoRoot) : undefined,
  };
}

/**
 * Канал графа правды: docs/truth/registry.json → активные кристаллы (S7). До эпика
 * стратегия граф НЕ читала (grep = 0). Кристаллы — ПОСЫЛКИ горизонта: `owner`-кристаллы
 * суть слово владельца, `derived` — выведенные факты (и пары для ночных снов S6).
 *
 * @param {string} repoRoot
 * @param {{onlyOwner?: boolean}} [flags]
 * @returns {any[] | null}
 */
export function readTruthChannel(repoRoot, flags = {}) {
  const path = resolve(repoRoot, 'docs/truth/registry.json');
  if (!existsSync(path)) return null;
  try {
    const json = JSON.parse(readFileSync(path, 'utf8'));
    const list = Array.isArray(json?.tokens) ? json.tokens : [];
    const active = list.filter((t) => t && t.status !== 'revoked' && t.status !== 'broken');
    return flags.onlyOwner ? active.filter((t) => t.class === 'owner') : active;
  } catch {
    return null;
  }
}

/**
 * Конфиг горизонта дня: docs/strategy/day-horizon.json = {gate, phase, criteria[],
 * lastGateTransition}. Веха ставится ЧЕЛОВЕКОМ (ручной артефакт по спеке), поэтому это
 * файл, а не вывод модели. Отсутствие → `null`: генератор обязан пометить «горизонт не
 * задан» видимо, а не выдумать веху молча.
 *
 * @param {string} repoRoot
 * @returns {{gate: string, phase: string, criteria?: string[], lastGateTransition?: string} | null}
 */
export function readHorizonConfig(repoRoot) {
  const path = resolve(repoRoot, 'docs/strategy/day-horizon.json');
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Рендер горизонта в markdown-артефакт. Секция provenance ЯВНО печатает мёртвые каналы
 * — это и есть «не тишина, не падение» из S4. Помеченный stale highlight рисуется
 * приглушённо с бейджем даты (DoD).
 *
 * @param {{gate: string, phase: string, criteria: string[]}} horizon
 * @param {{highlights: any[], provenance: any[], premises?: any[]}} inputs
 * @param {{now?: string}} [meta]
 * @returns {string}
 */
export function renderHorizonArtifact(horizon, inputs, meta = {}) {
  const { highlights = [], provenance = [], premises = [] } = inputs ?? {};
  const lines = [];
  lines.push('## Горизонт дня');
  lines.push('');
  lines.push(`- **Веха (gate):** \`${horizon.gate}\``);
  lines.push(`- **Фаза:** ${horizon.phase}`);
  if (horizon.criteria?.length) {
    lines.push(`- **Критерии прохождения вехи:**`);
    for (const c of horizon.criteria) lines.push(`  - ${c}`);
  }
  lines.push('');

  // S7: посылки горизонта из графа правды (grep больше не 0). owner-кристаллы = слово
  // владельца; показываем как несущие посылки, не как акценты (это не highlight).
  if (premises.length) {
    const owner = premises.filter((t) => t.class === 'owner');
    const derived = premises.filter((t) => t.class === 'derived');
    lines.push('## Посылки горизонта (граф правды)');
    lines.push('');
    lines.push(`_Кристаллов активно: ${premises.length} (owner: ${owner.length}, derived: ${derived.length}). Стратегия читает граф правды (S7)._`);
    lines.push('');
    for (const t of owner.slice(0, 8)) {
      const claim = String(t.claim ?? '').replace(/\s+/gu, ' ').trim();
      lines.push(`- 🪨 \`${t.id}\` — ${claim.length > 120 ? claim.slice(0, 120) + '…' : claim}`);
    }
    if (owner.length > 8) lines.push(`- …ещё ${owner.length - 8} owner-кристаллов`);
    lines.push('');
  }

  lines.push('## Акценты (highlights)');
  lines.push('');
  const timely = highlights.filter((h) => h.timely);
  const rest = highlights.filter((h) => !h.timely);
  if (highlights.length === 0) {
    lines.push('_Ни одного акцента: каналы пусты или инсайты не привязаны к вехе (см. provenance)._');
  } else {
    const render = (h) => {
      const badge = h.stale ? ` _(stale · ${h.staleBadge})_` : '';
      const echo = h.reflections > 1 ? ` ×${h.reflections}` : '';
      const dim = h.stale ? '~~' : '';
      return `- ${dim}**${h.title}**${dim} — \`${h.kind}:${h.ref}\`${echo}${badge}`;
    };
    if (timely.length) {
      lines.push('**Своевременные** (веха близко И область молчит):');
      for (const h of timely) lines.push(render(h));
      lines.push('');
    }
    if (rest.length) {
      lines.push('**Фоновые** (не своевременны сейчас):');
      for (const h of rest) lines.push(render(h));
      lines.push('');
    }
  }

  lines.push('## Provenance каналов');
  lines.push('');
  for (const p of provenance) {
    if (p.present) {
      lines.push(`- ✅ \`${p.channel}\` — жив, элементов: ${p.count}`);
    } else {
      lines.push(`- ⚠️ \`${p.channel}\` — **${p.note}**`);
    }
  }
  lines.push('');
  lines.push(
    '> Стратегия описывает акцент (`highlight`), но не назначает исполнителей и не пишет DoD:',
  );
  lines.push('> `assign(task, persona)` — операция реестра, не стратегии (Q1).');

  return lines.join('\n');
}
