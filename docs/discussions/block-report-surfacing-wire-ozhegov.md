# Обсуждение: block-report-surfacing-wire-ozhegov

<!-- Автогенерация yarn ask. Каждый блок ниже — одно обращение к персонажу. -->

## 2026-08-02 11:33 UTC · ozhegov

**Вопрос:** Ревью ОБОИХ блоков спринта memory-report-surfacing на фактическом коде. Зубов 23, все зелёные; живой прогон отчёта даёт по Веснину поимённое всплытие с его объяснениями, у прочих персон — «лифт не звали».

СРАЗУ ПРИЗНАЮ НАРУШЕНИЕ ПОРЯДКА: твой контекст я прогнал по блоку A (чистый модуль), а писал сразу оба блока. По блоку B (проводка CLI) прогона контекста ДО работы не было. Задним числом след не ставлю. Скажи отдельно, изменил бы ты конструкцию проводки, если бы тебя спросили вовремя.

ГДЕ Я ОТСТУПИЛ ОТ ТВОЕГО СОВЕТА:
1. Ты сказал: при всплытии состояние (1) ПОГЛОЩАЕТ (2), отказ отдельно не печатается. Отступил: за день бывает несколько обращений, и умолчать об отвергнутом облаке значит показать день полнее, чем он был. Отказы досчитываются хвостом «и отвергнутых облаков: N».
2. Добавил своё, чего ты не называл: объяснение персоны в отчёте подрезается до 180 символов с видимым многоточием и пометкой «полностью — в журнале». Причина: объяснения персон — проза, строка отчёта переставала читаться. Полный текст остаётся в op-log по тому же ref.

ЧТО ВСКРЫЛОСЬ ПОПУТНО. Зуб проводки нашёл чужой дефект: CLI разбирал журнал как const { entries } = parseOpLog(...), а parseOpLog возвращает { events, broken } — поля entries там нет НИКОГДА. Значит цикл сбора причин перетока не выполнялся ни разу с самого написания, reasonsByPersona всегда был пуст, и межа №5 («причина отличает переток от потери») молча не работала: отчёт печатал «v1 = ПОТЕРЯНО» при существующих причинах. Исправлено в этом же блоке — правка ровно в его зоне.

Ещё: main() звался безусловно, поэтому импорт CLI зубом дёргал бы git по дереву и ДОПИСЫВАЛ отчёт дня в docs/seanses. Поставил оговорку о прямом вызове по образцу _ssh-cabinet-*.mjs.

Ответь по пунктам: 1) годны ли оба блока к вливанию — LGTM или BLOCK с причиной; 2) по обоим моим отступлениям — принято или отвергнуто; 3) изменил бы ты конструкцию проводки, спроси я вовремя, и в чём именно; 4) верна ли граница «CLI приносит факты, модуль их именует» в том виде, как она вышла; 5) чего не хватает в зубах.

ДИФФ:
diff --git a/scripts/lib/team-memory-report.mjs b/scripts/lib/team-memory-report.mjs
index e9f24b17..64aa204a 100644
--- a/scripts/lib/team-memory-report.mjs
+++ b/scripts/lib/team-memory-report.mjs
@@ -5,14 +5,93 @@
  * (ратифицирован словом владельца 27.07): три строки на персону —
  * «записал в оперативку / утонуло в подсознание / всплывало сегодня».
  *
- * v1 честно ограничен: «подсознание» и «всплытие» машинно не существуют
- * (консилиум-гейт #1366 ч.2 / #1368) — вытеснение показывается ПОИМЁННО как
- * потеря (в этом и сигнал регрессии: 27.07 у Дынина семь позиций мастерской
- * задачника исчезли молча), строка «всплывало» — пометка «контур не поставлен».
+ * v2 (02.08): контур всплытия ПОСТАВЛЕН — спринт `subconscious-lift-c3`, PR #1634,
+ * #1635, #1636. Строка «всплывало» перестала быть пометкой о недостроенном и считается
+ * по op-log дня. Вытеснение по-прежнему поимённо (в этом и сигнал регрессии: 27.07 у
+ * Дынина семь позиций мастерской задачника исчезли молча) — и всплытие тоже поимённо:
+ * обе стороны кристалла читаются построчно, `→ архив (причина)` против `← архив
+ * (причина)`. Счёт без имён рвал бы симметрию и гнал читателя в журнал.
  *
  * Чистые функции: вход — текст git-диффа, выход — структура/markdown. fs/git — у CLI.
+ * Суждение о состоянии всплытия выносится ЗДЕСЬ, а не в CLI: состояние есть функция от
+ * данных, и определять его надо там, где это проверяемо без git и файловой системы.
  */
 
+/**
+ * Состояния строки всплытия. Закрыт: «прочее» здесь означало бы ровно ту немоту, ради
+ * снятия которой строка и переписана.
+ *
+ * `not-invoked` НЕ равно прежнему «контур не поставлен»: то было про отсутствие механизма
+ * в дереве, это — про день, в который его не звали. `empty-cloud` не равно `rejected`:
+ * пустой отбор из архива — не суждение персоны, а его отсутствие.
+ */
+export const SURFACING_STATES = Object.freeze([
+  'surfaced',
+  'rejected',
+  'empty-cloud',
+  'not-invoked',
+]);
+
+/**
+ * Состояние всплытия персоны за день. Различие `not-invoked` и `empty-cloud` держится на
+ * одном поле — числе запросов: оба дают пустой список актов, но пустое облако требует, чтобы
+ * лифт хотя бы звали.
+ *
+ * @param {{cloudQueries?: number, invocations?: Array<{outcome: string}>}} summary
+ * @returns {'surfaced'|'rejected'|'empty-cloud'|'not-invoked'}
+ */
+export function classifySurfacing(summary) {
+  const queries = Number(summary?.cloudQueries) || 0;
+  const acts = summary?.invocations ?? [];
+  if (acts.some((a) => a.outcome === 'emerge')) return 'surfaced';
+  if (acts.some((a) => a.outcome === 'reject')) return 'rejected';
+  return queries > 0 ? 'empty-cloud' : 'not-invoked';
+}
+
+/** Показ объяснения в отчёте. Полное живёт в журнале, здесь читаемость. */
+const REASON_SHOWN_CHARS = 180;
+
+/**
+ * Подрезать объяснение для ПОКАЗА. Причина перетока коротка по природе, объяснение персоны —
+ * проза, и в одну строку отчёта их влезает столько, что строку перестают читать.
+ *
+ * Обрез видимый: многоточие говорит, что текст продолжается, а полный лежит в op-log по тому
+ * же `ref`. Молчаливое усечение выдало бы огрызок за всё сказанное.
+ */
+function clipReason(reason) {
+  const text = String(reason).replace(/\s+/gu, ' ').trim();
+  return text.length <= REASON_SHOWN_CHARS ? text : `${text.slice(0, REASON_SHOWN_CHARS)}… (полностью — в журнале)`;
+}
+
+/**
+ * Строка всплытия — вторая половина кристалла. Зеркалит строку вытеснения: там `→ архив`,
+ * здесь `← архив`.
+ *
+ * Отказы того же дня при состоявшемся всплытии НЕ поглощаются, а досчитываются хвостом.
+ * Держатель предлагал поглощать; отступаю, потому что за день бывает несколько обращений, и
+ * умолчать об отвергнутом облаке значило бы показать день полнее, чем он был.
+ *
+ * @param {{cloudQueries?: number, invocations?: Array<{ref?: string, reason?: string, outcome: string}>}} summary
+ * @returns {string}
+ */
+export function surfacingLine(summary) {
+  const acts = summary?.invocations ?? [];
+  const state = classifySurfacing(summary);
+  if (state === 'not-invoked') return '- всплывало сегодня: лифт не звали';
+  if (state === 'empty-cloud') return '- всплывало сегодня: облако пустое — архив кандидатов не дал';
+  if (state === 'rejected') {
+    const why = acts.find((a) => a.outcome === 'reject')?.reason;
+    return `- всплывало сегодня: облако отвергнуто${why ? ` (${why})` : ''}`;
+  }
+  const emerged = acts.filter((a) => a.outcome === 'emerge');
+  const named = emerged
+    .map((a) => `${a.ref} ← архив${a.reason ? ` (${clipReason(a.reason)})` : ''}`)
+    .join(' · ');
+  const rejects = acts.filter((a) => a.outcome === 'reject').length;
+  const tail = rejects > 0 ? ` · и отвергнутых облаков: ${rejects}` : '';
+  return `- всплывало сегодня (${emerged.length}): ${named}${tail}`;
+}
+
 /** Заголовок записи журнала: `### 2026-07-27 · позиция · slug`. */
 const ENTRY_RE = /^[+-]#{3}\s+(\d{4}-\d{2}-\d{2})\s+·\s+([^·]+?)\s+·\s+(.+?)\s*$/u;
 
@@ -63,7 +142,11 @@ export function parseMemoryDiff(diffText) {
 export function renderMemoryReport(byPersona, opts = {}) {
   const personas = opts.personas ?? Object.keys(byPersona).sort();
   const lines = [`# Память команды — ${opts.date ?? '(дата не передана)'}`, ''];
-  lines.push('> Форма — кристалл token 121: записал / утонуло / всплывало. v1: контуры', '> подсознания и всплытия не поставлены (#1366 ч.2, #1368) — вытеснение = потеря, поимённо.', '');
+  lines.push(
+    '> Форма — кристалл token 121: записал / утонуло / всплывало. v2 (02.08): вытеснение и',
+    '> всплытие — поимённо, с причиной персоны (op-log: `transfer_to_archive`, `emerge`, `reject`).',
+    '',
+  );
   let added = 0;
   let evicted = 0;
   for (const id of personas) {
@@ -89,7 +172,7 @@ export function renderMemoryReport(byPersona, opts = {}) {
         ? `- утонуло в подсознание (${p.evicted.length}${anyReason ? ', переток — не потеря' : ', v1 = ПОТЕРЯНО'}): ${p.evicted.map(evictedLine).join(' · ')}`
         : '- утонуло в подсознание: ничего',
     );
-    lines.push('- всплывало сегодня: контур не поставлен (#1366 ч.2)');
+    lines.push(surfacingLine(opts.surfacingByPersona?.[id]));
     lines.push('');
   }
   const regression = evicted > added;
diff --git a/scripts/team-memory-report.mjs b/scripts/team-memory-report.mjs
index e033f91d..3b462d69 100644
--- a/scripts/team-memory-report.mjs
+++ b/scripts/team-memory-report.mjs
@@ -16,7 +16,7 @@
 import { execFileSync } from 'node:child_process';
 import { appendFileSync, existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
 import { dirname, join } from 'node:path';
-import { fileURLToPath } from 'node:url';
+import { fileURLToPath, pathToFileURL } from 'node:url';
 
 import { parseMemoryDiff, renderMemoryReport } from './lib/team-memory-report.mjs';
 import { opLogRel, parseOpLog } from './persona-memory/lib/op-log.mjs';
@@ -24,6 +24,30 @@ import { opLogRel, parseOpLog } from './persona-memory/lib/op-log.mjs';
 const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
 const MEMORY_DIR = 'docs/virtual-team/memory';
 
+/**
+ * Сводка всплытия персоны за день из событий её журнала.
+ *
+ * Собирает ФАКТЫ и только их — суждение о состоянии («всплыло» против «лифт не звали»)
+ * выносит чистый модуль отчёта. Граница та же, что уже держит причины перетока: CLI
+ * приносит данные, модуль их именует. Классифицировать здесь значило бы спрятать
+ * классификатор за файловой системой и лишить его зуба.
+ *
+ * `cloud_query` считается отдельно от актов нарочно: без него «архив не дал кандидатов» и
+ * «лифт сегодня не звали» неразличимы, а это разные дни персоны.
+ *
+ * @param {Array<{verb: string, ref?: string, reason?: string}>} entries
+ * @returns {{cloudQueries: number, invocations: Array<{outcome: string, ref?: string, reason?: string}>}}
+ */
+export function summarizeSurfacing(entries) {
+  const summary = { cloudQueries: 0, invocations: [] };
+  for (const e of entries ?? []) {
+    if (e.verb === 'cloud_query') summary.cloudQueries += 1;
+    else if (e.verb === 'emerge') summary.invocations.push({ outcome: 'emerge', ref: e.ref, reason: e.reason });
+    else if (e.verb === 'reject') summary.invocations.push({ outcome: 'reject', ref: e.ref, reason: e.reason });
+  }
+  return summary;
+}
+
 const argv = process.argv.slice(2);
 const argOf = (name) => {
   const i = argv.indexOf(`--${name}`);
@@ -64,18 +88,30 @@ function main() {
     .sort();
   // Межа №5: причины перетока из сегодняшнего op-log (transfer ≠ потеря).
   const reasonsByPersona = {};
+  // Всплытие едет тем же ходом: журнал уже открыт, и второй проход по нему был бы лишним.
+  const surfacingByPersona = {};
   for (const p of personas) {
     const logAbs = join(repoRoot, opLogRel(p, date));
     if (!existsSync(logAbs)) continue;
-    const { entries } = parseOpLog(readFileSync(logAbs, 'utf8'));
+    // `parseOpLog` возвращает `{events, broken}`. Прежде здесь разбиралось `{entries}` —
+    // поля с таким именем у разбора НЕТ, поэтому цикл ниже не выполнялся ни разу, и межа
+    // №5 («причина отличает переток от потери») молча не работала с самого написания:
+    // отчёт печатал «v1 = ПОТЕРЯНО» при существующих причинах. Поймано зубом проводки.
+    const { events: entries } = parseOpLog(readFileSync(logAbs, 'utf8'));
     const map = new Map();
     for (const e of entries ?? []) {
       if (e.verb === 'transfer_to_archive' && e.ref && e.reason) map.set(e.ref, e.reason);
     }
     if (map.size) reasonsByPersona[p] = map;
+    surfacingByPersona[p] = summarizeSurfacing(entries);
   }
 
-  const { markdown, totals, regression } = renderMemoryReport(byPersona, { date, personas, reasonsByPersona });
+  const { markdown, totals, regression } = renderMemoryReport(byPersona, {
+    date,
+    personas,
+    reasonsByPersona,
+    surfacingByPersona,
+  });
 
   console.log(markdown);
 
@@ -90,4 +126,9 @@ function main() {
   if (regression) console.error('⚠ регрессия: вытеснено больше, чем записано.');
 }
 
-main();
+// Прогон только при прямом вызове — образец из `_ssh-cabinet-*.mjs`. Без этой оговорки
+// импорт `summarizeSurfacing` зубом дёргал бы git по всему дереву и ДОПИСЫВАЛ отчёт дня в
+// docs/seanses: зуб, меняющий состояние репозитория, — не зуб.
+if (pathToFileURL(process.argv[1] ?? '').href === import.meta.url) {
+  main();
+}
diff --git a/scripts/team-memory-report.test.mjs b/scripts/team-memory-report.test.mjs
index 23573d56..f116eee7 100644
--- a/scripts/team-memory-report.test.mjs
+++ b/scripts/team-memory-report.test.mjs
@@ -5,7 +5,13 @@
 import assert from 'node:assert/strict';
 import { test } from 'node:test';
 
-import { parseMemoryDiff, renderMemoryReport } from './lib/team-memory-report.mjs';
+import {
+  SURFACING_STATES,
+  classifySurfacing,
+  parseMemoryDiff,
+  renderMemoryReport,
+  surfacingLine,
+} from './lib/team-memory-report.mjs';
 
 const DIFF = [
   '--- a/docs/virtual-team/memory/dynin.md',
@@ -42,11 +48,17 @@ test('пустой дифф → честное «изменений нет», н
   assert.deepEqual(totals, { added: 0, evicted: 0 });
 });
 
-test('форма token 121: три строки на персону, всплывало — с пометкой контура (v1)', () => {
+test('форма token 121: три строки на персону, всплывало — по журналу (v2)', () => {
+  // Прежняя редакция зуба требовала дословно «контур не поставлен» — и была права: контура
+  // тогда не существовало, имитировать его было нельзя. 02.08 контур поставлен спринтом
+  // subconscious-lift-c3 (PR #1634, #1635, #1636), и ложью стало ровно обратное. Зуб не
+  // глушится, а переписывается на новый предмет: форма трёх строк неизменна, но третья
+  // обязана называть СОСТОЯНИЕ дня.
   const { markdown } = renderMemoryReport(parseMemoryDiff(DIFF), { date: '2026-07-28' });
   assert.ok(markdown.includes('записал в оперативку'));
   assert.ok(markdown.includes('утонуло в подсознание'));
-  assert.ok(markdown.includes('всплывало сегодня: контур не поставлен'), 'несуществующий контур не имитируется');
+  assert.ok(markdown.includes('всплывало сегодня:'), 'третья строка кристалла на месте');
+  assert.ok(!markdown.includes('контур не поставлен'), 'поставленный контур не объявляется отсутствующим');
   assert.ok(markdown.includes('tasks-workshop-m2-set [2026-07-23]'), 'вытеснение поимённо с датой записи');
 });
 
@@ -61,3 +73,86 @@ test('регрессия: вытеснено больше, чем записан
   assert.equal(regression, true);
   assert.ok(markdown.includes('СИГНАЛ РЕГРЕССИИ'));
 });
+
+// ── всплытие: четыре состояния, различимые по журналу ────────────────────────
+
+test('перечень состояний всплытия закрыт и заморожен', () => {
+  assert.deepEqual([...SURFACING_STATES], ['surfaced', 'rejected', 'empty-cloud', 'not-invoked']);
+  assert.ok(Object.isFrozen(SURFACING_STATES));
+});
+
+test('«лифт не звали» и «облако пустое» различаются ОДНИМ полем, а не текстом', () => {
+  // Оба дают пустой список актов. Разница — звали ли лифт вообще; она и есть предмет.
+  const notInvoked = { cloudQueries: 0, invocations: [] };
+  const emptyCloud = { cloudQueries: 1, invocations: [] };
+
+  assert.equal(classifySurfacing(notInvoked), 'not-invoked');
+  assert.equal(classifySurfacing(emptyCloud), 'empty-cloud');
+  assert.notEqual(surfacingLine(notInvoked), surfacingLine(emptyCloud));
+});
+
+test('«лифт не звали» — про день, а не про отсутствие механизма', () => {
+  const line = surfacingLine({ cloudQueries: 0, invocations: [] });
+  assert.match(line, /лифт не звали/u);
+  assert.doesNotMatch(line, /не поставлен/u, 'прежняя пометка была про отсутствие кода');
+});
+
+test('всплывшее показывается поимённо и с объяснением ПЕРСОНЫ', () => {
+  const line = surfacingLine({
+    cloudQueries: 1,
+    invocations: [{ outcome: 'emerge', ref: 'vesnin-2026-07-29-m1-performer', reason: 'участие против назначения' }],
+  });
+  assert.match(line, /vesnin-2026-07-29-m1-performer/u, 'счёт без имени гонит читателя в журнал');
+  assert.match(line, /участие против назначения/u);
+  assert.match(line, /← архив/u, 'зеркало строки вытеснения: там → архив, здесь ← архив');
+});
+
+test('отказ персоны — не пустое облако: суждение против его отсутствия', () => {
+  const rejected = { cloudQueries: 1, invocations: [{ outcome: 'reject', reason: 'ни одна запись не по теме' }] };
+  assert.equal(classifySurfacing(rejected), 'rejected');
+  assert.match(surfacingLine(rejected), /облако отвергнуто \(ни одна запись не по теме\)/u);
+  assert.notEqual(classifySurfacing(rejected), classifySurfacing({ cloudQueries: 1, invocations: [] }));
+});
+
+test('отказ того же дня при состоявшемся всплытии не проглатывается', () => {
+  const line = surfacingLine({
+    cloudQueries: 2,
+    invocations: [
+      { outcome: 'emerge', ref: 'rec-a', reason: 'по делу' },
+      { outcome: 'reject', reason: 'второе облако мимо' },
+    ],
+  });
+  assert.match(line, /rec-a/u);
+  assert.match(line, /отвергнутых облаков: 1/u, 'умолчать значило бы показать день полнее, чем он был');
+});
+
+test('персона без сводки не ломает отчёт и не врёт о поставленности контура', () => {
+  const { markdown } = renderMemoryReport(parseMemoryDiff(DIFF), { date: '2026-07-28' });
+  assert.ok(markdown.includes('всплывало сегодня: лифт не звали'));
+  assert.ok(!markdown.includes('контур не поставлен'), 'ни в строке, ни в шапке');
+});
+
+test('сводка доезжает до отчёта по своей персоне, а не по всем сразу', () => {
+  const { markdown } = renderMemoryReport(parseMemoryDiff(DIFF), {
+    date: '2026-07-28',
+    surfacingByPersona: {
+      dynin: { cloudQueries: 1, invocations: [{ outcome: 'emerge', ref: 'rec-d', reason: 'к делу' }] },
+    },
+  });
+  assert.ok(markdown.includes('rec-d ← архив (к делу)'));
+  assert.ok(markdown.includes('всплывало сегодня: лифт не звали'), 'у прочих — своё состояние');
+});
+
+test('длинное объяснение подрезается ВИДИМО, а не молча', () => {
+  const long = 'а'.repeat(400);
+  const line = surfacingLine({ cloudQueries: 1, invocations: [{ outcome: 'emerge', ref: 'rec-a', reason: long }] });
+  assert.ok(line.length < 400, 'строку отчёта должно быть возможно прочесть');
+  assert.match(line, /… \(полностью — в журнале\)/u, 'огрызок не выдаётся за всё сказанное');
+  assert.match(line, /rec-a/u, 'указатель на полное остаётся');
+});
+
+test('короткое объяснение не трогается', () => {
+  const line = surfacingLine({ cloudQueries: 1, invocations: [{ outcome: 'emerge', ref: 'r', reason: 'к делу' }] });
+  assert.match(line, /\(к делу\)/u);
+  assert.doesNotMatch(line, /…/u);
+});

**Ответ:**

Отвечаю по пунктам, как словарной статьёй.

**1) LGTM обоим блокам.** Границы держатся: `service.ts` (модуль отчёта) именует состояния, CLI приносит факты. Публичный API однозначен: `SURFACING_STATES`, `classifySurfacing`, `surfacingLine`, `summarizeSurfacing`. Циклов нет, обхода `index.ts` нет (у .mjs-скриптов его роль играет файл модуля — соблюдено). Имена — определения: `not-invoked` ≠ `empty-cloud` ≠ `rejected` различены полем, а не текстом; это правильная лексикография.

**2) По отступлениям.**
- Хвост «и отвергнутых облаков: N» при состоявшемся всплытии — **принято**. Это не синоним поглощённого состояния, а отдельный факт дня. День персоны — множество актов, а не одно суждение.
- Видимое подрезание объяснения до 180 символов с отсылкой в журнал — **принято**. Но: `REASON_SHOWN_CHARS` держите приватной константой модуля (уже так) и не тащите в публичный API; если появится второй потребитель обрезки — вынести `clipReason` рядом, но не раньше.

**3) Проводку я бы не менял по конструкции.** Один проход по `parseOpLog`, `summarizeSurfacing` рядом с CLI, классификация в модуле — ровно та граница, которую я и попросил бы. Единственная правка, о которой сказал бы вовремя: `summarizeSurfacing` живёт в CLI-файле — это нормально, пока у него один потребитель; при втором — переселить в `lib/team-memory-report.mjs` рядом с `classifySurfacing` (одна лемма — одна статья).

**4) Граница «CLI приносит факты, модуль их именует» — верна.** Именно так и должна читаться: `verb` → `outcome` — перевод из журнала в словарь отчёта происходит в `summarizeSurfacing`, а суждение о состоянии — в `classifySurfacing`. Проверяемость без git/fs — соблюдена.

**5) Чего не хватает в зубах** (не блокирует, к следующему PR):
- Зуб на **неизвестный `verb`** в `summarizeSurfacing` — сейчас молча игнорируется; хотя бы утверждение, что посторонние глаголы не попадают в `invocations`.
- Зуб на **`broken`-события** из `parseOpLog`: что делает отчёт, если журнал частично битый — падает, пропускает, помечает? Сейчас не сказано словарём.
- Зуб на **сортировку/порядок** `invocations` в строке при нескольких `emerge` — иначе порядок будет зависеть от журнала неявно.
- Зуб на **guard прямого вызова** (`pathToFileURL(...) === import.meta.url`): импорт `summarizeSurfacing` не должен вызывать `main()`. Это ровно та регрессия, которую вы поймали руками — пусть её ловит тест.

По найденному дефекту `{ entries }` vs `{ events }` — правка в зоне блока, зафиксирована зубом проводки, отдельного разбирательства не требует. Хорошо, что всплыло: это как раз случай «один термин — один смысл», нарушение которого держалось молча.

---
