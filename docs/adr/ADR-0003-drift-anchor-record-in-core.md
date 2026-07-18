# ADR 0003 — контракт `DriftAnchorRecord` живёт в `@membrana/core`, а не в `@membrana/drift-anchor`

> **Статус:** ACCEPTED · 2026-07-13
> **Гейт:** light ADR (форма решения предрешена консилиумом `drift-anchor-triggers-2026-07-12` (#404):
> «Единый контракт DriftAnchorRecord в @membrana/core… Три producer'а через журнал, без прямых
> импортов» — Структурщик, реплика 47; LGTM Vesnin). Этот ADR фиксирует границу, чтобы размещение
> в core не выглядело тихим ростом foundation (P1 ревью 2026-07-13).

## Контекст

Консилиум-2 разложил «поведенческий якорь» на три producer'а в разных субстратах:
code-anchor в **CI** (GitHub Actions), scheduled-code-anchor на **office-хосте** (cron),
data-anchor на **background-media** (frozen-image). Всем трём нужен один тип записи журнала
(`anchorKind`/`anchorSource`/`detectorVersion`/`imageFrozenAt`/`delta`/`verdict`), плюс
потребители: divergence-алерт «Прод ≠ main» и будущая UI-панель кабинета.

Кандидаты на место контракта:
- `@membrana/drift-anchor` — пакет намеренно **без зависимостей** (чистое ядро `computeDrift`
  структурного/поведенческого дайджеста; README: «раннер и аннотация — снаружи»);
- `@membrana/core` — хаб доменных контрактов с прецедентом чистых функций рядом с типами
  (`detection-fusion.ts`, `runtime-version.ts`).

## Решение

`DriftAnchorRecord` + чистые `buildCodeAnchorRecord` / `evaluateProdMainDivergence` —
в `packages/core/src/contracts/drift-anchor.ts`.

**Почему core, а не drift-anchor:**
- ≥3 producer'а в разных субстратах и ≥2 потребителя (алерт, UI кабинета) — классический
  cross-service контракт, ровно то, для чего существует contracts-слой core;
- `@membrana/drift-anchor` остаётся zero-dependency утилитой морнинг-дайджеста; затащить туда
  корпусную/CI-семантику — значит либо раздуть его назначение, либо заставить core (потребителей
  UI) зависеть от него;
- консилиум-2 явно назначил core («один тип, две реализации producer'ов», без прямых импортов
  между CI-скриптом и серверными джобами).

**Граница:** producer'ы (`scripts/drift-anchor-code.mjs`, office-cron, будущий data-джоб)
НЕ содержат собственной логики вердикта — только собирают вход и зовут чистые функции core.
`MorningDriftDigest`-семейство (структурный якорь) остаётся в `@membrana/drift-anchor` —
это другой контур (ритуальный дайджест), сливать типы не нужно.

## Последствия

- Гейт fail-closed: пустой/нечисловой baseline или нечисловая метрика → `broken`
  (блокирующий merge якорь не имеет права тихо пройти на мусорном входе).
- Порог из `docs/anchors/thresholds.json` (`codeAnchorEpsilonF1`, `prodMainEpsilonF1`);
  семантика строгая: регресс `> ε` → broken, ровно ε → drift (виден, не блокит).
- UI-панель «Дрейф-якоря» типизируется от core без новых зависимостей.
