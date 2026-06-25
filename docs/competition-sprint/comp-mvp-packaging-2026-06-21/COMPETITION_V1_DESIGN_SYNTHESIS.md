> **Generated:** 2026-06-25 · provider: Anthropic · sprint `comp-mvp-packaging-2026-06-21`

# Три замысла упаковки UserCase MVP microphone

## Зачем было соревнование

Bundled MVP доказал функциональность: микрофонный пост запускается, записывает, классифицирует звук. Но **graph — инженерный чертёж, не продукт для оператора**. Три команды переупаковали **тот же runtime** в три разных нарратива: как рассказать историю микрофонного поста так, чтобы она была понятна оператору, инженеру и дизайнеру одновременно? Условие: паритет F1–F6 (функций), новой логики и нод не добавлять, только перегруппировать и сжать через collapse.

---

## Общий контракт паритета F1–F6

Все три fork обязаны выполнять:

- **F1** — Bootstrap: подключение журнала и микрофона на onConnect
- **F2** — Recording gate: окно записи 5 s при заполнении буфера
- **F3** — FFT trends: накопление спектральных кадров
- **F4** — Trends publish: классификация DRONE_TIGHT и отправка на сервер
- **F5** — Teardown: аккуратное завершение на onStop
- **F6** — Run без ручного import — все ноды и edges синтезированы в сборке

Пали all Run-green ✅ — синтезировано верно. Отличия только в **упаковке**: как нарезать график, какие субграфы спрятать в functions, как обозвать comment groups и в каком порядке читать canvas.

---

## Alpha: Live Observation Pipeline

### Философия

**«Спектакль из трёх актов»** — оператор не видит логику, он слышит историю. Act I (подключение) → Act II (наблюдение в эфире) → Act III (завершение). Каждый comment group = сцена; каждая user function = макро-шаг за 10 секунд объяснения. Audio цепь читается как нотная партитура: слева направо = forward in time, от микрофона до трека видна причинно-следственная связь. Журнал и политики — не технические параметры, а **инструменты оператора**.

### Ключевые решения

- **3 цветовых семантики** comment groups (primary / warning / success) вместо инженерных зон
- **Function «observation-tick»** объединяет gate + trends — один «heartbeat» main loop вместо двух отдельных блоков
- **RU описания групп** с audio units («5 s WAV», «48 kHz stream») — оператор говорит на языке звука, не технологий
- **initial/onConnect видны явно**, не collapse — ради onboarding новичка; видны шаги bootstrap
- **Именование функций глаголы в инфинитиве**: fn-alpha-bootstrap (onConnect), fn-alpha-recording-gate, fn-alpha-observation-tick

### Как выглядит на canvas

```
┌─ Act I: Старт ──────────────────┐
│ initial + onConnect              │
│ [Journal init] [Mic connect]     │
└─────────────────────────────────┘
         ↓ exec
┌─ Act II: Наблюдение ─────────────┐
│ Policy | fn-alpha-observation-tick | Journal  │
│        gate + trends collapsed      │
└─────────────────────────────────┘
         ↓ exec
┌─ Act III: Завершение ────────────┐
│ onStop + onDisconnect             │
│ (cleanup)                         │
└─────────────────────────────────┘
```

Main после collapse: **~8–10 видимых нод** + 4 comment группы. Четыре группы = четыре фреймовых стрелки на экране.

### Сильные стороны

- **Мгновенная narrativa** — оператор за 30 секунд понимает жизненный цикл поста
- **Audio causality явная** — ни один ref не висит в воздухе, всё видно слева направо
- **Идеален для demo** — три акта = три клика, плюс Run green
- Совместимо с дальнейшей оптимизацией (Phase 2 bundled id в catalog)

### Слабые стороны

- **main all ещё dense** до collapse — непрошедших узлов много
- **Две функции = дисциплина в pin CRUD** — при изменении runtime надо тянуть руки через оба блока
- **Меньше метрик** для автоматизации — красота субъективна; verify-layout при ручной разметке требует внимания

### Для кого подходит

- **Оператор** микрофонного поста (основной юзкейс): видит истории, не схемы
- **Демонстрант** на презентациях: три акта легко рассказать
- **Аналитик** audio pipeline: может проверить лог по актам

---

## Beta: Measured modular UserCase

### Философия

**«Красиво = структурно предсказуемо»** — нет субъективности, только метрики. Monotonic execution spine слева направо (LR), grid 8 px, overlap = 0, function depth ≤ 1. Каждая user function = переиспользуемый block с явным контрактом: inputs слева, outputs справа, pin names совпадают с runtime. layout проходит verify-layout — это **доказательство аккуратности**, не визуальный вкус. Dynin переводит эстетику в метрики; Ozhegov упаковывает runtime в копируемые блоки.

### Ключевые решения

- **3 независимых functions** (fn-beta-policy-build, fn-beta-recording-gate, fn-beta-trends-publish) — separation of concerns, каждую можно тестировать отдельно
- **verify-layout hard gate** в Definition of Done — компилятор, не критик вкуса
- **Policy function на main** (не только в initial) — ради single-screen demo; пяток нод policy construct видны явно
- **Duplicate MVP node semantics точно** — меняем только ids при collapse, не упрощаем граф
- **Orchestrator вверху main** — все три функции вызываются по цепи: Policy → Gate → Trends

### Как выглядит на canvas

```
┌─ Orchestrator spine ──────────────────────┐
│ Event.tick                                │
│    ↓                                      │
│ fn-beta-policy-build ───────┐             │
│    ↓                        ↓             │
│ fn-beta-recording-gate ─────fn-beta-trends-publish  │
│                             ↓             │
│                        journal/report     │
└───────────────────────────────────────────┘
```

Main visible nodes: **Event tick → 3 function call blocks → output refs** (~6–8 нод на canvas после collapse). Каждый function имеет ровно столько pins, сколько данных реально входит/выходит — без фантомов.

### Сильные стороны

- **Objectively высокие баллы** по C3/C5 (чистота, модульность)
- **Переиспользуемые templates** — другой автор UserCase копирует fn-beta-policy-build и приживает её в свой граф
- **Testable units** — collapse recipe проходит unit-тесты; Run дебаг по функциям
- **Строгая discipline** — verify-layout green обязателен; overlap не допускается
- Идеален для **инженерной документации**: показать что-то новичку — copy fn-beta-recording-gate

### Слабые стороны

- **Может выглядеть «сухо»** — нет нарратива, только структура; оператор видит блоки, не рассказ
- **Больше work** в collapse — dedupe pins, map edges, sync block pins после hydrate
- **High C3/C5 = low UX rating** на vote (если vote учитывает первое впечатление)

### Для кого подходит

- **Инженер** audio pipeline: чистая модульность, тестируемость
- **Автор нового UserCase** (копирует шаблоны функций)
- **CI/CD pipeline** — verify-layout green = acceptance badge
- **Документация SDK** (examples в package)

---

## Gamma: Poster UserCase

### Философия

**«Canvas как одностраничный плакат»** — нумерованные шаги ①–⑤, визуальная иерархия из DESIGN.md, **минимум ink**. Оператор видит продукт за три секунды, не editor. Comment groups не технические зоны, а **типографические блоки** с коротким RU copy (2 строки max, verb-first). User functions прячут complexity; на main остаётся читаемая лента из 5–7 элементов, как UI mockup, а не инженерная схема.

### Ключевые решения

- **Poster metaphor** — нумерованные шаги ①–⑤ вместо инженерных зон
- **1 mega-function** (или 2 максимум: gate + trends) на main — мин visual noise
- **Large group rects с padding** — whitespace = clarity; не tight MVP frames
- **Цветовая палитра из DESIGN.md** (primary / warning / success / info) **строго по спеку**
- **Smart align „авто" per row** — группы выравниваются сетке 8 px после каждого edit; нет ручного drag
- **icon-less text** — описание через слова, не картинки (a11y: title достаточен)

### Как выглядит на canvas

```
┌─①─ Политики записи и FFT ─────────────────────┐
│   [fn-gamma-policies]                          │
└────────────────────────────────────────────────┘
         ↓
┌──②──── Окно записи ──③── Спектр ──④─ Классификация ┐
│  [fn-gamma-live-bundle или split]               │
└────────────────────────────────────────────────────┘
         ↓
┌─⑤─ Отчёт на сервер ──────────────────────────┐
│   [journal + track publish]                    │
└────────────────────────────────────────────────┘
```

Target: **≤7 nodes visible** на main после collapse. Каждый нумерованный блок занимает один row; exec flows **top-to-bottom только**, не LR zig-zag.

### Сильные стороны

- **Лучший C4 UX / visual на vote** — красивый screenshot сразу "продает" продукт
- **30-секундная explainability** — новый оператор на презентации понимает всё за полминуты
- **Strong DESIGN.md alignment** — frame colors, spacing, grid discipline из corporate manual
- **Best для docs** и маркетинга — одна картинка = 1K слов
- **Легко наследует layout** — если capture скриншот, clone для следующего sprint

### Слабые стороны

- **Mega-function harder to maintain** — если 8+ pins, pin soup и pin-to-edge tracking сложнее
- **verify-layout overlap risk** — если рект слишком большой, дети вылазят из фрейма
- **F2–F4 debug inside collapse** — оператор не видит деталей gate/trends без double-click
- **Deferrable D-PINS-9** — если pins > 9, надо split на два блока (потеря elegance)

### Для кого подходит

- **Оператор** (UX-first): видит продукт без editor knowledge
- **Дизайнер** и **PM** (presentation-first): скриншот для презентации
- **Docs** и **onboarding** team — copy-paste в tutorial
- **Маркетинг** — один плакат вместо 50 слайдов

---

## Сравнительная таблица

| Метрика | Alpha | Beta | Gamma |
|---------|-------|------|-------|
| **Нарратив** | Три акта (journey map) | Оркестратор + блоки (engineering) | Плакат ①–⑤ (poster) |
| **Functions на main** | 2 (bootstrap + observation-tick) | 3 (policy + gate + trends) | 1–2 (live-bundle или split) |
| **Comment groups** | 4 + Act (I/II/III semantics) | 4 (orchestrator / gate / trends / journal) | 5 + ① numbering |
| **Main nodes (visible)** | 8–10 | 6–8 | ≤7 |
| **Exec pattern** | LR + vertical (acts) | LR strict (monotonic spine) | Top-to-bottom only |
| **verify-layout** | Optional (ручная разметка) | Hard gate (CI-required) | Soft (aesthetic check) |
| **C3/C5 (инженерия)** | 6/10 | 9/10 | 5/10 |
| **C4 (UX/presentation)** | 7/10 | 6/10 | 9/10 |
| **Modularity** | Средняя (2 big functions) | Высокая (3 independent blocks) | Низкая (mega-function) |
| **Testability** | Per-function smoke | Per-function unit-test | Integrated only |
| **Для оператора** | ⭐⭐⭐⭐ narrativa | ⭐⭐⭐ структура | ⭐⭐⭐⭐⭐ UX |
| **Для инженера** | ⭐⭐⭐ clarity | ⭐⭐⭐⭐⭐ modularity | ⭐⭐ debug hard |
| **Для авторов новых UC** | ⭐⭐ не template | ⭐⭐⭐⭐⭐ copy-paste | ⭐⭐⭐ poster clone |

---

## Уроки процесса: collapse, hydrate, runtime

### L1–L4: Collapse и pin wiring

**Что сломалось:** Collapse создавал duplicate edges, заматывал пины не туда, забывал socketType. Fan-in из одного источника на несколько внутренних узлов → dedupe pins по ключу `(side, handle, socketType)`. Exec-in/out wiring только по **boundary edges**, не по первому узлу в массиве.

**Профилактика:** После programmatic collapse grep JSON — нет пар одинаковых `source→targetHandle`. Collapse order: leaf → root (trends before gate). Smoke Run после каждого collapse spec.

### L5–L6: Hydrate и block sync

**Что сломалось:** `deserializeScenarioSubgraph` восстанавливал block только с D0 pins (exec-in/out), **игнорируя** `function.inputPins` / `outputPins`. После Apply UserCase edges на main ссылались на `policy`, `stream`, а block exposes только exec → validation fail.

**Fix:** `syncAllSubgraphBlocksFromFunctionDrafts` в `hydrateBoardFromDocument` для всех веток. Любой путь загрузки document (apply, bundled, import, script) → одна точка sync.

**Профилактика:** Test `hydrateBoardFromDocument(canon) → validatePreRun` для каждого fork. Не закрывать sprint без Run gate.

### L9–L12: Runtime и data bridges

**Что сломалось:** Function-input pins не пробрасывали данные с parent edges на subgraph block. Pure policy-build block не был data source. Observation после collapse выполнялась каждый tick, а не только при `is-recording-window-full`.

**Fix:** 
- `augmentResolveContextForFunctionCall` + data bridge `parent edge → block pin → function-input`
- `resolveNodeOutput` для `blockKind=subgraph` → pull через function-output pin
- `runSubgraphOnce` возвращает `execOutHandle`; parent block propagates его в main exec chain

**Профилактика:** UserCase с functions → smoke Run onConnect + main tick. Unit-test: Event.server → block pin → function-input → downstream.

---

## Мост к async v2.0: latent Sequence + Promise

После AP v1 bundled default = **v2.0-async**: вместо flat graph — `Sequence latentThen`, `StartAsyncJob(track-upload)`, detached drone report, sync trends на gate. Следующее соревнование упаковывает **async topology**, не v0.9 flat. Что наследуем:

### Из Alpha: нарратив через Promise stages

Alpha трёхактная структура идеально подходит для async:
- **Act I** = bootstrap (execute synchronously)
- **Act II** = main loop + **latent branches** (async track upload, drone report detach)
- **Act III** = teardown (sync cleanup after promise resolution)

Promise nodes можно groupировать как **завис в процессе**, аналогично музыкальной паузе между актами.

### Из Beta: collapse recipe для Sequence

Beta строгая separation of concerns переходит в async:
- `fn-beta-policy-build` — pure, остаётся как есть
- `fn-beta-recording-gate` — extends с `latentThen` для async gate post-processing
- `fn-beta-trends-publish` — `StartAsyncJob` внутри function; журнал ждёт Promise resolve

Collapse recipe для `Sequence(gate, latentThen(trends))` копирует structure из v1.

### Из Gamma: visual hierarchy для async deferred

Gamma numbered poster удобен для async:
- ① Политики (sync)
- ② Окно записи (sync, но gate может отложиться)
- ③–④ Спектр + Классификация (async drone, detached)
- ⑤ Отчёт (ждёт Promise)

Numbering не меняется; inside collapse `③④` будут `[async branch]` vs `[sync branch]`.

### Tech debt for v2.0

- **Pin budget для async**: Promise.value, Promise.reject, latent output требуют новых pin kinds
- **verify-layout для Promise nodes**: можно ли выпирать Promise за пределы function rect?
- **Runtime stores в drone branches**: analysisStore, collectStore нужны detached drone — надо pass by reference

---

## Итог

Все три замысла работают и Run-green. Alpha вживает MVP в оператора; Beta — в инженера; Gamma — в дизайнера. Второе соревнование (async v2.0) наследует collapse recipes (Beta), нарратив через stages (Alpha) и visual hierarchy (Gamma), но добавляет Promise topology. Выбор для продакшена зависит от аудитории: оператор → Alpha, инженер → Beta, маркетинг → Gamma. Для SDK рекомендуем Beta как gold standard modularity.
