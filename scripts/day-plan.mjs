#!/usr/bin/env node
/**
 * yarn day:plan — драйвер канона дня (провод #1363, слово владельца 28.07 «давай починим сразу»).
 *
 * Ядро сборки (day-plan-frame/day-plan-assemble, вердикт M2-B) построено давно — этот
 * скрипт дотягивает кабель: собирает КОНТЕКСТ из живых источников дня, наполняет пять
 * слотов по-слотово через панельную цепочку (стенка Slot → Text: LLM видит kind и
 * материал, НЕ структуру), собирает assemble() и пишет docs/DAY_PLAN.md.
 *
 * Живые источники (кейс live-strategy-synthesis, 27.07):
 *   - реестр активных задач (кандидаты магистрали → детерминированный top-3);
 *   - docs/HANDOFF.md — рука вчерашней сессии (топ-10, ловушки, хвосты);
 *   - docs/STRATEGY_DAY.md — детерминированный горизонт (#592, ЖИВОЙ генератор);
 *   - вчерашний team-evening-feedback (голоса команды и числа).
 *
 * Правила Q1 (заседание strategy-day-q1-stop-doing, 17.07): план НЕ пишет DoD и НЕ
 * назначает исполнителей; магистраль НЕ назначается — top-3 кандидатов, выбор словом
 * владельца (двухгейтовое утро). Пустой слот — видимое состояние, не отказ.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { provenanceHeader } from './lib/angelina-adapter.mjs';
import { assemble, FILL_STATUS, sign } from './lib/day-plan-assemble.mjs';
import { buildTop3, candidatesFromRegistry, frame } from './lib/day-plan-frame.mjs';
import { invokeProcedureLlm } from './lib/llm-procedure-ritual.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT_REL = 'docs/DAY_PLAN.md';
const MAX_SOURCE_CHARS = 12_000;

/** Правила наполнения per-kind: cardinality из frame, запреты Q1 — в каждом промпте. */
const SLOT_BRIEFS = Object.freeze({
  magistral:
    'Магистраль дня. НЕ назначай её: подай top-3 кандидатов (они даны в материале) — по 1–2 ' +
    'предложения на каждого: какую боль закрывает и почему годится магистралью. Заверши строкой: ' +
    '«Выбор магистрали — слово владельца (owner-choice)».',
  reinforcement:
    'Подкрепления магистрали (до 2): работы среднего размера, которые усиливают вероятный ' +
    'выбор магистрали или снимают её риски. Обоснуй связку одним предложением каждая.',
  perspective:
    'Перспективные (до 3): работы, открывающие следующие дни (календарь, зависимости). ' +
    'По одному предложению: что откроется.',
  experimental:
    'Экспериментальные (до 3): пробы из инсайтов/кейсов/снов — дешёвые, обратимые. ' +
    'По одному предложению: что узнаем.',
  sanitary:
    'Санитарные (до 5): вчерашние хвосты, помехи прогонов, ревью-долги. Коротко, ' +
    'по строке на пункт, с опорой на материал.',
});

function readBounded(rel) {
  const abs = join(repoRoot, rel);
  if (!existsSync(abs)) return null;
  const text = readFileSync(abs, 'utf8');
  return text.length > MAX_SOURCE_CHARS ? text.slice(0, MAX_SOURCE_CHARS) + '\n[…обрезано…]' : text;
}

function yesterdayIso(today = new Date()) {
  const d = new Date(today.getTime() - 24 * 3600 * 1000);
  return d.toISOString().slice(0, 10);
}

/** Чистая сборка контекста дня из уже прочитанных источников — тестируема без ФС. */
export function buildContext(sources) {
  const tasks = sources.registryTasks ?? [];
  let candidates = candidatesFromRegistry(tasks, { size: 'L' });
  if (candidates.length === 0) candidates = candidatesFromRegistry(tasks, { size: 'M' });
  const top3 = buildTop3({ candidates });
  return { top3, handoff: sources.handoff ?? null, horizon: sources.horizon ?? null, feedback: sources.feedback ?? null };
}

/** Чистая сборка промпта слота — стенка Slot → Text: kind и материал, без id/order/title. */
export function buildSlotPrompt(kind, ctx) {
  const parts = [
    'Ты наполняешь ОДИН слот плана дня Membrana. Отвечай только телом слота (markdown-список',
    'или 2–6 строк), без заголовков, без DoD, без назначения исполнителей.',
    '',
    `Тип слота: ${kind}. Задача: ${SLOT_BRIEFS[kind]}`,
    '',
  ];
  if (kind === 'magistral') {
    parts.push('Кандидаты top-3 (детерминированный ранг из реестра):',
      ctx.top3.length ? ctx.top3.map((c) => `- ${c.id} (зона: ${c.zone ?? 'не размечена'}, размер: ${c.size})`).join('\n') : '- реестр не дал кандидатов — скажи это честно', '');
  }
  if (ctx.horizon) parts.push('--- Горизонт дня (детерминированный, веха):', ctx.horizon, '');
  if (ctx.handoff) parts.push('--- Рука вчерашней сессии (HANDOFF, топ-10/ловушки/хвосты):', ctx.handoff, '');
  if (ctx.feedback) parts.push('--- Вчерашний вечерний фидбек команды:', ctx.feedback, '');
  parts.push('Опирайся только на материал выше; чего в нём нет — того не выдумывай.');
  return parts.join('\n');
}

/** Посылки дня — код, не LLM: что реально легло в сборку. */
/**
 * Предикат «вчерашний день закрыт» — У2 разбора #1539.
 *
 * Санитарный раздел плана 31.07 утверждал «вчерашний день не закрыт, итога нет ни у
 * партнёров, ни у команды» ПРИ ТОМ, что протокол лежал в стволе, а журнал отправки нёс
 * `sent=true`. Причина не в незнании: посылка «фидбек: вчерашний протокол прочитан»
 * стояла в том же документе утвердительно — санитарные строки собирались свободным
 * текстом, ничем не связанным с вычисленными фактами, и модель противоречила своему входу.
 *
 * Здесь факт становится ВЫЧИСЛИМЫМ. Граница проведена сознательно: закрытие дня
 * разрешимо и потому сочинению не подлежит; хвосты, помехи и ревью-долги остаются
 * свободными строками — предикатом они не выражаются.
 *
 * Журнал читается прямо: `docs/comms/sent-log.jsonl` в зоне блока, а дом предиката
 * «отправка по роду и дате» математик поместил в `comms-sent-log.mjs` — файл вне зоны.
 * ДОЛГ НАЗВАН: разбор JSONL здесь дублирует тамошний; свести — отдельным актом.
 *
 * @param {string} repoRoot
 * @param {string} dateIso `YYYY-MM-DD`
 * @returns {{ closed: boolean, feedback: boolean, swallow: boolean, why: string[] }}
 */
export function yesterdayClosure(repoRoot, dateIso) {
  const feedback = existsSync(join(repoRoot, `docs/seanses/team-evening-feedback-${dateIso}.md`));
  let swallow = false;
  const logAbs = join(repoRoot, 'docs/comms/sent-log.jsonl');
  if (existsSync(logAbs)) {
    for (const line of readFileSync(logAbs, 'utf8').split(/\n/u)) {
      if (!line.trim()) continue;
      let row;
      try {
        row = JSON.parse(line);
      } catch {
        continue; // битая строка журнала — не факт отправки и не повод врать в обе стороны
      }
      // Род у всех ласточек один — `swallow`; утреннюю от вечерней различает только имя
      // черновика (`swallow-morning-…` / `swallow-evening-…`, плюс разовые вроде
      // `swallow-denis-algo-…`). День закрывает ВЕЧЕРНЯЯ: утренняя — это план, а не итог.
      // Найдено на живых данных 31.07: без этого условия сегодняшняя утренняя отправка
      // засчиталась бы за вчерашний итог.
      // Сверено с `comms-sent-log.mjs` по ревью: там фильтра «утро/вечер» НЕТ вовсе
      // (только sha256 и kind ∈ {swallow, digest}) — расходиться не с чем, признак новый.
      // Сравнение по ИМЕНИ файла, а не по вхождению в путь: каталог с похожим именем
      // не должен засчитываться за отправку.
      const isEvening = String(row?.file ?? '').split('/').pop()?.startsWith('swallow-evening-') === true;
      if (row?.kind === 'swallow' && row?.sent === true && isEvening && String(row?.ts ?? '').startsWith(dateIso)) {
        swallow = true;
        break;
      }
    }
  }
  const why = [];
  if (!feedback) why.push('протокола команды нет');
  if (!swallow) why.push('вечерняя ласточка партнёрам не отправлена');
  return { closed: feedback && swallow, feedback, swallow, why };
}

export function gatherPremises(sources, top3) {
  const p = [];
  p.push(`реестр задач: кандидатов магистрали ${top3.length} (детерминированный ранг, зоны по разметке)`);
  p.push(sources.horizon ? 'горизонт: docs/STRATEGY_DAY.md прочитан (живой генератор #592)' : 'горизонт: docs/STRATEGY_DAY.md отсутствует — веха не задана');
  p.push(sources.handoff ? 'рука: docs/HANDOFF.md прочитан' : 'рука: docs/HANDOFF.md отсутствует');
  p.push(sources.feedback ? 'фидбек: вчерашний протокол команды прочитан' : 'фидбек: вчерашнего протокола нет');
  // Факт закрытия вчерашнего дня подаётся ПОСЫЛКОЙ и утверждением, а не намёком: посылки
  // модель обязана принимать как данность, и противоречить им в санитарном разделе не может.
  if (sources.closure) {
    p.push(
      sources.closure.closed
        ? 'вчерашний день ЗАКРЫТ (вычислено): протокол команды есть, ласточка отправлена — в санитарные это НЕ писать'
        : `вчерашний день НЕ закрыт (вычислено): ${sources.closure.why.join('; ')}`,
    );
  }
  p.push('магистраль НЕ назначена планом — top-3 кандидатов, выбор словом владельца (Q1 17.07 + гейт утра)');
  return p;
}

async function main() {
  const registryRaw = readBounded('docs/tasks/registry.json');
  let registryTasks = [];
  try {
    const j = JSON.parse(readFileSync(join(repoRoot, 'docs/tasks/registry.json'), 'utf8'));
    registryTasks = Array.isArray(j) ? j : (j.tasks ?? []);
  } catch { /* реестр нечитаем — кандидатов нет, посылка скажет */ }

  const sources = {
    registryTasks,
    handoff: readBounded('docs/HANDOFF.md'),
    horizon: readBounded('docs/STRATEGY_DAY.md'),
    feedback: readBounded(`docs/seanses/team-evening-feedback-${yesterdayIso()}.md`),
    closure: yesterdayClosure(repoRoot, yesterdayIso()),
  };
  const ctx = buildContext(sources);

  const fills = {};
  for (const slot of frame()) {
    const prompt = buildSlotPrompt(slot.kind, ctx);
    try {
      const res = await invokeProcedureLlm({ procedureId: 'ritual-strategy-day', prompt, maxTokens: 900 });
      fills[slot.id] = res.ok
        ? { text: res.text.trim(), status: FILL_STATUS.FILLED }
        : { text: '', status: FILL_STATUS.EMPTY };
      if (res.ok) console.error(`[day-plan] слот ${slot.id}: ${res.provider}/${res.model}`);
      else console.error(`[day-plan] слот ${slot.id}: цепочка не отдала — слот честно пуст`);
    } catch (e) {
      console.error(`[day-plan] слот ${slot.id}: ${e?.message ?? e} — слот честно пуст`);
      fills[slot.id] = { text: '', status: FILL_STATUS.EMPTY };
    }
  }

  const premises = gatherPremises(sources, ctx.top3);
  const { markdown, emptyCount, statuses } = assemble(fills, { premises });
  const signature = sign(markdown, 'llm', { signedAt: new Date().toISOString() });

  const header = provenanceHeader({ author: 'llm' });
  const title = `# План дня — ${new Date().toISOString().slice(0, 10)}\n`;
  const digestLine = `<!-- canon-digest: ${signature.digest} · signedAt: ${signature.signedAt} -->\n`;
  writeFileSync(join(repoRoot, OUTPUT_REL), `${header}\n${digestLine}${title}\n${markdown}\n`, 'utf8');

  console.log(`day-plan → ${OUTPUT_REL}: слотов пусто ${emptyCount}/5, статусы: ${JSON.stringify(statuses)}`);
  if (emptyCount >= 3) {
    console.error('day-plan: 3+ слотов пусты — план формально существует, но беден; проверить цепочку/источники.');
    process.exitCode = 3; // находка, не отказ: ритуал продолжится, репортёр скажет
  }
}

const isDirectRun = process.argv[1] && import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`;
if (isDirectRun) main();
