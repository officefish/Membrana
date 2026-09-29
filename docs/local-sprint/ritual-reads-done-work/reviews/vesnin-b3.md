# Vesnin Review: b3 `evening-reads-done-work`

Subject: `scripts/lib/review-done-ledger-port.mjs`, `scripts/lib/team-evening-feedback-ritual.mjs`,
`scripts/team-evening-feedback.mjs`, `scripts/team-evening-feedback-ritual.test.mjs` (коммит 9963fd10).

Verdict: **LGTM**.

Reviewed:

- Порт: `git log --numstat origin/main` за окно (fallback `HEAD`, если ствола в клоне нет) →
  `describeCommit` из ядра очереди oversized — природа и порог одним носителем, docs-only PR
  (ритуальные снимки) не входят, как и в очередь по умолчанию; `gh issue list --search created:>=`.
- Отказ печатается словами: без опроса билетов блок не пишет ни «заведён», ни «не заведён» —
  зуб-порча на gh 401 держит оба запрета.
- `collectGateMagistral` несёт строку свежести тем же импортом `magistralFreshness`; вещдока нет →
  «не судится», не `aligned`.
- Порядок в промпте: магистраль → книга сделанного → свежесть входов → документы дня; зуб держит.
- Порядок шагов `ritual-evening-run.mjs` не тронут; `DAY_DOC_INPUTS` не расширен (добавлены
  вычисляемые факты, не документы); промпт и регламент вечера не правились.

Findings:

1. Книга ходит в сеть каждым вечером (одним запросом `gh issue list`, лимит 200). При 200+ билетах за
   неделю хвост не увидится; сегодня их 43. Не блокирует; предел назван в CLOSURE.
2. Ссылка на ствол берётся как `origin/main` без `fetch` — книга видит то, что знает клон. Вечер
   идёт после `pr:ship`/`fetch` в цепочке, разрыва не ждём; если появится — это вход, не суждение.

Checks seen: `node --test scripts/team-evening-feedback-ritual.test.mjs` (b3-зубы 5, всего в файле
15) зелёный; живой `yarn team-evening-feedback --dry-run --no-rag --no-save` 29.09: «#2488 → #2492,
#2493, #2494, #2497, #2498», «#2489 → #2492, #2495, #2496, #2497, #2498», строка `aligned` (см. CLOSURE).
