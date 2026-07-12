#!/usr/bin/env node
/**
 * Drift-Anchor — ночной раннер (DA3).
 *
 * Собирает current-снимок (структурный DA1 + поведенческий DA2), сверяет с
 * версионированным baseline через чистую computeDrift (@membrana/drift-anchor),
 * и для дрейфующих якорей добавляет Claude-РЕАССОНИНГ (гипотеза, НЕ вердикт —
 * консилиум nightly-agents-platform). Выход — MorningDriftDigest JSON.
 *
 * Живёт на office-хосте (репо + собранные детекторы). Claude через media-прокси
 * (ANTHROPIC_API_KEY + HTTPS_PROXY из окружения). Graceful: нет ключа/прокси/ошибка
 * → дайджест всё равно детерминированный, без reasoning-строк.
 *
 * Usage: node scripts/drift-anchor-run.mjs [--out <path>] [--no-llm]
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { buildBehavioralComponents } from './drift-anchor-behavioral.mjs';
import { buildSnapshot } from './drift-anchor-snapshot.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASELINE_PATH = join(ROOT, 'docs/anchors/baseline.json');
const THRESHOLDS_PATH = join(ROOT, 'docs/anchors/thresholds.json');
const DRIFT_ANCHOR_DIST = join(ROOT, 'packages/drift-anchor/dist/index.js');

function loadThresholds() {
  const t = JSON.parse(readFileSync(THRESHOLDS_PATH, 'utf8'));
  return { epsilon1: t.epsilon1, epsilon2: t.epsilon2 };
}

/** Минимальный Anthropic-вызов через media-прокси (ClaudeService-аналог для .mjs). Graceful. */
async function annotate(anchor, anthropicKey, proxyUrl, model) {
  const prompt = [
    'Ты — аналитик агентного дрейфа Membrana. Ниже — ОДИН дрейфующий якорь (вердикт уже вынесен чистой функцией, НЕ меняй его).',
    'Дай ОДНУ короткую строку-гипотезу на русском: вероятная причина дрейфа (недавний коммит/правка). Без преамбулы, только гипотеза.',
    '',
    `Якорь: ${anchor.id} (${anchor.kind}), вердикт ${anchor.verdict}.`,
    `baseline=${anchor.baseline}, current=${anchor.current}, delta=${anchor.delta}.`,
  ].join('\n');

  const body = JSON.stringify({
    model: model || 'claude-haiku-4-5-20251001',
    max_tokens: 256,
    messages: [{ role: 'user', content: [{ type: 'text', text: prompt }] }],
  });
  const headers = {
    'content-type': 'application/json',
    'x-api-key': anthropicKey,
    'anthropic-version': '2023-06-01',
  };

  let res;
  if (proxyUrl) {
    const { fetch: undiciFetch, ProxyAgent } = await import('undici');
    const dispatcher = new ProxyAgent(proxyUrl);
    try {
      res = await undiciFetch('https://api.anthropic.com/v1/messages', {
        method: 'POST', headers, body, dispatcher, signal: AbortSignal.timeout(60_000),
      });
      const text = await res.text();
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = JSON.parse(text);
      return (json.content ?? []).filter((b) => b.type === 'text').map((b) => b.text).join(' ').trim() || null;
    } finally {
      try { await dispatcher.close(); } catch { /* ignore */ }
    }
  }

  res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST', headers, body, signal: AbortSignal.timeout(60_000),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = JSON.parse(text);
  return (json.content ?? []).filter((b) => b.type === 'text').map((b) => b.text).join(' ').trim() || null;
}

async function main() {
  const args = process.argv.slice(2);
  const noLlm = args.includes('--no-llm');
  const outIdx = args.indexOf('--out');
  const outPath = outIdx >= 0 && args[outIdx + 1]
    ? resolve(args[outIdx + 1])
    : join(ROOT, `docs/reports/drift-anchor/DRIFT_${new Date().toISOString().slice(0, 10)}.json`);

  const { computeDrift } = await import(pathToFileURL(DRIFT_ANCHOR_DIST).href);
  const baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'));
  const thresholds = loadThresholds();

  // current = структурный (DA1) + поведенческий (DA2)
  const structural = buildSnapshot().components;
  const behavioral = await buildBehavioralComponents();
  const current = { takenAt: new Date().toISOString(), components: [...structural, ...behavioral] };

  const digest = computeDrift(baseline, current, thresholds);

  // Claude аннотирует ТОЛЬКО дрейфующие якоря (гипотеза, вердикт не трогает)
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  const proxy = process.env.HTTPS_PROXY?.trim() || process.env.HTTP_PROXY?.trim();
  const model = process.env.ANTHROPIC_MODEL?.trim();
  const anchors = [];
  for (const a of digest.anchors) {
    if (!noLlm && key && a.verdict !== 'ok') {
      try {
        const reasoning = await annotate(a, key, proxy, model);
        anchors.push(reasoning ? { ...a, reasoning } : a);
        continue;
      } catch (e) {
        console.error(`annotate ${a.id} failed (graceful): ${e.message}`);
      }
    }
    anchors.push(a);
  }
  const out = { ...digest, anchors };

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n', 'utf8');
  console.error(`drift digest → ${outPath}`);
  console.log(`summary: ok=${out.summary.ok} drift=${out.summary.drift} broken=${out.summary.broken}`);
  for (const a of out.anchors) {
    if (a.verdict !== 'ok') console.log(`  ${a.verdict.toUpperCase()} ${a.id}: base=${a.baseline} cur=${a.current}${a.reasoning ? ' — ' + a.reasoning : ''}`);
  }
  // Ненулевой код если broken — для cron-алертинга
  process.exit(out.summary.broken > 0 ? 2 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
