# Исходники для синтеза трёх замыслов (comp-mvp-packaging v1)

> Sprint: `comp-mvp-packaging-2026-06-21` · bundled reference сейчас: `usercase-mvp-microphone` v2.0-async (после AP v1).

## Brief (суть соревнования)

**Problem:** bundled MVP функционально доказан, но graph — инженерный чертёж, не продукт для оператора. Три команды переупаковывают **тот же runtime** в наглядный UserCase (comment groups, user functions, layout).

**Паритет F1–F6:** bootstrap, recording gate, policies, trends publish, teardown, Run без ручного import.

**Не соревновались в:** новой логике, node kinds, core.

## Team Alpha — Live Observation Pipeline

**One-liner:** три акта на canvas (подключение → наблюдение → завершение); audio chain как partitura.

**Thesis:** оператор думает временем и звуком; comment group = акт спектакля; function = макро-шаг за 10 секунд объяснения.

**Functions:** fn-alpha-bootstrap (onConnect), fn-alpha-recording-gate, fn-alpha-observation-tick (gate+trends collapsed).

**ADR:** 3 цветовые семантики групп; observation tick объединяет gate+trends; RU copy с audio units; initial/onConnect не collapse — onboarding.

**Trade-off:** сильная narrativa; main dense до collapse; 2–3 functions = pin discipline.

## Team Beta — Measured modular UserCase (packaging vote winner)

**One-liner:** измеримые user functions + verify-layout как доказательство аккуратности.

**Thesis:** красиво = структурно предсказуемо (monotonic exec, grid, overlap 0); функции — переиспользуемые blocks.

**Functions:** fn-beta-policy-build (pure), fn-beta-recording-gate, fn-beta-trends-publish.

**ADR:** 3 functions separation of concerns; verify-layout hard gate; policies on main для single-screen demo; exact MVP semantics.

**Trade-off:** высокий C3/C5; может выглядеть сухо; больше collapse work.

## Team Gamma — Poster UserCase

**One-liner:** canvas как плакат ①–⑤, минимум ink, DESIGN.md hierarchy.

**Thesis:** beauty = visual hierarchy + negative space; groups — типографические блоки; mega-function прячет complexity.

**Functions:** fn-gamma-recording-gate + fn-gamma-trends-publish (mega-bundle deferred D-PINS-9).

**ADR:** numbered poster steps; prefer 1–2 functions; large group rects; smart align per row.

**Trade-off:** лучший C4 UX/screenshot; mega-function maintenance; debug inside collapse.

## Итог sprint v1 (исторический)

- Все три fork Run-green (L9–L12 fixes).
- Packaging vote: Beta > Alpha > Gamma — **merge не делался**.
- Catalog: tier community для alpha/beta/gamma; bundled остаётся MVP reference.
- Lessons: L1–L12 в USERCASE_COMPETITION_LESSONS.md (collapse pins, hydrate, exec-false-out, pure policy block).

## Контекст для v2 (async)

После AP v1 bundled default = **v2.0-async**: Sequence latentThen, StartAsyncJob(track-upload), detached drone report, sync trends on gate. Новое соревнование должно упаковывать **async topology**, не v0.9 flat graph.
