#!/usr/bin/env node
/**
 * yarn bridge:lead <event> — v0-плагин вызова Ангелины в живую сессию мостика.
 *
 * Проба композиции «LLM-голос по событию посреди сессии» (слово владельца 27.07:
 * «поддерживаю» на v0 с тумблером). Канал легитимен: слова приходят от носителя
 * (PROMPT_ANGELINA + панельная цепочка), не из-под маски — класс прецедента 25.07
 * невозможен по построению.
 *
 * Тумблер: BRIDGE_LEAD=1 обязателен — без него вызов честно отказывает (норма
 * «эксперимент включается словом, не появляется сам»).
 *
 * События v0 (контрактные моменты M2/M5): open · close · gesture · address.
 * Непрерывность присутствия — журнал: docs/virtual-team/lead-journal/<session>.md,
 * append-only; каждый вызов читает журнал сессии и дописывает свою запись.
 *
 * Отказ цепочки — carrier_status: absent, exit 1, никакой имитации (норма
 * procedure-must-follow-panel-chain).
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { invokeProcedureLlm } from './lib/llm-procedure-ritual.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const EVENTS = ['open', 'close', 'gesture', 'address'];
const JOURNAL_DIR = 'docs/virtual-team/lead-journal';
const MAX_JOURNAL_CHARS = 20_000;
const MAX_MATERIAL_CHARS = 30_000;

export function journalPath(sessionId) {
  return join(JOURNAL_DIR, `${sessionId}.md`);
}

/**
 * Чистая сборка промпта — тестируема без ФС/сети.
 * @param {{ persona: string; journal: string | null; event: string; material: string; sessionId: string }} a
 */
export function buildLeadPrompt(a) {
  const parts = [
    a.persona,
    '',
    '---',
    'Ты вызвана В ЖИВУЮ сессию капитанского мостика (v0-проба канала bridge).',
    `Сессия: ${a.sessionId}. Событие: ${a.event}.`,
    'Ты не ведёшь процедуру и не чинишь код — ты фиксируешь: конспект, провенанс',
    'решений, доклад по событию. Отвечай в своём характере, коротко (4–12 строк),',
    'по-русски. Не выдумывай фактов вне материала и журнала; чего нет — того нет.',
    '',
  ];
  if (a.journal) {
    parts.push('---', '## Твой журнал этой сессии (append-only, ты его уже писала)', '', a.journal, '');
  } else {
    parts.push('---', '## Журнал этой сессии пуст — это твоё первое появление в ней.', '');
  }
  parts.push('---', '## Материал события', '', a.material || '(материал не передан — скажи об этом честно)', '');
  return parts.join('\n');
}

function parseArgs(argv) {
  const event = argv.find((a) => !a.startsWith('--'));
  let material = '';
  let sessionId = '';
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--material') material = argv[++i] ?? '';
    if (a === '--material-file') material = readFileSync(argv[++i], 'utf8');
    if (a === '--session') sessionId = argv[++i] ?? '';
  }
  return { event, material: material.slice(0, MAX_MATERIAL_CHARS), sessionId };
}

async function main() {
  if (process.env.BRIDGE_LEAD !== '1') {
    console.error('bridge:lead выключен (тумблер BRIDGE_LEAD=1 не взведён) — включается только словом, не сам.');
    process.exitCode = 2;
    return;
  }
  const { event, material, sessionId } = parseArgs(process.argv.slice(2));
  if (!EVENTS.includes(event ?? '')) {
    console.error(`Событие обязано быть одним из: ${EVENTS.join(' | ')}. Пример: BRIDGE_LEAD=1 yarn bridge:lead close --session <id> --material-file <файл>`);
    process.exitCode = 1;
    return;
  }
  if (!sessionId) {
    console.error('--session <id> обязателен: журнал ведущей живёт по сессии (home lead_journal, вердикт M5).');
    process.exitCode = 1;
    return;
  }

  const persona = readFileSync(join(repoRoot, 'docs/virtual-team/PROMPT_ANGELINA.md'), 'utf8');
  const jPath = join(repoRoot, journalPath(sessionId));
  let journal = null;
  if (existsSync(jPath)) {
    journal = readFileSync(jPath, 'utf8');
    if (journal.length > MAX_JOURNAL_CHARS) journal = journal.slice(-MAX_JOURNAL_CHARS);
  }

  const prompt = buildLeadPrompt({ persona, journal, event, material, sessionId });
  const res = await invokeProcedureLlm({ procedureId: 'bridge-lead', prompt, maxTokens: 2000 });

  if (!res.ok) {
    console.error('carrier_status: absent — панельная цепочка не отдала голос ведущей; сессия продолжает как session-scribe. Сообщить владельцу.');
    process.exitCode = 1;
    return;
  }

  const reply = res.text.trim();
  console.log(`[Ангелина · ${event}]: ${reply}`);

  mkdirSync(dirname(jPath), { recursive: true });
  const stamp = new Date().toISOString();
  appendFileSync(
    jPath,
    `\n## ${stamp} · ${event} · ${res.provider}/${res.model}\n\n${reply}\n`,
    'utf8',
  );
  console.error(`→ журнал: ${journalPath(sessionId)} (звено: ${res.provider}/${res.model})`);
}

const isDirectRun = process.argv[1] && import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`;
if (isDirectRun) main();
