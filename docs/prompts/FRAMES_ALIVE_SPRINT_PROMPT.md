# План спринта: «Оживление фреймов» — первый залитый фрейм процедурного слоя

**Держатель/lead:** Ozhegov (Структурщик). **Участники:** Dynin (предикаты/математика), Rodchenko (Верстальщик — рендер), Angelina (секретарь: конспект/проверка соответствия/приёмка рендера — **кода не пишет, кодекс #922**), Vesnin (Teamlead — приёмка фреймов), капитан (approval процедуры).

> **Сноска о происхождении и авторитете.** Роли Ожегова и Дынина озвучены через **DeepSeek** (Anthropic лимитирован до 01.08). DeepSeek **слабее и не знаком с контекстом репозитория** — его вердикты суть черновик-сырьё, не авторитет. Авторитетна локальная сессия с полным контекстом: находки Ангелины/Teamlead ниже **переопределяют** текст DeepSeek. При расхождении DeepSeek ↔ контекст прав контекст. Три поправки к первому черновику приняты капитаном 22.07.

## Три принятые поправки (переопределяют черновик DeepSeek)

1. **Ангелина не держит и не исполняет код.** В черновике Ф5/Ф7 были на Ангелине — нарушение кодекса #922. Исправлено: рендер (Ф5) — на Верстальщика (Rodchenko), провод аудита (Ф7) — на Дынина. Ангелина — только приёмщик рендера своей мастерской и проверка соответствия.
2. **7.4 — один выполнимый механизм.** Черновик задваивал: P6 требовал «фрейм, принятый leadPersona (Ангелиной)», а ни один фрейм Ангелиной не принимался → `done(ritual-day)` недостижим. Исправлено: убираем клаузу «leadPersona принимает фрейм» из P6; вводим **подпись процедуры** (procedure-level approval) лидом (Ангелина) И капитаном — отдельно от пофреймовых двух подписей. `done` наружу = все фреймы валидны + procedure-approval.
3. **Приёмка — живой боевой прогон, не «done=зелёный».** Черновик проверял только рендер и предикаты. Исправлено: Ф9 включает реальный прогон — холодная сессия ведёт утро строго по цепочке `morning-wiring`, **ноль импровизации/сверхусилий**; капитан подписывает ПО ФАКТУ прогона (закон: держит структура, не героизм агента).

## 9 фреймов (нарезка Ожегова, с поправками)

| # | Фрейм | Holder | Гранулы (madeBy) | executed → accepted |
|---|-------|--------|------------------|----------------------|
| 1 | contract-evolution | Ozhegov | granule-schema (Ozh), granule-versioning (Dyn), granule-contentHash+`pin.segmentHash` **7.1** (Dyn) | Ozhegov → Vesnin |
| 2 | math-predicates | Dynin | P4, P5(+`resolved(pin)` **7.2**), P6(**без** leadPersona-клаузы — см. **7.4**), P7, done | Dynin → Ozhegov |
| 3 | code-schema-rules | Ozhegov | schema-file, manifestSchemaProblems, validateProcedure(P1/P2/P3/P4/P6) | Ozhegov → Dynin |
| 4 | code-resolve | Dynin | auditPins, P5-impl, P7-impl, contentHash-impl | Dynin → Ozhegov |
| 5 | workshop-render | **Rodchenko** | render-chain, render-version, render-done | Rodchenko → Angelina |
| 6 | morning-wiring-skeleton | Ozhegov | frame-stub, three-doors (CLAUDE.md/developer-rhythm/AGENTS.md), pin-segmentHash (Dyn) | Ozhegov → Dynin |
| 7 | audit-on-start | **Dynin** | audit-trigger, audit-report, block-on-drift | Dynin → Ozhegov |
| 8 | two-signatures | Ozhegov | executed(Ozh), accepted(Vesnin), verify-P5(Dyn) | Ozhegov+Vesnin → Dynin |
| 9 | acceptance-run | Ozhegov | done-check(Dyn), **боевой прогон утра** (холодная сессия по цепочке), procedure-approval: **Ангелина(lead)+капитан**, registry-update | (прогон) → Vesnin + капитан |

## Дыры Дынина — где закрыты (обновлено поправкой 2)

| Дыра | Где | Механизм |
|------|-----|----------|
| 7.1 | Ф1 | `contentHash = SHA(normalize(concat([g.content + g.pin.segmentHash])))` |
| 7.2 | Ф2 (P5) | `∀ g: g.pin=∅ ∨ resolved(g.pin)` — `ambiguous` → P5 false |
| 7.4 | Ф2 + Ф9 | **Один механизм:** procedure-approval подписью лида (Ангелина) + капитана; P6 больше НЕ требует пофреймовой подписи лида |
| 7.3, 7.5 | — | приняты как ограничения |

## Приёмка спринта

Боевой прогон утреннего ритуала: холодная сессия ведёт утро по отрендеренной цепочке `morning-wiring`, без импровизации → `done(ritual-day)`=true → **подпись процедуры Ангелиной (lead) и капитаном**. done=зелёный необходим, но НЕ достаточен — приёмка это живой прогон.

## Порядок / потоки

Ф1→Ф2 (последовательно). Ф3∥Ф4 (после Ф1/Ф2). Ф5←Ф3/Ф4. Ф6←Ф1/Ф4. Ф7←Ф4/Ф5. Ф8←Ф6/Ф7. Ф9←Ф8.

## Риски / долги / out of scope

- Anthropic лимит до 01.08 → **всё** через deepseek (сырьё) + локальная авторитетная правка; Linear гео-блок RU → туннель NL + локальный дубль `docs/`; junction node_modules landmine → `yarn install` по деревьям (снимать junction только `rmdir`).
- Долги: 7.3/7.5 приняты; миграция 6 легаси-процедур — не трогаем (zero-cost); CI-гейт аудита — отдельно; авто-миграция heading→marker — отложено.
- Out of scope: второй фрейм ritual-day; авто-`segmentHash`; история версий; web-UI мастерской; другие процедуры (по касанию после эталона).
