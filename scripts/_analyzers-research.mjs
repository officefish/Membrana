/**
 * Движок еженедельного «радара» внешних аналайзеров для Membrana.
 *
 * Идея: раз в неделю обходим публичные источники (HuggingFace Hub, arXiv),
 * сопоставляем найденное с уже зафиксированным каталогом §4 в
 * `docs/INTEGRATIONS_STRATEGY.md`, и через Anthropic просим Claude:
 *   1) отсеять дубли,
 *   2) предложить эшелон + оценки `L/T/C/Q` из матрицы §2,
 *   3) сформулировать рекомендации Teamlead-у,
 *   4) подготовить готовые строки-патчи для §4.
 *
 * Результат: один markdown-документ `docs/WEEKLY_ANALYZERS_RESEARCH.md`
 * (перезаписывается каждый запуск, история — в git).
 *
 * Документ НЕ используется ежедневным `yarn code-review`, но
 * учитывается недельным планировщиком `yarn plan:week`.
 *
 * Используется обёрткой `scripts/analyzers-research-week.mjs`.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fetch as undiciFetch, Agent } from 'undici';

import { loadDotEnv } from './_anthropic-env.mjs';
// Провод стадии стратегии к панели каналов (группа ritual): switch провайдера — в панели.
import { invokeProcedureLlm } from './lib/llm-procedure-ritual.mjs';

/** Жёсткий потолок контекста запроса к Anthropic (символы). */
const MAX_CONTEXT_CHARS = 90_000;

/** Из стратегии берём ограниченное число символов: нужны §1–§4, не всё подряд. */
const MAX_STRATEGY_CHARS = 30_000;

/** Сколько моделей и работ выбираем из источников. */
const HF_LIMIT = 40;
const ARXIV_LIMIT = 30;

/** Таймаут на сетевые вызовы к публичным API. */
const FETCH_TIMEOUT_MS = 20_000;

/**
 * Парсит §4 «Каталог кандидатов» из INTEGRATIONS_STRATEGY.md.
 * Возвращает плоский список имён, которые уже считаются известными.
 * Парсер намеренно простой — нам нужны только имена для дедупликации.
 *
 * @param {string} strategyText
 * @returns {string[]}
 */
export function extractKnownCandidates(strategyText) {
  if (!strategyText) return [];
  const startIdx = strategyText.indexOf('## 4.');
  if (startIdx < 0) return [];
  const endMatch = strategyText.slice(startIdx).match(/\n## 5\./);
  const slice = endMatch
    ? strategyText.slice(startIdx, startIdx + endMatch.index)
    : strategyText.slice(startIdx);

  const names = new Set();
  for (const line of slice.split(/\r?\n/)) {
    const cells = line.split('|').map((c) => c.trim()).filter(Boolean);
    if (cells.length < 3) continue;
    if (!/^\d+\.\d+$/.test(cells[0])) continue;

    const candidate = cells[1];
    for (const bold of candidate.matchAll(/\*\*([^*]+)\*\*/g)) {
      names.add(bold[1].trim().toLowerCase());
    }
    const cleaned = candidate.replace(/[*_`]/g, '').trim().toLowerCase();
    if (cleaned) names.add(cleaned);
  }
  return [...names];
}

/**
 * Локальный fetch с таймаутом и собственным dispatcher-ом (закрываем после чтения).
 */
async function fetchText(url, { headers, timeoutMs = FETCH_TIMEOUT_MS } = {}) {
  const dispatcher = new Agent();
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await undiciFetch(url, {
      method: 'GET',
      headers,
      dispatcher,
      signal: controller.signal,
    });
    const text = await res.text();
    return { ok: res.ok, status: res.status, text };
  } finally {
    clearTimeout(t);
    try {
      await dispatcher.close();
    } catch {
      /* ignore */
    }
  }
}

/**
 * HuggingFace Hub: модели с pipeline_tag=audio-classification.
 * Сортировки: lastModified и likes — обе подмешиваются в общий список.
 *
 * @param {string} since ISO-дата нижней границы фильтра по lastModified
 */
export async function fetchHuggingFaceCandidates(since) {
  const base = 'https://huggingface.co/api/models';
  const params = new URLSearchParams({
    pipeline_tag: 'audio-classification',
    limit: String(HF_LIMIT),
    full: 'false',
  });

  async function call(sortField, direction) {
    const u = new URL(base);
    for (const [k, v] of params) u.searchParams.set(k, v);
    u.searchParams.set('sort', sortField);
    u.searchParams.set('direction', direction);
    const r = await fetchText(u.toString(), {
      headers: { accept: 'application/json' },
    });
    if (!r.ok) {
      return { ok: false, status: r.status, items: [] };
    }
    try {
      const arr = JSON.parse(r.text);
      return { ok: true, status: r.status, items: Array.isArray(arr) ? arr : [] };
    } catch {
      return { ok: false, status: r.status, items: [] };
    }
  }

  const [recent, popular] = await Promise.all([
    call('lastModified', '-1'),
    call('likes', '-1'),
  ]);

  const byId = new Map();
  for (const m of [...recent.items, ...popular.items]) {
    if (!m?.modelId && !m?.id) continue;
    const id = m.modelId ?? m.id;
    if (byId.has(id)) continue;
    if (since && m.lastModified && m.lastModified < since && !m.likes) continue;
    byId.set(id, {
      id,
      lastModified: m.lastModified ?? null,
      likes: m.likes ?? 0,
      downloads: m.downloads ?? 0,
      tags: Array.isArray(m.tags) ? m.tags.slice(0, 8) : [],
      pipeline: m.pipeline_tag ?? 'audio-classification',
      url: `https://huggingface.co/${id}`,
    });
  }
  return {
    ok: recent.ok || popular.ok,
    items: [...byId.values()],
    httpStatusRecent: recent.status,
    httpStatusPopular: popular.status,
  };
}

/**
 * arXiv API: cs.SD / eess.AS + ключевые слова про дронов и теггинг звука.
 * Возвращает Atom-XML, парсим минимальным regex-ом — нам нужны title/summary/id/updated.
 */
export async function fetchArxivCandidates() {
  const query = [
    '(cat:cs.SD OR cat:eess.AS)',
    'AND',
    '(',
    'abs:drone OR abs:UAV OR abs:quadcopter',
    'OR abs:"sound event detection"',
    'OR abs:"audio classification"',
    'OR abs:"audio tagging"',
    'OR abs:"acoustic detection"',
    ')',
  ].join(' ');
  const u = new URL('http://export.arxiv.org/api/query');
  u.searchParams.set('search_query', query);
  u.searchParams.set('sortBy', 'submittedDate');
  u.searchParams.set('sortOrder', 'descending');
  u.searchParams.set('max_results', String(ARXIV_LIMIT));

  const r = await fetchText(u.toString(), {
    headers: { accept: 'application/atom+xml' },
  });
  if (!r.ok) {
    return { ok: false, status: r.status, items: [] };
  }

  const items = [];
  const entries = r.text.split('<entry>').slice(1);
  for (const raw of entries) {
    const end = raw.indexOf('</entry>');
    const block = end >= 0 ? raw.slice(0, end) : raw;
    const pick = (tag) => {
      const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
      return m ? decodeXmlEntities(m[1].replace(/\s+/g, ' ').trim()) : '';
    };
    const title = pick('title');
    const summary = pick('summary');
    const id = pick('id');
    const updated = pick('updated');
    if (!title || !id) continue;
    items.push({
      id,
      title,
      updated,
      summary: summary.slice(0, 600),
      url: id,
    });
  }
  return { ok: true, status: r.status, items };
}

/** Минимальный декодер для XML/HTML-сущностей, встречающихся в arXiv Atom. */
function decodeXmlEntities(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)));
}

function readBoundedFile(absPath, maxChars) {
  if (!existsSync(absPath)) return null;
  let text = readFileSync(absPath, 'utf8');
  if (text.length > maxChars) {
    text =
      text.slice(0, maxChars) +
      `\n\n[… документ обрезан до ${maxChars} символов для запроса …]\n`;
  }
  return text;
}

function buildSystemHeader() {
  return (
    `Ты — аналитик-исследователь проекта Membrana, ведёшь «радар» внешних\n` +
    `аналайзеров звука (модели, датасеты, статьи), которые могли бы пополнить\n` +
    `каталог §4 файла docs/INTEGRATIONS_STRATEGY.md.\n\n` +
    `Жёсткие правила приоритизации, которые НЕ обсуждаются и которым ты подчиняешь любую рекомендацию:\n` +
    `  1) Локально лучше, чем свой сервер; свой сервер лучше, чем внешний API.\n` +
    `  2) Zero-shot/off-the-shelf лучше, чем fine-tune; fine-tune лучше, чем обучение с нуля.\n` +
    `  3) Open-weights локально лучше, чем self-host; self-host лучше, чем платный API.\n\n` +
    `Тебе подаётся:\n` +
    `  A) Релевантный фрагмент INTEGRATIONS_STRATEGY.md (принципы §1, матрица §2,\n` +
    `     каталог §4 — то, что уже известно команде).\n` +
    `  B) Сырые данные из HuggingFace Hub (audio-classification) и arXiv (cs.SD / eess.AS)\n` +
    `     за последний период — кандидаты, которые могут быть новыми.\n\n` +
    `Не выдумывай факты вне поданного контекста. Если сведений о модели мало —\n` +
    `так и пиши («метаданные скудны»), не гадай о лицензии или качестве.`
  );
}

function buildTaskBody({ outputFileName, isoNow, sinceIso }) {
  return [
    `# Задание`,
    ``,
    `Сформируй ОДИН markdown-документ — еженедельный отчёт радара. Файл будет`,
    `сохранён как \`${outputFileName}\` и перезаписан целиком при следующем запуске`,
    `(история — в git). Используй именно эти заголовки уровня ## и ###, без отклонений.`,
    ``,
    `## 1. Сводка`,
    `- Дата отчёта: \`${isoNow}\`. Окно поиска: с \`${sinceIso}\` по \`${isoNow}\`.`,
    `- 3–6 предложений: что главное появилось за неделю и есть ли причина двигать каталог §4.`,
    `- Если значимых новинок нет — честно отметь это.`,
    ``,
    `## 2. Новые кандидаты`,
    `Таблица. Колонки строго в этом порядке:`,
    ``,
    `\`№\` | \`Кандидат\` | \`Источник\` | \`Эшелон\` | \`L\` | \`T\` | \`C\` | \`Q\` | \`Σ\` | \`Дубликат?\` | \`Заметки\``,
    ``,
    `- \`№\` — сквозная нумерация (1, 2, 3, …).`,
    `- \`Кандидат\` — имя модели/работы и короткая поясняющая фраза (1 строка).`,
    `- \`Источник\` — \`HuggingFace\` или \`arXiv\` + ссылка в формате \`[link](url)\`.`,
    `- \`Эшелон\` — 0/1/2/3 по §3 INTEGRATIONS_STRATEGY.md.`,
    `- \`L/T/C/Q\` — оценки по матрице §2 (целые числа).`,
    `- \`Σ\` — сумма L+T+C+Q.`,
    `- \`Дубликат?\` — \`да\` / \`нет\` / \`вариант X.Y\` со ссылкой на строку §4, если этот кандидат пересекается с уже известным.`,
    `- \`Заметки\` — 1–2 фразы: лицензия (если известна), почему интересно, что мешает.`,
    ``,
    `Сортировка строк: по \`Σ\` убыванию; внутри одного \`Σ\` — по эшелону (0 → 3).`,
    `Если кандидатов нет — оставь только заголовок раздела и фразу «За период новых кандидатов не найдено».`,
    ``,
    `## 3. Предлагаемые правки §4 INTEGRATIONS_STRATEGY.md`,
    `- Для каждого кандидата, у которого \`Σ ≥ 7\` И \`Дубликат? = нет\`, выдай готовую строку`,
    `  для подходящей таблицы §4.1 / §4.2 / §4.3 / §4.4 — в виде diff-блока:`,
    ``,
    `\`\`\`diff`,
    `+ | X.Y | **Имя** … | … | L | T | C | Q | **Σ** | целевой пакет |`,
    `\`\`\``,
    ``,
    `- Если кандидат уточняет уже известный (вариант существующей строки) — предложи`,
    `  правку существующей строки тем же diff-форматом (\`-\` + \`+\`).`,
    `- Если кандидатов с \`Σ ≥ 7\` нет — раздел из одной фразы «Правки не предлагаются».`,
    ``,
    `## 4. Рекомендации Teamlead-у`,
    `- 2–5 буллетов, что делать с этим отчётом: какие кандидаты двигать в каталог,`,
    `  какие требуют точечного замера, какие отбросить и почему.`,
    `- Соблюдай приоритеты §1.1/§1.2/§1.3: ни в каком случае не рекомендуй платный API,`,
    `  если локальный вариант не исчерпан, и не рекомендуй fine-tune, если zero-shot не замерен.`,
    ``,
    `## 5. Сырые источники`,
    `### HuggingFace (audio-classification, top по lastModified + likes)`,
    `Маркированный список: \`id\` + (likes/downloads, теги, lastModified). Без обработки, как пришло.`,
    `Если HF вернул ошибку — короткая строка «HuggingFace API: HTTP <code>».`,
    ``,
    `### arXiv (cs.SD / eess.AS, релевантные запросы)`,
    `Маркированный список: title + ссылка + 1 строка из summary. Без обработки.`,
    `Если arXiv вернул ошибку — короткая строка «arXiv API: HTTP <code>».`,
    ``,
    `Ограничения формата:`,
    `- Язык — русский.`,
    `- Никаких сроков в днях/неделях/часах — это документ-радар, а не план.`,
    `- Не цитируй INTEGRATIONS_STRATEGY.md длинными блоками — ссылайся на §X.Y.`,
    `- Не предлагай обходить запрет прямой работы с Web Audio API (см. ARCHITECTURE.md §1b).`,
  ].join('\n');
}

function writeReportFile({
  outputPath,
  commandName,
  isoNow,
  sinceIso,
  sources,
  body,
}) {
  const header =
    `<!-- Сгенерировано: ${isoNow} (${commandName}) -->\n` +
    `<!-- Окно поиска: ${sinceIso} → ${isoNow} -->\n` +
    `<!-- Источники: ${sources.join(', ')} -->\n` +
    `<!-- Каталог-источник: docs/INTEGRATIONS_STRATEGY.md §4 -->\n` +
    `<!-- Документ автоген; учитывается только weekly-plan, не daily-review. -->\n\n`;
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, header + body, 'utf8');
}

/**
 * @typedef {Object} AnalyzersResearchOptions
 * @property {string} outputPath   Абсолютный путь к выходному markdown-файлу.
 * @property {string} commandName  Имя yarn-команды (для шапки файла).
 * @property {boolean} [dryRun]    Если true — не вызывать Anthropic, только показать собранные источники.
 * @property {number} [sinceDays]  Окно поиска в днях (по умолчанию 7).
 */

/**
 * @param {AnalyzersResearchOptions} options
 */
export async function runAnalyzersResearch(options) {
  loadDotEnv();

  const sinceDays = options.sinceDays ?? 7;
  const now = new Date();
  const since = new Date(now.getTime() - sinceDays * 24 * 60 * 60 * 1000);
  const isoNow = now.toISOString();
  const sinceIso = since.toISOString();

  const strategyPath = resolve(process.cwd(), 'docs/INTEGRATIONS_STRATEGY.md');
  const strategy =
    readBoundedFile(strategyPath, MAX_STRATEGY_CHARS) ??
    '(docs/INTEGRATIONS_STRATEGY.md не найден — каталог пуст для дедупликации)';
  const knownNames = extractKnownCandidates(strategy);

  console.error(
    `Каталог §4: найдено ${knownNames.length} известных имён для дедупликации.`,
  );

  const [hf, arxiv] = await Promise.all([
    fetchHuggingFaceCandidates(sinceIso).catch((e) => ({
      ok: false,
      status: 0,
      items: [],
      error: String(e?.message ?? e),
    })),
    fetchArxivCandidates().catch((e) => ({
      ok: false,
      status: 0,
      items: [],
      error: String(e?.message ?? e),
    })),
  ]);

  console.error(
    `HuggingFace: ok=${hf.ok}, status=${hf.status ?? hf.httpStatusRecent}, items=${hf.items?.length ?? 0}`,
  );
  console.error(
    `arXiv: ok=${arxiv.ok}, status=${arxiv.status}, items=${arxiv.items?.length ?? 0}`,
  );

  const hfBlock = hf.items.length
    ? hf.items
        .map(
          (m) =>
            `- ${m.id} | likes=${m.likes} downloads=${m.downloads} | lastModified=${
              m.lastModified ?? '?'
            } | tags=[${m.tags.join(', ')}] | ${m.url}`,
        )
        .join('\n')
    : `(HuggingFace вернул ${hf.ok ? '0 элементов' : `HTTP ${hf.status ?? hf.httpStatusRecent ?? '?'}`})`;

  const arxivBlock = arxiv.items.length
    ? arxiv.items
        .map(
          (p) =>
            `- ${p.title} | ${p.updated} | ${p.url}\n  ${p.summary}`,
        )
        .join('\n')
    : `(arXiv вернул ${arxiv.ok ? '0 элементов' : `HTTP ${arxiv.status ?? '?'}`})`;

  const knownBlock = knownNames.length
    ? knownNames.map((n) => `- ${n}`).join('\n')
    : '(каталог пуст)';

  const outputFileRel = options.outputPath.replace(process.cwd() + '/', '');
  const systemHeader = buildSystemHeader();
  const task = buildTaskBody({
    outputFileName: outputFileRel,
    isoNow,
    sinceIso,
  });

  const assembled = [
    systemHeader,
    '',
    '---',
    '## docs/INTEGRATIONS_STRATEGY.md (фрагмент, ограничен по символам)',
    '',
    strategy,
    '',
    '---',
    '## Уже известные имена из §4 (для быстрой дедупликации)',
    '',
    knownBlock,
    '',
    '---',
    '## Сырые данные: HuggingFace Hub (pipeline_tag=audio-classification)',
    '',
    hfBlock,
    '',
    '---',
    '## Сырые данные: arXiv (cs.SD / eess.AS, последние работы по запросу)',
    '',
    arxivBlock,
    '',
    '---',
    task,
  ].join('\n');

  const bodyText =
    assembled.length > MAX_CONTEXT_CHARS
      ? assembled.slice(0, MAX_CONTEXT_CHARS) +
        `\n\n[… контекст обрезан до ${MAX_CONTEXT_CHARS} символов …]\n`
      : assembled;

  const sources = ['HuggingFace Hub (audio-classification)', 'arXiv (cs.SD / eess.AS)'];

  if (options.dryRun) {
    console.log('--- DRY RUN: контекст, который ушёл бы в Anthropic ---');
    console.log(bodyText);
    console.log('--- END DRY RUN ---');
    console.error(
      `Длина контекста: ${bodyText.length} символов; источники: ${sources.join(' / ')}.`,
    );
    return;
  }

  let exitCode = 0;
  try {
    const r = await invokeProcedureLlm({
      procedureId: 'ritual-strategy-day',
      prompt: bodyText,
      maxTokens: 8192,
    });

    if (!r.ok) {
      console.error(
        `[fail] LLM-канал стратегии исчерпан по всей цепочке: ${r.error || (r.status ? `HTTP ${r.status}` : 'нет ответа')}`,
      );
      exitCode = 1;
    } else {
      const out = r.text || '';
      writeReportFile({
        outputPath: options.outputPath,
        commandName: options.commandName,
        isoNow,
        sinceIso,
        sources,
        body: out,
      });
      console.log(out);
      console.error(`Записано: ${options.outputPath} (канал: ${r.provider}/${r.model})`);
    }
  } catch (e) {
    console.error(e);
    exitCode = 1;
  }

  if (exitCode === 0) {
    await new Promise((r) => setTimeout(r, 150));
  }
  process.exit(exitCode);
}

/**
 * Парсер CLI для обёртки. Поддерживает --help, --dry-run, --since-days=N.
 */
export function parseResearchArgs(argv, { commandName }) {
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(`Usage: node scripts/${commandName}.mjs [--dry-run] [--since-days=N] [--help]

  --dry-run         Не вызывать Anthropic API, только собрать и распечатать контекст.
                    Полезно для проверки сетевых вызовов без расхода кредитов / без ключа.
  --since-days=N    Окно поиска новых HF-моделей в днях (по умолчанию 7).
                    arXiv всегда отдаёт N последних работ независимо от этого флага.
  --help            Эта справка.

Требуется ANTHROPIC_API_KEY в .env (или --dry-run). Опционально ANTHROPIC_MODEL.
Выход: docs/WEEKLY_ANALYZERS_RESEARCH.md (перезаписывается).`);
    process.exit(0);
  }
  const dryRun = argv.includes('--dry-run');
  let sinceDays = 7;
  for (const a of argv) {
    if (a.startsWith('--since-days=')) {
      const v = Number.parseInt(a.slice('--since-days='.length), 10);
      if (Number.isFinite(v) && v > 0) sinceDays = v;
    }
  }
  return { dryRun, sinceDays };
}
