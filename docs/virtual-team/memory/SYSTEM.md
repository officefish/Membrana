# Система памяти персон: оперативная + подсознание

> Канон раздела «Память» (основа для harness.mmbrn.tech/tooling). Построен за один
> день 28.07 по заседанию memory-subconscious: 7 комнат (263 реплики), 7 ратификаций
> владельца, акт аудитора Веснина, сшивка с 5 межами
> (`docs/meeting/memory-subconscious/MEETING_VERDICT.md`). Код:
> `scripts/persona-memory/lib/` + оркестратор `scripts/persona-memory-extract.mjs`.
> Зубы контура: 49.

## Мотив (вещдоки, не теория)

Память персон жила одним md-файлом на персону; extractor пересобирал топ-33 из
239 кандидатов под бюджет 5K токенов по формуле 0.6·recency+0.4·importance —
**свежесть правила отбором**. 27.07 у Дынина молча исчезли 10 записей (вся
мастерская задачника); 28.07 итог дня — «записано 46 · вытеснено 48». Потери были
невидимы и невозвратны.

## Архитектура (C1–C6, все контракты ратифицированы)

```
оперативная O (проекция md) ←── selectOperational (политика C2) ──┐
        ↑ rebuild                                                  │
архив A (append-only jsonl, ИСТОЧНИК ИСТИНЫ) ──── transfer ────────┘
        │                                    (причина+класс → op-log, C5)
        └── buildSubconsciousCloud (C3, слот) → emerge+why / reject (акт персоны)
циклы: evening_compress / morning_warmup (C4) · метрики/сигналы (C5)
```

**C1 — подсознание.** `memory/archive/<persona>.jsonl` первичен; `memory/<persona>.md`
— проекция. `ArchiveRecord`: id · personaId · ts · provenance · source ·
kind (`verbatim`|`summary`) · text; **summary ⇒ fullRef** (конспект без указателя
не существует). **Оператора erase нет** — зуб проверяет сами экспорты модуля.
Переток несёт `importanceSnapshot` — история не мутирует задним числом.

**C2 — приоритизация.** `O = pinned ∪ greedy-pack(бюджет)`. Pinned — человек-флаг
`importance.json` (join по provenance, **проводится в отбор**), вне конкурса;
переполнение — fail-closed `pinned_overflow`, не усечение. Классы
`position|insight|precedent|routine` × `active|settled` (закрытые enum);
comparator **ординалами**: pinned ↓ · expired ↑ · класс ↓ · цикл ↓ · **recency
последним**. TTL по умолчанию — только у routine (168ч); важным классам — только
словом человека. Каждый transfer — с причиной из закрытого словаря.

**C3 — всплытие (контракт, код — следующая фаза).** Лифт ≠ память:
`buildSubconsciousCloud` подаёт облако ≤10 (similar ≤5 после MMR · contrast ≤3 ·
outsider 1–2 — serendipity-слоты); мультизапрос осями topic|contrast|dispute;
**акт всплытия — за судящим звеном персоны**: emerge с обязательным «почему» либо
reject всего облака с причиной. Один retrieval-порт (развитие RAG-контура).

**C4 — активный цикл.** Обязательные слоты суток: `evening_compress` (после гейта
#569: политика → переток → квитанция с `transfer_applied`) и `morning_warmup`
(handoff-кеш persona×date). Всплытие — по повестке/жесту/утреннему feed;
авто-cron — нет. Пропуск такта — квитанция `miss` (подделка done запрещена
предикатом), опоздание — `late`, деградация видима: `miss(E) → restricted warmup`.

**C5 — наблюдение.** Op-log закрытым словарём 10 глаголов (чужой — throw);
метрики v1 — счётчики без порогов; сигнал `sunk_unsurfaced(N)` — важное,
перенесённое и ни разу не всплывшее, поимённо; третья строка отчёта token 121 —
только emerge; **n/a ≠ 0**, forge запрещён единым каноном `unbackedClaim`.

**C6 — extractor.** Тонкий CLI-оркестратор: сбор кандидатов → append в архив →
политика над полной лентой → op-log события → проекция. Миграция:
`--migrate-day-zero` (снапшот, `source: migration-snapshot`) и
`--backfill-before=<date>` (восстановление из git-истории,
`source: git-restore@sha`, дедуп по id).

## Боевая миграция 28.07 (первый прогон)

Day-zero: 5 персон, +169 записей. Backfill окна потерь: +48, **все 10 вытесненных
записей Дынина вернулись поимённо** (`git-restore@ce30f182`). Пересборка проекций
политикой: мастерская задачника удержана классовым рангом при живом бюджете;
pinned-переполнений нет; op-log дня — 200+ событий с причинами. Отчёт памяти
(`yarn team-memory:report`) теперь помечает вытеснение с причиной как
«переток — не потеря».

## Слоты v2 (именованы, пусты)

summarizer (сжатие при перетоке) · semanticIndex/embeddingRef (векторный индекс
под облако; кандидат-носитель — MCP на office + локальные эмбеддинги, #1393) ·
калибровка весов по метрикам · cross-persona · analogy-query · retrieval-recall
бенчмарки.
