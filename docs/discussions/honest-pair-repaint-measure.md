# Замер перекраски истории: ужесточение honest_pair до полной пары

Блок `history-repaint-measure` спринта `gate-honest-pair-completeness` ([#1641](https://github.com/officefish/Membrana/issues/1641)).

**Зачем замер стоит ПЕРВЫМ блоком, до кода.** Требование резчика: девятый вердикт трогает
закрытый список, и цену перекраски прошлых прогонов надо посчитать до, а не после. Массовая
перекраска (условно >50% блоков) означала бы, что это не ужесточение гейта, а перепись
истории — и дорога вела бы в консилиум, не в PR.

## Вопрос замера

Сколько блоков в прошлых лентах исполнения потеряли бы `honest_pair`, требуй предикат полную
пару родов `context_run + review_pass` вместо нынешнего «хотя бы один валидный след»?

## Метод

По каждой ленте `docs/sprint/trail/*.jsonl`: собрать множество родов следа на каждый
`blockId`, проверить наличие обоих родов пары. Команда воспроизведения:

```bash
node - <<'EOF'
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
const TRAIL = 'docs/sprint/trail';
let blocks = 0, pairOk = 0, repaint = [];
for (const f of readdirSync(TRAIL).filter((x) => x.endsWith('.jsonl'))) {
  const byBlock = new Map();
  for (const line of readFileSync(join(TRAIL, f), 'utf8').trim().split('\n')) {
    if (!line.trim()) continue;
    let t; try { t = JSON.parse(line); } catch { continue; }
    if (!t.blockId) continue;
    if (!byBlock.has(t.blockId)) byBlock.set(t.blockId, new Set());
    byBlock.get(t.blockId).add(t.kind);
  }
  for (const [blockId, kinds] of byBlock) {
    blocks += 1;
    if (kinds.has('context_run') && kinds.has('review_pass')) pairOk += 1;
    else repaint.push(`${f} · ${blockId} · [${[...kinds].join(', ')}]`);
  }
}
console.log(`лент: ${readdirSync(TRAIL).filter((x) => x.endsWith('.jsonl')).length} · блоков: ${blocks} · полная пара: ${pairOk} · перекраска: ${repaint.length}`);
for (const r of repaint) console.log('  ' + r);
EOF
```

## Результат — 03.08, дерево `b7ca2756`

```
лент: 29 · блоков: 125 · полная пара: 124 · ПЕРЕКРАСКА: 1 (1%)
  memory-report-surfacing.jsonl · report-surfacing-wire · [review_pass]
```

## Вердикт замера

**Ворота пройдены.** Перекрашивается ровно один блок из 125 — и это тот самый вещдок, ради
которого заведено иссью: `report-surfacing-wire`, работавший без прогона контекста и
получивший `honest_pair` на одном `review_pass`. Предикат ужесточается, НЕ переписывая
историю: 124 честных блока остаются честными, единственный нечестный наконец назван нечестным.

Замер также подтверждает довод резчика о классе `stop`: раз фактическая парность и так
держалась (124 из 125), требование пары ничего не ломает в живой практике — оно лишь
перестаёт полагаться на дисциплину докладчика там, где обязан работать предикат.

## Границы замера

- Считались только рода следа; свежесть (`revisionAt`) не пересчитывалась — она предмет
  других вердиктов (`stale_trace` / `stale_partial`) и этим спринтом не трогается.
- Ленты актов плана (`docs/sprint/cut/trail/*.jsonl`) вне замера: у актов своя ось и свой
  закрытый список родов, к вердиктам блоков они не относятся.
