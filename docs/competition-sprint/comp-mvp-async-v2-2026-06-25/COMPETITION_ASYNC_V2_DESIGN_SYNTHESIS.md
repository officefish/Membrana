> **Generated:** 2026-06-25 · provider: Anthropic · sprint `comp-mvp-async-v2-2026-06-25`

# Три замысла упаковки UserCase MVP microphone async v2

> **Sprint:** `comp-mvp-async-v2-2026-06-25` · **Winner:** Team Beta · **Phase:** 4 closed

## Зачем было соревнование async v2

Bundled MVP `v2.0-async` доказал функциональность: `latent Sequence Then-0/1/2`, `StartAsyncJob(track-upload)`, detached drone report, trends публикуются на gate без блокировки. Но **canvas остался инженерным** — оператор не видит async как целостную историю: что неблокирует tick, что приходит «потом».

Три команды независимо переупаковали **тот же runtime** (F1–F7 паритет) в три разных нарратива: как рассказать про non-blocking upload и detached report так, чтобы это было понятно оператору, инженеру и дизайнеру? Условие: нулевая логика в runtime, только упаковка через functions, comment groups, `verify-layout`.

---

## Контракт паритета F1–F7 и C7

Все три fork обязаны:

- **F1** — Bootstrap: onConnect + initial, подключение журнала и микрофона
- **F2** — Recording gate: `latent Sequence Then-0/1`, MakeTrack
- **F3** — Async upload: `StartAsyncJob(track-upload)` — не блокирует main tick
- **F4** — Trends sync: `Then-2` publish на gate (пока upload уходит)
- **F5** — Drone report: detached `on-async-resolved` — **отдельно** от hot path
- **F6** — Teardown: onStop + onDisconnect
- **F7** — Run ≥60s, `smoke v2.0-async: PASS` (дефер на winner)

**C7 Async clarity** — новый критерий scorecard (вес 1.5). Оценивает: насколько упаковка объясняет, что upload не блокирует trends, drone report приходит позже, без чтения chain-log.

Пали all `verify-competition-async-v2` green ✅ — F1–F7 синтезировано верно. Отличия только в упаковке.

---

## Alpha: Live Observation Pipeline + async narrative

### Философия

**«Четыре акта вместо трёх»** — оператор слышит async как часть journey. Act I (bootstrap) → Act II (gate + trends синхронно) → **Act IIb (upload в фоне)** → Act III (detached report приходит) → Act IV (teardown). Каждый comment group = сцена; видимый `StartAsyncJob` на main path показывает **причинно-следственную связь во времени**: gate запустилась → trends пошли → upload ушёл параллельно → report прилетел отдельным событием.

### Ключевые решения упаковки

| Решение | Реализация |
|---------|-----------|
| **4 Acts жизненный цикл** | initial → Act I-III groups + Act IIb warning frame (async) |
| **StartAsyncJob visible** | На main canvas, не в collapse — оператор видит узел уходит в фон |
| **Detached report = отдельная fn** | `fn-alpha-async-v2-detached-report`, success frame, не синхронна на hot path |
| **RU copy с audio semantics** | «Не блокирует запись», «Классификация на gate», «Отчёт пришёл позже» |
| **3–4 functions** | bootstrap, observation (gate+trends), optional detached; баланс между visibility и collapse |

### Как выглядит на canvas

```
┌─ Act I: Старт ──────────────────────┐
│ initial + onConnect + Policy build   │
└─────────────────────────────────────┘
         ↓ exec
┌─ Act II: Gate + Trends синхронно ────┐
│ fn-alpha-observation-latent           │
│ (gate Then-2 + trends publish)        │
└─────────────────────────────────────┘
         ↓ exec
┌─ Act IIb: Upload в фоне (warning) ───┐
│ StartAsyncJob(track-upload)           │
│ [не блокирует gate/trends]            │
└─────────────────────────────────────┘
         ↓ (detached)
┌─ Act III: Отчёт дрон (success) ──────┐
│ fn-alpha-detached-report              │
│ on-async-resolved → publish           │
└─────────────────────────────────────┘
         ↓ exec
┌─ Act IV: Завершение ────────────────┐
│ onStop + onDisconnect + cleanup       │
└────────────────────────────────────┘
```

Main visible после collapse: **8–10 нод** + 6 comment groups. Каждая сцена — визуально отделена; exec flows top-to-bottom; async ветка видна как параллельный путь.

### Сильные стороны

- **Лучший C7 live**: `StartAsyncJob` на main — оператор видит non-blocking узел, не угадывает
- **Detached report явен**: отдельная функция с собственным описанием — F5 не спрятан
- **Narrativa во времени**: Act IIb = естественное продолжение observer journey из v1
- **Музыкант одобрил**: audio causality — gate → trends, upload параллельно, drone потом
- **Ideal для teach**: instructor показывает три акта + Act IIb async ветка

### Слабые стороны

- **Main плотнее**: 4 functions = больше pin surface; если runtime меняется, четыре блока надо тянуть
- **StartAsyncJob на main = меньше modularity**: beta будет спрятан в function — чище для SDK
- **Poster scan хуже**: gamma ①–⑥ лучше на 30 секунд объяснения
- **6 comment groups**: может выглядеть перегруженным если новичок не в курсе Act семантики

### Для кого подходит

- **Оператор микрофонного поста**: видит полный async lifecycle как part of job
- **Инструктор на demo**: три-четыре клика, объясняешь причинность
- **Audio engineer**: явное разделение sync gate vs async upload vs detached report
- НЕ для SDK авторов (beta лучше как template)

---

## Beta: Measured modular UserCase + async pipeline

### Философия

**«Красиво = структурно проверяемо; контракт функции = её границы»** — нет субъективности. Каждая async operation = отдельный function с явным контрактом pins (inputs слева, outputs справа). Upload pipeline = одна переиспользуемая function (сворачивает 3 node: start → resolved → publish). `verify-layout` strict exec-spine LR, `verify-competition-async-v2` check pins, `pack-test` воспроизводимая асceptance — это доказательство качества, не визуальный вкус.

### Ключевые решения упаковки

| Решение | Реализация |
|---------|-----------|
| **fn-beta-async-upload-pipeline** | 3-node collapse: StartAsyncJob → on-resolved → detached publish; один reusable block |
| **Orchestrator spine на main** | Event.tick → Policy → Gate (Then-2) → Trends → Upload pipeline (async) → detached resolve |
| **6 engineering frames** | orchestrator, gate, trends, upload, detached — каждая = отдельный function или path |
| **3 functions total** | gate-latent, upload-pipeline, trends-publish; thin main |
| **verify-layout hard gate** | No overlap, grid 8px, exec-spine strict LR — CI required |

### Как выглядит на canvas

```
┌─ Orchestrator spine ──────────────────────────────┐
│ Event.tick                                         │
│    ↓                                               │
│ fn-beta-async-gate                                 │
│  (latent Sequence Then-0/1)                        │
│    ↓ (Then-2 trigger)                             │
│ fn-beta-async-trends                               │
│  (publish on gate, async refs to job)             │
│    ↓                                               │
│ fn-beta-async-upload-pipeline (collapsed)         │
│  [StartAsyncJob → on-resolved → detached publish] │
│    ↓                                               │
│ Journal / Report refs                             │
└──────────────────────────────────────────────────┘
```

Main visible: **6–7 нод** + 4–5 engineering groups. Каждый function = отдельный rect с sync inputs-outputs; async ветка = collapsed function, pins видны на rect.

### Сильные стороны

- **Лучший C2/C3/C5**: модульность, тестируемость, maintainability; три independent functions
- **Reusable async template**: `fn-beta-async-upload-pipeline` — авторы новых UserCase копируют контракт
- **verify-layout + verify-prerun = acceptance badge**: объективный, не субъективный
- **Engineering map**: orchestrator spine вверху, четыре функции ниже — легко объяснить architecture designer
- **Beta унаследовала v1 победу** по структуре; async не сломал дисциплину

### Слабые стороны

- **StartAsyncJob в collapse**: C7 live visibility ниже alpha — оператор видит pipeline rect, не узел
- **Operator UX ниже**: инженерная карта, не рассказ; сухо на first screen
- **6 comment groups**: overlap upload/detached в одной функции — смешивает upload и report
- **Может выглядеть холодно** для presentation (gamma poster лучше)

### Для кого подходит

- **Инженер audio pipeline**: чистая модульность, тестируемые блоки
- **SDK авторы**: copy `fn-beta-async-upload-pipeline` как шаблон async pattern
- **CI/CD pipeline**: verify-layout green + pack test = reproducible acceptance
- **Documentation**: examples в package; beta = gold standard
- **Catalog publish**: готов к переиспользованию (в отличие от alpha)

---

## Gamma: Poster UserCase + numbered async steps

### Философия

**«Canvas как одностраничный плакат ①–⑥; zero tech jargon»** — оператор видит продукт за 10 секунд, не editor. Comment groups — не инженерные зоны, а **типографические блоки** с коротким RU copy (2 строки max): глагол + что произойдёт. User functions прячут async complexity; на main остаётся читаемая лента ①–⑥: политики → bootstrap → gate → trends → **⑤ отправка в фоне** → **⑥ отчёт пришёл**. Как UI mockup, а не инженерная схема.

### Ключевые решения упаковки

| Решение | Реализация |
|---------|-----------|
| **Numbering ①–⑥** | Каждый шаг = number frame; ① политики, ② bootstrap, ③–④ gate/trends, ⑤ upload async, ⑥ detached report |
| **Poster semantics** | Large rects с padding; DESIGN.md colors (primary/warning/success); whitespace = clarity |
| **1–2 functions на main** | `fn-gamma-async-live-bundle` (gate+trends+upload); optional `fn-gamma-policies` |
| **RU titles short** | «Отправка в фоне», «Отчёт дрон», не tech terms |
| **Top-to-bottom exec only** | Никаких LR zig-zag; vertical lanes |

### Как выглядит на canvas

```
┌─ ① Политики ──────────────────────────────────┐
│ [Policy build nodes]                           │
└────────────────────────────────────────────────┘
         ↓
┌─ ② Подключение ──────────────────────────────┐
│ [initial + onConnect]                         │
└────────────────────────────────────────────────┘
         ↓
┌─ ③ Окно записи ──────────────────────────────┐
│ [gate latent Sequence]                        │
└────────────────────────────────────────────────┘
         ↓
┌─ ④ Классификация на gate ────────────────────┐
│ [trends publish Then-2]                       │
└────────────────────────────────────────────────┘
         ↓
┌─ ⑤ Отправка в фоне ──────────────────────────┐
│ [StartAsyncJob + async pipeline]              │
└────────────────────────────────────────────────┘
         ↓ (detached)
┌─ ⑥ Отчёт дрон ───────────────────────────────┐
│ [on-async-resolved + publish]                 │
└────────────────────────────────────────────────┘
```

Main visible: **≤7 нод** (после collapse); каждый numbered block занимает один row; exec flows vertical only; async flows внутри блоков.

### Сильные стороны

- **Лучший C4 UX**: красивый screenshot = 1000 слов; «продает» продукт за 10 секунд
- **Best для onboarding**: новый оператор видит шесть шагов, не Promise topology
- **Poster clone**: если capture скриншот, clone для следующего sprint/project
- **Gamma унаследовала v1 победу** по presentation; async не потерял elegance
- **Rodchenko одобрил**: ①–⑥ = типографическая гармония с DESIGN.md

### Слабые стороны

- **Async clarity ниже**: `StartAsyncJob` скрыт в `fn-gamma-async-live-bundle` — C7 не явен на canvas
- **Engineering detail невидим**: оператор не видит Sequence Then, не видит pin wiring — debug сложнее
- **Mega-function harder to maintain**: если 8+ pins, pin soup; если runtime меняется, один большой блок надо тянуть
- **Для SDK авторов плохо**: нельзя copy-paste отдельные компоненты (всё bundled)

### Для кого подходит

- **Оператор микрофонного поста** (presentation-first): UX лучше alpha/beta
- **Дизайнер и PM**: плакат ①–⑥ для презентации, website
- **Docs и onboarding**: один screenshot в tutorial
- **Маркетинг**: скриншот вместо 10 слайдов
- НЕ для инженера и SDK авторов

---

## Сравнительная таблица

| Метрика | Alpha | Beta | Gamma |
|---------|-------|------|-------|
| **Нарратив** | 4 Acts (journey + async) | Orchestrator spine (engineering) | Poster ①–⑥ (onboarding) |
| **Functions на main** | 3–4 | 3 | 1–2 |
| **Comment groups** | 6 (Acts I–IV + IIb async) | 5–6 (orchestrator frame) | 6 (numbered ①–⑥) |
| **StartAsyncJob on main** | ✅ **видим** | ❌ collapsed | ❌ collapsed |
| **Detached report fn** | ✅ **отдельная** | ❌ in pipeline | ❌ in bundle |
| **Main nodes visible (после collapse)** | 8–10 | 6–7 | ≤7 |
| **Exec pattern** | vertical + Act IIb branches | LR strict spine | vertical lanes |
| **verify-layout** | soft (aesthetic) | hard gate (CI) | soft (grid align) |
| **Upload pipeline collapse** | partial | ✅ **fn-beta-async-upload-pipeline** | in bundle fn |
| **C3 Testability** | Per-function | ✅ per-function + unit test | integrated only |
| **C4 UX / presentation** | ⭐⭐⭐⭐ narrativa | ⭐⭐⭐ structure | ⭐⭐⭐⭐⭐ poster |
| **C5 Modularity** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| **C7 Async clarity** | ⭐⭐⭐⭐⭐ visible | ⭐⭐⭐ described | ⭐⭐⭐⭐ numbered |
| **Для оператора** | ⭐⭐⭐⭐ teach | ⭐⭐⭐ reference | ⭐⭐⭐⭐⭐ scan |
| **Для инженера** | ⭐⭐⭐⭐ clarity | ⭐⭐⭐⭐⭐ modular | ⭐⭐ debug |
| **Для авторов новых UC** | ⭐⭐⭐ pattern | ⭐⭐⭐⭐⭐ template | ⭐⭐⭐ clone |

---

## Итог голосования: Beta winner

| Place | Team | Weighted | Margin |
|-------|------|----------|--------|
| **1** | **Beta** | **203.5** | — |
| 2 | Alpha | 202.5 | −1.0 |
| 3 | Gamma | 193.0 | −10.5 |

### Почему Beta выиграла

**Beta доминирует C2/C3/C5**: модульность, тестируемость, maintainability. `fn-beta-async-upload-pipeline` — первый async pattern для catalog; авторы следующих UserCase копируют контракт. `verify-layout` hard gate + `pack-test` = reproducible acceptance; не визуальный вкус, а метрики.

**C7 split**: Alpha выигрывает live visibility (StartAsyncJob on main), Gamma — poster numbered steps. Beta выигрывает по C3 (verifiable) и C5 (reusable). Tie-break — Vesnin: modularity + catalog. Weighted score, а не tie.

**Vote pattern**:
- Vesnin (teamlead): Beta по C2/C3 (44 vs 43 vs 42)
- Ozhegov (структурщик): Beta по modularity (45.5 vs 39 vs 35.5)
- Dynin (математик): Beta по measurability (43.5 vs 41 vs 40)
- Музыкант: Alpha #1, но вес C7 = 1.5, не перевешивает C3/C5
- Rodchenko (дизайнер): Gamma #1, но C4 вес = 1.5 как C7

### Phase 5 cherry-pick polish

| Source | Что cherry-pick в winner | Зачем |
|--------|--------------------------|-------|
| **Beta** | `fn-beta-async-upload-pipeline` (основа) | gold standard upload async |
| **Alpha** | Act IIb descriptions + detached fn pattern | C7 clarity copy |
| **Gamma** | ⑤ «Отправка в фоне» / ⑥ «Отчёт дрон» titles | RU UX on beta frames |

**Merge**: New usercase `usercase-mvp-microphone-beta-async-v2` (в community tier, не bundled default).

---

## Уроки для следующего catalog publish и operator debug

### L1: Visible vs. collapsed в async context

**Что сломалось**: Alpha выигрывает C7 оценку жюри, потому что `StartAsyncJob` виден на main. Но Beta правильнее по C3/C5 — одна function = одна ответственность. Выход: не ломать Beta, но в Phase 5 добавить comment frame **внутри** `fn-beta-async-upload-pipeline` с указанием на StartAsyncJob узел. Operator может double-click и увидеть структуру.

**Профилактика**: Collapse recipe для async functions должен сохранять pin labels (job start → job resolved → publish). Даже в collapse, hover over function rect показывает async boundary.

### L2: Detached report = non-hot-path identity

**Что сломалось**: Beta спрятал detached report внутри upload-pipeline function, Alpha вынес в отдельную function. Gamma bundled оба. ADR AD3 говорит: detached не должна блокировать gate/trends. Lesson: detached всегда — отдельный comment frame или отдельная branch exec, визуально отделен от hot path.

**Профилактика**: `verify-competition-async-v2` check: detached exec edges не входят в gate/trends pin inputs. Если входят — validation fail.

### L3: Poster numbering ≠ exec ordering

**Что сломалось**: Gamma ①–⑥ — типографические шаги, не exec timing. Оператор может подумать, что ⑥ выполняется после ⑤ синхронно. Но ⑤ async, ⑥ detached — exec ordering другой. Lesson: numbered poster хороша для UX, но требует explicit comment copy: «⑤ уходит в фоне, ⑥ приходит потом».

**Профилактика**: Gamma CONCEPT docs добавить timings: «⑤–⑥ одновременны, но не синхронны» (2 строки RU в group title).

### L4: Copy-paste hazard in SDK

**Что выигрывает Beta**: `fn-beta-async-upload-pipeline` реально clone-able. Но при clone надо:
1. Переименовать function id
2. Переназначить input pins (trackRef вместо конкретного source)
3. Check pin wiring after deserialize

**Профилактика**: Async function template включает comments на pin labels:

```javascript
// input: trackRef — MakeTrack output или ref from parent
// output: jobId — StartAsyncJob result, передавать в detached branch
// async edge: on-resolved node вызывается отдельно, не блокирует main tick
```

### L5: Phase 5 merge требует re-verify

**Что сломалось**: Cherry-pick Gamma titles в Beta frames может нарушить `verify-layout` grid (новый text = bigger rects). Cherry-pick Alpha detached fn может добавить pins, которые не mapped на main.

**Профилактика**: Phase 5 == Phase 2β full cycle: `yarn usercase:build-competition-async-v2 beta` + `verify-competition-async-v2` green. Smoke test. Только потом merge.

### L6: Metrics для future async patterns

**Что learned**: C7 Async clarity = новый критерий; async будет в каждом UserCase. Рекомендация:

| Метрика | Measure |
|---------|---------|
| **C7.1 Non-blocking visibility** | StartAsyncJob visible on main (не collapsed)? [Alpha model] |
| **C7.2 Async boundary clarity** | Detached exec edges не входят в hot path pins? [Validation] |
| **C7.3 Pin contract** | Async function pins labeled (jobId, on-resolved)? [Template] |
| **C7.4 Operator literacy** | RU copy mention «не блокирует» / «в фоне» / «потом»? [Copy audit] |

Не weight все поровну; Phase 5 decide priorities.

---

## Финальные рекомендации

1. **Bundled MVP** остаётся `usercase-mvp-microphone` (v2.0-async, не меняем).
2. **Community tier** — три fork (alpha/beta/gamma) доступны в примерах; Vesnin выбирает лучшие идеи.
3. **Catalog template** — Beta upload-pipeline function как async pattern reference.
4. **Next sprint** (async v2.1): Если runtime усложнится (ещё Promise chains), повторяем соревнование; колони копируют Beta модульность.
5. **Operator onboarding** — один screenshot из gamma, три акта из alpha, инженерная карта из beta — всем найдётся роль.

---

*comp-mvp-async-v2-2026-06-25 · synthesis · 2026-06-25*
